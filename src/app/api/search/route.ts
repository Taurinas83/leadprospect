import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import ZAI, { type SearchFunctionResultItem } from 'z-ai-web-dev-sdk'

// POST /api/search - Search for leads on the web
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, niche, location } = body

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
    // Append keywords that help find business contact info
    searchQuery = `${searchQuery} telefone contato site`

    // Use z-ai-web-dev-sdk for web search
    const zai = await ZAI.create()
    const results: SearchFunctionResultItem[] = await zai.functions.invoke('web_search', {
      query: searchQuery,
      num: 15,
    })

    // Save search to SearchHistory
    const searchHistory = await db.searchHistory.create({
      data: {
        query,
        niche: niche || null,
        location: location || null,
        results: results.length,
      },
    })

    return NextResponse.json({
      results,
      searchId: searchHistory.id,
    })
  } catch (error) {
    console.error('Error searching for leads:', error)
    return NextResponse.json(
      { error: 'Failed to search for leads' },
      { status: 500 }
    )
  }
}
