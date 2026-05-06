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
    const serpApiKey = process.env.SERPAPI_KEY

    if (serpApiKey) {
      const params = new URLSearchParams({
        engine: 'google',
        q: searchQuery,
        api_key: serpApiKey,
        num: '15'
      })
      
      const res = await fetch(`https://serpapi.com/search.json?${params}`)
      if (!res.ok) {
        throw new Error('Falha na API do SerpAPI')
      }
      
      const data = await res.json()
      if (data.organic_results) {
        results = data.organic_results.map((r: any) => ({
          name: r.title || 'Desconhecido',
          url: r.link || '',
          snippet: r.snippet || '',
        }))
      }
    } else {
      // Mocked Fallback se a SERPAPI_KEY não estiver configurada no Vercel
      console.warn('SERPAPI_KEY ausente. Usando resultados de fallback.')
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
