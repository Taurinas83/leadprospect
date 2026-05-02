#!/bin/bash
cd /home/z/my-project
while true; do
  echo "Starting server at $(date)"
  node server.js 2>&1
  EXIT_CODE=$?
  echo "Server exited with code $EXIT_CODE at $(date)"
  echo "Restarting in 2 seconds..."
  sleep 2
done
