import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser, createSessionToken } from '@/lib/auth-custom'
import { ensureDbInitialized } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized()

    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      )
    }

    let user
    try {
      user = await authenticateUser(email, password)
    } catch (error) {
      // Handle rate limit and deactivated account errors
      if (error instanceof Error) {
        if (error.message.includes('bloqueada')) {
          return NextResponse.json(
            { error: error.message },
            { status: 429 }
          )
        }
        if (error.message.includes('desativada')) {
          return NextResponse.json(
            { error: error.message },
            { status: 403 }
          )
        }
      }
      throw error
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Email ou senha inválidos' },
        { status: 401 }
      )
    }

    const token = createSessionToken(user)

    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    })

    // Set session cookie - secure in production
    const isProduction = process.env.NODE_ENV === 'production'
    response.cookies.set('leadprospect-session', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
