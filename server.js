const net = require('net');
const fs = require('fs');
const path = require('path');

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW = 60 * 1000;
let totalSessions = 0;   // Unique ID counter (Never resets)
let activeCount = 0;
let GAME_PAUSED = false;
let MAINTENANCE_MODE = false;
const activePlayers = [];
const startTime = '6:00 PM';
const requestLog = {};
const CHALLENGE_DIR = './challenges';
const logTime = () => new Date().toLocaleTimeString("en-US", {timeZone: "Asia/Kolkata"});


// ---------------------------------------------------------------------

let validUsers = [];
try {
    if (fs.existsSync('valid_users.txt')) {
        validUsers = fs.readFileSync('valid_users.txt', 'utf8').split('\n').map(l => l.trim()).filter(l => l.length > 0);
        console.log(`[SYS] Loaded ${validUsers.length} whitelist users.`);
    } else console.log("[SYS] No whitelist found (valid_users.txt). OPEN ACCESS.");
} catch (e) { console.log("[-] Error loading users:", e.message); }

// ---------------------------------------------------------------------

// accepts both username AND ip
function isUserBanned(username, playerIP) {
    try {
        if (!fs.existsSync('banned.txt')) return false;

        const bannedList = fs.readFileSync('banned.txt', 'utf8').split('\n').map(line => line.trim()).filter(line => line.length > 0);

        return bannedList.some(banRule => {
            if (username === banRule) return true;
            // IP Match (Exact OR Partial)
            // If the ban rule is "::ffff:127.0", it will block "::ffff:127.0.0.1"
            if (playerIP && playerIP.startsWith(banRule)) return true;
            return false;
        });
    } catch (err) {
        console.log("Error reading banned.txt:", err);
        return false;
    }
}


// ---------------------------------------------------------------------

function kickAll() {
    activePlayers.forEach( (playerSocket) => {
        playerSocket.write("\n[!] Server Restarting / Kicking All Players!\n");
        playerSocket.destroy();
    });
};



// ---------------------------------------------------------------------

// --- loading games ---
const games = []; 

if (!fs.existsSync(CHALLENGE_DIR)) fs.mkdirSync(CHALLENGE_DIR);

function loadGamesRecursively(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    entries.forEach(entry => {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            // If it's a folder (e.g., "web"), go inside it!
            loadGamesRecursively(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
            // If it's a .js file, try to load it
            try {
                // use path.resolve to make sure require finds the file correctly
                const gameModule = require(path.resolve(fullPath));
                
                // Check if it's a valid game module (has an ID and Port)
                if (gameModule.id && gameModule.port) {
                    games.push(gameModule);
                    console.log(`[GAME] Loaded "${gameModule.name}" on Port ${gameModule.port}`);
                }
            } catch (err) {
                console.log(`[ERR] Failed to load ${entry.name}:`, err.message);
            }
        }
    });
}

loadGamesRecursively(CHALLENGE_DIR);


// ---------------------------------------------------------------------

// --- starting the server for each game ---
games.forEach(game => {
    const server = net.createServer(socket => handleConnection(socket, game));
    server.listen(game.port, '::', () => {
        console.log(`[!] Listening: ${game.name} (::${game.port})`);
    });
});



// ---------------------------------------------------------------------

// ------- connection handler for every game port -----------

