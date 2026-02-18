#!/bin/sh

# 1. Start the Sync Script in the BACKGROUND (&)
./sync_users.sh &

# 2. Start the Node Server in the FOREGROUND
# (If this stops, the container stops)
node server.js
