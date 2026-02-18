FROM node:18-alpine

# 1. Install System Dependencies
# - mariadb-client: REQUIRED. It provides the 'mysql' command for sync_users.sh
# - We REMOVED python3, pip, and venv since all games are now Node.js
RUN apk add --no-cache mariadb-client

WORKDIR /app

# 2. Copy the Game Logic
COPY server.js .
COPY challenges/ ./challenges/

# 3. Copy the Scripts
COPY sync_users.sh .
COPY start.sh .

# Create an empty valid_users.txt just in case it doesn't exist yet
# (Prevents crash if the file is missing on first run)
RUN touch valid_users.txt

# 4. Permissions (Make scripts executable)
RUN chmod +x sync_users.sh start.sh

# 5. Expose Ports
# 1337 = Main Game Server
# 300x = Netcat Ports
# 367x = Web Challenge Ports
EXPOSE 2001 2671 2002 2672 2003 2673 2004 2674 2005 2675 2006 2676 3001 3671 3002 3672 3003 3673 3004 3674 3005 3675 3006 3676 4001 4671 4002 4672 4003 4673 4005 4675 5001 5671 5003 5673 5004 5674 5005 5675 6001 6671 6003 6673 6004 6674 6005 6675 7001 7671 7002 7003 7673 7004 7005

# 6. Run the wrapper script
CMD ["./start.sh"]