function handleConnection(socket, game) {
    const playerIP = socket.remoteAddress;

    // == rate limiting ==
    const now = Date.now();
    if ( !requestLog[playerIP] ) requestLog[playerIP] = [];

    requestLog[playerIP] = requestLog[playerIP].filter(t => now - t < RATE_LIMIT_WINDOW);

    if (requestLog[playerIP].length >= RATE_LIMIT_MAX) {
        console.log(`[!] RATE LIMIT: Blocking ${playerIP}`);
        socket.write("[-] You are connecting too fast. Wait 60s.\n");
        socket.destroy();
        return;
    }
    requestLog[playerIP].push(now);

    // == maintenance mode ==
    if (MAINTENANCE_MODE) {
        try {
            if (!fs.existsSync('whitelist.txt')) fs.writeFileSync('whitelist.txt', '');
            
            const whitelist = fs.readFileSync('whitelist.txt', 'utf8');
            const whitelistPrefixes = whitelist.split('\n').map(line => line.trim()).filter(line => line.length > 0);
            const isWhitelist = whitelistPrefixes.some(prefix => playerIP.startsWith(prefix));
            if (!isWhitelist) {
                console.log(`[!] Blocked connection during Maintenance: ${playerIP}`);
                socket.write("[-] SERVER IN MAINTENANCE MODE.\n");
                socket.write(`[-] Event starts at ${startTime}. Please wait.\n`);
                socket.destroy();
                return; // Stoping execution here
            }
        } catch (err) {
            console.log("Whitelist error:", err);
        }
    }

    totalSessions++;
    activeCount++;
    const playerID = `Player-${totalSessions}`;

    // == socket data ==
    socket.gameData = { 
        username: null, 
        gameId: game.id,
        gameName: game.name, 
        playerID: playerID,
        status: "Lobby",
        connectTime: Date.now() 
    };
    activePlayers.push(socket);

    socket.write("Login with CTFd Username: ");
    let gameLogicHandler = null;


    // == handling player input ==
    socket.on('data', (data) => {
        if (GAME_PAUSED) {
            socket.write("[!] Server is currently PAUSED by admin. Please wait...\n");
            return; // Ignore input
        }
        /*if (MAINTENANCE_MODE) {
            socket.write("[!] Game is under maintenance. Answers are not being recorded currently.  Please wait for game to resume...\n");
            return; // Ignore input
        }*/


        if (MAINTENANCE_MODE) {
            try {
                if (!fs.existsSync('whitelist.txt')) fs.writeFileSync('whitelist.txt', '');
            
                const whitelist = fs.readFileSync('whitelist.txt', 'utf8');
                const whitelistPrefixes = whitelist.split('\n').map(line => line.trim()).filter(line => line.length > 0);
                const isWhitelist = whitelistPrefixes.some(prefix => playerIP.startsWith(prefix));
                if (!isWhitelist) {
                    console.log(`[!] Blocked connection during Maintenance: ${playerIP}`);
                    socket.write("[-] SERVER IN MAINTENANCE MODE.\n");
                    socket.write(`[-] Event starts at ${startTime}. Please wait.\n`);
                    socket.destroy();
                    return; // Stoping execution here
                }
            } catch (err) {
                console.log("Whitelist error:", err);
            }
        }



        const input = data.toString().trim();
        // ------ login ---------
        if (!socket.gameData.username){
            if (isUserBanned(input, playerIP)) {
                console.log(`[!] Banned user tried to login: "${input}" (IP: ${playerIP})`);
                socket.write("\n[-] YOUR ACCOUNT IS BANNED.\n");
                socket.write("[-] Please contact the event admin.\n");
                socket.destroy();
                return;
            }

            // checking validity of the username
            if (validUsers.length > 0 && !validUsers.includes(input)) {
                socket.write("[-] Invalid Username. Please register on CTFd.\n");
                socket.write("Try again: ");
                return;
            }
            // checking if username alr exists
            const isAlreadyPlaying = activePlayers.some(p => 
                p !== socket && !p.destroyed && p.gameData && p.gameData.username === input
            );
            if (isAlreadyPlaying) {
                socket.write(`[-] User "${input}" is already logged in!\n`);
                socket.destroy();
                return;
            }
            // login was a success
            socket.gameData.username = input;
            // ------------- USER ENTERS THE SERVER --------------
            socket.gameData.gameStartTime = Date.now();
            console.log(`[+] ${playerIP} logged in as: "${input}" in "${socket.gameData.gameName}". (Online: ${activeCount}) [${logTime()}]`);
            socket.write(`[+] Login Successful! Welcome, ${input}.\n`);
            gameLogicHandler = game.start(socket, () => {
                // onWin();
                const endTime = Date.now();
                const duration = ((endTime - socket.gameData.gameStartTime) / 1000).toFixed(2); // Seconds
                console.log(`[WIN] ${socket.gameData.username} beat ${game.name} in ${duration}s at [${logTime()}]`);
                try {
                    if(!fs.existsSync('winners.txt')) fs.writeFileSync('winners.txt', '');
                    const logLine = `[${logTime()}] USER: ${socket.gameData.username} | GAME: ${game.id} | ${duration}s\n`;
                    fs.appendFileSync('winners.txt', logLine);
                } catch(e) {}
            })
            return;
        }

        // ---------- gameplay ------------
        if (gameLogicHandler){
            gameLogicHandler(input);
        }
    });

    // to prevent crash on disconnect or something
    socket.on('error', (error) => { console.log(`Error: ${error}`); });

    socket.on('close', () =>{
        const endTime = Date.now();
        const duration = ((endTime - socket.gameData.gameStartTime) / 1000).toFixed(2); // Seconds
        activeCount--;
        const index = activePlayers.indexOf(socket);
        if (index !== -1) activePlayers.splice(index, 1); 
        // -------------- USER DISCONNECTS FROM THE SERVER -------------
        console.log(`[-] "${socket.gameData.username}" ${playerIP} after ${duration}s disconnected. (Online: ${activeCount}) [${logTime()}]`);
    });
    
}



