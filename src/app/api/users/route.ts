import { db, ensureDbInitialized } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireManager, authErrorResponse } from '@/lib/auth-custom'
import { hash } from 'bcryptjs'

// GET /api/users - List all users (manager only)
export async function GET() {
  try {
    await ensureDbInitialized()
    await requireManager()

    const users = await db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        _count: {
          select: { leads: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(users)
  } catch (error) {
    return authErrorResponse(error)
  }
}

// POST /api/users - Create a new user (manager only)
export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized()
    await requireManager()

    const body = await request.json()
    const { name, email, password, role } = body

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Nome, email e senha são obrigatórios' },
        { status: 400 }
      )
    }

    if (!['manager', 'member'].includes(role)) {
      return NextResponse.json(
        { error: 'Papel inválido. Use "manager" ou "member"' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'A senha deve ter pelo menos 6 caracteres' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: 'Já existe um usuário com este email' },
        { status: 409 }
      )
    }

    const hashedPassword = await hash(password, 10)

    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        active: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    return authErrorResponse(error)
  }
}
