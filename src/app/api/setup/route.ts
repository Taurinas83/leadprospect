import { ensureDbInitialized } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/setup - Initialize database on first run
export async function GET() {
  try {
    await ensureDbInitialized()
    return NextResponse.json({ status: 'ok', message: 'Database initialized' })
  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json(
      { status: 'error', message: 'Database initialization failed' },
      { status: 500 }
    )
  }
}
