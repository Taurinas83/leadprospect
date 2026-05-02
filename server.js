/* eslint-disable @typescript-eslint/no-require-imports */
const { createServer } = require('http');
const next = require('next');

const port = parseInt(process.env.PORT || '3000', 10);
const hostname = process.env.HOSTNAME || '0.0.0.0';

// Ensure DATABASE_URL is set for cloud deployments without .env
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./db/custom.db';
}

// Ensure db directory exists for SQLite
try {
  const { existsSync, mkdirSync } = require('fs');
  const { join } = require('path');
  const dbDir = join(process.cwd(), 'db');
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
    console.log('[Startup] Created db directory:', dbDir);
  }
} catch (e) {
  console.warn('[Startup] Could not create db directory:', e.message);
}

const app = next({ dev: false, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res);
  });

  server.listen(port, hostname, () => {
    console.log(`[Server] LeadProspect running at http://${hostname}:${port}`);
  });

  server.on('error', (err) => {
    console.error('[Server] Error:', err);
    process.exit(1);
  });
}).catch((err) => {
  console.error('[Server] Failed to start:', err);
  process.exit(1);
});

process.on('SIGTERM', () => { process.exit(0); });
process.on('SIGINT', () => { process.exit(0); });
process.on('uncaughtException', (err) => { console.error('[Server] Uncaught:', err); });
process.on('unhandledRejection', (err) => { console.error('[Server] Unhandled rejection:', err); });
