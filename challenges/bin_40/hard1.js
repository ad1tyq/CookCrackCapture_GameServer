const http = require('http');

module.exports = {
    id: "madrigal_cargo",
    name: "Madrigal's Lost Cargo",
    port: 4005,      // Netcat Port
    webPort: 4675,   // Web Port (Hosts the Source Code)
    flag: "HEISENBERG{u4f_ch3ck5um_m4st3r_c4rg0_l0st}",

    // We store the server instance here
    httpServer: null,

    // === THE CHALLENGE SOURCE CODE ===
    // This is the C file the user downloads to understand the struct layout.
    cSourceCode: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

// === MADRIGAL ELECTROMOTIVE LOGISTICS ===
// "Lydia is very particular about the paperwork."

typedef struct {
    int priority_id;          // Offset 0  (4 bytes)
    int _padding;             // Offset 4  (4 bytes - Alignment)
    void (*verify_route)();   // Offset 8  (8 bytes)
    char *manifest_notes;     // Offset 16 (8 bytes)
    int integrity_check;      // Offset 24 (4 bytes)
                              // Total Size: 32 bytes (aligned)
} Shipment;

Shipment *current_shipment = NULL;

void distribute_blue() {
    printf("\\n[+] Route Verified. Distribution Authorized.\\n");
    printf("[+] FLAG: %s\\n", getenv("FLAG"));
    exit(0);
}

void standard_route() {
    printf("\\n[*] Standard shipping route verified. Nothing suspicious here.\\n");
}

void create_shipment() {
    current_shipment = (Shipment*)malloc(sizeof(Shipment));
    current_shipment->priority_id = 1;
    current_shipment->verify_route = standard_route;
    
    // Calculate Integrity: 1 ^ Address of standard_route
    current_shipment->integrity_check = 
        current_shipment->priority_id ^ (unsigned long)current_shipment->verify_route;
        
    printf("[+] New Shipment Created at %p\\n", current_shipment);
}

void cancel_shipment() {
    if (current_shipment) {
        free(current_shipment);
        printf("[-] Shipment Canceled. Memory freed.\\n");
        // VULNERABILITY: Dangling pointer! We don't set current_shipment to NULL.
    }
}

void file_complaint() {
    // VULNERABILITY: malloc(32) reuses the chunk just freed by cancel_shipment()
    char *complaint = malloc(sizeof(Shipment)); 
    printf("Enter complaint details (Raw Hex): ");
    read(0, complaint, sizeof(Shipment)); 
    printf("[*] Complaint filed. Logicistics will review it.\\n");
}

void process_shipment() {
    if (current_shipment) {
        // === THE TRAP ===
        // We verify the integrity before running the function.
        // If you overwrote the function pointer but forgot to update the check...
        unsigned long calc_check = 
            current_shipment->priority_id ^ (unsigned long)current_shipment->verify_route;

        if ((int)calc_check != current_shipment->integrity_check) {
            printf("\\n[!] INTEGRITY BREACH: Checksum Mismatch!\\n");
            printf("[!] Calculated: 0x%lx, Expected: 0x%x\\n", calc_check, current_shipment->integrity_check);
            exit(-1);
        }

        // Run the function pointer
        current_shipment->verify_route();
    }
}

int main() {
    setvbuf(stdout, NULL, _IONBF, 0);
    printf("Madrigal Logistics Terminal\\n");
    printf("Leak: distribute_blue is at %p\\n", distribute_blue);
    
    while(1) {
        printf("\\n1. Create Shipment\\n2. Cancel Shipment\\n3. File Complaint\\n4. Process Shipment\\n> ");
        int choice;
        scanf("%d", &choice);
        // ... switch case handling ...
    }
}
`,

    start: (socket, onWin) => {
        
        // === SINGLETON PATTERN (Web Server) ===
        if (!module.exports.httpServer) {
            console.log(`[WEB] Starting Madrigal Server on ${module.exports.webPort}`);
            module.exports.httpServer = http.createServer((req, res) => {
                if (req.url === '/madrigal.c') {
                    res.writeHead(200, { 'Content-Type': 'text/plain' });
                    res.end(module.exports.cSourceCode);
                    return;
                }
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end("<h1>Madrigal Logistics</h1><p>Internal Only.</p><p>Source: <a href='/madrigal.c'>madrigal.c</a></p>");
            });
            module.exports.httpServer.listen(module.exports.webPort, '0.0.0.0', () => {});
        }

        // === SIMULATION STATE ===
        const WIN_FUNC_ADDR = 0x400896; // Simulated address of distribute_blue
        const DEFAULT_FUNC_ADDR = 0x400820; // Simulated address of standard_route
        
        // Memory State
        let heapMemory = Buffer.alloc(32); // Represents the struct/chunk
        let isAllocated = false;
        let isFreed = false; // Tracks UAF state

        // === NETCAT INTERFACE ===
        socket.write("=== MADRIGAL ELECTROMOTIVE LOGISTICS ===\n");
        socket.write(`[+] SOURCE CODE: http://cookcrackcapture.in:${module.exports.webPort}/madrigal.c\n`);
        socket.write(`[+] SYSTEM LEAK: 'distribute_blue' function is at 0x${WIN_FUNC_ADDR.toString(16)}\n`);
        
        const printMenu = () => {
            if (!socket.destroyed) {
                socket.write("\nOptions:\n");
                socket.write("(C)reate Shipment\n");
                socket.write("(D)elete/Cancel Shipment\n");
                socket.write("(F)ile Complaint (Overwrite Data)\n");
                socket.write("(P)rocess Shipment (Trigger Function)\n");
                socket.write("> ");
            }
        };

        printMenu();

        return (input) => {
            const choice = input.trim().toUpperCase().charAt(0);

            // === OPTION F: FILE COMPLAINT (THE EXPLOIT) ===
            // This is where the user sends the raw payload
            if (choice === 'F' && input.length > 2) {
                 // Parse the rest of the line as Hex Payload
                 const hexPayload = input.trim().substring(2).trim().replace(/\s+/g, '');
                 
                 if (!isFreed && !isAllocated) {
                     socket.write("[-] Error: No active memory chunk to overwrite.\n");
                     printMenu();
                     return;
                 }

                 try {
                    const payloadBuf = Buffer.from(hexPayload, 'hex');
                    // Overwrite the heap memory (simulating reuse of the freed chunk)
                    for(let i=0; i<payloadBuf.length && i<32; i++) {
                        heapMemory[i] = payloadBuf[i];
                    }
                    socket.write("[+] Complaint filed. Memory overwritten.\n");
                 } catch(e) {
                     socket.write("[-] Invalid Hex.\n");
                 }
                 printMenu();
                 return;
            }

            switch (choice) {
                case 'C': // Create
                    isAllocated = true;
                    isFreed = false;
                    // Reset Memory to Default Struct
                    heapMemory.fill(0);
                    heapMemory.writeUInt32LE(1, 0); // Priority 1
                    // 4 bytes padding
                    // Verify Route function ptr
                    heapMemory.writeUInt32LE(DEFAULT_FUNC_ADDR, 8); 
                    // Integrity Check: 1 ^ DEFAULT_ADDR
                    heapMemory.writeUInt32LE(1 ^ DEFAULT_FUNC_ADDR, 24); 
                    
                    socket.write(`[+] Shipment Created. ID: 1\n`);
                    break;

                case 'D': // Delete (Free)
                    if (isAllocated) {
                        isFreed = true; // Mark as freed (Dangling pointer remains in C logic)
                        socket.write("[-] Shipment Canceled. Memory marked as free.\n");
                    } else {
                        socket.write("[-] No shipment to cancel.\n");
                    }
                    break;

                case 'P': // Process (Trigger)
                    if (!isAllocated) {
                        socket.write("[-] No shipment data found.\n");
                        break;
                    }
                    
                    // 1. Read Values from "Memory"
                    const priority = heapMemory.readUInt32LE(0);
                    // Read Function Pointer (We simulate 64-bit pointers but stick to low values for ease)
                    const funcPtrLow = heapMemory.readUInt32LE(8); 
                    const integrity = heapMemory.readUInt32LE(24);

                    // 2. LOGIC CHECK (The Integrity Trap)
                    // Does Priority ^ FuncPtr == Integrity?
                    const calcCheck = priority ^ funcPtrLow;

                    if (calcCheck !== integrity) {
                        socket.write(`\n[!] INTEGRITY BREACH: Checksum Mismatch!\n`);
                        socket.write(`[!] Memory reads: Priority=${priority}, FuncAddr=0x${funcPtrLow.toString(16)}, Checksum=0x${integrity.toString(16)}\n`);
                        socket.write(`[!] Expected Checksum: 0x${calcCheck.toString(16)}\n`);
                        socket.write("[!] Lydia is shredding the documents. Goodbye.\n");
                        socket.destroy();
                        return;
                    }

                    // 3. EXECUTION
                    socket.write("[*] Integrity Verified.\n");
                    if (funcPtrLow === WIN_FUNC_ADDR) {
                        socket.write("[+] EXECUTING: distribute_blue()\n");
                        socket.write(`[+] FLAG: ${module.exports.flag}\n`);
                        onWin();
                        socket.destroy();
                    } else if (funcPtrLow === DEFAULT_FUNC_ADDR) {
                        socket.write("[*] EXECUTING: standard_route()\n");
                        socket.write("[*] Nothing happened.\n");
                    } else {
                        socket.write(`[?] Executing unknown function at 0x${funcPtrLow.toString(16)}... Crash.\n`);
                        socket.write("Try again: ")
                    }
                    break;

                default:
                    if (choice !== 'F') printMenu(); // Don't reprint for F
                    break;
            }
            if (choice !== 'F') printMenu();
        };
    }
};