// ---------------------------------------------------------------------

// -------- admin_cmd.txt ------------
try {
    if (!fs.existsSync('admin_cmd.txt')) fs.writeFileSync('admin_cmd.txt', '');

    fs.watchFile('admin_cmd.txt', {interval: 100}, (curr, prev) => {
        const rawCmd = fs.readFileSync('admin_cmd.txt', 'utf8').trim();
        if(!rawCmd) return; // ignores empty saves
        console.log(`[DEBUG] Raw Command Read: "${rawCmd}"`);

        // CMD format: "COMMAND ARGUMENT"
        const parts = rawCmd.split(' ');
        const cmd = parts[0].toUpperCase();
        const target = parts.length > 1 ? parts.slice(1).join(' ') : null;
        
        // -------- checking for valid users ---------
        if (cmd === 'RELOAD_USERS') {
            try {
                validUsers = fs.readFileSync('valid_users.txt', 'utf8')
                    .split('\n').map(l => l.trim()).filter(l => l.length > 0);
                console.log(`[!] Reloaded ${validUsers.length} users.`);
            } catch(e) { console.log("Reload failed"); }
        }

        // ------- KICK ------
        if (cmd === 'KICK') {
            if (target === 'ALL') {
                kickAll();
            } else if (target) {
                const playerSocket = activePlayers.find(p => 
                    !p.destroyed && p.gameData && p.gameData.username === target
                );
                if (playerSocket) {
                    playerSocket.write("\n[!] You have been kicked.\n");
                    playerSocket.destroy();
                }
            }
        }
        
        // --- BAN (ip or username) ---
        if (cmd === 'BAN' && target) {
            try {
                fs.appendFileSync('banned.txt', target + '\n');
                console.log(`[!] BANNED THIS USER: ${target}`);

                // kicking user out if online rn 
                const playerSocket = activePlayers.find(p => 
                    !p.destroyed && p.gameData && (p.gameData.username === target || p.remoteAddress && p.remoteAddress.startsWith(target))
                );
                if (playerSocket) {
                    playerSocket.write("\n[!] YOUR ACCOUNT HAS BEEN BANNED.\n");
                    playerSocket.destroy();
                }
            } catch (err) {
                console.log("Could not read banned.txt (creating it now...)");
                fs.writeFileSync('banned.txt', '');
            }
        }

        // ------- STATUS ------
        if (cmd === 'STATUS'){
            try {
                const report = activePlayers.map(socket => {
                    const ip = socket.remoteAddress || "Unknown IP";
                    const d = socket.gameData || {};
                    const duration = ((Date.now() - (d.connectTime || Date.now())) / 1000).toFixed(0);
                    
                    return {
                        user: d.username || "Identifying...",
                        game: d.gameName || "Unknown Game", 
                        status: d.status || "Active",
                        ip: ip,
                        online: `${duration}s`,
                        time: logTime()
                    };
                });
                
                fs.writeFileSync('status_dump.json', JSON.stringify(report, null, 2));
                console.log(`[+] Status dumped to status_dump.json (${activePlayers.length} players)`);
            } catch (err) {
                console.log("[-] Error generating status:", err);
            }
        }

        // ------- PAUSE ------
        if (cmd === 'PAUSE'){
            GAME_PAUSED = true;
            console.log('[!] SERVER PAUSED!');
            activePlayers.forEach(s => { if(!s.destroyed) s.write("\n[!] ADMIN PAUSED GAME.\n"); });
        }

        // ------- RESUME ------
        if (cmd === 'RESUME'){
            GAME_PAUSED = false;
            activePlayers.map(s => {
                if(!s.destroyed && s.gameData && s.gameData.username) {
                    s.write("\n[!] SERVER RESUMED!\n");
                    if (s.reprompt) s.reprompt(); 
                    else if (s.gameData.username) s.write("Enter input: ");
                }
                // s.write(`Game is now resumed. Press ENTER\n`);
            })
        }

        // ------- MAINTENANCE TOGGLE ------
        if (cmd === 'MAINTENANCE_ON') {
            MAINTENANCE_MODE = true;
            console.log('[!] MAINTENANCE MODE ENABLED. Whitelist active.');
            activePlayers.forEach(s => { if(!s.destroyed) s.write("\n[-] SERVER IN MAINTENANCE MODE. Please wait for game to resume...\n");});
        }
        if (cmd === 'MAINTENANCE_OFF') {
            MAINTENANCE_MODE = false;
            console.log('[!] MAINTENANCE MODE DISABLED. Everyone can join.');
            activePlayers.map(socket => {
                socket.write(`\n[+] Server maintenance is done and is now resumed.\n`);
                if (socket.reprompt) socket.reprompt(); 
                else if (socket.gameData.username) socket.write("Enter input: ");
            })
        }

        fs.writeFileSync('admin_cmd.txt', '');
    });
} catch (err) {
    console.log("Error setting up admin watcher", err);
}

