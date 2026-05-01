import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/stats - Get pipeline statistics
export async function GET() {
  try {
    // Get total leads count
    const totalLeads = await db.lead.count()

    // Get leads grouped by status
    const leadsByStatusRaw = await db.lead.groupBy({
      by: ['status'],
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
      _count: {
        niche: true,
      },
    })

    const leadsByNiche = leadsByNicheRaw.map((item) => ({
      niche: item.niche ? item.niche.charAt(0).toUpperCase() + item.niche.slice(1) : 'Não definido',
      count: item._count.niche,
    }))

    // Get leads grouped by source
    const leadsBySourceRaw = await db.lead.groupBy({
      by: ['source'],
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
        createdAt: {
          gte: oneWeekAgo,
        },
      },
    })

    // Pipeline value (mock: based on qualified + proposta leads)
    const pipelineLeads = await db.lead.count({
      where: {
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
      bySource,
      recentLeads,
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    )
  }
}
