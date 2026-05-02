import { db, ensureDbInitialized } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, authErrorResponse } from '@/lib/auth-custom'

// Helper to capitalize first letter
function capitalize(str: string | null): string | null {
  if (!str) return str
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// GET /api/leads - List leads with filters (requires auth)
export async function GET(request: NextRequest) {
  try {
    await ensureDbInitialized()
    const currentUser = await requireAuth()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const niche = searchParams.get('niche')
    const search = searchParams.get('search')
    const userId = searchParams.get('userId')
    const leadType = searchParams.get('leadType')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    const skip = (page - 1) * limit

    // Build where clause - normalize status/niche to lowercase for DB query
    const where: Record<string, unknown> = {}

    if (status) {
      where.status = status.toLowerCase()
    }

    if (niche) {
      where.niche = niche.toLowerCase()
    }

    if (leadType) {
      where.leadType = leadType
    }

    // Enforce data isolation: members can only see their own leads
    if (currentUser.role === 'manager') {
      // Manager can see all or filter by specific userId
      if (userId) {
        where.userId = userId
      }
    } else {
      // Members can only see their own leads regardless of what they request
      where.userId = currentUser.id
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { company: { contains: search } },
      ]
    }

    const leads = await db.lead.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    })

    // Capitalize status and niche in response
    const normalizedLeads = leads.map((lead) => ({
      ...lead,
      status: capitalize(lead.status) || lead.status,
      niche: capitalize(lead.niche),
      source: capitalize(lead.source),
    }))

    const total = await db.lead.count({ where })

    return NextResponse.json(normalizedLeads)
  } catch (error) {
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN')) {
      return authErrorResponse(error)
    }
    console.error('Error fetching leads:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leads' },
      { status: 500 }
    )
  }
}

// POST /api/leads - Create a new lead (requires auth)
export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized()
    const currentUser = await requireAuth()

    const body = await request.json()

    const {
      name,
      company,
      email,
      phone,
      whatsapp,
      website,
      instagram,
      linkedin,
      address,
      niche,
      leadType,
      status,
      source,
      score,
      notes,
      userId,
    } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    // For pessoa_juridica, company is required; for pessoa_fisica, it's optional
    const effectiveLeadType = leadType || 'pessoa_juridica'
    if (effectiveLeadType === 'pessoa_juridica' && !company) {
      return NextResponse.json(
        { error: 'Company is required for Pessoa Jurídica' },
        { status: 400 }
      )
    }

    // Determine the userId for the lead
    // Members can only create leads for themselves
    let effectiveUserId = currentUser.id
    if (currentUser.role === 'manager' && userId) {
      effectiveUserId = userId
    }

    const lead = await db.lead.create({
      data: {
        name,
        company: company || '',
        email: email || null,
        phone: phone || null,
        whatsapp: whatsapp || null,
        website: website || null,
        instagram: instagram || null,
        linkedin: linkedin || null,
        address: address || null,
        niche: niche ? niche.toLowerCase() : null,
        leadType: effectiveLeadType,
        status: status ? status.toLowerCase() : 'novo',
        source: source ? source.toLowerCase() : 'manual',
        score: score ?? 0,
        notes: notes || null,
        userId: effectiveUserId,
      },
    })

    // Return with capitalized values
    return NextResponse.json({
      ...lead,
      status: capitalize(lead.status) || lead.status,
      niche: capitalize(lead.niche),
      source: capitalize(lead.source),
    }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN')) {
      return authErrorResponse(error)
    }
    console.error('Error creating lead:', error)
    return NextResponse.json(
      { error: 'Failed to create lead' },
      { status: 500 }
    )
  }
}

// PATCH /api/leads - Update a lead (requires auth)
export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await requireAuth()

    const body = await request.json()
    const { id, ...fieldsToUpdate } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Lead ID is required' },
        { status: 400 }
      )
    }

    // Check if lead exists
    const existing = await db.lead.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    // Members can only update their own leads
    if (currentUser.role !== 'manager' && existing.userId !== currentUser.id) {
      return NextResponse.json(
        { error: 'Você não tem permissão para editar este lead' },
        { status: 403 }
      )
    }

    // Only include fields that are provided, normalize status/niche to lowercase
    const data: Record<string, unknown> = {}
    const allowedFields = [
      'name', 'company', 'email', 'phone', 'whatsapp', 'website',
      'instagram', 'linkedin', 'address', 'niche', 'leadType',
      'status', 'source', 'score', 'notes',
    ]

    for (const field of allowedFields) {
      if (field in fieldsToUpdate) {
        // Normalize text fields to lowercase for DB storage
        if (field === 'status' || field === 'niche' || field === 'source') {
          data[field] = (fieldsToUpdate[field] as string).toLowerCase()
        } else {
          data[field] = fieldsToUpdate[field]
        }
      }
    }

    const lead = await db.lead.update({
      where: { id },
      data,
    })

    // Return with capitalized values
    return NextResponse.json({
      ...lead,
      status: capitalize(lead.status) || lead.status,
      niche: capitalize(lead.niche),
      source: capitalize(lead.source),
    })
  } catch (error) {
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN')) {
      return authErrorResponse(error)
    }
    console.error('Error updating lead:', error)
    return NextResponse.json(
      { error: 'Failed to update lead' },
      { status: 500 }
    )
  }
}

// DELETE /api/leads - Delete a lead (requires auth)
export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await requireAuth()

    // Support both query param and JSON body
    const { searchParams } = new URL(request.url)
    let id = searchParams.get('id')

    if (!id) {
      try {
        const body = await request.json()
        id = body.id
      } catch {
        // No JSON body
      }
    }

    if (!id) {
      return NextResponse.json(
        { error: 'Lead ID is required' },
        { status: 400 }
      )
    }

    // Check if lead exists
    const existing = await db.lead.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    // Members can only delete their own leads
    if (currentUser.role !== 'manager' && existing.userId !== currentUser.id) {
      return NextResponse.json(
        { error: 'Você não tem permissão para excluir este lead' },
        { status: 403 }
      )
    }

    await db.lead.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN')) {
      return authErrorResponse(error)
    }
    console.error('Error deleting lead:', error)
    return NextResponse.json(
      { error: 'Failed to delete lead' },
      { status: 500 }
    )
  }
}
