import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-custom'
import { ensureDbInitialized } from '@/lib/db'

export async function GET() {
  try {
    await ensureDbInitialized()

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
