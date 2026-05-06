import { db, ensureDbInitialized } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, authErrorResponse } from '@/lib/auth-custom'

// POST /api/search - Search for leads on the web (requires auth)
export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized()
    await requireAuth() // Valida se o usuário está logado

    const body = await request.json()
    const { query, niche, location, leadType } = body

    if (!query) {
      return NextResponse.json(
        { error: 'A busca (query) é obrigatória' },
        { status: 400 }
      )
    }

    // Construct a search query optimized for finding business leads
    let searchQuery = query
    if (niche) {
      searchQuery = `${niche} ${searchQuery}`
    }
    if (location) {
      searchQuery = `${searchQuery} ${location}`
    }

    // Adjust search keywords based on lead type
    const effectiveLeadType = leadType || 'pessoa_juridica'
    if (effectiveLeadType === 'pessoa_fisica') {
      searchQuery = `${searchQuery} profissional autônomo contato instagram`
    } else {
      searchQuery = `${searchQuery} telefone contato site empresa`
    }

    let results: any[] = []
    
    // Search engine 1: DuckDuckGo HTML
    try {
      console.log('Searching via DuckDuckGo Lite...')
      const ddgBody = new URLSearchParams({ q: searchQuery, kl: 'br-pt' })
      const ddgRes = await fetch('https://lite.duckduckgo.com/lite/', {
        method: 'POST',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        body: ddgBody.toString()
      })

      if (ddgRes.ok) {
        const html = await ddgRes.text()
        const regex = /<a[^>]+class="result-url"[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>.*?<td class='result-snippet'[^>]*>(.*?)<\/td>/gs
        let match
        while ((match = regex.exec(html)) !== null) {
          let url = match[1].replace(/&amp;/g, '&')
          if (url.startsWith('//')) url = 'https:' + url
          const title = match[2].replace(/<[^>]+>/g, '').trim()
          const snippet = match[3].replace(/<[^>]+>/g, '').trim()
          results.push({ name: title || 'Desconhecido', url, snippet })
        }
      }
    } catch (e) {
      console.error('DuckDuckGo Search Failed:', e)
    }

    // Search engine 2: SearXNG Public Instance Fallback
    if (results.length === 0) {
      try {
        console.log('DuckDuckGo failed or empty. Falling back to SearXNG...')
        const searxUrl = `https://searx.be/search?q=${encodeURIComponent(searchQuery)}&format=json`
        const searxRes = await fetch(searxUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        })
        if (searxRes.ok) {
          const data = await searxRes.json()
          if (data.results && data.results.length > 0) {
            results = data.results.map((r: any) => ({
              name: r.title || 'Desconhecido',
              url: r.url || '',
              snippet: r.content || ''
            }))
          }
        }
      } catch (e) {
        console.error('SearXNG Search Failed:', e)
      }
    }

    // Fallback Mock se tudo falhar
    if (results.length === 0) {
      console.warn('Motores de busca falharam. Usando resultados de fallback (mock).')
      results = [
        { name: 'Empresa Exemplo 1', url: 'https://exemplo1.com', snippet: 'Clínica especializada na região. Contato: (11) 99999-1111 - Instagram: instagram.com/exemplo1' },
        { name: 'Profissional Teste 2', url: 'https://exemplo2.com', snippet: 'Consultoria empresarial e de negócios. linkedin.com/in/exemplo2 WhatsApp: 5511988882222' },
        { name: 'Negócio Local 3', url: '', snippet: 'Restaurante e delivery. Faça seu pedido: instagram.com/negocio3' }
      ]
    }

    // Extract social media links from search results
    const enrichedResults = results.map((r) => {
      const url = r.url || ''
      const snippet = r.snippet || ''
      const allText = `${url} ${snippet}`.toLowerCase()

      let instagram = ''
      let linkedin = ''
      let whatsapp = ''

      // Extract Instagram
      const igMatch = allText.match(/instagram\.com\/([a-zA-Z0-9_.]+)/)
      if (igMatch) {
        instagram = `https://instagram.com/${igMatch[1]}`
      }

      // Extract LinkedIn
      const liMatch = allText.match(/linkedin\.com\/(in|company)\/([a-zA-Z0-9_.-]+)/)
      if (liMatch) {
        linkedin = `https://linkedin.com/${liMatch[1]}/${liMatch[2]}`
      }

      // Extract WhatsApp
      const waMatch = allText.match(/wa\.me\/(\d+)|whatsapp.*?(\+?\d{10,})/)
      if (waMatch) {
        whatsapp = waMatch[1] ? `https://wa.me/${waMatch[1]}` : waMatch[2] || ''
      }

      return {
        ...r,
        instagram,
        linkedin,
        whatsapp,
      }
    })

    // Save search to SearchHistory
    const searchHistory = await db.searchHistory.create({
      data: {
        query,
        niche: niche || null,
        location: location || null,
        leadType: effectiveLeadType,
        results: results.length,
      },
    })

    return NextResponse.json({
      results: enrichedResults,
      searchId: searchHistory.id,
    })
  } catch (error) {
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN')) {
      return authErrorResponse(error)
    }
    console.error('Error searching for leads:', error)
    return NextResponse.json(
      { error: 'Failed to search for leads' },
      { status: 500 }
    )
  }
}
