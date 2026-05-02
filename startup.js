/**
 * Startup script for LeadProspect
 * Handles database initialization and server startup
 * Works in both local sandbox and Z.ai cloud environments
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ensure db directory exists
const dbDir = path.join(__dirname, 'db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log('> Created db directory');
}

// Ensure Prisma client is generated
try {
  console.log('> Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit', cwd: __dirname });
} catch (e) {
  console.log('> Prisma generate failed, trying alternate...');
  try {
    execSync('bunx prisma generate', { stdio: 'inherit', cwd: __dirname });
  } catch (e2) {
    console.error('> Failed to generate Prisma client');
  }
}

// Push database schema (creates tables if they don't exist)
try {
  console.log('> Setting up database...');
  execSync('npx prisma db push --skip-generate', { stdio: 'inherit', cwd: __dirname });
  console.log('> Database ready');
} catch (e) {
  console.log('> Prisma db push failed with npx, trying bunx...');
  try {
    execSync('bunx prisma db push --skip-generate', { stdio: 'inherit', cwd: __dirname });
    console.log('> Database ready');
  } catch (e2) {
    console.error('> WARNING: Database setup failed. Tables may already exist.');
  }
}

// Seed initial manager user if no users exist
try {
  console.log('> Checking if seed is needed...');
  const { PrismaClient } = require('@prisma/client');
  const { hash } = require('bcryptjs');
  const prisma = new PrismaClient();

  async function seedIfNeeded() {
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      console.log('> No users found, seeding initial manager...');
      const hashedPassword = await hash('gestor123', 10);
      await prisma.user.create({
        data: {
          name: 'Administrador',
          email: 'admin@leadprospect.com',
          password: hashedPassword,
          role: 'manager',
          active: true,
        },
      });
      console.log('> Initial manager created: admin@leadprospect.com / gestor123');
      console.log('> ⚠️  IMPORTANT: Change this password after first login!');
    } else {
      console.log(`> Database has ${userCount} user(s), skipping seed`);
    }
    await prisma.$disconnect();
  }

  seedIfNeeded().catch((e) => {
    console.error('> Seed check failed:', e.message);
  });
} catch (e) {
  console.log('> Could not check/seed database, will try on first request');
}

// Start the Next.js server
const port = process.env.PORT || '3000';
console.log(`> Starting LeadProspect on port ${port}...`);

// Use next start for standard deployment
const server = spawn('npx', ['next', 'start', '-p', port], {
  cwd: __dirname,
  stdio: 'inherit',
  env: { ...process.env },
});

server.on('error', (err) => {
  console.error('> Failed to start server:', err);
  process.exit(1);
});

server.on('exit', (code) => {
  console.log(`> Server exited with code ${code}`);
  process.exit(code || 0);
});

process.on('SIGTERM', () => {
  console.log('> SIGTERM received, shutting down...');
  server.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('> SIGINT received, shutting down...');
  server.kill('SIGINT');
});
