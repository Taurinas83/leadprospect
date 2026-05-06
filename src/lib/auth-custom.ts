import { db, ensureDbInitialized } from '@/lib/db'
import { cookies } from 'next/headers'
import * as crypto from 'crypto'
import { compare, hash } from 'bcryptjs'

const SESSION_SECRET = process.env.SESSION_SECRET || process.env.NEXTAUTH_SECRET || 'leadprospect-secret-key-dev'

// Fallback users via environment variables (for Vercel deployment without external DB)
interface EnvUser {
  id: string
  name: string
  email: string
  password: string
  role: string
}

function getEnvUsers(): EnvUser[] {
  const envUsers = process.env.APP_USERS
  if (!envUsers) return []

  try {
    return JSON.parse(envUsers)
  } catch {
    console.error('[Auth] Failed to parse APP_USERS env variable')
    return []
  }
}

async function hashPassword(password: string): Promise<string> {
  return hash(password, 10)
}

// Default fallback users with pre-hashed passwords
// Passwords: gestor123, membro123, membro123
const DEFAULT_USERS: EnvUser[] = [
  {
    id: 'env-user-1',
    name: 'Ricardo Silva',
    email: 'ricardo@leadprospect.com',
    password: '$2b$10$2nuZ8h1DXt871vw1Hj0ty.LCLKgMPoTuiU7Z4PNiTgabwyQc.P.Eu', // gestor123
    role: 'manager',
  },
  {
    id: 'env-user-2',
    name: 'Ana Santos',
    email: 'ana@leadprospect.com',
    password: '$2b$10$OvjRWbkee1kkIeeXX.Si7OUZYp/Zr33osPDoPDwmbhTyVqxy8z09q', // membro123
    role: 'member',
  },
  {
    id: 'env-user-3',
    name: 'Bruno Oliveira',
    email: 'bruno@leadprospect.com',
    password: '$2b$10$OvjRWbkee1kkIeeXX.Si7OUZYp/Zr33osPDoPDwmbhTyVqxy8z09q', // membro123
    role: 'member',
  },
]

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
    // Try database first
    try {
      await ensureDbInitialized()
      const rateLimit = checkRateLimit(email)
      if (!rateLimit.allowed) {
        const minutes = Math.ceil((rateLimit.retryAfterMs || 0) / 60000)
        throw new Error(`Conta temporariamente bloqueada. Tente novamente em ${minutes} minutos.`)
      }

      const user = await db.user.findUnique({ where: { email } })
      if (user) {
        // Check if user is active
        if ('active' in user && !user.active) {
          throw new Error('Conta desativada. Entre em contato com o administrador.')
        }

        // Use bcrypt comparison
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
      }
    } catch (dbError) {
      // If database fails, fall back to env users
      console.log('[Auth] Database unavailable, using env users')
    }

    // Fallback to environment users
    const envUsers = getEnvUsers().length > 0 ? getEnvUsers() : DEFAULT_USERS
    const envUser = envUsers.find(u => u.email === email)

    if (!envUser) {
      recordFailedAttempt(email)
      return null
    }

    // Compare password with env user
    const passwordMatch = await compare(password, envUser.password)
    if (!passwordMatch) {
      recordFailedAttempt(email)
      return null
    }

    clearFailedAttempts(email)

    return {
      id: envUser.id,
      name: envUser.name,
      email: envUser.email,
      role: envUser.role,
    }
  } catch (error) {
    // Re-throw known error messages (like rate limit and deactivated)
    if (error instanceof Error && (error.message.includes('bloqueada') || error.message.includes('desativada'))) {
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
    const cookieStore = await cookies()
    const token = cookieStore.get('leadprospect-session')?.value
    if (!token) return null

    const payload = verifyToken(token)
    if (!payload) return null

    // Check if this is an env user (starts with 'env-user-')
    const userId = payload.id as string
    if (userId.startsWith('env-user-')) {
      // Return the user from the token payload directly for env users
      return {
        id: userId,
        name: payload.name as string,
        email: payload.email as string,
        role: payload.role as string,
      }
    }

    // For database users, verify they still exist and are active
    try {
      await ensureDbInitialized()
      const user = await db.user.findUnique({ where: { id: userId } })
      if (!user) return null
      if ('active' in user && !user.active) return null

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      }
    } catch {
      // If database fails but we have a valid token, return the payload
      return {
        id: userId,
        name: payload.name as string,
        email: payload.email as string,
        role: payload.role as string,
      }
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
