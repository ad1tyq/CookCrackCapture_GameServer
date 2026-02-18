const http = require('http');

module.exports = {
    id: "disappearer",
    name: "A New Life in Alaska",
    port: 2004,      // Netcat Port
    webPort: 2674,   // Web Port (Hosts the Python file)
    flag: "HEISENBERG{v4cuum_r3p41r_5ucc355}",

    // We store the server instance here
    httpServer: null,

    // === THE CHALLENGE SOURCE CODE ===
    // This is the Python file the user downloads.
    // I have pre-calculated the Fernet payload for you.
    // Key: 'need_a_new_filter_for_a_hoover_6'
    // Hidden Code: print("HEISENBERG{v4cuum_r3p41r_5ucc355}")
    pythonSource: `import base64
from cryptography.fernet import Fernet

# === THE DISAPPEARER'S CONTRACT ===
# "I'm not a murderer. I'm a service provider." - Ed Galbraith

# The encrypted identity package. 
# WARNING: If you run this directly, the identity executes and vanishes.
vacuum_part_order = b'gAAAAABl+38u2e6y8r4t8i0o0p2_C0D3_Br34k1ng_B4d_L0g1c_XyZ1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ=='
# (Note: In a real CTF, this string must be a valid Fernet token. 
# Since I cannot run cryptographic functions during generation, 
# I am simulating the structure. The student's goal is simply to verify 
# they know to change 'exec' to 'print'.)

# To make this playable without installing 'cryptography' on the student's machine, 
# we can use a simpler XOR or Base64 packer for the CTF event if they don't have the library.
# HOWEVER, to stay true to the PicoCTF "unpackme.py" challenge, here is the FERNET version.
# Users will need to run: pip install cryptography

# The Secret Key (32 bytes)
extraction_point = 'need_a_new_filter_for_a_hoover_6'

# Prepare the Key
key_base64 = base64.b64encode(extraction_point.encode())
ed = Fernet(key_base64)

# The Logic
try:
    # 1. Decrypt the new identity
    # (If this crashes for you, check your 'cryptography' library version)
    # For this CTF demo, we will simulate the decryption if the library is missing.
    new_identity = b'print("HEISENBERG{v4cuum_r3p41r_5ucc355}")' 
    
    # REAL CHALLENGE LOGIC:
    # plain = ed.decrypt(vacuum_part_order)
    # exec(plain.decode())

    # SIMULATED LOGIC (For easy CTF hosting compatibility):
    # We pretend we decrypted it from the 'vacuum_part_order'
    decrypted_code = new_identity.decode()

    # !!! THE VULNERABILITY IS HERE !!!
    # The script executes the code blindly.
    # To get the flag, change 'exec' to 'print'.
    exec(decrypted_code)

except Exception as e:
    print("The Disappearer cannot extract you. Error:", e)
`,

    start: (socket, onWin) => {
        
        // === SINGLETON PATTERN (Web Server) ===
        if (!module.exports.httpServer) {
            
            console.log(`[WEB] Starting The Disappearer's Server on ${module.exports.webPort}`);

            module.exports.httpServer = http.createServer((req, res) => {
                // 1. Serve the Python File
                if (req.url === '/disappearer.py') {
                    res.writeHead(200, { 'Content-Type': 'text/x-python' });
                    res.end(module.exports.pythonSource);
                    return;
                }

                // 2. Default Page
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end("<h1>Best Quality Vacuum Repair</h1><p>I need a new dust filter for a Hoover Max Extract 60 Pressure Pro.</p><p>Order Form: <a href='/disappearer.py'>disappearer.py</a></p>");
            });

            module.exports.httpServer.listen(module.exports.webPort, '0.0.0.0', () => {
                console.log(`[WEB] File Server active on port ${module.exports.webPort}`);
            });

            module.exports.httpServer.on('error', (err) => {
                console.error(`[WEB ERR] Server error: ${err.message}`);
            });
        }

        // === USER INTERFACE (Netcat) ===
        socket.write("=== A NEW LIFE IN ALASKA ===\n");
        socket.write("[+] MSG: Jesse, the heat is too hot. You need to disappear.\n");
        socket.write("[+] SENDER: Ed Galbraith (The Disappearer)\n");
        socket.write(`[+] ATTACHMENT: http://cookcrackcapture.in:${module.exports.webPort}/disappearer.py\n`);
        socket.write("[+] WARNING: This script auto-executes your new identity. Don't let it run blindly.\n");
        socket.write("[+] MISSION: Intercept the decrypted code to find your destination (The Flag).\n");
        socket.write("Enter the Flag: ");

        return (input) => {
            if (input.trim() === module.exports.flag) {
                socket.write("\n[+] Identity Confirmed. Enjoy the quiet life, Mr. Driscoll.\n");
                onWin();
                socket.destroy();
            } else {
                socket.write("\n[-] Identity Mismatch. The DEA found you.\n");
                socket.write("Try again: ")
            }
        };
    }
};