// ---------------------------------------------------------------------
//  ------------------- dm system ----------------------

try {
    if (!fs.existsSync('dm.txt')) fs.writeFileSync('dm.txt', '');

    fs.watchFile('dm.txt', {interval: 100}, (curr, prev) => {
        const content = fs.readFileSync('dm.txt', 'utf8').trim();
        
        if (content.length > 0 && content.includes('|')) {
            
            const splitIndex = content.indexOf('|');
            const target = content.substring(0, splitIndex).trim();
            const message = content.substring(splitIndex + 1).trim();

            console.log(`[!] Attempting DM to ${target}...`);

            let found = false;
            activePlayers.forEach((socket) => {
                const isIP = socket.remoteAddress === target;
                const isUser = socket.gameData && socket.gameData.username === target;
                if (!socket.destroyed) {
                    if (isIP || isUser) {
                        socket.write(`\n\n[ADMIN DIRECT MESSAGE]: ${message}\n\n`);
                        if (socket.reprompt) socket.reprompt(); 
                        else if (socket.gameData.username) socket.write("Enter input: ");
                        console.log(`[+] DM Sent to ${socket.gameData.username || target} (${socket.remoteAddress})`);
                    }
                    found = true;
                    console.log(`[+] DM Sent to ${target}`);
                }
            });

            if (!found) console.log(`[-] Could not find player: ${target}`);
        }
        fs.writeFileSync('dm.txt', '');
    });
} catch (err) { console.log("DM watcher error", err); }



// ---------------------------------------------------------------------

// ------------ broadcasting updates to the player -----------------
try {
    if (!fs.existsSync('updates.txt')) fs.writeFileSync('updates.txt', '');
    fs.watchFile('updates.txt', {interval: 100}, (curr, prev) => {
        const update = fs.readFileSync('updates.txt', 'utf8').trim();
        if(update.length > 0) {
            console.log(`[!] Broadcasting message: ${update}`);
            activePlayers.forEach((socket) => {
                if(!socket.destroyed) {
                    socket.write(`\n\n[ANNOUNCEMENT]: ${update}\n\n`);
                    if (socket.reprompt) socket.reprompt(); 
                    else if (socket.gameData.username) socket.write("Enter input: ");
                }
            });
        }
        fs.writeFileSync('updates.txt', '');
    });
} catch (err) {
    console.log(`Error: Could not read updates.txt`);
    fs.writeFileSync('updates.txt', '');
};


// ---------------------------------------------------------------------



