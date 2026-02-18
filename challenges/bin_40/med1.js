const http = require('http');

module.exports = {
    id: "superlab_protocol",
    name: "The Superlab Protocol",
    port: 4003,      // Netcat Port
    webPort: 4673,   // Web Port (Hosts the Source Code)
    flag: "HEISENBERG{b3w4r3_th3_h34p_s34l_c4f3_b4b3}",

    // We store the server instance here
    httpServer: null,

    // === THE CHALLENGE SOURCE CODE ===
    // This is the C file the user downloads.
    // It shows the "Safety Seal" logic.
    cSourceCode: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// === SUPERLAB BATCH CONTROLLER v2.0 ===
// "Nothing stops this train. Nothing."

void execute_protocol(char *cmd) {
    printf("Executing: %s\\n", cmd);
    // In the real challenge, this would run system(cmd);
    // Here we just check if you managed to change it.
    if (strstr(cmd, "/bin/sh")) {
        system("cat flag.txt");
    } else {
        system(cmd);
    }
}

int main() {
    // Disable buffering
    setvbuf(stdout, NULL, _IONBF, 0);

    // === THE HEAP LAYOUT ===
    // 1. Chemical Batch Name (32 bytes)
    // 2. Safety Seal (4 bytes) - MUST BE 0xCAFEBABE
    // 3. Machine Operation (64 bytes) - Defaults to "clean_tank"
    
    char *batch_name = malloc(32);
    unsigned int *safety_seal = malloc(4);
    char *machine_op = malloc(64);

    // Initialize Defaults
    *safety_seal = 0xCAFEBABE;
    strcpy(machine_op, "/usr/bin/clean_tank");

    printf("=== SUPERLAB CONTROL TERMINAL ===\\n");
    printf("[*] Batch Name Buffer: %p\\n", batch_name);
    printf("[*] Safety Seal Addr : %p\\n", safety_seal);
    printf("[*] Machine Op Addr  : %p\\n", machine_op);
    printf("[!] WARNING: Safety Seal Active. Do not breach.\\n");

    printf("\\nEnter Batch ID (Hex Encoded): ");
    
    // VULNERABILITY: read_hex allows writing past the 32 byte limit
    // If you write 32 bytes, then 4 bytes for the seal, then bytes for the command...
    read_hex_input(batch_name); 

    // === THE TRAP ===
    // If you just overflow with 'AAAA...', this check fails.
    if (*safety_seal != 0xCAFEBABE) {
        printf("\\n[!!!] CRITICAL FAILURE: Safety Seal Broken! (Value: 0x%x)\\n", *safety_seal);
        printf("Emergency Shutdown Initiated.\\n");
        exit(-1);
    }

    // Execution
    execute_protocol(machine_op);
    return 0;
}
`,

    start: (socket, onWin) => {
        
        // === SINGLETON PATTERN (Web Server) ===
        if (!module.exports.httpServer) {
            
            console.log(`[WEB] Starting Superlab Server on ${module.exports.webPort}`);

            module.exports.httpServer = http.createServer((req, res) => {
                // 1. Serve the C Source File
                if (req.url === '/superlab.c') {
                    res.writeHead(200, { 'Content-Type': 'text/plain' });
                    res.end(module.exports.cSourceCode);
                    return;
                }

                // 2. Default Page
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end("<h1>Superlab Control</h1><p>Restricted Access.</p><p>Source: <a href='/superlab.c'>superlab.c</a></p>");
            });

            module.exports.httpServer.listen(module.exports.webPort, '0.0.0.0', () => {
                console.log(`[WEB] File Server active on port ${module.exports.webPort}`);
            });

            module.exports.httpServer.on('error', (err) => {
                console.error(`[WEB ERR] Server error: ${err.message}`);
            });
        }

        // === SIMULATING THE HEAP ===
        // We simulate the memory layout in JavaScript buffers.
        const BATCH_SIZE = 32;
        const SEAL_SIZE = 4;
        const OP_SIZE = 64;
        const TOTAL_SIZE = BATCH_SIZE + SEAL_SIZE + OP_SIZE;

        // Create a buffer representing the heap memory
        let heap = Buffer.alloc(TOTAL_SIZE);
        
        // Fill defaults
        heap.fill(0); 
        // Set Seal at offset 32 (0xCAFEBABE in Little Endian)
        heap.writeUInt32LE(0xCAFEBABE, BATCH_SIZE); 
        // Set Command at offset 36
        heap.write("/usr/bin/clean_tank", BATCH_SIZE + SEAL_SIZE);

        // Fake Addresses for the "Leak"
        const baseAddr = 0x55001020;

        // === USER INTERFACE (Netcat) ===
        socket.write("=== SUPERLAB CONTROL TERMINAL ===\n");
        socket.write(`[+] SOURCE: http://cookcrackcapture.in:${module.exports.webPort}/superlab.c\n`);
        socket.write(`[*] Batch Name Buffer: 0x${baseAddr.toString(16)}\n`);
        socket.write(`[*] Safety Seal Addr : 0x${(baseAddr + BATCH_SIZE).toString(16)}\n`);
        socket.write(`[*] Machine Op Addr  : 0x${(baseAddr + BATCH_SIZE + SEAL_SIZE).toString(16)}\n`);
        socket.write("[!] WARNING: Safety Seal Active. Do not breach.\n\n");
        
        socket.write("Enter Batch ID Payload (Hex String): ");

        return (input) => {
            try {
                // 1. Parse Hex Input
                const cleanInput = input.trim().replace(/\s+/g, ''); // Remove whitespace
                
                if (!/^[0-9a-fA-F]+$/.test(cleanInput)) {
                    socket.write("\n[-] Error: Input must be a valid Hex string (e.g., 414243...)\n");
                    socket.destroy();
                    return;
                }

                const payload = Buffer.from(cleanInput, 'hex');

                // 2. Simulate the Overflow (Copy payload into heap starting at 0)
                // We copy byte by byte to simulate memory overwrite
                for (let i = 0; i < payload.length && i < TOTAL_SIZE; i++) {
                    heap[i] = payload[i];
                }

                // 3. CHECK THE SEAL
                // Read the 4 bytes at the seal offset
                const currentSeal = heap.readUInt32LE(BATCH_SIZE);

                if (currentSeal !== 0xCAFEBABE) {
                    socket.write(`\n[!!!] CRITICAL FAILURE: Safety Seal Broken! (Value: 0x${currentSeal.toString(16)})\n`);
                    socket.write("Emergency Shutdown Initiated. The alarm is ringing!\n");
                    socket.destroy();
                    return;
                }

                // 4. CHECK THE COMMAND
                // Read the string at the command offset
                // Find the null terminator or end of buffer
                let commandEnd = heap.indexOf(0, BATCH_SIZE + SEAL_SIZE);
                if (commandEnd === -1) commandEnd = TOTAL_SIZE;
                
                const currentCommand = heap.toString('utf8', BATCH_SIZE + SEAL_SIZE, commandEnd);

                socket.write(`\n[*] Safety Seal Intact. Proceeding.\n`);
                socket.write(`[*] Executing Operation: ${currentCommand}\n`);

                if (currentCommand.includes("/bin/sh") || currentCommand.includes("sh")) {
                    socket.write("\n[+] SYSTEM HACKED. Root Shell Access Granted.\n");
                    socket.write(`[+] FLAG: ${module.exports.flag}\n`);
                    onWin();
                    socket.destroy();
                } else if (currentCommand.includes("clean_tank")) {
                    socket.write("[-] Tank cleaning started. Nothing interesting happened.\n");
                    socket.write("Try again: ")
                } else {
                    socket.write("[-] Unknown command executed.\n");
                    socket.write("Try again: ")
                }

            } catch (e) {
                socket.write("\n[!] Error processing payload.\n");
                socket.destroy();
            }
        };
    }
};
