import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, authErrorResponse } from '@/lib/auth-custom'

// Helper to capitalize first letter
function capitalize(str: string | null): string | null {
  if (!str) return str
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// GET /api/stats - Get pipeline statistics (requires auth)
export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuth()

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    // Build where clause - enforce data isolation
    const where: Record<string, unknown> = {}
    if (currentUser.role === 'manager') {
      // Manager can see all or filter by userId
      if (userId) {
        where.userId = userId
      }
    } else {
      // Members always see only their own data
      where.userId = currentUser.id
    }

    // Get total leads count
    const totalLeads = await db.lead.count({ where })

    // Get leads grouped by status
    const leadsByStatusRaw = await db.lead.groupBy({
      by: ['status'],
      where,
      _count: {
        status: true,
      },
    })

    // Capitalize status names for display
    const leadsByStatus = leadsByStatusRaw.map((item) => ({
      status: item.status.charAt(0).toUpperCase() + item.status.slice(1),
      count: item._count.status,
    }))

    // Get leads grouped by niche
    const leadsByNicheRaw = await db.lead.groupBy({
      by: ['niche'],
      where,
      _count: {
        niche: true,
      },
    })

    const leadsByNiche = leadsByNicheRaw.map((item) => ({
      niche: item.niche ? item.niche.charAt(0).toUpperCase() + item.niche.slice(1) : 'Não definido',
      count: item._count.niche,
    }))

    // Get leads grouped by type (PJ vs PF)
    const pjResult = await db.$queryRaw`SELECT COUNT(*) as count FROM Lead WHERE leadType = 'pessoa_juridica'` as { count: number }[]
    const pfResult = await db.$queryRaw`SELECT COUNT(*) as count FROM Lead WHERE leadType = 'pessoa_fisica'` as { count: number }[]
    const pjCount = Number(pjResult[0]?.count || 0)
    const pfCount = Number(pfResult[0]?.count || 0)

    const leadsByType = [
      { leadType: 'Pessoa Jurídica', key: 'pessoa_juridica', count: pjCount },
      { leadType: 'Pessoa Física', key: 'pessoa_fisica', count: pfCount },
    ].filter((item) => item.count > 0)

    // Get leads grouped by source
    const leadsBySourceRaw = await db.lead.groupBy({
      by: ['source'],
      where,
      _count: {
        source: true,
      },
    })

    const bySource: Record<string, number> = {}
    for (const item of leadsBySourceRaw) {
      const key = item.source ? item.source.charAt(0).toUpperCase() + item.source.slice(1) : 'Não definido'
      bySource[key] = item._count.source
    }

    // Get recent leads (last 5) - capitalize status
    const recentLeadsRaw = await db.lead.findMany({
      where,
      take: 5,
      orderBy: { createdAt: 'desc' },
    })

    const recentLeads = recentLeadsRaw.map((lead) => ({
      ...lead,
      status: lead.status.charAt(0).toUpperCase() + lead.status.slice(1),
      niche: lead.niche ? lead.niche.charAt(0).toUpperCase() + lead.niche.slice(1) : null,
      source: lead.source ? lead.source.charAt(0).toUpperCase() + lead.source.slice(1) : null,
    }))

    // Calculate conversion rate: fechado / total
    const closedCount = leadsByStatusRaw.find((s) => s.status === 'fechado')?._count.status || 0
    const conversionRate = totalLeads > 0 ? (closedCount / totalLeads) * 100 : 0

    // Calculate new leads this week
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    const newThisWeek = await db.lead.count({
      where: {
        ...where,
        createdAt: {
          gte: oneWeekAgo,
        },
      },
    })

    // Pipeline value (mock: based on qualified + proposta leads)
    const pipelineLeads = await db.lead.count({
      where: {
        ...where,
        status: { in: ['qualificado', 'proposta'] },
      },
    })
    const pipelineValue = pipelineLeads * 2500 // Average deal value in BRL

    return NextResponse.json({
      totalLeads,
      newThisWeek,
      conversionRate: Math.round(conversionRate * 100) / 100,
      pipelineValue,
      leadsByStatus,
      leadsByNiche,
      leadsByType,
      bySource,
      recentLeads,
    })
  } catch (error) {
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN')) {
      return authErrorResponse(error)
    }
    console.error('Error fetching stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    )
  }
}
