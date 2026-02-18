const http = require('http');
const url = require('url');

module.exports = {
    id: "jesse_xss",
    name: "The Cap'n Cook Designer",
    port: 3006,      
    webPort: 3676,   
    flag: "HEISENBERG{pr0t0typ3_p0llut10n_1s_n0_j0k3_y0}",

    httpServer: null,

    start: (socket, onWin) => {

        if (!module.exports.httpServer) {
            console.log(`[WEB] Starting Cap'n Cook Designer on ${module.exports.webPort}`);

            module.exports.httpServer = http.createServer((req, res) => {
                const parsedUrl = url.parse(req.url, true);
                
                if (parsedUrl.pathname === '/') {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    
                    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Cap'n Cook Logo Designer</title>
    <style>
        body { background-color: #1a1a1a; color: #eee; font-family: 'Courier New', monospace; text-align: center; padding: 50px; }
        .canvas { border: 2px dashed #ffcc00; padding: 20px; margin: 20px auto; width: 60%; min-height: 200px; }
        .hidden-flag { display: none; background: #222; border: 2px solid #0f0; padding: 20px; margin-top: 20px; }
        h1 { color: #ffcc00; }
    </style>
</head>
<body>
    <h1>Cap'n Cook Logo Designer v1.1</h1>
    <p>Pass config via URL: ?config={"theme": "dark"}</p>
    <div id="display" class="canvas">
        <p id="status">Loading...</p>
    </div>
    <div id="secret-box" class="hidden-flag"></div>

    <script>
        // === FIXED MERGE FUNCTION ===
        function merge(target, source) {
            for (let key in source) {
                if (key === '__proto__') continue; 
                
                // FIX: functions (like constructor) are also objects in JS!
                // We must allow recursion if the target is an object OR a function.
                let isObj = (val) => typeof val === 'object' || typeof val === 'function';

                if (isObj(target[key]) && isObj(source[key]) && source[key] !== null) {
                    merge(target[key], source[key]);
                } else {
                    target[key] = source[key];
                }
            }
            return target;
        }

        const defaultConfig = { 
            theme: 'yellow', 
            metadata: { version: '1.0' }
        };

        const params = new URLSearchParams(window.location.search);
        
        try {
            const userConfig = JSON.parse(params.get('config') || '{}');
            merge(defaultConfig, userConfig);
            document.getElementById('status').innerText = "Config merged.";

            // THE CHECK
            if (Object.prototype.isAdmin === "true") {
                const box = document.getElementById('secret-box');
                box.style.display = 'block';
                box.innerHTML = "<h3>AUTHORIZED: GUS FRING</h3><p style='color:#0f0; font-size:1.2em'>Flag: ${module.exports.flag}</p>";
            }
        } catch (e) {
            document.getElementById('status').innerText = "Error: " + e.message;
        }
    </script>
</body>
</html>
                    `;
                    res.end(htmlContent);
                    return;
                }
                res.writeHead(404);
                res.end("Not Found");
            });

            module.exports.httpServer.listen(module.exports.webPort, '0.0.0.0', () => {
                console.log(`[WEB] Cap'n Cook Designer active on port ${module.exports.webPort}`);
            });
        }

        socket.write("=== THE CAP'N COOK DESIGNER ===\n");
        socket.write(`[+] DESIGN PORTAL: http://cookcrackcapture.in:${module.exports.webPort}\n`);
        socket.write("[+] MISSION: We need to override the system to get admin access.\n");
        socket.write("[+] INTEL: The web developer left the source code visible. Audit it.\n");
        socket.write("Enter Flag: ");

        return (input) => {
            if (input.trim() === module.exports.flag) {
                socket.write("\n[+] Science, Bitch! Good job.\n");
                onWin();
                socket.destroy();
            } else {
                socket.write("\n[-] Access Denied.\n");
                socket.write("Try again: ")
            }
        };
    }
};
