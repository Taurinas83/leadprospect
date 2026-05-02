/* eslint-disable @typescript-eslint/no-require-imports */
const { createServer } = require('http');
const { existsSync, mkdirSync } = require('fs');
const { join } = require('path');
const { execSync } = require('child_process');

// Ensure db directory exists for SQLite
const dbDir = join(__dirname, 'db');
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
  console.log('[Startup] Created db directory');
}

// Ensure Prisma client is generated
try {
  const prismaClientPath = join(__dirname, 'node_modules', '.prisma', 'client');
  if (!existsSync(prismaClientPath)) {
    console.log('[Startup] Generating Prisma client...');
    execSync('npx prisma generate', { stdio: 'inherit', cwd: __dirname });
  }
} catch (err) {
  console.warn('[Startup] Prisma generate warning:', err.message);
  // Continue anyway - it might already be generated
}

// Try to push schema if db file doesn't exist yet
try {
  const dbPath = join(__dirname, 'db', 'custom.db');
  if (!existsSync(dbPath)) {
    console.log('[Startup] Pushing database schema...');
    execSync('npx prisma db push --skip-generate', { stdio: 'inherit', cwd: __dirname });
    console.log('[Startup] Database schema pushed successfully');
  }
} catch (err) {
  console.warn('[Startup] Prisma db push warning:', err.message);
  // Continue anyway - ensureDbInitialized() in the app will create tables via raw SQL
}

const port = parseInt(process.env.PORT || '3000', 10);
const hostname = '0.0.0.0';

console.log(`[Startup] Starting LeadProspect on ${hostname}:${port}...`);

const next = require('next');
const app = next({ dev: false, hostname, port });
const handle = app.getRequestHandler();

let requestCount = 0;

app.prepare().then(() => {
  const server = createServer((req, res) => {
    requestCount++;
    if (requestCount === 1) {
      console.log('[Server] First request received - server is working!');
    }
    if (requestCount % 50 === 0) {
      const mem = process.memoryUsage();
      console.log(`[Server] Request #${requestCount} RSS: ${Math.round(mem.rss/1024/1024)}MB heap: ${Math.round(mem.heapUsed/1024/1024)}MB`);
    }
    handle(req, res);
  });

  server.on('error', (err) => {
    console.error('[Server] Server error:', err);
  });

  server.listen(port, hostname, () => {
    console.log(`[Server] ✅ LeadProspect running at http://${hostname}:${port}`);
    console.log(`[Server] Environment: production`);
    console.log(`[Server] Database: ${process.env.DATABASE_URL || 'file:./db/custom.db'}`);
  });
}).catch((err) => {
  console.error('[Server] Failed to start Next.js:', err);
  process.exit(1);
});

process.on('SIGTERM', () => { console.log('[Server] SIGTERM received, shutting down'); process.exit(0); });
process.on('SIGINT', () => { console.log('[Server] SIGINT received, shutting down'); process.exit(0); });
process.on('uncaughtException', (err) => { console.error('[Server] Uncaught exception:', err); });
process.on('unhandledRejection', (err) => { console.error('[Server] Unhandled rejection:', err); });
