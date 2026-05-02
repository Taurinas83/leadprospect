#!/bin/bash
cd /home/z/my-project

# Trap all signals
trap 'echo "TRAPPED SIGNAL at $(date)" >> /tmp/server-death.log' SIGHUP SIGINT SIGTERM SIGKILL

echo "Starting at $(date)" >> /tmp/server-death.log
echo "PID: $$" >> /tmp/server-death.log

# Run node with full error output
node server.js >> /tmp/server-stdout.log 2>> /tmp/server-stderr.log
EXIT_CODE=$?

echo "EXIT CODE: $EXIT_CODE at $(date)" >> /tmp/server-death.log
echo "---STDERR---" >> /tmp/server-death.log
cat /tmp/server-stderr.log >> /tmp/server-death.log
echo "---STDOUT---" >> /tmp/server-death.log
cat /tmp/server-stdout.log >> /tmp/server-death.log
