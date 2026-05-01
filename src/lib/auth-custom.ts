import { db } from '@/lib/db'
import { cookies } from 'next/headers'
import * as crypto from 'crypto'

const SESSION_SECRET = process.env.NEXTAUTH_SECRET || 'leadprospect-secret-key-dev'

export interface SessionUser {
  id: string
  name: string
  email: string
  role: string
}

// HMAC-signed token for session management
function signToken(payload: Record<string, unknown>): string {
  const data = JSON.stringify({ ...payload, iat: Date.now() })
  const encoded = Buffer.from(data).toString('base64url')
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url')
  return `${encoded}.${sig}`
}

function verifyToken(token: string): Record<string, unknown> | null {
  try {
    const [payloadEncoded, sig] = token.split('.')
    if (!payloadEncoded || !sig) return null

    const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payloadEncoded).digest('base64url')
    if (sig !== expectedSig) return null

    const data = Buffer.from(payloadEncoded, 'base64url').toString()
    const payload = JSON.parse(data)
    // Check expiry (24 hours)
    if (Date.now() - payload.iat > 24 * 60 * 60 * 1000) return null

    return payload
  } catch {
    return null
  }
}

export async function authenticateUser(email: string, password: string): Promise<SessionUser | null> {
  try {
    const user = await db.user.findUnique({ where: { email } })
    if (!user) return null
    if (user.password !== password) return null

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    }
  } catch (error) {
    console.error('Auth error:', error)
    return null
  }
}

export function createSessionToken(user: SessionUser): string {
  return signToken({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  })
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('leadprospect-session')?.value
    if (!token) return null

    const payload = verifyToken(token)
    if (!payload) return null

    return {
      id: payload.id as string,
      name: payload.name as string,
      email: payload.email as string,
      role: payload.role as string,
    }
  } catch {
    return null
  }
}
