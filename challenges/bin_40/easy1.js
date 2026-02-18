const http = require('http');

module.exports = {
    id: "crystal_ship",
    name: "The Crystal Ship Coordinates",
    port: 4001,      // Netcat Port
    webPort: 4671,   // Web Port (Hosts the Source Code)
    flag: "HEISENBERG{P13_15_d3l1c10u5_but_m4th_15_b3tt3r}",

    // We store the server instance here
    httpServer: null,

    // === THE CHALLENGE SOURCE CODE ===
    // This is the C file the user downloads to analyze the offsets.
    cSourceCode: `#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>

// === THE CRYSTAL SHIP NAVIGATION SYSTEM ===
// "We need to move the RV, Jesse. The coordinates are burned."

// 1. Compile this: gcc crystal_ship.c -o crystal_ship -no-pie
//    (Actually, the server runs it WITH PIE enabled, so addresses shift!)

void start_cook() {
    // Offset: 0x1250 (Hypothetical, depends on compiler but fixed relative to check_fuel)
    printf("You found the spot! Let's cook.\\n");
    FILE *fptr = fopen("flag.txt", "r");
    if (fptr == NULL) {
        printf("Error: Missing flag.txt\\n");
        exit(0);
    }
    char c = fgetc(fptr);
    while (c != EOF) {
        printf("%c", c);
        c = fgetc(fptr);
    }
    printf("\\n");
}

void check_fuel() {
    // Offset: 0x11A0
    printf("Fuel levels stable.\\n");
}

int main() {
    // Disable buffering
    setvbuf(stdout, NULL, _IONBF, 0);

    printf("Yo, Mr. White! The RV is mobile. We aren't at the usual spot.\\n");
    
    // THE LEAK (In Decimal, to confuse LLMs)
    // The server actually prints the address of check_fuel() here.
    printf("I'm currently checking the fuel tank at GPS Coordinate: %lu\\n", (unsigned long)&check_fuel);
    
    unsigned long input_addr;
    printf("Where is the Blue Sky equipment? (Enter Hex): ");
    scanf("%lx", &input_addr);

    // Jump to the user's address
    void (*cook)(void) = (void (*)())input_addr;
    cook();

    return 0;
}
`,

    start: (socket, onWin) => {
        
        // === SINGLETON PATTERN (Web Server) ===
        if (!module.exports.httpServer) {
            
            console.log(`[WEB] Starting Crystal Ship Server on ${module.exports.webPort}`);

            module.exports.httpServer = http.createServer((req, res) => {
                // 1. Serve the C Source File
                if (req.url === '/crystal_ship.c') {
                    res.writeHead(200, { 'Content-Type': 'text/plain' });
                    res.end(module.exports.cSourceCode);
                    return;
                }

                // 2. Default Page
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end("<h1>The Crystal Ship</h1><p>Status: Mobile</p><p>Navigation Data: <a href='/crystal_ship.c'>crystal_ship.c</a></p>");
            });

            module.exports.httpServer.listen(module.exports.webPort, '0.0.0.0', () => {
                console.log(`[WEB] File Server active on port ${module.exports.webPort}`);
            });

            module.exports.httpServer.on('error', (err) => {
                console.error(`[WEB ERR] Server error: ${err.message}`);
            });
        }

        // === SIMULATING PIE (Position Independent Executable) ===
        // In a real binary, the "Base Address" changes every run (ASLR).
        // The distance between functions (Offsets) stays the same.
        
        // 1. Generate a random Base Address (e.g., 0x56000000xxxx)
        const randomPage = Math.floor(Math.random() * 50000);
        const baseAddress = 0x560000000000n + BigInt(randomPage * 0x1000);

        // 2. Define Fixed Offsets (Simulating the compiled binary structure)
        // Let's assume:
        // check_fuel is at Offset 0x11A0
        // start_cook is at Offset 0x1250
        // Difference: 0x1250 - 0x11A0 = 0xB0 (176 bytes)
        const offsetCheckFuel = 0x11A0n;
        const offsetStartCook = 0x1250n;

        const checkFuelRealAddr = baseAddress + offsetCheckFuel;
        const startCookRealAddr = baseAddress + offsetStartCook;

        // === USER INTERFACE (Netcat) ===
        socket.write("=== THE CRYSTAL SHIP COORDINATES ===\n");
        socket.write(`[+] WEB INTEL: http://cookcrackcapture.in:${module.exports.webPort}/crystal_ship.c\n`);
        socket.write("Yo, Mr. White! The RV is mobile. We aren't at the usual spot.\n");
        
        // THE LEAK: Print check_fuel address in DECIMAL (Base 10)
        // LLMs hate this because they often try to use it as Hex or fail the conversion.
        socket.write(`I'm currently checking the fuel tank at GPS Coordinate: ${checkFuelRealAddr.toString()}\n`);
        
        socket.write("Where is the Blue Sky equipment? (Enter Hex 0x...): ");

        return (input) => {
            try {
                // Parse input as Hex
                const cleanInput = input.trim().toLowerCase().replace("0x", "");
                const userGuess = BigInt("0x" + cleanInput);

                if (userGuess === startCookRealAddr) {
                    socket.write("\n[+] Coordinates Locked. Equipment Active.\n");
                    socket.write(`[+] FLAG: ${module.exports.flag}\n`);
                    onWin();
                    socket.destroy();
                } else {
                    // Simulate a Segfault
                    socket.write("\n[!] SEGFAULT: Incorrect address. We're lost in the desert.\n");
                    socket.write(`(Debug: You jumped to 0x${userGuess.toString(16)}. Target was 0x${startCookRealAddr.toString(16)})\n`);
                    socket.write("Try again: ")
                }
            } catch (e) {
                socket.write("\n[!] SEGFAULT: Invalid memory address format.\n");
                socket.destroy();
            }
        };
    }
};
