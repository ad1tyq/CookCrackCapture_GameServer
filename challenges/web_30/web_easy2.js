const http = require('http');

module.exports = {
    id: "batch_cookies",
    name: "Quality Control: Batch 99",
    port: 3002,      // Netcat Port (For Admin/Flag submission)
    webPort: 3672,   // NEW Web Port (Distinct from the previous game)
    flag: "HEISENBERG{b4tch_28_1s_th3_p7ur35t}",

    httpServer: null,

    start: (socket, onWin) => {

        // === SINGLETON WEB SERVER ===
        if (!module.exports.httpServer) {
            console.log(`[WEB] Starting Batch 99 Server on ${module.exports.webPort}`);

            module.exports.httpServer = http.createServer((req, res) => {
                // 1. Parse Cookies manually (Node.js doesn't do this by default)
                const parseCookies = (request) => {
                    const list = {};
                    const rc = request.headers.cookie;
                    rc && rc.split(';').forEach((cookie) => {
                        const parts = cookie.split('=');
                        list[parts.shift().trim()] = decodeURI(parts.join('='));
                    });
                    return list;
                };

                const cookies = parseCookies(req);
                let batchCookie = cookies['batch'];

                // Fake Chicken Flavors (Distractions)
                const batches = ["Original Recipe", "Spicy Wings", "Lemon Herb", "Garlic Pepper", "Cajun Style", 
                                 "Extra Crispy", "Honey BBQ", "Buffalo Special", "Ranch Dipped", "Teriyaki Glaze", 
                                 "Mango Habanero", "Nashville Hot", "Smoky Chipotle", "Roasted Garlic", "Parmesan Crusted", 
                                 "Lemon Pepper", "Sweet Chili", "Sriracha Honey", "Bourbon BBQ", "Maple Bacon", 
                                 "Hickory Smoked", "Mesquite Grilled", "Zesty Italian", "Herb & Butter", "Truffle Oil Infused", 
                                 "Ghost Pepper Extreme", "Carolina Reaper Edition", "Blueberry Muffin (Wait, what?)"];

                // Default Headers
                res.setHeader('Content-Type', 'text/html');

                // === THE LOGIC ===
                
                // Case A: No Cookie? Give them Batch 0 (Base64 Encoded)
                if (!batchCookie) {
                    // "MA==" is Base64 for "0"
                    res.setHeader('Set-Cookie', 'batch=MA==; Path=/');
                    res.end(`
                        <h1>Pollos Quality Control</h1>
                        <p>Status: No batch selected. Assigning default batch 0.</p>
                        <p><i>(Refresh the page to see batch details)</i></p>
                    `);
                    return;
                }

                try {
                    // Case B: Cookie Exists? Decode it.
                    // 1. Base64 Decode (Node.js style)
                    const decodedStr = Buffer.from(batchCookie, 'base64').toString('utf-8');
                    // 2. Parse to Integer
                    const batchId = parseInt(decodedStr);

                    if (isNaN(batchId)) throw new Error("NaN");

                    // === WIN CONDITION (Batch 28) ===
                    if (batchId === 28) {
                        res.end(`
                            <img src="https://wallpapercave.com/wp/wp15786645.jpg"/><br>
                            <div style="background-color:#e1f5fe; padding:20px; border: 2px solid #0288d1; font-family: sans-serif;">
                                <h1>BATCH 28 VERIFIED</h1>
                                <h2>Product: Blue Sky (99.1% Purity)</h2>
                                <p><b>Flag:</b> ${module.exports.flag}</p>
                            </div>
                        <br><img src="https://wallpapercave.com/wp/wp15786707.jpg">
                        <img src="https://i.pinimg.com/474x/7e/f6/0c/7ef60c77a808c876f4bf1463282fca20.jpg"/>>
                        `);
                    } 
                    // Case C: Valid Batch, Wrong ID
                    else if (batchId >= 0 && batchId < batches.length) {
                        res.end(`
                            <h1>Batch #${batchId} Status</h1>
                            <p><b>Flavor Profile:</b> ${batches[batchId]}</p>
                            <p>Status: Legal Shipment.</p>
                            <br><br><img src = 'https://i.ytimg.com/vi/RRgUluVGclE/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLA0yfMrNfrL_fRTYRCikxLjtrjnPw'/>
                        `);
                    } 
                    // Case D: Out of Bounds
                    else {
                         res.end(`<h1>Batch #${batchId} Status</h1><p>Status: Unknown Batch ID.</p>`);
                    }

                } catch (e) {
                    res.end("<h1>Error 500</h1><p>Invalid Batch ID format. System expects Base64 encoded numbers.</p>");
                }
            });

            // Listen on 0.0.0.0 (Crucial!)
            module.exports.httpServer.listen(module.exports.webPort, '0.0.0.0', () => {
                console.log(`[WEB] Batch 99 Server active on port ${module.exports.webPort}`);
            });
            
            module.exports.httpServer.on('error', (err) => {
                console.error(`[WEB ERR] Server error: ${err.message}`);
            });
        }

        // === NETCAT INTERFACE ===
        socket.write("=== QUALITY CONTROL: BATCH 99 ===\n");
        socket.write(`[+] PORTAL ONLINE: http://cookcrackcapture.in:${module.exports.webPort}\n`);
        socket.write("[+] INSTRUCTION: Find the 'Blue Sky' batch manifest.\n");
        socket.write("[+] The system uses cookies to track Batch IDs.\n");
        socket.write("Enter Flag: ");

        return (input) => {
            if (input.trim() === module.exports.flag) {
                socket.write("\n[+] Shipment Verified. Gus is pleased.\n");
                onWin();
                socket.destroy();
            } else {
                socket.write("\n[-] Incorrect Flag.\n");
                socket.write("Try again: ")
            }
        };
    }
};
