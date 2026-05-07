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

// Google Custom Search API - FREE: 100 queries/day
async function searchGoogle(query: string): Promise<SearchResult[]> {
  const GOOGLE_API_KEY = process.env.GOOGLE_SEARCH_API_KEY
  const GOOGLE_CX = process.env.GOOGLE_SEARCH_CX

  if (!GOOGLE_API_KEY || !GOOGLE_CX) return []

  try {
    const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(query)}&num=10&hl=pt-BR&gl=br`
    const res = await fetch(url, { cache: 'no-store' })

    if (res.status === 429 || res.status === 403) {
      console.log('[Search] Google quota exceeded (429/403), switching to Bing')
      return []
    }

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
  } catch (e) {
    console.error('Google Search failed:', e)
  }
  return []
}

// Bing Search API - FREE: 1000 queries/month (F0 tier)
async function searchBing(query: string): Promise<SearchResult[]> {
  const BING_API_KEY = process.env.BING_SEARCH_API_KEY
  if (!BING_API_KEY) return []

  try {
    const url = `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}&count=10&mkt=pt-BR&textFormat=Raw`
    const res = await fetch(url, {
      headers: {
        'Ocp-Apim-Subscription-Key': BING_API_KEY,
        'Accept': 'application/json',
      },
      cache: 'no-store',
    })

    if (res.status === 403) {
      console.log('[Search] Bing quota exceeded')
      return []
    }

    if (res.ok) {
      const data = await res.json()
      if (data.webPages?.value?.length > 0) {
        return data.webPages.value.map((item: any) => ({
          name: item.name || item.url?.replace(/^https?:\/\//, '').split('/')[0] || 'Desconhecido',
          url: item.url || '',
          snippet: item.snippet || '',
        }))
      }
    }
  } catch (e) {
    console.error('Bing Search failed:', e)
  }
  return []
}

// Main search: Google first → Bing fallback
async function performSearch(query: string): Promise<SearchResult[]> {
  let results = await searchGoogle(query)
  if (results.length > 0) {
    console.log(`[Search] ${results.length} results from Google`)
    return results
  }

  console.log('[Search] Google returned 0 or quota exceeded, trying Bing...')
  results = await searchBing(query)
  if (results.length > 0) {
    console.log(`[Search] ${results.length} results from Bing`)
  } else {
    console.log('[Search] No results from Google or Bing')
  }
  return results
}

function extractSocialLinks(result: SearchResult): SearchResult {
  const url = (result.url || '').toLowerCase()
  const snippet = (result.snippet || '').toLowerCase()
  const name = (result.name || '').toLowerCase()
  const allText = `${url} ${snippet} ${name}`

  const igMatch = allText.match(/(?:instagram\.com|instagr\.am)\/([a-zA-Z0-9_.]+)/)
  if (igMatch) result.instagram = `https://instagram.com/${igMatch[1]}`
  else if (url.includes('instagram.com/')) result.instagram = result.url

  const liMatch = allText.match(/linkedin\.com\/(in|company)\/([a-zA-Z0-9_.-]+)/)
  if (liMatch) result.linkedin = `https://linkedin.com/${liMatch[1]}/${liMatch[2]}`
  else if (url.includes('linkedin.com/')) result.linkedin = result.url

  const waMatch = allText.match(/wa\.me\/(\d+)/)
  if (waMatch) result.whatsapp = `https://wa.me/${waMatch[1]}`

  const phoneMatch = allText.match(/(\(?\d{2}\)?\s?9?\d{4}[-.]?\d{4})/)
  if (phoneMatch) result.phone = phoneMatch[1]

  const emailMatch = allText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)
  if (emailMatch) result.email = emailMatch[1]

  return result
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth()
    const body = await request.json()
    const { query, niche, location, leadType } = body

    if (!query) return NextResponse.json({ error: 'A busca é obrigatória' }, { status: 400 })

    let searchQuery = query
    if (niche && niche !== 'todos') searchQuery = `${niche} ${searchQuery}`
    if (location) searchQuery = `${searchQuery} ${location}`
    searchQuery = `${searchQuery} contato telefone site empresa`

    console.log(`[Search] Query: "${searchQuery}"`)
    const results = await performSearch(searchQuery)
    const enrichedResults = results.map(r => extractSocialLinks(r))

    let searchId = null
    try {
      const h = await db.searchHistory.create({ data: { query, niche: niche || null, location: location || null, leadType: leadType || 'pessoa_juridica', results: results.length } })
      searchId = h.id
    } catch {}

    return NextResponse.json({ results: enrichedResults, searchId })
  } catch (error) {
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN')) return authErrorResponse(error)
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Erro na busca' }, { status: 500 })
  }
}
