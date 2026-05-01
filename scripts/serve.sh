#!/bin/bash
# Auto-restart wrapper for Next.js production server
# Keeps the server alive even if it crashes under memory pressure

cd /home/z/my-project

# Build first if needed
if [ ! -f .next/BUILD_ID ]; then
  echo "Building Next.js production bundle..."
  npx next build
fi

MAX_RETRIES=0
RETRY_COUNT=0

while [ $MAX_RETRIES -eq 0 ] || [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  echo "Starting Next.js production server (attempt $((RETRY_COUNT + 1)))..."
  npx next start -p 3000
  
  EXIT_CODE=$?
  echo "Server exited with code $EXIT_CODE"
  
  RETRY_COUNT=$((RETRY_COUNT + 1))
  
  # Wait before restarting
  sleep 3
done
