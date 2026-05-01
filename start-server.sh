#!/bin/bash
cd /home/z/my-project
while true; do
  echo "[$(date)] Starting Next.js dev server..." >> /tmp/server-lifecycle.log
  node node_modules/next/dist/bin/next dev -p 3000 >> dev.log 2>&1
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code $EXIT_CODE" >> /tmp/server-lifecycle.log
  sleep 2
done
