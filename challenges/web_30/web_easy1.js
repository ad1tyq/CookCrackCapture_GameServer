const http = require('http');

module.exports = {
    id: "madrigal_web",
    name: "The Madrigal Paper Trail",
    port: 3001,
    webPort: 3671, // NEW: Port for the Website
    flag: "HEISENBERG{n0t_y0ur_4v3r4g3_r0b0t_txt}",

    // We store the server instance here
    httpServer: null,

    start: (socket, onWin) => {
        
        // === SINGLETON PATTERN (Node.js Version) ===
        // Only start the web server if it's not already running
        if (!module.exports.httpServer) {
            
            console.log(`[WEB] Starting Node.js HTTP Server on ${module.exports.webPort}`);

            module.exports.httpServer = http.createServer((req, res) => {
                // 1. The Robots.txt File
                if (req.url === '/robots.txt') {
                    res.writeHead(200, { 'Content-Type': 'text/plain' });
                    res.end("User-agent: *\nDisallow: /pollos-hidden-ventilation-0982");
                    return;
                }

                // 2. The Hidden Flag Page
                if (req.url === '/pollos-hidden-ventilation-0982') {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end("<h1>Lab Blueprints Found!</h1><p>Flag: HEISENBERG{n0t_y0ur_4v3r4g3_r0b0t_txt}</p>");
                    return;
                }

                res.writeHead(200, { 
                    'Content-Type': 'text/html',
                    'X-Madrigal-Internal': 'config_v2.php' 
                });
                res.end("<h1>Madrigal Logistics</h1><p>System Status: Online</p>");
            });

            // Listen on 0.0.0.0 (Crucial for Docker)
            module.exports.httpServer.listen(module.exports.webPort, '0.0.0.0', () => {
                console.log(`[WEB] Server active on port ${module.exports.webPort}`);
            });

            // Handle server errors (like port in use) gracefully
            module.exports.httpServer.on('error', (err) => {
                console.error(`[WEB ERR] Server error: ${err.message}`);
            });
        }

        // === USER INTERFACE (Netcat) ===
        socket.write("=== THE MADRIGAL PAPER TRAIL ===\n");
        socket.write(`[+] WEBSERVER ONLINE: http://cookcrackcapture.in:${module.exports.webPort}\n`);
        socket.write("[+] Find the flag on the website and paste it here.\n");
        socket.write("Enter Flag: ");

        return (input) => {
            if (input.trim() === module.exports.flag) {
                socket.write("\n[+] Correct! Do the same in the website also.\n");
                onWin();
                socket.destroy();
            } else {
                socket.write("\n[-] Wrong flag.\n");
                socket.write("Try again: ")
            }
        };
    }
};
