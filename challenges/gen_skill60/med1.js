const http = require('http');

module.exports = {
    id: "belize_transfer",
    name: "The Belize Transfer",
    port: 6003,      // Netcat Port
    webPort: 6673,   // Web Port (Hosts the "Offshore Key")
    flag: "HEISENBERG{53nd_h1m_t0_b3l1z3_8822}",

    // Server instance
    httpServer: null,

    start: (socket, onWin) => {
        
        // === SINGLETON PATTERN (Web Server) ===
        if (!module.exports.httpServer) {
            
            console.log(`[WEB] Starting Offshore Banking Server on ${module.exports.webPort}`);

            module.exports.httpServer = http.createServer((req, res) => {
                // 1. The "Offshore Key"
                if (req.url === '/offshore.key') {
                    res.writeHead(200, { 'Content-Type': 'text/plain' });
                    res.end("OFFSHORE ROTATION KEY: 13\n(Everything moves by 13 steps in the sun)");
                    return;
                }

                // 2. Default Page
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end("<h1>Saul Goodman & Associates</h1><p>International Transfers</p><ul><li><a href='/offshore.key'>offshore.key</a></li></ul>");
            });

            module.exports.httpServer.listen(module.exports.webPort, '0.0.0.0', () => {
                console.log(`[WEB] File Server active on port ${module.exports.webPort}`);
            });
        }

        // === CHALLENGE LOGIC ===
        socket.write("=== SAUL GOODMAN'S OFFSHORE TERMINAL ===\n");
        socket.write("[+] Saul: 'Someone's going on a trip to Belize, and we need to authorize the transfer.'\n");
        socket.write(`[+] Saul: 'Check the offshore key here: http://cookcrackcapture.in:${module.exports.webPort}/offshore.key'\n\n`);

        // Rotate the flag using ROT13 for the stream
        const rot13 = (str) => {
            return str.replace(/[a-zA-Z]/g, (c) => {
                return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
            });
        };

        const scrambledFlag = rot13(module.exports.flag);

        socket.write("[+] INCOMING ENCRYPTED STREAM:\n");
        socket.write("------------------------------------\n");
        socket.write(scrambledFlag + "\n");
        socket.write("------------------------------------\n\n");
        socket.write("Enter the authorized plaintext to send them to Belize: ");

        return (input) => {
            if (input.trim() === module.exports.flag) {
                socket.write("\n[+] Saul: 'It's done. They're enjoying the Belizean sun now.'\n");
                onWin();
                socket.destroy();
            } else {
                socket.write("\n[-] Saul: 'That's not the right code! The DEA is listening!'\n");
                socket.write("Try again: ")
            }
        };
    }
};
