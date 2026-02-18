module.exports = {
    id: "saul_burner",
    name: "Saul's Burner Protocol",
    port: 5003, // Netcat Port
    flag: "HEISENBERG{Y0_M4TH_15_T1GHT_Y0}",

    // Character Set: 0-25=A-Z, 26-35=0-9, 36=_
    charset: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_",

    start: (socket, onWin) => {
        // === CHALLENGE LOGIC ===
        // We will "encrypt" the flag into a list of large numbers.
        // The player must reverse this by calculating: number % 37 --> character
        
        // 1. Generate the message payload from the flag
        const message = module.exports.flag;
        const numbers = [];

        for (let i = 0; i < message.length; i++) {
            const char = message[i].toUpperCase();
            
            // Find the index of the character in our custom charset
            // If it's a bracket '{' or '}', we leave it alone or handle it? 
            // The prompt says "A-Z, 0-9, _". 
            // To make it solvable, we will only encode the CONTENT inside the curly braces 
            // OR we encode the whole thing if we map special chars. 
            // Standard PicoCTF behavior: The output is just the CONTENT, wrapper is manual.
            // BUT, for this specific "Saul" prompt, let's encode the *entire* string 
            // but map '{' and '}' to something else or just skip them in the logic 
            // to force the user to figure out the wrapper.
            
            // SIMPLIFIED LOGIC: We will just encode the INNER TEXT: "Y0_M4TH_15_T1GHT_Y0"
            // The player has to wrap it in HEISENBERG{...} manually as per instructions,
            // OR we encode the wrapper too if we extend the charset.
            // Let's stick to the prompt's charset (37 chars).
            // We will encode the flag *content* only.
            
            const charsetIndex = module.exports.charset.indexOf(char);
            
            if (charsetIndex !== -1) {
                // We create a "large number" that results in this index when mod 37 is applied.
                // Formula: (Random Multiplier * 37) + index
                const multiplier = Math.floor(Math.random() * 800) + 50; // Random large multiplier
                const encryptedNum = (multiplier * 37) + charsetIndex;
                numbers.push(encryptedNum);
            }
        }

        // === USER INTERFACE (Netcat) ===
        socket.write("=== SAUL'S BURNER PHONE SERVICE ===\n");
        socket.write("[+] CONNECTED: Encrypted uplink established.\n");
        socket.write("[+] INCOMING MESSAGE FROM: 'Magic Man'\n\n");
        
        socket.write("MSG_START\n");
        // Send the numbers separated by spaces
        socket.write(numbers.join(" "));
        socket.write("\nMSG_END\n\n");

        socket.write("INSTRUCTIONS:\n");
        socket.write("1. Take each number modulo 37.\n");
        socket.write("2. Map result: 0-25 -> A-Z, 26-35 -> 0-9, 36 -> _\n");
        socket.write("3. Wrap the decrypted text in the flag format: HEISENBERG{...}\n");
        socket.write("   Example: If decrypted text is 'HELLO', enter HEISENBERG{HELLO}\n\n");
        
        socket.write("Enter Decrypted Flag: ");

        return (input) => {
            // Check if the input matches the actual flag
            if (input.trim() === module.exports.flag) {
                socket.write("\n[+] 'S'all good, man! Message received.'\n");
                onWin();
                socket.destroy();
            } else {
                socket.write("\n[-] Transmission garbled. DEA is tracing... Connection severed.\n");
                socket.write("Try again: ")
            }
        };
    }
};
