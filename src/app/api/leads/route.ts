import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// Helper to capitalize first letter
function capitalize(str: string | null): string | null {
  if (!str) return str
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// GET /api/leads - List leads with filters
export async function GET(request: NextRequest) {
  try {
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

    if (userId) {
      where.userId = userId
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
    console.error('Error fetching leads:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leads' },
      { status: 500 }
    )
  }
}

// POST /api/leads - Create a new lead
export async function POST(request: NextRequest) {
  try {
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

    // If no userId provided, use a default (first manager)
    let effectiveUserId = userId
    if (!effectiveUserId) {
      const defaultManager = await db.user.findFirst({
        where: { role: 'manager' },
      })
      effectiveUserId = defaultManager?.id || ''
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
    console.error('Error creating lead:', error)
    return NextResponse.json(
      { error: 'Failed to create lead' },
      { status: 500 }
    )
  }
}

// PATCH /api/leads - Update a lead
export async function PATCH(request: NextRequest) {
  try {
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
    console.error('Error updating lead:', error)
    return NextResponse.json(
      { error: 'Failed to update lead' },
      { status: 500 }
    )
  }
}

// DELETE /api/leads - Delete a lead
export async function DELETE(request: NextRequest) {
  try {
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

    await db.lead.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting lead:', error)
    return NextResponse.json(
      { error: 'Failed to delete lead' },
      { status: 500 }
    )
  }
}
