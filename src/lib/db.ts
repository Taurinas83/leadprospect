import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  dbInitialized: boolean | undefined
}

// Create Prisma client singleton (works with PostgreSQL on Vercel/Supabase)
export const db = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

let initPromise: Promise<void> | null = null

/**
 * Ensures the database has at least one admin user.
 * Tables are created via `prisma migrate deploy` at build/deploy time.
 */
export async function ensureDbInitialized(): Promise<void> {
  if (globalForPrisma.dbInitialized) return

  if (!initPromise) {
    initPromise = initializeDatabase()
  }

  return initPromise
}

async function initializeDatabase(): Promise<void> {
  try {
    // Seed initial admin user if no users exist
    const userCount = await db.user.count()
    if (userCount === 0) {
      const hashedPassword = await hash('gestor123', 10)
      await db.user.create({
        data: {
          name: 'Administrador',
          email: 'admin@leadprospect.com',
          password: hashedPassword,
          role: 'manager',
          active: true,
        },
      })
      console.log('[DB] Admin inicial criado: admin@leadprospect.com / gestor123')
    }

    globalForPrisma.dbInitialized = true
    console.log('[DB] Database inicializado com sucesso')
  } catch (error) {
    console.error('[DB] Falha ao inicializar database:', error)
    globalForPrisma.dbInitialized = true
  }
}
