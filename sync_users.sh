#!/bin/sh
# (Note: changed from /bin/bash to /bin/sh for Alpine Linux)

# === CONFIGURATION ===
# Use the Container Name as the Hostname
DB_HOST="ctfd-db-1"
DB_USER="ctfd"
DB_PASS="ctfd"
DB_NAME="ctfd"
# =====================

echo "[*] Starting Auto-Sync Service (Docker Mode)..."

# Ensure temp file exists
touch current_users.txt

while true; do
    # 1. Connect to remote DB using installed mysql client
    # -h: Hostname, -N: No headers, -B: Batch
    mariadb -h $DB_HOST -u$DB_USER -p$DB_PASS $DB_NAME --skip-ssl -N -B -e "SELECT name FROM users WHERE banned=0;" > temp_users.txt
    
    # Check if mysql command succeeded
    if [ $? -eq 0 ]; then
        # 2. Compare with existing file
        if ! cmp -s temp_users.txt current_users.txt; then
            mv temp_users.txt valid_users.txt
            cp valid_users.txt current_users.txt
            COUNT=$(wc -l < valid_users.txt)
            echo "RELOAD_USERS" > admin_cmd.txt
            echo "[$(date +%T)] CHANGE DETECTED! Synced $COUNT users."
        else
            rm temp_users.txt
        fi
    else
        echo "[!] Retrying DB connection..."
    fi

    sleep 30
done
