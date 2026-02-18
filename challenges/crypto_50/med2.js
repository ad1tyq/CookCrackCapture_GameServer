module.exports = {
    id: "gale_heartbeat",
    name: "Gale's Heartbeat Monitor",
    port: 5004, // Netcat Port
    flag: "HEISENBERG{V1G3N3R3_15_JUST_SHIFTING_W1TH_STYLE}",
    
    // Config
    timeout: 5000, // 5 seconds to reply
    possibleKeys: ["CHEMISTRY", "POLLOS", "ALBUQUERQUE", "METHYLAMINE", "BLUE", "WALTER", "JESSE", "GALE"],
    // Random plaintext phrases to encrypt
    plaintexts: [
        "RESPECT THE CHEMISTRY",
        "I AM THE ONE WHO KNOCKS",
        "TREAD LIGHTLY",
        "SAY MY NAME",
        "NO HALF MEASURES",
        "BETTER CALL SAUL"
    ],

    // Vigenère Encryption Function
    encryptVigenere: (text, key) => {
        let result = "";
        let keyIndex = 0;
        text = text.toUpperCase();
        key = key.toUpperCase();

        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i);
            
            // Only shift A-Z (65-90)
            if (charCode >= 65 && charCode <= 90) {
                const shift = key.charCodeAt(keyIndex % key.length) - 65;
                const encryptedChar = String.fromCharCode(((charCode - 65 + shift) % 26) + 65);
                result += encryptedChar;
                keyIndex++;
            } else {
                result += text[i]; // Keep spaces/punctuation as is
            }
        }
        return result;
    },

    start: (socket, onWin) => {
        // 1. Pick a random key and random plaintext
        const randomKey = module.exports.possibleKeys[Math.floor(Math.random() * module.exports.possibleKeys.length)];
        const targetPlaintext = module.exports.plaintexts[Math.floor(Math.random() * module.exports.plaintexts.length)];
        
        // 2. Encrypt it
        const ciphertext = module.exports.encryptVigenere(targetPlaintext, randomKey);

        // 3. User Interface
        socket.write("=== GALE'S HEARTBEAT MONITOR ===\n");
        socket.write("[+] STATUS: Lab equipment active.\n");
        socket.write("[+] ALERT: Encrypted heartbeat received. Decrypt immediately!\n");
        socket.write(`[+] TIME LIMIT: ${module.exports.timeout / 1000} seconds.\n\n`);
        
        socket.write(`KEY: ${randomKey}\n`);
        socket.write(`CIPHERTEXT: ${ciphertext}\n\n`);
        socket.write("Enter Decrypted Message: ");

        // 4. Start the Timer
        const timer = setTimeout(() => {
            if (!socket.destroyed) {
                socket.write("\n\n[-] TIMEOUT! Victor has traced your IP.\n");
                socket.destroy();
            }
        }, module.exports.timeout);

        // 5. Input Handler
        return (input) => {
            clearTimeout(timer); // Stop the timer if they reply

            // Check answer (case-insensitive)
            if (input.trim().toUpperCase() === targetPlaintext) {
                socket.write("\n[+] Heartbeat acknowledged. Lab is secure.\n");
                socket.write(`[+] FLAG: ${module.exports.flag}\n`);
                onWin();
                socket.destroy();
            } else {
                socket.write(`\n[-] INCORRECT. The correct message was: "${targetPlaintext}"\n`);
                socket.write("Try again: ")
            }
        };
    }
};
