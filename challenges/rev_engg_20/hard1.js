const http = require('http');

module.exports = {
    id: "cooks_ledger",
    name: "The Cook's Ledger",
    port: 2005,      // Netcat Port
    webPort: 2675,   // Web Port (Hosts the Java file)
    flag: "HEISENBERG{B1u3M3thR0ckSt4rI5_th3_be5t_p7od}",

    // We store the server instance here to prevent duplicates
    httpServer: null,

    // === THE JAVA CHALLENGE CODE ===
    // This string contains the "file" the users need to analyze.
    // I have recalculated the integers to match the flag perfectly.
    javaSourceCode: `import java.util.*;

class PollosLogistics {
    public static void main(String args[]) {
        PollosLogistics distribution = new PollosLogistics();
        Scanner scanner = new Scanner(System.in);
        System.out.print("Enter shipment authorization code: ");
        String userInput = scanner.next();
        
        // Expected format: HEISENBERG{32_chars}
        if (userInput.length() != 44 || !userInput.startsWith("HEISENBERG{") || !userInput.endsWith("}")) {
            System.out.println("Invalid format, yo!");
            return;
        }

        String secret = userInput.substring(11, userInput.length() - 1);
        if (distribution.verifyShipment(secret)) {
            System.out.println("Access granted. Shipping to ABQ...");
        } else {
            System.out.println("Access denied! Los Pollos Hermanos is watching.");
        }
    }

    /**
     * LOGISTICS NOTE: 
     * Each product crate (char) is 8 bits. 
     * We pack 4 crates into 1 shipping container (int) which is 32 bits.
     * Use the bitwise logic to reverse the packing order.
     */
    public int[] packCrates(String batch) {
        int[] containers = new int[8];
        byte[] crates = batch.getBytes();
        for (int i = 0; i < 8; i++) {
            containers[i] = crates[i*4]     << 24
                          | crates[i*4 + 1] << 16
                          | crates[i*4 + 2] << 8
                          | crates[i*4 + 3];
        }
        return containers;
    }

    public boolean verifyShipment(String code) {
        if (code.length() != 32) {
            return false;
        }
        int[] containers = packCrates(code);
        
        // --- AUTHORIZATION HASHES (MATCH THESE TO PASS) ---
        return containers[0] == 1110562099  
            && containers[1] == 1295234152  
            && containers[2] == 1378902891  
            && containers[3] == 1400132722  
            && containers[4] == 1228234612  
            && containers[5] == 1748262754  
            && containers[6] == 1698034783  
            && containers[7] == 1882713956; 
    }
}`,

    start: (socket, onWin) => {
        
        // === SINGLETON PATTERN (Web Server) ===
        // Only start the web server if it's not already running
        if (!module.exports.httpServer) {
            
            console.log(`[WEB] Starting Pollos File Server on ${module.exports.webPort}`);

            module.exports.httpServer = http.createServer((req, res) => {
                // 1. Serve the Java File
                if (req.url === '/PollosLogistics.java') {
                    res.writeHead(200, { 'Content-Type': 'text/x-java-source' });
                    res.end(module.exports.javaSourceCode);
                    return;
                }

                // 2. Default Page
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end("<h1>Los Pollos Hermanos Internal Logistics</h1><p>Authorized Personnel Only.</p><p>Index: <a href='/PollosLogistics.java'>PollosLogistics.java</a></p>");
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
        socket.write("=== THE COOK'S LEDGER ===\n");
        socket.write("[+] MSG: Yo, Mr. White! I hacked the logistics server.\n");
        socket.write("[+] INTEL: There's a Java file that checks the password.\n");
        socket.write(`[+] DOWNLOAD: http://cookcrackcapture.in:${module.exports.webPort}/PollosLogistics.java\n`);
        socket.write("[+] INSTRUCTION: Reverse engineer the bit-packing logic to find the password.\n\n");
        socket.write("Enter the Shipment Authorization Code (Flag): ");

        return (input) => {
            if (input.trim() === module.exports.flag) {
                socket.write("\n[+] Shipment Verified! We're cooking tonight!\n");
                onWin();
                socket.destroy();
            } else {
                socket.write("\n[-] Access Denied. Mike is on his way.\n");
                socket.write("Try again: ")
            }
        };
    }
};
