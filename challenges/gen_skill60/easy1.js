const http = require('http');

module.exports = {
    id: "dea_cipher",
    name: "The DEA Cipher Case",
    port: 6001,      // Netcat Port
    webPort: 6671,   // Web Port (Hosts the "Evidence" file)
    flag: "HEISENBERG{b45e64_15_n0t_3ncrypt10n_y0}",

    // Server instance
    httpServer: null,

    start: (socket, onWin) => {
        
        // === SINGLETON PATTERN (Web Server) ===
        if (!module.exports.httpServer) {
            
            console.log(`[WEB] Starting DEA Evidence Server on ${module.exports.webPort}`);

            module.exports.httpServer = http.createServer((req, res) => {
                // 1. The Evidence "File"
                if (req.url === '/evidence_report.txt') {
                    res.writeHead(200, { 'Content-Type': 'text/plain' });
                    // Base64 encoded version of the flag
                    const encodedFlag = Buffer.from(module.exports.flag).toString('base64');
                    res.end(`DEA CASE FILE: #0982-BLUE\nOFFICER: HANK SCHRADER\n\nRecovered Ciphertext: ${encodedFlag}\n\nNotes: This looks like standard transport encoding. Use a decoder.`);
                    return;
                }

                // 2. Default Page
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end("<h1>DEA Evidence Database</h1><p>Restricted Access.</p><ul><li><a href='/evidence_report.txt'>evidence_report.txt</a></li></ul>");
            });

            module.exports.httpServer.listen(module.exports.webPort, '0.0.0.0', () => {
                console.log(`[WEB] File Server active on port ${module.exports.webPort}`);
            });

            module.exports.httpServer.on('error', (err) => {
                console.error(`[WEB ERR] Server error: ${err.message}`);
            });
        }

        // === USER INTERFACE (Netcat) ===
        socket.write("=== DEA CASE FILE ACCESS ===\n");
        socket.write("[+] STATUS: Connection established via DEA backdoor.\n");
        socket.write("[+] INTEL: Hank Schrader left an evidence file on the local server.\n");
        socket.write(`[+] ACCESS: http://cookcrackcapture.in:${module.exports.webPort}/evidence_report.txt\n`);
        socket.write("[+] MISSION: Decode the recovered text to find the secret passphrase.\n");
        socket.write("Enter the Passphrase: ");

        return (input) => {
            if (input.trim() === module.exports.flag) {
                socket.write("\n[+] Identification confirmed. Welcome back, ASAC Schrader.\n");
                onWin();
                socket.destroy();
            } else {
                socket.write("\n[-] Access Denied. The DEA has logged your IP.\n");
                socket.write("Try again: ")
            }
        };
    }
};
