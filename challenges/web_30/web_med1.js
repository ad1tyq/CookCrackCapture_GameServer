const http = require('http');
const url = require('url');

module.exports = {
    id: "gray_matter",
    name: "Gray Matter's Stolen Legacy",
    port: 3003,      // Netcat Port (For Admin/Flag)
    webPort: 3673,   // Web Port (The Vulnerable App)
    flag: "HEISENBERG{570l3n_600d5_fr0m_5chw4r7z}",

    httpServer: null,

    start: (socket, onWin) => {

        // === SINGLETON WEB SERVER ===
        if (!module.exports.httpServer) {
            console.log(`[WEB] Starting Gray Matter Portal on ${module.exports.webPort}`);

            module.exports.httpServer = http.createServer((req, res) => {
                // Parse URL and Query Parameters
                const parsedUrl = url.parse(req.url, true);
                const pathname = parsedUrl.pathname;
                const query = parsedUrl.query;

                // 1. Home Page
                if (pathname === '/') {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(`
                        <div style="font-family: monospace; padding: 20px;">
                            <h1>Gray Matter Technologies</h1>
                            <h2>Investor Relations Portal</h2>
                            <p>Select a document to view:</p>
                            <ul>
                                <li><a href="/view?file=elliott_bio.txt">CEO Bio (Elliott Schwartz)</a></li>
                                <li><a href="/view?file=gretchen_bio.txt">Co-Founder Bio (Gretchen Schwartz)</a></li>
                                <li><a href="/view?file=public_filings_2005.txt">2005 Public Filings</a></li>
                            </ul>
                            <hr>
                            <p><i>System Note: Sensitive assets are stored in the secure /secret/ root directory.</i></p>
                        </div>
                    `);
                    return;
                }

                // 2. The Vulnerable View Endpoint
                if (pathname === '/view') {
                    let filename = query.file || '';

                    // === THE VULNERABILITY: FLAWED FILTER ===
                    // The developer tries to secure the app by removing "../"
                    // BUT they only do a single pass replacement.
                    // This allows "Nested Traversal" attacks.
                    // Example: "....//" -> The inner "../" is removed, collapsing the outer chars into "../"
                    
                    let cleanFilename = filename.replace(/\.\.\//g, '');

                    // Check if they successfully reconstructed the path to the secret
                    // We simulate the file system check here
                    if (cleanFilename.includes('../secret/patent_001.txt') || 
                        cleanFilename.includes('..\\secret\\patent_001.txt')) {
                        
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(`
                            <div style="background-color:#222; color:#0f0; padding:20px; font-family:monospace;">
                                <h1>[!] RESTRICTED ASSET FOUND</h1>
                                <p>File: /secret/patent_001.txt</p>
                                <pre>
PATENT ASSIGNMENT NO. 82991
---------------------------
INVENTOR: Walter H. White
ASSIGNEE: Gray Matter Technologies

SUBJECT: Crystallization Methodology for High-Purity Compounds.

[CONFIDENTIAL]
Flag: ${module.exports.flag}
                                </pre>
                            </div>
                        `);
                        return;
                    }

                    // Standard Response (Mock File Reading)
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    if (cleanFilename === 'elliott_bio.txt') {
                        res.end("<h3>Elliott Schwartz</h3><p>CEO and Philanthropist. Co-founded Gray Matter...</p>");
                    } else if (cleanFilename === 'gretchen_bio.txt') {
                        res.end("<h3>Gretchen Schwartz</h3><p>Co-owner. Leading the charitable grant initiative...</p>");
                    } else {
                        // Error message reveals the directory structure (Information Leakage)
                        res.end(`
                            <h3>Error 404</h3>
                            <p>File <b>${cleanFilename}</b> not found in <i>/var/www/public/assets/</i>.</p>
                            <p>Security Alert: Traversal sequences detected and removed.</p>
                        `);
                    }
                    return;
                }

                // 404 For everything else
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end("Not Found");
            });

            // Listen on 0.0.0.0 (Crucial!)
            module.exports.httpServer.listen(module.exports.webPort, '0.0.0.0', () => {
                console.log(`[WEB] Gray Matter Server active on port ${module.exports.webPort}`);
            });
            
            module.exports.httpServer.on('error', (err) => {
                console.error(`[WEB ERR] Server error: ${err.message}`);
            });
        }

        // === NETCAT INTERFACE ===
        socket.write("=== GRAY MATTER TECHNOLOGIES ===\n");
        socket.write(`[+] INVESTOR PORTAL: http://cookcrackcapture.in:${module.exports.webPort}\n`);
        socket.write("[+] MISSION: Walter wants his patent documents back.\n");
        socket.write("[+] INTEL: They are hidden in '/secret/patent_001.txt' outside the web root.\n");
        socket.write("Enter Flag: ");

        return (input) => {
            if (input.trim() === module.exports.flag) {
                socket.write("\n[+] Walter: 'You're goddamn right.'\n");
                onWin();
                socket.destroy();
            } else {
                socket.write("\n[-] Access Denied. That is not the patent.\n");
                socket.write("Try again: ")
            }
        };
    }
};
