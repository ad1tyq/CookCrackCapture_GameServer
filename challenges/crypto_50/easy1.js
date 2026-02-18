const http = require('http');

module.exports = {
    id: "secret_menu",
    name: "The Manager's Secret Menu",
    port: 5001,      // Netcat Port
    webPort: 5671,   // Web Port (Hosts the Ciphertext file)
    flag: "HEISENBERG{v4cuum_v3nt1l4t10n_p57111uxtP}",

    // We store the server instance here
    httpServer: null,

    start: (socket, onWin) => {
        
        // === SINGLETON PATTERN (Web Server) ===
        if (!module.exports.httpServer) {
            
            console.log(`[WEB] Starting Pollos Secret Server on ${module.exports.webPort}`);

            module.exports.httpServer = http.createServer((req, res) => {
                // 1. The Encoded Recipe File
                if (req.url === '/recipe.txt') {
                    res.writeHead(200, { 'Content-Type': 'text/plain' });
                    // This is the Double-Base64 + ROT-10 encoded version of the flag
                    res.end("Wm01S1NWRXlkM0p0WVhSbFgzWmxiblJpYkdGMGFXOXVJanRhZno1eGZ6MXpYemR6TVRFeFpXNWhhdz09");
                    return;
                }

                // 2. Default Page
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end("<h1>Los Pollos Hermanos - Management Portal</h1><p>Welcome, Manager. Check the daily specials below.</p><ul><li><a href='/recipe.txt'>Daily Special (Internal Code)</a></li></ul>");
            });

            module.exports.httpServer.listen(module.exports.webPort, '0.0.0.0', () => {
                console.log(`[WEB] Secret Menu Server active on port ${module.exports.webPort}`);
            });

            module.exports.httpServer.on('error', (err) => {
                console.error(`[WEB ERR] Server error: ${err.message}`);
            });
        }

        // === USER INTERFACE (Netcat) ===
        socket.write("=== THE MANAGER'S SECRET MENU ===\n");
        socket.write("[+] MSG: Yo, I found this encoded recipe in a bucket of fry batter.\n");
        socket.write("[+] HINT: Gus loves 'Neon' (Atomic Number 10) for lighting up his lab.\n");
        socket.write(`[+] ACCESS: http://cookcrackcapture.in:${module.exports.webPort}/recipe.txt\n`);
        socket.write("[+] MISSION: Peel back the layers of flavoring to find the real meaning.\n");
        socket.write("Enter the Plaintext Recipe (Flag): ");

        return (input) => {
            if (input.trim() === module.exports.flag) {
                socket.write("\n[+] Identification confirmed. The batch is ready for distribution.\n");
                onWin();
                socket.destroy();
            } else {
                socket.write("\n[-] Access Denied. Victor is tracking your signal.\n");
                socket.write("Try again: ")
            }
        };
    }
};
