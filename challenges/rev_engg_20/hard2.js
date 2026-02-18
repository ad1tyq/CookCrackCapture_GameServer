const http = require('http');

module.exports = {
    id: "car_wash",
    name: "A1A Car Wash Accounting",
    port: 2006,      // Netcat Port
    webPort: 2676,   // Web Port (Hosts the Assembly file)
    flag: "HEISENBERG{0083ddd1}",

    // We store the server instance here
    httpServer: null,

    // === THE CHALLENGE SOURCE CODE ===
    // This is the file users will download.
    assemblySourceCode: `
    .arch armv8-a
    .file    "money_laundry.c"
    .text
    .align    2
    .global    launder_funds
    .type    launder_funds, %function
launder_funds:
    sub    sp, sp, #32
    str    w0, [sp, 12]      // Store input 'a'
    str    wzr, [sp, 24]     // total = 0
    str    wzr, [sp, 28]     // i = 0
    b      .CHECK_LIMIT
.CLEANING_LOOP:
    ldr    w0, [sp, 24]
    add    w0, w0, 7         // THE TWEAK: Multiplier is 7 (Not 3 like the original)
    str    w0, [sp, 24]
    ldr    w0, [sp, 28]
    add    w0, w0, 1         // i++
    str    w0, [sp, 28]
.CHECK_LIMIT:
    ldr    w1, [sp, 28]
    ldr    w0, [sp, 12]
    cmp    w1, w0
    bcc    .CLEANING_LOOP
    ldr    w0, [sp, 24]      // Load final total
    add    sp, sp, 32
    ret
    .size    launder_funds, .-launder_funds

    .section    .rodata
    .align    3
.MSG:
    .string    "Laundered Total: %ld\\n"
    .text
    .align    2
    .global    main
    .type    main, %function
main:
    stp    x29, x30, [sp, -48]!
    add    x29, sp, 0
    str    w0, [x29, 28]
    str    x1, [x29, 16]
    ldr    x0, [x29, 16]
    add    x0, x0, 8
    ldr    x0, [x0]
    bl     atoi
    bl     launder_funds
    str    w0, [x29, 44]
    adrp   x0, .MSG
    add    x0, x0, :lo12:.MSG
    ldr    w1, [x29, 44]
    bl     printf
    nop
    ldp    x29, x30, [sp], 48
    ret
`,

    start: (socket, onWin) => {
        
        // === SINGLETON PATTERN (Web Server) ===
        // Only start the web server if it's not already running
        if (!module.exports.httpServer) {
            
            console.log(`[WEB] Starting A1A File Server on ${module.exports.webPort}`);

            module.exports.httpServer = http.createServer((req, res) => {
                // 1. Serve the Assembly File
                if (req.url === '/money_laundry.S') {
                    res.writeHead(200, { 'Content-Type': 'text/plain' });
                    res.end(module.exports.assemblySourceCode);
                    return;
                }

                // 2. Default Page
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end("<h1>A1A Car Wash Accounting System</h1><p>Restricted Access.</p><p>Audit Log: <a href='/money_laundry.S'>money_laundry.S</a></p>");
            });

            // Listen on 0.0.0.0 (Crucial for Docker)
            module.exports.httpServer.listen(module.exports.webPort, '0.0.0.0', () => {
                console.log(`[WEB] File Server active on port ${module.exports.webPort}`);
            });

            module.exports.httpServer.on('error', (err) => {
                console.error(`[WEB ERR] Server error: ${err.message}`);
            });
        }

        // === USER INTERFACE (Netcat) ===
        socket.write("=== A1A CAR WASH ACCOUNTING ===\n");
        socket.write("[+] SYSTEM: Old ARM server found in the storage room.\n");
        socket.write(`[+] DOWNLOAD SOURCE: http://cookcrackcapture.in:${module.exports.webPort}/money_laundry.S\n`);
        socket.write("[+] QUESTION: What is the resulting integer if the input argument 'a' is 1234567?\n");
        socket.write("[+] FORMAT: Hexadecimal, 32-bit, lowercase, no 0x prefix (e.g., 0055aabb)\n");
        socket.write("Enter Flag: ");

        return (input) => {
            if (input.trim() === module.exports.flag) {
                socket.write("\n[+] Books Balanced! Skyler is happy.\n");
                onWin();
                socket.destroy();
            } else {
                socket.write("\n[-] Incorrect total. The IRS is auditing us now.\n");
                socket.write("Try again: ")
            }
        };
    }
};
