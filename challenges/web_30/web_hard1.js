const http = require('http');
const querystring = require('querystring');

module.exports = {
    id: "pollos_sqli",
    name: "The Manager's Terminal",
    port: 3005,      // Netcat Port
    webPort: 3675,   // Web Port
    flag: "HEISENBERG{l05_p0ll05_53cr3t}",

    httpServer: null,

    start: (socket, onWin) => {

        // === SINGLETON WEB SERVER ===
        if (!module.exports.httpServer) {
            console.log(`[WEB] Starting Pollos DB on ${module.exports.webPort}`);

            module.exports.httpServer = http.createServer((req, res) => {
                
                // 1. Serve the Login Page (GET)
                if (req.method === 'GET') {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(`
                        <div style="font-family: monospace; background: #000; color: #0f0; padding: 20px; height: 100vh;">
                            <h1 style="color: #ffff00;">LOS POLLOS HERMANOS</h1>
                            <h2>Internal Management Terminal [v 2.4.1]</h2>
                            <p>Authorized Personnel Only (Gus Fring, Lydia Rodarte-Quayle)</p>
                            <hr style="border-color: #0f0;">
                            <form action="/login" method="POST">
                                <label>USERNAME: </label><input type="text" name="user" style="background: #333; color: #fff; border: none; padding: 5px;"><br><br>
                                <label>PASSWORD: </label><input type="password" name="pass" style="background: #333; color: #fff; border: none; padding: 5px;"><br><br>
                                <input type="submit" value="AUTHENTICATE" style="background: #0f0; color: #000; font-weight: bold; border: none; padding: 10px;">
                            </form>
                            </div>
                    `);
                    return;
                }

                // 2. Handle Login (POST)
                if (req.method === 'POST' && req.url === '/login') {
                    let body = '';
                    req.on('data', chunk => { body += chunk.toString(); });
                    req.on('end', () => {
                        const postData = querystring.parse(body);
                        const user = postData.user || '';
                        const pass = postData.pass || '';

                        // === THE VULNERABILITY SIMULATOR ===
                        // We simulate how a database interprets the injected string.
                        // Target Query: SELECT * FROM users WHERE username = '$user' AND password = '$pass'
                        
                        const REAL_PASS = "l05_p0ll05_53cr3t";
                        let isLoginSuccess = false;

                        // [Scenario 1]: Normal Login
                        if (user === 'fring_admin' && pass === REAL_PASS) {
                            isLoginSuccess = true;
                        }

                        // [Scenario 2]: SQL Injection Logic
                        // We simulate the logic: "fring_admin' AND substr(password, 1, 1) = 'l' --"
                        
                        // Step A: Check if the user closed the quote (') and started a command
                        if (user.startsWith("fring_admin'")) {
                            const payload = user.substring(12); // Get everything after 'fring_admin'

                            // Check 1: The "OR 1=1" Bypass (Basic Check)
                            if (payload.includes("OR 1=1")) {
                                isLoginSuccess = true; 
                            }
                            
                            // Check 2: The "Blind SQLi" Character Check
                            // Regex looks for: AND substr(password, X, 1) = 'Y'
                            // This supports both "substr" and "substring" syntax
                            const substrMatch = payload.match(/AND\s+subst(?:r|ring)\(password,\s*(\d+),\s*1\)\s*=\s*'([^']+)'/i);
                            
                            if (substrMatch) {
                                const index = parseInt(substrMatch[1]); // The position (1-based)
                                const char = substrMatch[2];            // The guess ('l')
                                
                                // SQL is 1-based index, JS is 0-based
                                if (REAL_PASS[index - 1] === char) {
                                    isLoginSuccess = true;
                                }
                            }

                            // Check 3: The "Length" Check (Optional helper)
                            const lenMatch = payload.match(/AND\s+length\(password\)\s*=\s*(\d+)/i);
                            if (lenMatch) {
                                if (REAL_PASS.length === parseInt(lenMatch[1])) {
                                    isLoginSuccess = true;
                                }
                            }
                        }

                        // === THE RESPONSE (Blind) ===
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        if (isLoginSuccess) {
                            // BLIND SQLi: We only tell them "Found" or "Not Found".
                            // We do NOT give the flag here. They have to extract the password char by char.
                            res.end(`<h3 style="color:green">Status: Employee Record Found.</h3><a href="/">Back</a>`);
                        } else {
                            res.end(`<h3 style="color:red">Status: No Record Matches.</h3><a href="/">Back</a>`);
                        }
                    });
                    return;
                }

                res.writeHead(404);
                res.end("Not Found");
            });

            module.exports.httpServer.listen(module.exports.webPort, '0.0.0.0', () => {
                console.log(`[WEB] Pollos DB active on port ${module.exports.webPort}`);
            });
            
            module.exports.httpServer.on('error', (err) => {
                console.error(`[WEB ERR] Server error: ${err.message}`);
            });
        }

        // === NETCAT INTERFACE ===
        socket.write("=== THE MANAGER'S TERMINAL ===\n");
        socket.write(`[+] DB PORTAL ONLINE: http://cookcrackcapture.in:${module.exports.webPort}\n`);
        socket.write("[+] MISSION: The login is vulnerable to Blind SQL Injection.\n");
        socket.write("[+] You must extract the 'fring_admin' password character by character.\n");
        socket.write("[+] HINT: ' OR username='fring_admin' AND substr(password, 1, 1) = '?' -- \n");
        socket.write("Enter Extracted Password: ");

        return (input) => {
            if (input.trim() === "l05_p0ll05_53cr3t") {
                socket.write("\n[+] ACCESS GRANTED. Coordinates downloaded.\n");
                onWin();
                socket.destroy();
            } else {
                socket.write("\n[-] Access Denied. Wrong Password.\n");
                socket.write("Try again: ")
            }
        };
    }
};
