#!/bin/bash
cd /home/z/my-project
while true; do
  echo "[$(date)] Starting server..." >> /tmp/watchdog.log
  node -e "
    process.on('exit', (code) => {
      console.error('PROCESS EXITING with code:', code);
    });
    process.on('uncaughtException', (err) => {
      console.error('UNCAUGHT EXCEPTION:', err);
    });
    process.on('unhandledRejection', (err) => {
      console.error('UNHANDLED REJECTION:', err);
    });
    process.on('SIGTERM', () => {
      console.error('RECEIVED SIGTERM');
      process.exit(15);
    });
    process.on('SIGINT', () => {
      console.error('RECEIVED SIGINT');
      process.exit(2);
    });
    process.on('SIGHUP', () => {
      console.error('RECEIVED SIGHUP');
    });
    
    const { createServer } = require('http');
    const next = require('next');
    const app = next({ dev: false, port: 3000 });
    const handle = app.getRequestHandler();
    
    app.prepare().then(() => {
      const server = createServer((req, res) => handle(req, res));
      server.on('error', (err) => console.error('SERVER ERROR:', err));
      server.listen(3000, () => console.log('Server ready on 3000'));
    }).catch(err => {
      console.error('PREPARE ERROR:', err);
      process.exit(1);
    });
  " >> /tmp/watchdog.log 2>&1
  
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code: $EXIT_CODE" >> /tmp/watchdog.log
  echo "Restarting in 2 seconds..." >> /tmp/watchdog.log
  sleep 2
done
