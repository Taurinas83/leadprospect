import { db, ensureDbInitialized } from '@/lib/db'
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
    await ensureDbInitialized()
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

    // Get leads grouped by type (PJ vs PF) - with proper where clause
    const pjResult = await db.lead.count({ where: { ...where, leadType: 'pessoa_juridica' } })
    const pfResult = await db.lead.count({ where: { ...where, leadType: 'pessoa_fisica' } })

    const leadsByType = [
      { leadType: 'Pessoa Jurídica', key: 'pessoa_juridica', count: pjResult },
      { leadType: 'Pessoa Física', key: 'pessoa_fisica', count: pfResult },
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

    // Get recent leads (last 5) - capitalize status, include user name
    const recentLeadsRaw = await db.lead.findMany({
      where,
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { name: true },
        },
      },
    })

    const recentLeads = recentLeadsRaw.map((lead) => ({
      ...lead,
      userName: lead.user?.name || null,
      user: undefined,
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

    // Team ranking: only for managers viewing all leads
    let teamRanking: { userId: string; userName: string; totalLeads: number; newLeads: number; contacted: number; qualified: number; proposal: number; closed: number; lost: number; conversionRate: number }[] = []
    if (currentUser.role === 'manager' && !userId) {
      const activeUsers = await db.user.findMany({
        where: { active: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      })

      teamRanking = await Promise.all(
        activeUsers.map(async (u) => {
          const userTotal = await db.lead.count({ where: { userId: u.id } })
          const userNew = await db.lead.count({ where: { userId: u.id, status: 'novo' } })
          const userContacted = await db.lead.count({ where: { userId: u.id, status: 'contatado' } })
          const userQualified = await db.lead.count({ where: { userId: u.id, status: 'qualificado' } })
          const userProposal = await db.lead.count({ where: { userId: u.id, status: 'proposta' } })
          const userClosed = await db.lead.count({ where: { userId: u.id, status: 'fechado' } })
          const userLost = await db.lead.count({ where: { userId: u.id, status: 'perdido' } })
          const userConversion = userTotal > 0 ? Math.round((userClosed / userTotal) * 10000) / 100 : 0

          return {
            userId: u.id,
            userName: u.name,
            totalLeads: userTotal,
            newLeads: userNew,
            contacted: userContacted,
            qualified: userQualified,
            proposal: userProposal,
            closed: userClosed,
            lost: userLost,
            conversionRate: userConversion,
          }
        })
      )

      // Sort by total leads descending
      teamRanking.sort((a, b) => b.totalLeads - a.totalLeads)
    }

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
      teamRanking,
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
