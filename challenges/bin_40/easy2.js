const http = require('http');

module.exports = {
    id: "blue_sky",
    name: "Blue Sky Integrity",
    port: 4002,      // Netcat Port (Game Loop)
    webPort: 4672,   // Web Port (Hosts the Source)
    flag: "HEISENBERG{h34p_0v3rfl0w_m4st3r_99.1_p3rc3nt}",

    // Store server instance
    httpServer: null,

    // === THE CHALLENGE SOURCE CODE ===
    // This is the C file the user downloads to analyze the "Heap Layout".
    // It hints that there is a 32-byte distance between the buffer and the target.
    cSourceCode: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// BLUE SKY PURITY MONITOR
// Author: Gale Boetticher

// Heap layout context:
// On this system, malloc(5) allocates a 32-byte chunk due to alignment/metadata.
// [ Header (8) ] [ Buffer (32) ] [ Header (8) ] [ PurityStatus (32) ]
// Distance to overwrite: 32 bytes.

#define BUF_SIZE 32

char *purity_status;
char *batch_additive;
char daily_signature[5]; // Generated at runtime

void init() {
    // 1. Generate Random Signature for the day
    // (This prevents replay attacks!)
    generate_random_sig(daily_signature); 
    printf("Today's Authorized Signature: %s\\n", daily_signature);

    // 2. Allocate Heap Memory
    // The 'purity_status' is right next to 'batch_additive' on the heap.
    batch_additive = malloc(BUF_SIZE);
    purity_status = malloc(BUF_SIZE);
    
    // 3. Set Default State
    strcpy(purity_status, "FAIL");
}

void write_additive() {
    printf("Enter additive formula: ");
    // VULNERABILITY: scanf doesn't check boundaries!
    // If you write more than 32 bytes, you spill into 'purity_status'.
    scanf("%s", batch_additive); 
}

void check_purity() {
    printf("Current Purity Status: %s\\n", purity_status);
    
    if (strcmp(purity_status, daily_signature) == 0) {
        printf("99.1%% PURITY ACHIEVED. SHIP IT.\\n");
        system("cat flag.txt");
    } else {
        printf("CONTAMINATED. DO NOT SHIP.\\n");
    }
}
`,

    start: (socket, onWin) => {
        
        // === 1. WEB SERVER (Serves the C Source) ===
        if (!module.exports.httpServer) {
            console.log(`[WEB] Starting Blue Sky Server on ${module.exports.webPort}`);
            
            module.exports.httpServer = http.createServer((req, res) => {
                // Serve the C source file
                if (req.url === '/blue_sky.c') {
                    res.writeHead(200, { 'Content-Type': 'text/plain' });
                    res.end(module.exports.cSourceCode);
                    return;
                }

                // Default Landing Page
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(`
                    <body style="background-color:#0d47a1; color:#ffffff; font-family:sans-serif; padding:50px;">
                        <h1>Blue Sky Laboratory</h1>
                        <p>Status: <span style="background-color:red; padding:2px;">BATCH HOLD</span></p>
                        <p>The purity sensor is stuck. We need to manually override the heap variables.</p>
                        <p>Analysis File: <a href="/blue_sky.c" style="color:#64b5f6">blue_sky.c</a></p>
                    </body>
                `);
            });

            module.exports.httpServer.listen(module.exports.webPort, '0.0.0.0', () => {
                console.log(`[WEB] Blue Sky Server active on port ${module.exports.webPort}`);
            });
            
            module.exports.httpServer.on('error', (err) => console.log(`[WEB ERR] ${err.message}`));
        }

        // === 2. NETCAT INTERFACE (The Heap Simulation) ===
        
        // --- GAME STATE ---
        // Generate a random 4-char signature (e.g., "X9aB")
        const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let signature = "";
        for(let i=0; i<4; i++) signature += charset.charAt(Math.floor(Math.random() * charset.length));

        // Simulated Heap Variables
        let purityStatus = "FAIL"; // The target to overwrite
        let inputBuffer = "";      // The 32-byte buffer
        const BUFFER_SIZE = 32;    // The "Distance" to the next chunk

        socket.write("=== BLUE SKY PURITY MONITOR ===\n");
        socket.write(`[+] WEB SOURCE: http://cookcrackcapture.in:${module.exports.webPort}/blue_sky.c\n`);
        socket.write("[+] SYSTEM ALERT: Sensor Malfunction. Purity Status locked to 'FAIL'.\n");
        socket.write(`[+] REQUIRED OVERRIDE SIGNATURE: ${signature}\n`);
        socket.write("---------------------------------------------------\n");
        socket.write("1. Write to Additive Buffer (32 bytes)\n");
        socket.write("2. Check Purity Status\n");
        socket.write("3. Exit\n");
        socket.write("---------------------------------------------------\n");
        socket.write("Select Option: ");

        return (input) => {
            const choice = input.trim();

            // === OPTION 1: WRITE (The Exploit) ===
            // This logic detects if the user is trying to write data (heuristic check)
            // or if they just typed "1".
            if (choice === "1") {
                socket.write("Enter data to write to heap: ");
                // We return a *new* function to handle the NEXT input (the actual payload)
                // This is a simple state machine for the menu
                return (payload) => {
                    inputBuffer = payload.trim(); // "Write" to buffer

                    // --- HEAP OVERFLOW SIMULATION ---
                    if (inputBuffer.length > BUFFER_SIZE) {
                        // The overflow!
                        // Anything after byte 32 "spills" into purityStatus
                        purityStatus = inputBuffer.substring(BUFFER_SIZE);
                        socket.write(`[!] WARNING: Buffer Overflow detected at address 0x560a... \n`);
                        socket.write(`[!] Adjacent memory overwritten.\n`);
                    } else {
                        // No overflow, nothing happens to purityStatus
                    }
                    
                    socket.write("\nSelect Option: ");
                    // Return to main menu handler (by recursively returning this function)
                    // (In your server architecture, you likely just handle the next 'data' event,
                    // so we reset state by just printing the prompt)
                };
            }

            // === OPTION 2: CHECK (The Win Condition) ===
            else if (choice === "2") {
                socket.write(`\n[+] CURRENT PURITY READOUT: "${purityStatus}"\n`);
                socket.write(`[+] REQUIRED SIGNATURE:     "${signature}"\n`);

                if (purityStatus === signature) {
                    socket.write("\n[+] 99.1% PURITY ACHIEVED. SHIPMENT AUTHORIZED.\n");
                    socket.write(`[+] FLAG: ${module.exports.flag}\n`);
                    onWin();
                    socket.destroy();
                } else {
                    socket.write("\n[-] CONTAMINATED BATCH. DISPOSE IMMEDIATELY.\n");
                    socket.write("Select Option: ");
                }
            }

            // === OPTION 3: EXIT ===
            else if (choice === "3") {
                socket.destroy();
            }
            
            // === DIRECT PAYLOAD HANDLING (Quality of Life) ===
            // If the user sends a massive string directly (without pressing '1' first),
            // we can treat it as an exploit attempt if it's long enough.
            // This helps with scripted solutions that might just blast data.
            else if (input.length > 32) {
                purityStatus = input.substring(32).trim(); // Handle the newline/trim carefully
                // If they matched it in one shot:
                 if (purityStatus.startsWith(signature)) {
                    socket.write("\n[+] 99.1% PURITY ACHIEVED. SHIPMENT AUTHORIZED.\n");
                    socket.write(`[+] FLAG: ${module.exports.flag}\n`);
                    onWin();
                    socket.destroy();
                 } else {
                    socket.write(`\n[-] wrote to heap, but purity is now '${purityStatus}'. Needed '${signature}'.\n`);
                    socket.write("Select Option: ");
                 }
            }
            
            else {
                socket.write("\nSelect Option: ");
            }
        };
    }
};
