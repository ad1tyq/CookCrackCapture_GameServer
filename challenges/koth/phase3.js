const http = require('http');
const crypto = require('crypto');

// === CONFIGURATION (Top-level constants for reliability) ===
const ADMIN_PASS = "blueskymethylamine";
const JWT_SECRET = "Methylamine";
const FLAG = "GALE_BOETTICHER_1307";
const WEB_PORT = 7673;

module.exports = {
    id: "superlab_api",
    name: "Phase 3: The Superlab API",
    port: 7003,      // Netcat Port (CLI)
    webPort: WEB_PORT,
    flag: FLAG,
    
    // Store server instance
    httpServer: null,

    // === JWT HELPER FUNCTIONS ===
    jwt: {
        base64UrlEncode: (str) => {
            return Buffer.from(str).toString('base64')
                .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
        },
        base64UrlDecode: (str) => {
            str = str.replace(/-/g, '+').replace(/_/g, '/');
            while (str.length % 4) str += '=';
            return Buffer.from(str, 'base64').toString();
        },
        sign: (payload, secret) => {
            const header = { alg: 'HS256', typ: 'JWT' };
            const h = module.exports.jwt.base64UrlEncode(JSON.stringify(header));
            const p = module.exports.jwt.base64UrlEncode(JSON.stringify(payload));
            const signature = crypto.createHmac('sha256', secret)
                .update(`${h}.${p}`)
                .digest('base64')
                .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
            return `${h}.${p}.${signature}`;
        },
        verify: (token, secret) => {
            try {
                const [h, p, s] = token.split('.');
                if (!h || !p || !s) return null;
                const signature = crypto.createHmac('sha256', secret)
                    .update(`${h}.${p}`)
                    .digest('base64')
                    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
                if (signature !== s) return null;
                return JSON.parse(module.exports.jwt.base64UrlDecode(p));
            } catch (e) { return null; }
        }
    },

    start: (socket, onWin) => {
        
        // === 1. INTERNAL WEB SERVER (The API) ===
        if (!module.exports.httpServer) {
            console.log(`[WEB] Starting Superlab API on ${WEB_PORT}`);
            
            module.exports.httpServer = http.createServer((req, res) => {
                // Helper to send JSON
                const sendJSON = (status, data) => {
                    res.writeHead(status, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(data));
                };

                // Helper to read body
                const readBody = (callback) => {
                    let body = '';
                    req.on('data', chunk => body += chunk.toString());
                    req.on('end', () => {
                        try { callback(JSON.parse(body)); } 
                        catch (e) { sendJSON(400, { error: "Invalid JSON" }); }
                    });
                };

                // === ROUTES ===
                
                // 1. Login
                if (req.method === 'POST' && req.url === '/api/auth/login') {
                    readBody((data) => {
                        // Check against the constant ADMIN_PASS
                        if (data.username === 'admin' && data.password === ADMIN_PASS) {
                            const token = module.exports.jwt.sign(
                                { user: 'admin', role: 'manager', iat: Math.floor(Date.now()/1000) }, 
                                JWT_SECRET
                            );
                            sendJSON(200, { 
                                success: true, 
                                token: token,
                                role: 'manager', 
                                hint: "Role 'manager' is insufficient for superlab access." 
                            });
                        } else {
                            sendJSON(401, { error: "Invalid credentials" });
                        }
                    });
                    return;
                }

                // 2. Public Info
                if (req.method === 'GET' && req.url === '/') {
                    sendJSON(200, { api: "Madrigal Electromotive Inventory System", version: "3.1.4" });
                    return;
                }

                // 3. Precursors (Hint for Secret)
                if (req.method === 'GET' && req.url === '/api/chemicals/precursors') {
                    sendJSON(200, { 
                        chemicals: ["Phenylacetic Acid", "Methylamine", "Aluminum Amalgam", "Caustic Soda"],
                        note: "Restricted Access. Shipment tracking active."
                    });
                    return;
                }

                // 4. Debug (Hint for Vulnerability)
                if (req.method === 'GET' && req.url === '/api/debug/jwt') {
                    sendJSON(200, { 
                        debug: true, 
                        hint: "The secret key is a chemical name found in the precursors list.",
                        algorithm: "HS256"
                    });
                    return;
                }

                // 5. Chemicals List
                if (req.method === 'GET' && req.url === '/api/chemicals') {
                    const authHeader = req.headers['authorization'];
                    const token = authHeader && authHeader.split(' ')[1];
                    const decoded = module.exports.jwt.verify(token, JWT_SECRET);
                    
                    if (!decoded) {
                        sendJSON(401, { error: "Invalid Token" });
                        return;
                    }
                    sendJSON(200, { chemicals: ["Acetone", "Toluene", "Hydrochloric Acid", "Hydrogen Peroxide"] });
                    return;
                }

                // 6. THE SECRET (Win Condition)
                if (req.method === 'GET' && req.url === '/api/inventory/secret') {
                    const authHeader = req.headers['authorization'];
                    const token = authHeader && authHeader.split(' ')[1];
                    
                    // Verify signature
                    const decoded = module.exports.jwt.verify(token, JWT_SECRET);
                    
                    if (!decoded) {
                        sendJSON(401, { error: "Invalid Token Signature. Don't try to fool Gus." });
                        return;
                    }

                    // Check Role
                    if (decoded.role === 'superlab') {
                        sendJSON(200, { 
                            status: "ACCESS GRANTED", 
                            inventory: "Golden Moth Chemical - Barrel 804",
                            phase4_hint: FLAG
                        });
                    } else {
                        sendJSON(403, { 
                            error: "Access Denied", 
                            message: `Role '${decoded.role}' is not authorized. Requires 'superlab' clearance.` 
                        });
                    }
                    return;
                }

                sendJSON(404, { error: "Not Found" });
            });

            module.exports.httpServer.listen(WEB_PORT, '0.0.0.0', () => {
                console.log(`[WEB] API Server active on port ${WEB_PORT}`);
            });
        }

        // === 2. NETCAT INTERFACE (The Player Client) ===
        
        let currentToken = null;
        let hintsUsed = 0;

        // --- HTTP Helper for the Socket ---
        const apiRequest = (method, path, body, callback) => {
            const options = {
                hostname: '139.59.7.11',
                port: WEB_PORT,
                path: path,
                method: method,
                headers: { 'Content-Type': 'application/json' }
            };
            
            if (currentToken) options.headers['Authorization'] = `Bearer ${currentToken}`;

            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try { callback(JSON.parse(data), res.statusCode); }
                    catch (e) { callback({ error: "Parse Error" }, 500); }
                });
            });
            
            req.on('error', (e) => callback({ error: "Connection Failed" }, 500));
            if (body) req.write(JSON.stringify(body));
            req.end();
        };

        // --- HELPER: Banner ---
        const showBanner = () => {
            socket.write("\n╔════════════════════════════════════════════════════════════╗\n");
            socket.write("║      PHASE 3: THE SUPERLAB API 🧪                          ║\n");
            socket.write("╚════════════════════════════════════════════════════════════╝\n");
            socket.write("\n  You have the admin password. But you need 'superlab' access.\n");
            socket.write("  The API uses JWT tokens. Can you forge one?\n");
            socket.write("  Target: localhost:3000 (Simulated internally)\n");
            socket.write("═══════════════════════════════════════════════════════════════\n");
            socket.write("                          📖 THE STORY\n");
            socket.write("═══════════════════════════════════════════════════════════════\n");
            socket.write("\n");
            socket.write("  You've decoded Gus Fring's cipher and obtained the admin\n");
            socket.write("  password for Madrigal Electromotive's chemical tracking API.\n");
            socket.write("\n");
            socket.write("  But 'admin' access isn't enough - the really valuable data\n");
            socket.write("  requires 'superlab' clearance. The JWT tokens seem weak...\n");
            socket.write("\n");
            socket.write("  \"I hide in plain sight.\" - Gustavo Fring\n");
            socket.write("\n");
            socket.write("═══════════════════════════════════════════════════════════════\n");
            socket.write("                        🎯 YOUR MISSION\n");
            socket.write("═══════════════════════════════════════════════════════════════\n");
            socket.write("\n");
            socket.write("  1. Login with the Phase 2 password\n");
            socket.write("  2. Analyze the JWT token you receive\n");
            socket.write("  3. Find the JWT secret (check the hints!)\n");
            socket.write("  4. Forge a token with 'superlab' role\n");
            socket.write("  5. Access the secret inventory\n");
            socket.write("\n");
            socket.write("  💡 TIP: Visit jwt.io to decode and forge JWT tokens\n");
            socket.write("\n");
            socket.write("═══════════════════════════════════════════════════════════════\n");
            socket.write("\n  Type 'help' for commands.\n\n");
            socket.write("superlab> ");
        };

        const showHelp = () => {
            socket.write("\n  login <pass>     - Login as admin (Phase 2 pass)\n");
            socket.write("  token            - Show current JWT\n");
            socket.write("  chemicals        - List chemicals (Requires login)\n");
            socket.write("  precursors       - View precursors (Hint for secret)\n");
            socket.write("  debug            - View debug info\n");
            socket.write("  secret           - Access Secret Inventory (Win Condition)\n");
            socket.write("  usetoken <jwt>   - Use a forged token\n");
            socket.write("  hint             - Get help\n");
            socket.write("  quit             - Exit\n\n");
        };

        showBanner();

        // --- INPUT HANDLER ---
        return (input) => {
            const args = input.trim().split(/\s+/);
            const cmd = args[0]?.toLowerCase();

            // Reprompt helper
            const reprompt = () => {
                const prefix = currentToken ? "superlab[auth]> " : "superlab> ";
                socket.write(prefix);
            };

            switch (cmd) {
                case 'help':
                case '?':
                    showHelp();
                    reprompt();
                    break;

                case 'info':
                    apiRequest('GET', '/', null, (data) => {
                        socket.write(`\n  ${JSON.stringify(data, null, 2)}\n\n`);
                        reprompt();
                    });
                    break;

            case 'login':
    if (args.length < 2) {
        socket.write("  [!] Usage: login <password>\n");
        reprompt();
    } else {
        // Join all arguments after 'login' as the password
        // This allows for passwords with spaces if needed
        const pass = args.slice(1).join(' ');
        
        apiRequest('POST', '/api/auth/login', { 
            username: 'admin', 
            password: pass 
        }, (data) => {
            if (data.token) {
                currentToken = data.token;
                socket.write(`\n  [✓] Login successful! Role: ${data.role}\n`);
                socket.write(`  [!] Use 'token' to see your JWT.\n\n`);
            } else {
                socket.write(`\n  [✗] ${data.error}\n\n`);
            }
            reprompt();
        });
    }
    break;

                case 'token':
                    if (!currentToken) socket.write("  [!] Not logged in.\n");
                    else socket.write(`\n  ${currentToken}\n  (Decode at jwt.io)\n\n`);
                    reprompt();
                    break;

                case 'chemicals':
                    apiRequest('GET', '/api/chemicals', null, (data) => {
                        socket.write(`\n  ${JSON.stringify(data, null, 2)}\n\n`);
                        reprompt();
                    });
                    break;

                case 'precursors':
                    apiRequest('GET', '/api/chemicals/precursors', null, (data) => {
                        socket.write(`\n  ${JSON.stringify(data, null, 2)}\n\n`);
                        reprompt();
                    });
                    break;

                case 'debug':
                    apiRequest('GET', '/api/debug/jwt', null, (data) => {
                        socket.write(`\n  ${JSON.stringify(data, null, 2)}\n\n`);
                        reprompt();
                    });
                    break;

                case 'usetoken':
                    if (args.length < 2) {
                        socket.write("  [!] Usage: usetoken <jwt_string>\n");
                    } else {
                        currentToken = args[1];
                        socket.write("  [+] Token updated! Try 'secret' now.\n");
                    }
                    reprompt();
                    break;

                case 'secret':
                    apiRequest('GET', '/api/inventory/secret', null, (data, status) => {
                        if (status === 200) {
                            socket.write("\n╔════════════════════════════════════════════════════════════╗\n");
                            socket.write("║  ✓ ACCESS GRANTED - Welcome to the Superlab!               ║\n");
                            socket.write("╚════════════════════════════════════════════════════════════╝\n");
                            socket.write(`\n  Inventory: ${data.inventory}\n`);
                            socket.write(`  FLAG: ${data.phase4_hint}\n\n`);
                            
                            onWin();
                            socket.destroy();
                            return;
                        } else {
                            socket.write(`\n  [✗] ${data.error}\n`);
                            socket.write(`  ${data.message || ''}\n\n`);
                            reprompt();
                        }
                    });
                    break;

                case 'hint':
                    hintsUsed++;
                    if (hintsUsed === 1) socket.write("\n  [HINT 1] Check 'debug' and 'precursors'. The JWT secret is a chemical name.\n\n");
                    else if (hintsUsed === 2) socket.write("\n  [HINT 2] Secret is 'Methylamine'. Forge a token at jwt.io.\n\n");
                    else if (hintsUsed === 3) socket.write("\n  [HINT 3] Set 'role' to 'superlab' in the payload.\n\n");
                    else socket.write("\n  [!] No more hints.\n\n");
                    reprompt();
                    break;

                case 'quit':
                case 'exit':
                    socket.write("\n  \"I am the one who knocks.\"\n");
                    socket.destroy();
                    return;

                default:
                    if (cmd && cmd.length > 0) {
                        socket.write(`  [!] Unknown command: ${cmd}\n`);
                        socket.write("  Try again.\n");
                    }
                    reprompt();
                    break;
            }
        };
    }
};
