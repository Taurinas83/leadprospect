import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-custom'

export async function GET() {
  try {
    const user = await getSession()

    if (!user) {
      return NextResponse.json({ user: null })
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    console.error('Session error:', error)
    return NextResponse.json({ user: null })
  }
}
