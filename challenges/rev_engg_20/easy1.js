const http = require('http');

module.exports = {
    id: "rv_generator",
    name: "The RV Generator",
    port: 2001,      // Netcat Port
    webPort: 2671,   // Web Port (Hosts the Java file)
    flag: "HEISENBERG{5t4rt_th3_g3n3r4t0r_j3553_4521}",

    // We store the server instance here
    httpServer: null,

    // === THE CHALLENGE SOURCE CODE ===
    // This is the Java file the user downloads.
    // The password "5t4rt_th3_g3n3r4t0r_j3553_4521" is hardcoded inside.
    javaSource: `import java.util.*;

class CrystalShipPower {
    public static void main(String args[]) {
        CrystalShipPower ignition = new CrystalShipPower();
        Scanner scanner = new Scanner(System.in); 
        System.out.print("Enter ignition sequence password: ");
        String userInput = scanner.next();
        
        // Expected format: HEISENBERG{password}
        if (userInput.startsWith("HEISENBERG{") && userInput.endsWith("}")) {
            String input = userInput.substring(11, userInput.length() - 1);
            if (ignition.isAuthorized(input)) {
                System.out.println("Generator humming... Let's cook.");
            } else {
                System.out.println("Ignition failed! Better call Saul.");
            }
        } else {
            System.out.println("Wrong flag format, yo!");
        }
    }

    /**
     * I left the password here so I wouldn't forget it, but 
     * Skyler says this is 'unsecure' or whatever. 
     * It's not like a DEA agent is gonna find this laptop in the desert.
     * - Jesse P.
     */
    public boolean isAuthorized(String password) {
        return password.equals("5t4rt_th3_g3n3r4t0r_j3553_4521");
    }
}`,

    start: (socket, onWin) => {
        
        // === SINGLETON PATTERN (Web Server) ===
        if (!module.exports.httpServer) {
            
            console.log(`[WEB] Starting RV Dashboard Server on ${module.exports.webPort}`);

            module.exports.httpServer = http.createServer((req, res) => {
                // 1. Serve the Java File
                if (req.url === '/CrystalShipPower.java') {
                    res.writeHead(200, { 'Content-Type': 'text/x-java-source' });
                    res.end(module.exports.javaSource);
                    return;
                }

                // 2. Default Page
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end("<h1>Crystal Ship Dashboard</h1><p>Generator Status: OFFLINE</p><p>Error: Ignition Sequence Missing.</p><p>Download Log: <a href='/CrystalShipPower.java'>CrystalShipPower.java</a></p>");
            });

            module.exports.httpServer.listen(module.exports.webPort, '0.0.0.0', () => {
                console.log(`[WEB] File Server active on port ${module.exports.webPort}`);
            });

            module.exports.httpServer.on('error', (err) => {
                console.error(`[WEB ERR] Server error: ${err.message}`);
            });
        }

        // === USER INTERFACE (Netcat) ===
        socket.write("=== THE RV GENERATOR ===\n");
        socket.write("[+] MSG: Yo, Mr. White! The generator won't start.\n");
        socket.write("[+] INTEL: I found the ignition code on the dashboard laptop.\n");
        socket.write(`[+] DOWNLOAD: http://cookcrackcapture.in:${module.exports.webPort}/CrystalShipPower.java\n`);
        socket.write("[+] MISSION: Find the password inside the file to start the cook.\n");
        socket.write("Enter the Flag: ");

        return (input) => {
            if (input.trim() === module.exports.flag) {
                socket.write("\n[+] Ignition Successful! The Crystal Ship is live.\n");
                onWin();
                socket.destroy();
            } else {
                socket.write("\n[-] Engine stalled. Try again.\n");
                socket.write("Try again: ")
            }
        };
    }
};
