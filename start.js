/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Production start script for Z.ai Cloud deployment.
 * Sets up environment, then delegates to Next.js built-in server.
 */

const { execSync } = require('child_process');
const { existsSync, mkdirSync } = require('fs');
const { join } = require('path');

// Ensure DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./db/custom.db';
  console.log('[Start] Set DATABASE_URL=fallback');
}

// Ensure SESSION_SECRET is set
if (!process.env.SESSION_SECRET && !process.env.NEXTAUTH_SECRET) {
  process.env.SESSION_SECRET = 'leadprospect-secret-key-prod';
  console.log('[Start] Set SESSION_SECRET=fallback');
}

// Ensure db directory exists
const dbDir = join(process.cwd(), 'db');
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
  console.log('[Start] Created db directory');
}

// Ensure Prisma client is generated
try {
  const prismaClientPath = join(process.cwd(), 'node_modules', '.prisma', 'client');
  if (!existsSync(prismaClientPath)) {
    console.log('[Start] Generating Prisma client...');
    execSync('npx prisma generate', { stdio: 'pipe', cwd: process.cwd() });
  }
} catch (e) {
  console.warn('[Start] Prisma generate warning:', e.message);
}

// Push schema if database doesn't exist yet
try {
  const dbPath = join(process.cwd(), 'db', 'custom.db');
  if (!existsSync(dbPath)) {
    console.log('[Start] Initializing database schema...');
    execSync('npx prisma db push --skip-generate', { stdio: 'pipe', cwd: process.cwd() });
  }
} catch (e) {
  console.warn('[Start] DB push warning - will auto-create on first request');
}

// Now start Next.js using the built-in server
const port = process.env.PORT || '3000';
const hostname = '0.0.0.0';

console.log(`[Start] Starting Next.js on ${hostname}:${port}...`);

try {
  execSync(`npx next start -H ${hostname} -p ${port}`, {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: { ...process.env },
  });
} catch (e) {
  console.error('[Start] Next.js exited with error:', e.message);
  process.exit(1);
}
