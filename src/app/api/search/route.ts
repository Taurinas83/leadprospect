import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, authErrorResponse } from '@/lib/auth-custom'

interface SearchResult {
  name: string
  url: string
  snippet: string
  instagram?: string
  linkedin?: string
  whatsapp?: string
  phone?: string
  email?: string
}

async function searchDuckDuckGo(query: string): Promise<SearchResult[]> {
  const results: SearchResult[] = []
  
  try {
    // Method 1: DuckDuckGo HTML interface
    const htmlUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&kl=br-pt`
    const res = await fetch(htmlUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': 'https://duckduckgo.com/',
      },
      cache: 'no-store',
    })

    if (res.ok) {
      const html = await res.text()
      
      // Extract actual result links from DuckDuckGo HTML
      // DuckDuckGo uses: <a class="result__a" href="/l/?kh=-1&uddg=ACTUAL_URL">
      const linkRegex = /<a class="result__a" href="\/l\/\?[^"]*uddg=([^"&]+)[^"]*"[^>]*>(.*?)<\/a>/gs
      const snippetRegex = /<a class="result__snippet[^"]*"[^>]*>(.*?)<\/a>/gs
      
      let match
      const snippets: string[] = []
      
      // First collect all snippets
      let snipMatch
      while ((snipMatch = snippetRegex.exec(html)) !== null) {
        snippets.push(snipMatch[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim())
      }
      
      let idx = 0
      while ((match = linkRegex.exec(html)) !== null) {
        const encodedUrl = match[1]
        const title = match[2].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim()
        
        // Decode URL
        let url = decodeURIComponent(encodedUrl)
        if (!url.startsWith('http')) url = 'https://' + url
        
        const snippet = snippets[idx] || ''
        idx++
        
        results.push({
          name: title || new URL(url).hostname,
          url,
          snippet,
        })
        
        if (results.length >= 15) break
      }
    }
  } catch (e) {
    console.error('DuckDuckGo HTML failed:', e)
  }

  // Method 2: DuckDuckGo Lite (fallback)
  if (results.length === 0) {
    try {
      const params = new URLSearchParams({ q: query, kl: 'br-pt' })
      const res = await fetch('https://lite.duckduckgo.com/lite/', {
        method: 'POST',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'text/html',
        },
        body: params.toString(),
        cache: 'no-store',
      })

      if (res.ok) {
        const html = await res.text()
        // Lite version uses: <a class="result-link" href="URL">
        const liteRegex = /<a class="result-link" href="([^"]+)"[^>]*>(.*?)<\/a>/gs
        const liteSnippetRegex = /<td class="result-snippet"[^>]*>(.*?)<\/td>/gs
        
        const snippets: string[] = []
        let snipMatch
        while ((snipMatch = liteSnippetRegex.exec(html)) !== null) {
          snippets.push(snipMatch[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim())
        }
        
        let match
        let idx = 0
        while ((match = liteRegex.exec(html)) !== null) {
          let url = match[1].replace(/&amp;/g, '&')
          if (url.startsWith('//')) url = 'https:' + url
          const title = match[2].replace(/<[^>]+>/g, '').trim()
          
          results.push({
            name: title || new URL(url).hostname,
            url,
            snippet: snippets[idx] || '',
          })
          idx++
          
          if (results.length >= 15) break
        }
      }
    } catch (e) {
      console.error('DuckDuckGo Lite failed:', e)
    }
  }

  return results
}

function extractSocialLinks(result: SearchResult): SearchResult {
  const url = result.url || ''
  const snippet = result.snippet || ''
  const name = result.name || ''
  const allText = `${url} ${snippet} ${name}`.toLowerCase()

  // Extract Instagram
  const igMatch = allText.match(/(?:instagram\.com|instagr\.am)\/([a-zA-Z0-9_.]+)/)
  if (igMatch) {
    result.instagram = `https://instagram.com/${igMatch[1]}`
  }

  // Extract LinkedIn
  const liMatch = allText.match(/linkedin\.com\/(in|company)\/([a-zA-Z0-9_.-]+)/)
  if (liMatch) {
    result.linkedin = `https://linkedin.com/${liMatch[1]}/${liMatch[2]}`
  }

  // Extract WhatsApp
  const waMatch = allText.match(/wa\.me\/(\d+)|whatsapp\.com\/.*?(\+?\d{10,})/)
  if (waMatch) {
    result.whatsapp = waMatch[1] ? `https://wa.me/${waMatch[1]}` : waMatch[2]
  }

  // Extract phone numbers (Brazilian format)
  const phoneMatch = allText.match(/(?:\+?55\s?)?\(?\d{2}\)?\s?9?\d{4}[-.]?\d{4}/)
  if (phoneMatch) {
    result.phone = phoneMatch[0]
  }

  // Extract email
  const emailMatch = allText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
  if (emailMatch) {
    result.email = emailMatch[0]
  }

  // Try to get Instagram from URL hostname
  if (!result.instagram) {
    const hostMatch = url.match(/instagram\.com\/([a-zA-Z0-9_.]+)/)
    if (hostMatch) {
      result.instagram = url
    }
  }

  // Try to get LinkedIn from URL hostname
  if (!result.linkedin) {
    const hostMatch = url.match(/linkedin\.com\/(in|company)\/([a-zA-Z0-9_.-]+)/)
    if (hostMatch) {
      result.linkedin = url
    }
  }

  return result
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth()

    const body = await request.json()
    const { query, niche, location, leadType } = body

    if (!query) {
      return NextResponse.json(
        { error: 'A busca (query) é obrigatória' },
        { status: 400 }
      )
    }

    // Build search query
    let searchQuery = query
    if (niche && niche !== 'todos') searchQuery = `${niche} ${searchQuery}`
    if (location) searchQuery = `${searchQuery} ${location}`
    
    // Add business contact keywords
    searchQuery = `${searchQuery} contato telefone site`

    console.log(`[Search] Query: "${searchQuery}"`)

    // Perform real web search
    let results = await searchDuckDuckGo(searchQuery)
    
    console.log(`[Search] Found ${results.length} results`)

    // If DuckDuckGo returns nothing, try alternative approaches
    if (results.length === 0) {
      // Try without location modifier
      const altQuery = `${query} ${niche !== 'todos' ? niche : ''} site:.com.br`
      results = await searchDuckDuckGo(altQuery)
    }

    // Enrich with social links
    const enrichedResults = results.map(r => extractSocialLinks(r))

    // Save search history (optional)
    let searchId = null
    try {
      const searchHistory = await db.searchHistory.create({
        data: {
          query,
          niche: niche || null,
          location: location || null,
          leadType: leadType || 'pessoa_juridica',
          results: results.length,
        },
      })
      searchId = searchHistory.id
    } catch {
      // DB might not be available
    }

    return NextResponse.json({
      results: enrichedResults,
      searchId,
    })
  } catch (error) {
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN')) {
      return authErrorResponse(error)
    }
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Erro na busca. Tente novamente.' },
      { status: 500 }
    )
  }
}
