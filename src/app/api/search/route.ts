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

// Search using Brave Search API (free tier: 2000 queries/month)
// Fallback to multiple free search APIs
async function searchBrave(query: string): Promise<SearchResult[]> {
  const results: SearchResult[] = []
  
  try {
    // Method 1: Brave Search API (free tier available)
    const BRAVE_API_KEY = process.env.BRAVE_SEARCH_API_KEY
    if (BRAVE_API_KEY) {
      const res = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=15&country=br&search_lang=pt`,
        {
          headers: {
            'Accept': 'application/json',
            'X-Subscription-Token': BRAVE_API_KEY,
          },
          cache: 'no-store',
        }
      )
      
      if (res.ok) {
        const data = await res.json()
        if (data.web?.results) {
          return data.web.results.map((r: any) => ({
            name: r.title || r.url?.replace(/^https?:\/\//, '').split('/')[0] || 'Desconhecido',
            url: r.url || '',
            snippet: r.description || '',
          }))
        }
      }
    }
  } catch (e) {
    console.error('Brave Search failed:', e)
  }

  return results
}

// Search using free SearXNG instances (multiple fallbacks)
async function searchSearXNG(query: string): Promise<SearchResult[]> {
  const instances = [
    'https://searx.be',
    'https://search.bus-hit.me',
    'https://searx.tiekoetter.com',
    'https://search.sapti.me',
    'https://searx.nixnet.services',
  ]

  for (const instance of instances) {
    try {
      const url = `${instance}/search?q=${encodeURIComponent(query)}&format=json&language=pt-BR&categories=general`
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'pt-BR,pt;q=0.9',
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.results?.length > 0) {
          console.log(`[Search] Got ${data.results.length} results from ${instance}`)
          return data.results.slice(0, 15).map((r: any) => ({
            name: r.title || r.url?.replace(/^https?:\/\//, '').split('/')[0] || 'Desconhecido',
            url: r.url || '',
            snippet: r.content || '',
          }))
        }
      }
    } catch (e) {
      console.error(`SearXNG ${instance} failed:`, e)
      continue
    }
  }

  return []
}

// Search using Google Custom Search JSON API (free: 100 queries/day)
async function searchGoogle(query: string): Promise<SearchResult[]> {
  try {
    const GOOGLE_API_KEY = process.env.GOOGLE_SEARCH_API_KEY
    const GOOGLE_CX = process.env.GOOGLE_SEARCH_CX

    if (GOOGLE_API_KEY && GOOGLE_CX) {
      const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(query)}&num=10&hl=pt-BR&gl=br`
      const res = await fetch(url, { cache: 'no-store' })

      if (res.ok) {
        const data = await res.json()
        if (data.items?.length > 0) {
          return data.items.map((item: any) => ({
            name: item.title || 'Desconhecido',
            url: item.link || '',
            snippet: item.snippet || '',
          }))
        }
      }
    }
  } catch (e) {
    console.error('Google Search failed:', e)
  }

  return []
}

// Main search function - tries multiple sources
async function performSearch(query: string): Promise<SearchResult[]> {
  let results: SearchResult[] = []

  // Try Brave Search first (if API key configured)
  results = await searchBrave(query)
  if (results.length > 0) {
    console.log(`[Search] Found ${results.length} results from Brave`)
    return results
  }

  // Try SearXNG (free, no API key needed)
  results = await searchSearXNG(query)
  if (results.length > 0) {
    console.log(`[Search] Found ${results.length} results from SearXNG`)
    return results
  }

  // Try Google Custom Search (if configured)
  results = await searchGoogle(query)
  if (results.length > 0) {
    console.log(`[Search] Found ${results.length} results from Google`)
    return results
  }

  // Last resort: DuckDuckGo HTML with enhanced headers
  try {
    const htmlUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&kl=br-pt`
    const res = await fetch(htmlUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
      cache: 'no-store',
    })

    if (res.ok) {
      const html = await res.text()
      
      // Check for CAPTCHA
      if (html.includes('One more step') || html.includes('verify you are human')) {
        console.warn('[Search] DuckDuckGo CAPTCHA detected')
        return []
      }

      // Parse results - DuckDuckGo HTML format
      const titleRegex = /<a[^>]*class="result__a"[^>]*href="[^"]*uddg=([^"&]+)[^"]*"[^>]*>(.*?)<\/a>/gs
      const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>(.*?)<\/a>/gs
      
      const snippets: string[] = []
      let snipMatch
      while ((snipMatch = snippetRegex.exec(html)) !== null) {
        snippets.push(snipMatch[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim())
      }

      let match
      let idx = 0
      while ((match = titleRegex.exec(html)) !== null) {
        const encodedUrl = match[1]
        const title = match[2].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim()
        
        const url = decodeURIComponent(encodedUrl)
        const finalUrl = url.startsWith('http') ? url : `https://${url}`
        
        results.push({
          name: title || new URL(finalUrl).hostname,
          url: finalUrl,
          snippet: snippets[idx] || '',
        })
        idx++
        
        if (results.length >= 15) break
      }
      
      if (results.length > 0) {
        console.log(`[Search] Found ${results.length} results from DuckDuckGo HTML`)
      }
    }
  } catch (e) {
    console.error('DuckDuckGo HTML failed:', e)
  }

  return results
}

function extractSocialLinks(result: SearchResult): SearchResult {
  const url = (result.url || '').toLowerCase()
  const snippet = (result.snippet || '').toLowerCase()
  const name = (result.name || '').toLowerCase()
  const allText = `${url} ${snippet} ${name}`

  // Extract Instagram
  const igMatch = allText.match(/(?:instagram\.com|instagr\.am)\/([a-zA-Z0-9_.]+)/)
  if (igMatch) {
    result.instagram = `https://instagram.com/${igMatch[1]}`
  } else if (url.includes('instagram.com/')) {
    result.instagram = result.url
  }

  // Extract LinkedIn
  const liMatch = allText.match(/linkedin\.com\/(in|company)\/([a-zA-Z0-9_.-]+)/)
  if (liMatch) {
    result.linkedin = `https://linkedin.com/${liMatch[1]}/${liMatch[2]}`
  } else if (url.includes('linkedin.com/')) {
    result.linkedin = result.url
  }

  // Extract WhatsApp
  const waMatch = allText.match(/wa\.me\/(\d+)/)
  if (waMatch) {
    result.whatsapp = `https://wa.me/${waMatch[1]}`
  }

  // Extract phone (Brazilian)
  const phoneMatch = allText.match(/(\(?\d{2}\)?\s?9?\d{4}[-.]?\d{4})/)
  if (phoneMatch) {
    result.phone = phoneMatch[1]
  }

  // Extract email
  const emailMatch = allText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)
  if (emailMatch) {
    result.email = emailMatch[1]
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
    searchQuery = `${searchQuery} contato telefone site`

    console.log(`[Search] Executing: "${searchQuery}"`)

    // Perform real web search
    const results = await performSearch(searchQuery)
    console.log(`[Search] Total results: ${results.length}`)

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
