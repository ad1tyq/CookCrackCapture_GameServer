# 🧪 CookCrackCapture: The Breaking Bad CTF Backend

This repository contains the backend infrastructure for the **CookCrackCapture** CTF event. It is a highly modular, containerized Node.js application designed to host multiple interactive hacking challenges over raw TCP sockets and HTTP.

## 🏗️ Architecture Overview

The system is built on a **Centralized Game Controller** architecture. Instead of running 30+ separate Docker containers (which would consume massive RAM), a single Node.js process (`server.js`) manages all game instances.

### Key Components:
1.  **`server.js` (The Brain):**
    * Loads all game modules from the `challenges/` directory.
    * Spins up a unique TCP server for each game on its designated port.
    * Handles authentication (Whitelist), rate limiting, and anti-cheat logging.
    * Manages the **Admin Watcher** system for real-time control.

2.  **`sync_users.sh` (The Bridge):**
    * A shell script running in the background.
    * Connects to the external `ctfd` database every 30 seconds.
    * Syncs valid usernames to `valid_users.txt`, allowing instant access for new registrants without restarting the server.

3.  **`challenges/` (The Content):**
    * Each file (e.g., `hashcrack.js`, `blue_sky.js`) is a self-contained module.
    * They export a `start()` function that defines the game logic and a `port` number.
    * This modularity allows adding new challenges just by dropping a file—no server code changes needed.

---

## 📂 File System Explained

| File / Folder | Purpose |
| :--- | :--- |
| **`Dockerfile`** | Builds the Alpine Linux image, installs `mariadb-client` (for sync), and sets up the environment. |
| **`start.sh`** | The container entrypoint. It launches `sync_users.sh` in the background and `server.js` in the foreground. |
| **`server.js`** | The main application logic. Handles networking, admin commands, and game orchestration. |
| **`sync_users.sh`** | Polls the CTFd database to keep the whitelist updated. |
| **`challenges/`** | Directory containing all game logic files (`.js`). |
| **`admin_cmd.txt`** | **Control File.** Admins write commands here to control the server (see below). |
| **`dm.txt`** | **Control File.** Writes here send Direct Messages to players. |
| **`updates.txt`** | **Control File.** Writes here broadcast announcements to all players. |
| **`banned.txt`** | List of banned IPs/Usernames. |
| **`valid_users.txt`** | Whitelist of allowed usernames (Synced automatically). |
| **`winners.txt`** | Permanent log of who solved which challenge and when. |
| **`status_dump.json`** | Output file for the `STATUS` command. |

---

## 🚀 Deployment

This system is designed to run via **Docker Compose**.

### 1. Build & Start
```bash
docker-compose up -d --build game-server
