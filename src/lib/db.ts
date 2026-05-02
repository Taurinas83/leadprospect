import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

// Ensure DATABASE_URL is always set (fallback for cloud deployments without .env)
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./db/custom.db'
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  dbInitialized: boolean | undefined
}

// Create Prisma client singleton
export const db = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

/**
 * Auto-initialize database on first use.
 * Creates tables (via raw SQL for SQLite) and seeds initial admin user.
 * This runs inside the Next.js process - no external scripts needed.
 */
let initPromise: Promise<void> | null = null

export async function ensureDbInitialized(): Promise<void> {
  if (globalForPrisma.dbInitialized) return

  if (!initPromise) {
    initPromise = initializeDatabase()
  }

  return initPromise
}

async function initializeDatabase(): Promise<void> {
  // Ensure db directory exists for SQLite
  try {
    const { existsSync, mkdirSync } = await import('fs')
    const { join } = await import('path')
    const dbDir = join(process.cwd(), 'db')
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true })
      console.log('[DB] Created db directory:', dbDir)
    }
  } catch (e) {
    console.warn('[DB] Could not create db directory:', e)
  }

  try {
    // Check if User table exists by trying a simple query
    await db.$queryRaw`SELECT 1 FROM User LIMIT 1`
    globalForPrisma.dbInitialized = true
    return
  } catch {
    // Table doesn't exist yet - need to create it
    console.log('[DB] Tables not found, creating database schema...')
  }

  try {
    // Create tables using raw SQL (works without prisma db push)
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS User (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'member',
        active BOOLEAN NOT NULL DEFAULT 1,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `)

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS Lead (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        company TEXT NOT NULL DEFAULT '',
        email TEXT,
        phone TEXT,
        whatsapp TEXT,
        website TEXT,
        instagram TEXT,
        linkedin TEXT,
        address TEXT,
        niche TEXT,
        leadType TEXT NOT NULL DEFAULT 'pessoa_juridica',
        status TEXT NOT NULL DEFAULT 'novo',
        source TEXT DEFAULT 'manual',
        score INTEGER NOT NULL DEFAULT 0,
        notes TEXT,
        userId TEXT NOT NULL,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES User(id)
      );
    `)

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS SearchHistory (
        id TEXT PRIMARY KEY NOT NULL,
        query TEXT NOT NULL,
        niche TEXT,
        location TEXT,
        leadType TEXT,
        results INTEGER NOT NULL DEFAULT 0,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `)

    // Seed initial admin user
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
      console.log('[DB] Initial admin created: admin@leadprospect.com')
    }

    globalForPrisma.dbInitialized = true
    console.log('[DB] Database initialized successfully')
  } catch (error) {
    console.error('[DB] Database initialization failed:', error)
    // Don't throw - let the app try to work anyway
    // Tables might already exist from a previous attempt
    globalForPrisma.dbInitialized = true
  }
}
