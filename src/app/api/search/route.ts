import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, authErrorResponse } from '@/lib/auth-custom'
import ZAI, { type SearchFunctionResultItem } from 'z-ai-web-dev-sdk'

// POST /api/search - Search for leads on the web (requires auth)
export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuth()

    const body = await request.json()
    const { query, niche, location, leadType } = body

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
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

    // Use z-ai-web-dev-sdk for web search
    const zai = await ZAI.create()
    const results: SearchFunctionResultItem[] = await zai.functions.invoke('web_search', {
      query: searchQuery,
      num: 15,
    })

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

    // Save search to SearchHistory with the user who performed it
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
