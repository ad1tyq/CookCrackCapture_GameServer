const path = require('path');

module.exports = {
    id: "rv_battery",
    name: "Phase 1: The RV Battery",
    port: 7001,      // Netcat Port
    flag: "HEISENBERG_99", // The answer to submit

    // CRC32 Table (Moved inside to be self-contained)
    crcTable: (() => {
        const table = new Uint32Array(256);
        for (let i = 0; i < 256; i++) {
            let crc = i;
            for (let j = 0; j < 8; j++) {
                crc = (crc & 1) ? (0xEDB88320 ^ (crc >>> 1)) : (crc >>> 1);
            }
            table[i] = crc >>> 0;
        }
        return table;
    })(),

    // Helper: Calculate CRC32
    crc32: (buffer, start, end) => {
        let crc = 0xFFFFFFFF;
        for (let i = start; i < end; i++) {
            crc = module.exports.crcTable[(crc ^ buffer[i]) & 0xFF] ^ (crc >>> 8);
        }
        return (crc ^ 0xFFFFFFFF) >>> 0;
    },

    // Helper: Generate the specific challenge buffer
    generateChallengeBuffer: () => {
        const buffer = Buffer.alloc(512); // Standard page size
        
        // 1. Magic Header "WALT"
        buffer.write("WALT", 0);

        // 2. The Secret Message
        const secret = "HEISENBERG_99";
        const key = 0x0C; // The "12 Volts" key
        
        // Write Length at 0x24
        buffer.writeUInt32LE(secret.length, 0x24);

        // Write Encrypted Message at 0x80
        for(let i=0; i<secret.length; i++) {
            buffer[0x80 + i] = secret.charCodeAt(i) ^ key;
        }

        // 3. Calculate "Correct" CRC (Assuming voltage is 0x0C)
        // We set the Correct Voltage first to calculate the valid checksum
        buffer[0x08] = 0x0C; 
        buffer[0x09] = 0x00;
        
        const correctCRC = module.exports.crc32(buffer, 0, 0x1FC); // CRC up to 0x1FC
        
        // Write the Checksum at the end
        buffer.writeUInt32LE(correctCRC, 0x1FC);

        // 4. CORRUPT THE BUFFER (The Challenge)
        // The solution says the user sees "ff ff" at 0x08-0x09
        buffer[0x08] = 0xFF; 
        buffer[0x09] = 0xFF;

        return buffer;
    },

    start: (socket, onWin) => {
        // --- GAME STATE ---
        // Each player gets their own instance of the buffer
        let workingBuffer = module.exports.generateChallengeBuffer();
        let hintsUsed = 0;

        // --- HELPER: Hex Dump to Socket ---
        const hexDump = (buffer, start = 0, length = 128) => {
            const end = Math.min(start + length, buffer.length);
            socket.write(`\n  Offset    00 01 02 03 04 05 06 07  08 09 0A 0B 0C 0D 0E 0F    ASCII\n`);
            socket.write(`  ──────────────────────────────────────────────────────────────────\n`);

            for (let i = start; i < end; i += 16) {
                let hex1 = '';
                let hex2 = '';
                let ascii = '';

                for (let j = 0; j < 16; j++) {
                    if (i + j < buffer.length) {
                        const byte = buffer[i + j];
                        if (j < 8) hex1 += byte.toString(16).padStart(2, '0') + ' ';
                        else       hex2 += byte.toString(16).padStart(2, '0') + ' ';
                        
                        ascii += (byte >= 32 && byte <= 126) ? String.fromCharCode(byte) : '.';
                    }
                }
                socket.write(`  ${i.toString(16).padStart(8, '0')}  ${hex1.padEnd(24)}${hex2.padEnd(24)} ${ascii}\n`);
            }
            socket.write('\n');
        };

        // --- HELPER: Banner ---
        const showBanner = () => {
            socket.write("\n╔════════════════════════════════════════════════════════════╗\n");
            socket.write("║      PHASE 1: THE RV BATTERY 🔋                            ║\n");
            socket.write("╚═══════════════════════════════════════════════════════════╝\n");
            socket.write("\n  The BMS (Battery Management System) dump is corrupted.\n");
            socket.write("  Fix the voltage reading to 12V (hint: hex) and decrypt the message.\n");
            socket.write("═══════════════════════════════════════════════════════════════\n");
    socket.write("                          📖 THE STORY\n");
    socket.write("═══════════════════════════════════════════════════════════════\n");
    socket.write("\n");
    socket.write("  The sun beats down on the New Mexico desert as you approach\n");
    socket.write("  the abandoned RV. Jesse said the cook's secrets were hidden\n");
    socket.write("  in the vehicle's systems, but when you hotwire the dashboard,\n");
    socket.write("  only garbage data appears on the diagnostic screen.\n");
    socket.write("\n");
    socket.write("  The Battery Management System has a corrupted data dump.\n");
    socket.write("  Something is wrong with the voltage reading - it's showing\n");
    socket.write("  impossible values. If you can fix the corruption and restore\n");
    socket.write("  the correct voltage, the system might reveal its secrets...\n");
    socket.write("\n");
    socket.write("  \"Yeah, Mr. White! Yeah, science!\" - Jesse Pinkman\n");
    socket.write("\n");
    socket.write("═══════════════════════════════════════════════════════════════\n");
    socket.write("                        🎯 YOUR MISSION\n");
    socket.write("═══════════════════════════════════════════════════════════════\n");
    socket.write("\n");
    socket.write("  1. Examine the corrupted data dump (dump command)\n");
    socket.write("  2. Find the corrupted bytes and fix them (fix command)\n");
    socket.write("  3. Validate the checksum to confirm repair (checksum command)\n");
    socket.write("  4. Decrypt the hidden message (decrypt command)\n");
    socket.write("  5. Submit the flag (submit command)\n");
    socket.write("\n");
    socket.write("  💡 HINT: Car batteries are typically 12 volts...\n");
    socket.write("\n");
            socket.write("\n  Type 'help' for commands.\n\n");
            socket.write("rv_battery> ");
        };

        // --- HELPER: Help ---
        const showHelp = () => {
            socket.write("\n  dump [offset]        - Show hex dump\n");
            socket.write("  info                 - Show file info\n");
            socket.write("  fix <offset> <value> - Edit byte (hex)\n");
            socket.write("  checksum             - Check CRC32 integrity\n");
            socket.write("  decrypt <key>        - XOR decrypt hidden msg\n");
            socket.write("  submit <answer>      - Submit final flag\n");
            socket.write("  hint                 - Get help\n");
            socket.write("  quit                 - Exit\n\n");
        };

        // Start the interaction
        showBanner();

        // --- INPUT HANDLER ---
        return (input) => {
            const args = input.trim().split(/\s+/);
            const cmd = args[0]?.toLowerCase();

            switch (cmd) {
                case 'help':
                case '?':
                    showHelp();
                    break;

                case 'dump':
                case 'xxd':
                    const offset = args[1] ? parseInt(args[1], 16) : 0;
                    hexDump(workingBuffer, offset);
                    break;

                case 'info':
                    socket.write("\n  File Information:\n");
                    socket.write(`  - Size: ${workingBuffer.length} bytes\n`);
                    socket.write(`  - Magic: ${workingBuffer.toString('utf8', 0, 4)}\n`);
                    socket.write(`  - Byte at 0x08: 0x${workingBuffer[0x08].toString(16).padStart(2,'0')}\n\n`);
                    break;

                case 'fix':
                    if (args.length < 3) {
                        socket.write("  [!] Usage: fix <offset> <value> (e.g., fix 8 0c)\n");
                    } else {
                        const fixOffset = parseInt(args[1], 16);
                        const fixValue = parseInt(args[2], 16);
                        if (fixOffset >= 0 && fixOffset < workingBuffer.length) {
                            workingBuffer[fixOffset] = fixValue & 0xFF;
                            socket.write(`  [+] Set byte at 0x${fixOffset.toString(16)} to 0x${(fixValue & 0xFF).toString(16)}\n`);
                        } else {
                            socket.write("  [!] Invalid offset\n");
                        }
                    }
                    break;

                case 'checksum':
                case 'crc':
                    const storedCRC = workingBuffer.readUInt32LE(0x1FC);
                    const calcCRC = module.exports.crc32(workingBuffer, 0, 0x1FC);
                    socket.write(`\n  Stored CRC32:     0x${storedCRC.toString(16).toUpperCase()}\n`);
                    socket.write(`  Calculated CRC32: 0x${calcCRC.toString(16).toUpperCase()}\n`);
                    if (storedCRC === calcCRC) {
                        socket.write("  [✓] CHECKSUM VALID! The file structure is repaired.\n\n");
                    } else {
                        socket.write("  [✗] CHECKSUM MISMATCH. Keep fixing.\n\n");
                    }
                    break;

                case 'decrypt':
                    if (args.length < 2) {
                        socket.write("  [!] Usage: decrypt <xor_key_hex>\n");
                    } else {
                        const xorKey = parseInt(args[1], 16);
                        const msgLen = workingBuffer.readUInt32LE(0x24);
                        let decrypted = '';
                        
                        // Safety check on length
                        const safeLen = Math.min(msgLen, 64);
                        
                        for (let i = 0; i < safeLen; i++) {
                            const dec = workingBuffer[0x80 + i] ^ xorKey;
                            if (dec >= 32 && dec <= 126) decrypted += String.fromCharCode(dec);
                            else decrypted += '?';
                        }
                        socket.write(`\n  XOR Key: 0x${xorKey.toString(16)}\n`);
                        socket.write(`  Decrypted: "${decrypted}"\n\n`);
                    }
                    break;

                case 'submit':
                    if (args.length < 2) {
                        socket.write("  [!] Usage: submit <answer>\n");
                    } else {
                        const answer = args.slice(1).join('_').toUpperCase();
                        if (answer === module.exports.flag) {
                            socket.write("\n╔═══════════════════════════════════════════════════════════╗\n");
                            socket.write("║  ✓ CORRECT! You've repaired the RV battery data!           ║\n");
                            socket.write("╚════════════════════════════════════════════════════════════╝\n");
                            socket.write(`\n  FLAG: ${module.exports.flag}\n\n`);
                            
                            // Trigger Win
                            onWin(); 
                            
                            // Destroy socket only on success
                            socket.destroy(); 
                            return; 
                        } else {
                            socket.write("\n  [✗] Incorrect. Keep analyzing the dump file.\n");
                            socket.write("  Try again.\n\n");
                        }
                    }
                    break;

                case 'hint':
                    hintsUsed++;
                    if (hintsUsed === 1) socket.write("\n  [HINT 1] The file Magic is 'WALT'. Look at offset 0x08... it looks wrong.\n\n");
                    else if (hintsUsed === 2) socket.write("\n  [HINT 2] Car batteries are 12 Volts. 12 in Hex is 0C.\n\n");
                    else if (hintsUsed === 3) socket.write("\n  [HINT 3] fix 8 c -> checksum -> decrypt c\n\n");
                    else socket.write("\n  [!] No more hints.\n\n");
                    break;

                case 'reset':
                    workingBuffer = module.exports.generateChallengeBuffer();
                    socket.write("  [*] Buffer reset to corrupted state.\n");
                    break;

                case 'quit':
                case 'exit':
                    socket.write("\n  \"Tread lightly.\"\n");
                    socket.destroy();
                    return;

                default:
                    if (cmd && cmd.length > 0) {
                        socket.write(`  [!] Unknown command: ${cmd}\n`);
                        socket.write("  Try again.\n");
                    }
                    break;
            }

            // Always reprompt unless socket destroyed
            socket.write("rv_battery> ");
        };
    }
};
