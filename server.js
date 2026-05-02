/* eslint-disable @typescript-eslint/no-require-imports */
const { createServer } = require('http');
const next = require('next');

const port = parseInt(process.env.PORT || '3000', 10);
const app = next({ dev: false, port });
const handle = app.getRequestHandler();

let requestCount = 0;

app.prepare().then(() => {
  const server = createServer((req, res) => {
    requestCount++;
    if (requestCount % 10 === 0) {
      const mem = process.memoryUsage();
      console.log(`Request #${requestCount} RSS: ${Math.round(mem.rss/1024/1024)}MB heap: ${Math.round(mem.heapUsed/1024/1024)}MB`);
    }
    handle(req, res);
  });

  server.on('error', (err) => {
    console.error('Server error:', err);
  });

  server.listen(port, () => {
    console.log(`> LeadProspect server running on http://localhost:${port}`);
  });
}).catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});

process.on('SIGTERM', () => { console.log('SIGTERM received'); process.exit(0); });
process.on('SIGINT', () => { console.log('SIGINT received'); process.exit(0); });
process.on('uncaughtException', (err) => { console.error('Uncaught:', err); });
process.on('unhandledRejection', (err) => { console.error('Unhandled rejection:', err); });
