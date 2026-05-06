import { ensureDbInitialized } from '@/lib/db'
import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import { NextResponse } from 'next/server'

const prisma = new PrismaClient()

// GET /api/setup - Initialize database and create default users on first run
export async function GET() {
  try {
    await ensureDbInitialized()

    // Check if any users exist
    const userCount = await prisma.user.count()

    if (userCount === 0) {
      // Create default users
      const users = [
        {
          name: 'Ricardo Silva',
          email: 'ricardo@leadprospect.com',
          password: 'gestor123',
          role: 'manager',
        },
        {
          name: 'Ana Santos',
          email: 'ana@leadprospect.com',
          password: 'membro123',
          role: 'member',
        },
        {
          name: 'Bruno Oliveira',
          email: 'bruno@leadprospect.com',
          password: 'membro123',
          role: 'member',
        },
      ]

      for (const user of users) {
        const hashedPassword = await hash(user.password, 10)
        await prisma.user.create({
          data: {
            name: user.name,
            email: user.email,
            password: hashedPassword,
            role: user.role,
          },
        })
      }

      return NextResponse.json({
        status: 'ok',
        message: 'Database initialized with default users',
        users: users.map(u => ({ email: u.email, role: u.role }))
      })
    }

    return NextResponse.json({
      status: 'ok',
      message: 'Database already initialized',
      userCount
    })
  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json(
      { status: 'error', message: 'Database initialization failed', error: String(error) },
      { status: 500 }
    )
  }
}
