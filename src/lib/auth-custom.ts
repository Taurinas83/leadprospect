import { db, ensureDbInitialized } from '@/lib/db'
import { cookies } from 'next/headers'
import * as crypto from 'crypto'
import { compare } from 'bcryptjs'

const SESSION_SECRET = process.env.SESSION_SECRET || process.env.NEXTAUTH_SECRET || 'leadprospect-secret-key-dev'

// Rate limiting: track failed login attempts
const failedAttempts = new Map<string, { count: number; lockedUntil: number }>()
const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_DURATION = 15 * 60 * 1000 // 15 minutes

export function checkRateLimit(email: string): { allowed: boolean; retryAfterMs?: number } {
  const entry = failedAttempts.get(email)
  if (!entry) return { allowed: true }

  if (entry.lockedUntil > Date.now()) {
    return { allowed: false, retryAfterMs: entry.lockedUntil - Date.now() }
  }

  // Lockout expired, reset
  if (entry.lockedUntil > 0) {
    failedAttempts.delete(email)
  }

  return { allowed: true }
}

function recordFailedAttempt(email: string) {
  const entry = failedAttempts.get(email) || { count: 0, lockedUntil: 0 }
  entry.count++
  if (entry.count >= MAX_FAILED_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_DURATION
  }
  failedAttempts.set(email, entry)
}

function clearFailedAttempts(email: string) {
  failedAttempts.delete(email)
}

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
    await ensureDbInitialized()

    // Check rate limit first
    const rateLimit = checkRateLimit(email)
    if (!rateLimit.allowed) {
      const minutes = Math.ceil((rateLimit.retryAfterMs || 0) / 60000)
      throw new Error(`Conta temporariamente bloqueada. Tente novamente em ${minutes} minutos.`)
    }

    const user = await db.user.findUnique({ where: { email } })
    if (!user) {
      recordFailedAttempt(email)
      return null
    }

    // Check if user is active
    if ('active' in user && !user.active) {
      throw new Error('Conta desativada. Entre em contato com o administrador.')
    }

    // Use bcrypt comparison instead of plaintext
    const passwordMatch = await compare(password, user.password)
    if (!passwordMatch) {
      recordFailedAttempt(email)
      return null
    }

    clearFailedAttempts(email)

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    }
  } catch (error) {
    // Re-throw known error messages (like rate limit and deactivated)
    if (error instanceof Error && error.message.includes('bloqueada') || error instanceof Error && error.message.includes('desativada')) {
      throw error
    }
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
    await ensureDbInitialized()

    const cookieStore = await cookies()
    const token = cookieStore.get('leadprospect-session')?.value
    if (!token) return null

    const payload = verifyToken(token)
    if (!payload) return null

    // Verify user still exists and is active in database
    const user = await db.user.findUnique({ where: { id: payload.id as string } })
    if (!user) return null
    if ('active' in user && !user.active) return null

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    }
  } catch {
    return null
  }
}

/**
 * Require authentication - returns user or throws a response
 * Use in API routes to guard endpoints
 */
export async function requireAuth(): Promise<SessionUser> {
  const user = await getSession()
  if (!user) {
    throw new Error('UNAUTHORIZED')
  }
  return user
}

/**
 * Require manager role - returns user or throws
 * Use in API routes that only managers can access
 */
export async function requireManager(): Promise<SessionUser> {
  const user = await requireAuth()
  if (user.role !== 'manager') {
    throw new Error('FORBIDDEN')
  }
  return user
}

/**
 * Helper to create auth error responses
 */
export function authErrorResponse(error: unknown) {
  if (error instanceof Error) {
    if (error.message === 'UNAUTHORIZED') {
      return new Response(JSON.stringify({ error: 'Não autorizado. Faça login para continuar.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    if (error.message === 'FORBIDDEN') {
      return new Response(JSON.stringify({ error: 'Acesso negado. Apenas gestores podem realizar esta ação.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }
  return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  })
}
