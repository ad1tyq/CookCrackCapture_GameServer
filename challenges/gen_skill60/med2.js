const http = require('http');
const fs = require('fs');
const path = require('path');

module.exports = {
    id: "madrigal_mole",
    name: "The Madrigal Mole",
    port: 6004,      // Netcat Port (Admin Panel)
    webPort: 6674,   // Web Port (Hosts the Malware)
    flag: "HEISENBERG{y0u_4r3_th3_d4ng3r_n0t_th3_m4lw4r3}",

    // Store server instance
    httpServer: null,

    start: (socket, onWin) => {
        
        // === 1. WEB SERVER (Serves the Malware) ===
        if (!module.exports.httpServer) {
            console.log(`[WEB] Starting Madrigal Mole Server on ${module.exports.webPort}`);
            
            module.exports.httpServer = http.createServer((req, res) => {
                // Serve the suspicious file
                // MAKE SURE YOU PUT 'inventory_calc.exe' IN THE SAME FOLDER OR ADJUST PATH
                if (req.url === '/inventory_calc.exe') {
                    const filePath = path.join(__dirname, 'inventory_calc.exe');
                    if (fs.existsSync(filePath)) {
                        res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
                        fs.createReadStream(filePath).pipe(res);
                    } else {
                        // Fallback if file missing (for testing)
                        res.writeHead(404);
                        res.end("Error: inventory_calc.exe not found on server.");
                    }
                    return;
                }

                // Default Landing Page
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(`
                    <body style="background-color:#1a1a1a; color:#00ff00; font-family:monospace; padding:50px;">
                        <h1>Madrigal Electromotive Security</h1>
                        <hr>
                        <p>WARNING: Unauthorized device detected.</p>
                        <p>Security Scanner: <span style="color:red">ACTIVE</span></p>
                        <p>Suspicious File Quarantined: <a href="/inventory_calc.exe" style="color:yellow">inventory_calc.exe</a></p>
                    </body>
                `);
            });

            module.exports.httpServer.listen(module.exports.webPort, '0.0.0.0', () => {
                console.log(`[WEB] Mole Server active on port ${module.exports.webPort}`);
            });
            
            module.exports.httpServer.on('error', (err) => console.log(`[WEB ERR] ${err.message}`));
        }

        // === 2. NETCAT INTERFACE (The YARA Tester) ===
        socket.write("=== MADRIGAL SECURITY WHITELIST ===\n");
        socket.write("[+] SYSTEM: Pollos Guard Antivirus (v4.2)\n");
        socket.write("[+] STATUS: Waiting for whitelist signature update.\n");
        socket.write(`[+] SAMPLE: http://cookcrackcapture.in:${module.exports.webPort}/inventory_calc.exe\n`);
        socket.write("\n[INSTRUCTION] Paste your YARA rule below to verify it against the malware.\n");
        socket.write("[WARNING] Rules flagging 'UPX' or generic headers will be rejected.\n");
        socket.write("Input Rule (End with a single dot '.' on a new line, or just paste one line):\n");

        // Buffer to store multi-line input
        let ruleBuffer = "";

        return (input) => {
            // Check for termination char to process multi-line rules
            if (input.trim() === ".") {
                processRule(ruleBuffer);
                ruleBuffer = ""; // Reset
                return;
            }
            
            // Accumulate input
            ruleBuffer += input + "\n";
            
            // If the input looks complete (simple heuristic for one-liners), process immediately
            if (input.includes("rule") && input.includes("condition") && input.includes("}")) {
                processRule(input);
                ruleBuffer = "";
            }

            function processRule(yaraRule) {
                const rule = yaraRule.toString();
                
                console.log(`[MOLE] Testing Rule from ${socket.remoteAddress}`);

                // --- THE "MOCK" YARA ENGINE (Anti-LLM Logic) ---
                
                // 1. Syntax Check
                if (!rule.includes("rule") || !rule.includes("condition")) {
                    socket.write("\n[-] SYNTAX ERROR: Not a valid YARA rule structure.\n");
                    return;
                }

                // 2. The "Trap" (Reject Generics/Packers)
                // LLMs love using "UPX", "KERNEL32", "IsDebuggerPresent"
                const forbidden = ["UPX", "KERNEL32", "IsDebuggerPresent", "ExitProcess", "VirtualProtect"];
                const hitForbidden = forbidden.find(w => rule.includes(w) || rule.includes(w.toLowerCase()));
                
                if (hitForbidden) {
                    socket.write(`\n[!] REJECTED: Your rule flagged on '${hitForbidden}'.\n`);
                    socket.write("[!] Pollos Guard flagged this as a false positive (it matches legitimate system files).\n");
                    socket.write("[!] Be more specific. Dig deeper into the binary strings.\n");
                    return;
                }

                // 3. The "Key" (Require Specifics)
                // The user must find at least one of these unique strings in the binary
                // "Toaler" is a typo in the binary strings. "SolidBrush" is a specific GDI+ call.
                const required = ["Toaler", "Backdoor", "SolidBrush", "Madrigal", "Inventory"];
                const hitRequired = required.find(w => rule.includes(w));

                if (hitRequired) {
                    socket.write("\n[+] SUCCESS: Signature accepted.\n");
                    socket.write("[+] The rule surgically identified the tracker without false positives.\n");
                    socket.write(`[+] FLAG: ${module.exports.flag}\n`);
                    onWin();
                    socket.destroy();
                } else {
                    socket.write("\n[-] FAIL: Rule is too weak.\n");
                    socket.write("[-] It did not detect the specific artifacts of the Heisenberg Tracker.\n");
                    socket.write("[-] Hint: Look at the strings. There is a typo in one of the variable names.\n");
                    socket.write("[+] Try again:")
                }
            }
        };
    }
};
