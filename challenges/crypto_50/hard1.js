const http = require('http');

module.exports = {
    id: "madrigal_misstep",
    name: "The Madrigal Misstep",
    port: 5005,      // Netcat Port
    webPort: 5675,   // Web Port (Hosts the Source Code)
    flag: "HEISENBERG{n0nc3_r3u53_15_4_f4t4l_m155t3p_lyd14}",

    // We store the server instance here
    httpServer: null,

    // === THE CHALLENGE SOURCE CODE ===
    // This is the Python file users download. 
    // It implements a rotating nonce pool to break simple AI solvers.
    pythonSource: `import secrets
import hashlib
from Crypto.Cipher import ChaCha20_Poly1305

# "Lydia, we need to be professional about this." - Gus Fring
flag = "HEISENBERG{...}" 

def shasum(x):
    return hashlib.sha256(x).digest()

# The key is derived from a secret and the flag
key = shasum(secrets.token_bytes(32) + flag.encode())

# THE VULNERABILITY: A small, static rotating nonce pool.
# Lydia's engineers thought rotating through 2 nonces was "safe enough."
NONCE_POOL = [
    b'Madrigal_N1', # Nonce 0
    b'Madrigal_N2'  # Nonce 1
]

messages = [
    "Shipment ID: 991. Content: Industrial Chicken Fryers.", # Uses NONCE_POOL[0]
    "Personnel Log: Victor is on site at the laundry lab.",   # Uses NONCE_POOL[1]
    "Manifest: Phenylacetic acid - 200 Gallons."              # Uses NONCE_POOL[0] !! REUSE !!
]

goal = "Authorize Shipment: Blue Sky"

def encrypt(message, index):
    nonce = NONCE_POOL[index % len(NONCE_POOL)]
    cipher = ChaCha20_Poly1305.new(key=key, nonce=nonce)
    ciphertext, tag = cipher.encrypt_and_digest(message.encode())
    return ciphertext + tag + nonce

def decrypt(message_enc):
    # Format: [Ciphertext][Tag(16)][Nonce(11)]
    ciphertext = message_enc[:-27]
    tag = message_enc[-27:-11]
    nonce = message_enc[-11:]
    cipher = ChaCha20_Poly1305.new(key=key, nonce=nonce)
    return cipher.decrypt_and_verify(ciphertext, tag)

# Display Intercepted Traffic
for i, msg in enumerate(messages):
    print(f"Intercepted Packet {i}:")
    print(f"Plaintext: {msg}")
    encrypted = encrypt(msg, i)
    print(f"HEX: {encrypted.hex()}\\n")

print("--- MADRIGAL LOGISTICS TERMINAL ---")
user_input = bytes.fromhex(input("Inject Command (HEX): "))
try:
    decrypted = decrypt(user_input).decode()
    print(f"Decrypted Command: {decrypted}")
    if decrypted == goal:
        print(f"ACCESS GRANTED. FLAG: {flag}")
except Exception:
    print("INVALID AUTHENTICATION TAG. ALARM TRIGGERED.")
`,

    start: (socket, onWin) => {
        // === SINGLETON PATTERN (Web Server) ===
        if (!module.exports.httpServer) {
            console.log(`[WEB] Starting Madrigal Crypto Server on ${module.exports.webPort}`);
            module.exports.httpServer = http.createServer((req, res) => {
                if (req.url === '/madrigal_handshake.py') {
                    res.writeHead(200, { 'Content-Type': 'text/x-python' });
                    res.end(module.exports.pythonSource);
                    return;
                }
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end("<h1>Madrigal Electromotive</h1><p>Secure Handshake Protocol v4.2</p><a href='/madrigal_handshake.py'>madrigal_handshake.py</a>");
            });
            module.exports.httpServer.listen(module.exports.webPort, '0.0.0.0');
        }

        // === USER INTERFACE (Netcat) ===
        socket.write("=== THE MADRIGAL MISSTEP ===\n");
        socket.write(`[+] LOGISTICS PORTAL: http://cookcrackcapture.in:${module.exports.webPort}/madrigal_handshake.py\n`);
        socket.write("[+] Lydia: 'The encryption is state-of-the-art, Gus. No one is getting in.'\n");
        socket.write("[+] Mission: Forge the 'Blue Sky' authorization command to bypass the terminal.\n\n");
        socket.write("Enter Command Payload (HEX): ");

        return (input) => {
            // Note: In a real-world scenario, you'd run the actual Python crypto logic here.
            // For the CTF wrapper, we check if they successfully found the flag.
            if (input.trim() === module.exports.flag) {
                socket.write("\n[+] Integrity Check: BYPASSED.\n[+] 'You're goddamn right.'\n");
                onWin();
                socket.destroy();
            } else {
                socket.write("\n[-] INVALID TAG. Lydia is calling the hitmen.\n");
                socket.write("Try again: ")
            }
        };
    }
};
