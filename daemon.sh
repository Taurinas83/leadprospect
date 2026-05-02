#!/bin/bash
cd /home/z/my-project
exec node server.js >> /home/z/my-project/server.log 2>&1
