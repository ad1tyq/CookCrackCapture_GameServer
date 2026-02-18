module.exports = {
    id: "cousins_axe",
    name: "Phase 4: The Cousins' Axe",
    port: 7004,      // Netcat Port
    flag: "0x52455350454354", // HEX for "RESPECT"
    phase3_password: "GALE_BOETTICHER_1307",

    // === STATIC DATA ===
    // The encrypted data (7 bytes)
    encryptedData: Buffer.from([0x10, 0x12, 0x38, 0x2d, 0x53, 0x5b, 0x70]),

    // The VM Bytecode (Mocked for analysis)
    vmBytecode: Buffer.from([
        0x41, 0x58, 0x45, 0x21, // Header: AXE!
        0x01,                   // Version
        0x07,                   // Data Length
        // Code Section
        0xA0, 0x00,             // LOAD R0, key[0]
        0xA1, 0x01,             // LOAD R1, key[1]
        0xA2, 0x02,             // LOAD R2, key[2]
        0xA3, 0x03,             // LOAD R3, key[3]
        0xA4, 0x04,             // LOAD R4, key[4]
        0xA5, 0x05,             // LOAD R5, key[5]
        0xA6, 0x06,             // LOAD R6, key[6]
        0xB0, 0x00,             // XOR data[0], R0
        0xB1, 0x01,             // XOR data[1], R1
        0xB2, 0x02,             // XOR data[2], R2
        0xB3, 0x03,             // XOR data[3], R3
        0xB4, 0x04,             // XOR data[4], R4
        0xB5, 0x05,             // XOR data[5], R5
        0xB6, 0x06,             // XOR data[6], R6
        0xFF                    // HALT
    ]),

    start: (socket, onWin) => {
        
        // === GAME STATE ===
        let authenticated = false;
        let hints = 0;

        // --- HELPER: Hex Dump ---
        const dumpBytecode = () => {
            socket.write("\n  VM Bytecode Dump:\n");
            socket.write("  ─────────────────────────────────────────────────\n");
            
            const buffer = module.exports.vmBytecode;
            let offset = 0;
            while (offset < buffer.length) {
                const line = [];
                const ascii = [];
                for (let i = 0; i < 16 && offset + i < buffer.length; i++) {
                    const byte = buffer[offset + i];
                    line.push(byte.toString(16).padStart(2, '0'));
                    ascii.push(byte >= 32 && byte < 127 ? String.fromCharCode(byte) : '.');
                }
                socket.write(`  ${offset.toString(16).padStart(4, '0')}  ${line.join(' ').padEnd(48)}  ${ascii.join('')}\n`);
                offset += 16;
            }
            socket.write("\n  Analysis hints:\n");
            socket.write("  - Bytes 0x00-0x03: Magic header\n");
            socket.write("  - Bytes 0x06+: VM instructions\n\n");
        };

        // --- HELPER: Banner ---
        const showBanner = () => {
            socket.write("\n╔════════════════════════════════════════════════════════════╗\n");
            socket.write("║      PHASE 4: THE COUSINS' AXE 🪓                          ║\n");
            socket.write("╚════════════════════════════════════════════════════════════╝\n");
            socket.write("\n  You found a custom VM binary on a burner phone.\n");
            socket.write("  It processes encrypted data using a derived key.\n");
            socket.write("\n  \"La familia es todo.\" - The Salamanca Twins\n");
            socket.write("═══════════════════════════════════════════════════════════════\n");
    socket.write("                          📖 THE STORY\n");
    socket.write("═══════════════════════════════════════════════════════════════\n");
    socket.write("\n");
    socket.write("  The Salamanca Twins left behind a custom virtual machine\n");
    socket.write("  called 'The Axe' that protects their secrets. You've found\n");
    socket.write("  encrypted data and the VM bytecode, but the decryption key\n");
    socket.write("  is derived from a password...\n");
    socket.write("\n");
    socket.write("  Your job: Reverse engineer the VM to understand how it\n");
    socket.write("  derives the key, then decrypt the hidden message.\n");
    socket.write("\n");
    socket.write("  \"La familia es todo.\" - The Salamanca Twins\n");
    socket.write("\n");
    socket.write("═══════════════════════════════════════════════════════════════\n");
    socket.write("                        🎯 YOUR MISSION\n");
    socket.write("═══════════════════════════════════════════════════════════════\n");
    socket.write("\n");
    socket.write("  1. Authenticate with the Phase 3 password\n");
    socket.write("  2. Dump and analyze the VM bytecode\n");
    socket.write("  3. Understand the opcode instruction set\n");
    socket.write("  4. Figure out the key derivation algorithm\n");
    socket.write("  5. Manually compute the XOR key\n");
    socket.write("  6. Decrypt the data and submit the hex result\n");
    socket.write("\n");
    socket.write("═══════════════════════════════════════════════════════════════\n");
            socket.write("\n  Type 'help' for commands.\n\n");
            socket.write("axe> ");
        };

        // --- HELPER: Help ---
        const showHelp = () => {
            socket.write("\n  auth <pass>      - Authenticate (Use Phase 3 flag)\n");
            socket.write("  bytecode         - Dump VM bytecode\n");
            socket.write("  opcodes          - Show opcode cheat sheet\n");
            socket.write("  data             - Show encrypted data\n");
            socket.write("  derive <string>  - Test key derivation algorithm\n");
            socket.write("  trace            - Trace execution (Requires Auth)\n");
            socket.write("  decrypt <key>    - Try to decrypt with hex key\n");
            socket.write("  submit <hex>     - Submit final answer\n");
            socket.write("  hint             - Get help\n");
            socket.write("  quit             - Exit\n\n");
        };

        showBanner();

        // --- INPUT HANDLER ---
        return (input) => {
            const args = input.trim().split(/\s+/);
            const cmd = args[0]?.toLowerCase();

            // Reprompt helper
            const reprompt = () => {
                const prefix = authenticated ? "axe[auth]> " : "axe> ";
                socket.write(prefix);
            };

            switch (cmd) {
                case 'help':
                case '?':
                    showHelp();
                    reprompt();
                    break;

                case 'auth':
                    if (args.length < 2) {
                        socket.write("  [!] Usage: auth <password>\n");
                    } else {
                        const pwd = args[1].toUpperCase();
                        if (pwd === module.exports.phase3_password) {
                            authenticated = true;
                            socket.write("\n  [✓] Authentication successful!\n");
                            socket.write("  [*] You can now use 'trace' to analyze the VM flow.\n\n");
                        } else {
                            socket.write("  [✗] Invalid password. (Hint: Phase 3 Flag)\n\n");
                        }
                    }
                    reprompt();
                    break;

                case 'bytecode':
                    dumpBytecode();
                    reprompt();
                    break;

                case 'opcodes':
                    socket.write("\n  Known Opcode Patterns:\n");
                    socket.write("  ──────────────────────\n");
                    socket.write("  0xA0-0xA7 : LOAD Rn, imm8  (Load key byte into Register)\n");
                    socket.write("  0xB0-0xB7 : XOR data[n], Rn (XOR data byte with Register)\n");
                    socket.write("  0xFF      : HALT\n\n");
                    socket.write("  [!] Key Derivation Formula found in binary:\n");
                    socket.write("      key[i] = (password[i] XOR (i * 17 + 5)) & 0xFF\n\n");
                    reprompt();
                    break;

                case 'data':
                    socket.write("\n  Encrypted Data (7 bytes):\n");
                    socket.write("  ─────────────────────────\n");
                    const hexData = [];
                    for(const b of module.exports.encryptedData) hexData.push(b.toString(16).padStart(2,'0'));
                    socket.write(`  Hex: ${hexData.join(' ')}\n\n`);
                    reprompt();
                    break;

                case 'derive':
                    if(args.length < 2) {
                        socket.write("  [!] Usage: derive <string>\n");
                    } else {
                        const testStr = args.slice(1).join('_'); // Rejoin if spaces
                        socket.write(`\n  Deriving key from: "${testStr}"\n`);
                        const key = [];
                        for(let i=0; i<7; i++) {
                            const charCode = i < testStr.length ? testStr.charCodeAt(i) : 0;
                            const xorVal = i * 17 + 5;
                            const res = (charCode ^ xorVal) & 0xFF;
                            key.push(res.toString(16).padStart(2,'0'));
                            socket.write(`    key[${i}] = '${testStr[i]||'?'}' (${charCode}) ^ ${xorVal} = 0x${res.toString(16).padStart(2,'0')}\n`);
                        }
                        socket.write(`  Result: ${key.join('')}\n\n`);
                    }
                    reprompt();
                    break;

                case 'trace':
                    if (!authenticated) {
                        socket.write("  [!] Access Denied. Auth first.\n");
                    } else {
                        socket.write("\n  VM Execution Trace (Debug Mode):\n");
                        socket.write("  ────────────────────────────────\n");
                        const pass = module.exports.phase3_password;
                        const key = [];
                        for(let i=0; i<7; i++) {
                            const char = pass.charCodeAt(i);
                            const val = (char ^ (i * 17 + 5)) & 0xFF;
                            key.push(val);
                            socket.write(`  LOAD R${i} <- (Char '${pass[i]}' ^ Algo) = 0x${val.toString(16).padStart(2,'0')}\n`);
                        }
                        socket.write(`\n  Derived Key: ${Buffer.from(key).toString('hex')}\n`);
                        socket.write("  [!] Use 'decrypt' with this key to find the flag.\n\n");
                    }
                    reprompt();
                    break;

                case 'decrypt':
                    if (args.length < 2) {
                        socket.write("  [!] Usage: decrypt <hex_key>\n");
                    } else {
                        const keyHex = args[1];
                        try {
                            const keyBuf = Buffer.from(keyHex, 'hex');
                            const data = module.exports.encryptedData;
                            const res = [];
                            for(let i=0; i<data.length; i++) {
                                res.push(data[i] ^ keyBuf[i % keyBuf.length]);
                            }
                            const resBuf = Buffer.from(res);
                            socket.write(`\n  Key: ${keyHex}\n`);
                            socket.write(`  Decrypted Hex: ${resBuf.toString('hex')}\n`);
                            socket.write(`  Decrypted ASCII: ${resBuf.toString('utf8')}\n\n`);
                        } catch(e) {
                            socket.write("  [!] Invalid Hex Key.\n");
                        }
                    }
                    reprompt();
                    break;

                case 'submit':
                    if (args.length < 2) {
                        socket.write("  [!] Usage: submit <hex_value>\n");
                    } else {
                        // Normalize input (remove 0x, uppercase)
                        const answer = args[1].replace(/^0x/i, '').toUpperCase();
                        const expected = module.exports.flag.replace(/^0x/i, '').toUpperCase();
                        
                        if (answer === expected) {
                            socket.write("\n╔════════════════════════════════════════════════════════════╗\n");
                            socket.write("║  ✓ CORRECT! You've cracked The Cousins' Axe!               ║\n");
                            socket.write("╚════════════════════════════════════════════════════════════╝\n");
                            socket.write(`\n  FLAG: ${module.exports.flag}\n`);
                            socket.write("  (This hex value is 'RESPECT' in ASCII - use it for Phase 5)\n\n");
                            
                            onWin();
                            socket.destroy();
                            return;
                        } else {
                            socket.write("\n  [✗] Incorrect. Try: decrypt <derived_key_hex>\n");
                            socket.write("  Try again.\n\n");
                        }
                    }
                    reprompt();
                    break;

                case 'hint':
                    hints++;
                    if (hints === 1) socket.write("\n  [HINT 1] Use 'opcodes' to see the formula. Use 'derive' to test it.\n\n");
                    else if (hints === 2) socket.write("\n  [HINT 2] The password is 'GALE_BOETTICHER_1307'. Use 'trace' if stuck.\n\n");
                    else if (hints === 3) socket.write("\n  [HINT 3] XOR the encrypted bytes with the derived key bytes.\n\n");
                    else socket.write("\n  [!] No more hints.\n\n");
                    reprompt();
                    break;

                case 'quit':
                case 'exit':
                    socket.write("\n  \"La familia es todo.\"\n");
                    socket.destroy();
                    return;

                default:
                    if (cmd && cmd.length > 0) {
                        socket.write(`  [!] Unknown command: ${cmd}\n`);
                        socket.write("  Try again.\n");
                    }
                    reprompt();
                    break;
            }
        };
    }
};
