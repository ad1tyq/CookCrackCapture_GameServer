const http = require('http');
const url = require('url');

module.exports = {
    id: "vamonos_eval",
    name: "The Vamonos Calculation",
    port: 3004,      // Netcat Port
    webPort: 3674,   // Web Port
    flag: "HEISENBERG{rce_1s_4_m4tt3r_0f_ch3m15try}",

    httpServer: null,

    start: (socket, onWin) => {

        // === SINGLETON WEB SERVER ===
        if (!module.exports.httpServer) {
            console.log(`[WEB] Starting Vamonos Calc on ${module.exports.webPort}`);

            module.exports.httpServer = http.createServer((req, res) => {
                const parsedUrl = url.parse(req.url, true);
                const query = parsedUrl.query;

                // 1. The Calculator UI (Home Page)
                if (parsedUrl.pathname === '/') {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(`
                        <div style="font-family: sans-serif; max-width: 600px; margin: 50px auto; border: 2px solid #ffcc00; padding: 20px;">
                            <h1 style="color: #d32f2f;">Vamonos Pest Control</h1>
                            <h2>Chemical Mixture Calculator</h2>
                            <p>Enter the volume formula for the Methylamine tank.</p>
                            <form action="/calc" method="GET">
                                <input type="text" name="formula" placeholder="e.g. 500 * 45" style="width: 300px; padding: 10px;">
                                <input type="submit" value="Calculate">
                            </form>
                            <p style="color: gray; font-size: 0.8em;">System v1.0 (Node.js Kernel)</p>
                        </div>
                    `);
                    return;
                }

                // 2. The Vulnerable Endpoint
                if (parsedUrl.pathname === '/calc') {
                    const formula = query.formula || '';
                    
                    // === THE TWEAK: JavaScript Blacklist ===
                    // We block common NodeJS RCE keywords to force the user to be clever.
                    const blacklist = ['require', 'fs', 'child_process', 'exec', 'spawn', 'import', 'eval', 'process'];
                    
                    const hit = blacklist.find(word => formula.toLowerCase().includes(word));
                    
                    if (hit) {
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(`
                            <h3 style="color:red">Security Alert!</h3>
                            <p>The keyword <b>'${hit}'</b> is restricted by the Vamonos Firewall.</p>
                            <p>We don't allow hacking tools in the chemical lab.</p>
                            <a href="/">Go Back</a>
                        `);
                        return;
                    }

                    try {
                        // === THE VULNERABILITY ===
                        // Direct eval() of user input. 
                        // Since we are in Node, they can access global objects if they bypass the blacklist.
                        
                        // We expose the flag in the environment for them to find
                        process.env.SECRET_FLAG = module.exports.flag;

                        const result = eval(formula);
                        
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(`<h3>Result: ${result}</h3><a href="/">Calculate Again</a></br></br>
                            <img src = 'https://i.pinimg.com/736x/35/f1/f9/35f1f9c6c77968f41048032e8ba57364.jpg'/>`);
                    } catch (e) {
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(`<h3>Calculation Error:</h3><p>${e.message}</p><a href="/">Go Back</a>`);
                    }
                    return;
                }

                res.writeHead(404);
                res.end("Not Found");
            });

            // Listen on 0.0.0.0
            module.exports.httpServer.listen(module.exports.webPort, '0.0.0.0', () => {
                console.log(`[WEB] Vamonos Server active on port ${module.exports.webPort}`);
            });
            
            module.exports.httpServer.on('error', (err) => {
                console.error(`[WEB ERR] Server error: ${err.message}`);
            });
        }

        // === NETCAT INTERFACE ===
        socket.write("=== THE VAMONOS CALCULATION ===\n");
        socket.write(`[+] CALCULATOR ONLINE: http://cookcrackcapture.in:${module.exports.webPort}\n`);
        socket.write("[+] TASK: Break out of the calculator and read the process environment variables.\n");
        socket.write("[+] The flag is hidden in 'process.env.SECRET_FLAG'.\n");
        socket.write("Enter Flag: ");

        return (input) => {
            if (input.trim() === module.exports.flag) {
                socket.write("\n[+] Shipment Secured. Good job, Todd.\n");
                onWin();
                socket.destroy();
            } else {
                socket.write("\n[-] Wrong flag.\n");
                socket.write("Try again: ")
            }
        };
    }
};
