module.exports = {
    id: "full_measure",
    name: "Phase 5: Full Measure",
    port: 7005,      // Netcat Port
    flag: "157.245.108.254", // The Root Credentials
    phase4_password_hex: "52455350454354", // "RESPECT" in hex

    // === CONSTANTS ===
    BUFFER_SIZE: 64,
    CANARY_OFFSET: 64,
    RET_OFFSET: 84, // 64 buffer + 4 canary + 16 saved regs
    WIN_ADDRESS: 0x401337,
    EXPECTED_CANARY: Buffer.from([0x52, 0x45, 0x53, 0x50]), // "RESP"

    start: (socket, onWin) => {
        
        // === GAME STATE (Per Connection) ===
        let memory = Buffer.alloc(256, 0);
        let authenticated = false;
        let functionsFound = false;
        let hints = 0;

        // --- HELPER: Reset Memory ---
        const resetMemory = () => {
            memory.fill(0);
            // Place Canary
            module.exports.EXPECTED_CANARY.copy(memory, module.exports.CANARY_OFFSET);
            // Place Default Return Address (0x00400000 - typical start)
            Buffer.from([0x00, 0x00, 0x40, 0x00]).copy(memory, module.exports.RET_OFFSET);
        };

        // Initialize memory
        resetMemory();

        // --- HELPER: Banner ---
        const showBanner = () => {
            socket.write("\n╔════════════════════════════════════════════════════════════╗\n");
            socket.write("║      PHASE 5: FULL MEASURE 💀                              ║\n");
            socket.write("╚════════════════════════════════════════════════════════════╝\n");
            socket.write("\n  Walter's final service has a buffer overflow vulnerability.\n");
            socket.write("  But it's protected by a Stack Canary.\n");
            socket.write("  You must overflow the buffer, preserve the canary, and jump to the win function.\n");
            socket.write("\n  \"No more half measures.\"\n");
            socket.write("═══════════════════════════════════════════════════════════════\n");
    socket.write("                          📖 THE STORY\n");
    socket.write("═══════════════════════════════════════════════════════════════\n");
    socket.write("\n");
    socket.write("  Walter's final service has a buffer overflow vulnerability.\n");
    socket.write("  Your goal: overflow the buffer to call a hidden function.\n");
    socket.write("\n");
    socket.write("  But there's protection: a stack canary guards the return\n");
    socket.write("  address. If you corrupt it, the program crashes.\n");
    socket.write("\n");
    socket.write("  The Phase 4 flag contains the key to bypass this protection...\n");
    socket.write("\n");
    socket.write("  \"No more half measures, Walter.\" - Mike Ehrmantraut\n");
    socket.write("\n");
    socket.write("═══════════════════════════════════════════════════════════════\n");
    socket.write("                        🎯 YOUR MISSION\n");
    socket.write("═══════════════════════════════════════════════════════════════\n");
    socket.write("\n");
    socket.write("  1. Authenticate with the Phase 4 flag\n");
    socket.write("  2. Analyze the memory layout\n");
    socket.write("  3. Figure out what the canary value is\n");
    socket.write("  4. Find the address of the hidden function\n");
    socket.write("  5. Craft a payload that overflows the buffer\n");
    socket.write("  6. Preserve the canary and redirect to win function\n");
        socket.write("  7. Accquire the flag and go to http://flagn\n");
    socket.write("\n");
    socket.write("═══════════════════════════════════════════════════════════════\n");
            socket.write("\n  Type 'help' for commands.\n\n");
            socket.write("walter> ");
        };

        // --- HELPER: Help ---
        const showHelp = () => {
            socket.write("\n  auth <hex>       - Authenticate (Use Phase 4 flag)\n");
            socket.write("  info             - Show memory layout\n");
            socket.write("  analyze          - Decode Phase 4 flag (Requires Auth)\n");
            socket.write("  functions        - Find hidden functions (Requires Auth)\n");
            socket.write("  memory           - Dump current memory state (Requires Auth)\n");
            socket.write("  send <hex>       - Send payload (The Exploit!)\n");
            socket.write("  hint             - Get help\n");
            socket.write("  quit             - Exit\n\n");
        };

        // --- LOGIC: Send Payload ---
        const handleSend = (hexInput) => {
            if (!authenticated) {
                socket.write("  [!] Authentication required.\n");
                return;
            }
            if (!hexInput) {
                socket.write("  [!] Usage: send <hex_payload>\n");
                return;
            }

            // Clean input
            const hexStr = hexInput.replace(/0x/g, '').replace(/\\x/g, '').replace(/\s/g, '');
            let payload;
            try {
                payload = Buffer.from(hexStr, 'hex');
            } catch (e) {
                socket.write("  [!] Invalid hex string.\n");
                return;
            }

            socket.write(`\n  [*] Sending ${payload.length} bytes to buffer...\n`);

            // 1. Reset Memory & Simulate Write
            resetMemory();
            
            // 2. Overflow! (Copy input starting at 0)
            payload.copy(memory, 0);

            // 3. Check Canary Integrity
            const currentCanary = memory.slice(module.exports.CANARY_OFFSET, module.exports.CANARY_OFFSET + 4);
            if (!currentCanary.equals(module.exports.EXPECTED_CANARY)) {
                socket.write("\n  ╔════════════════════════════════════════════════════════════╗\n");
                socket.write("  ║  *** STACK SMASHING DETECTED *** ║\n");
                socket.write("  ╚════════════════════════════════════════════════════════════╝\n");
                socket.write(`\n  Expected canary: 0x${module.exports.EXPECTED_CANARY.toString('hex').toUpperCase()}\n`);
                socket.write(`  Got canary:      0x${currentCanary.toString('hex').toUpperCase()}\n`);
                socket.write("\n  [!] The canary was corrupted. Program crashed.\n");
                socket.write("  [!] You must include the correct canary at offset 64 (0x40).\n\n");
                return;
            }

            // 4. Check Return Address
            const retAddr = memory.readUInt32LE(module.exports.RET_OFFSET);
            
            socket.write("  [✓] Canary preserved.\n");
            socket.write(`  [*] Return address: 0x${retAddr.toString(16)}\n`);

            if (retAddr === module.exports.WIN_ADDRESS) {
                socket.write("\n╔════════════════════════════════════════════════════════════╗\n");
                socket.write("║                                                            ║\n");
                socket.write("║                    SAY MY NAME                             ║\n");
                socket.write("║                                                            ║\n");
                socket.write("╚═══════════════════════════════════════════════════════════╝\n");
                socket.write("\n  \"You're goddamn right.\"\n\n");
                socket.write("  🎉 CONGRATULATIONS! You've completed the Breaking Bad CTF!\n");
                socket.write(`  ROOT CREDENTIALS: ${module.exports.flag}\n\n`);
                
                onWin();
                socket.destroy();
            } else {
                socket.write("  [*] Return address not pointing to win function.\n");
                socket.write("  [*] Use 'functions' to find the target address.\n\n");
            }
        };

        // Start interaction
        showBanner();

        // --- INPUT HANDLER ---
        return (input) => {
            const args = input.trim().split(/\s+/);
            const cmd = args[0]?.toLowerCase();

            // Reprompt helper
            const reprompt = () => {
                const prefix = authenticated ? "walter[auth]> " : "walter> ";
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
                        socket.write("  [!] Usage: auth <phase4_flag>\n");
                    } else {
                        const pwd = args[1].replace(/^0[xX]/, '').toUpperCase();
                        if (pwd === module.exports.phase4_password_hex) {
                            authenticated = true;
                            socket.write("\n  [✓] Authentication successful!\n");
                            socket.write("  [*] Commands unlocked: analyze, functions, memory, send\n\n");
                        } else {
                            socket.write("  [✗] Invalid Phase 4 flag.\n\n");
                        }
                    }
                    reprompt();
                    break;

                case 'info':
                    socket.write("\n  Memory Layout:\n");
                    socket.write("  ─────────────────────────────────────────────────\n");
                    socket.write("  [0x00-0x3F]  Buffer (64 bytes)      <- Your Input\n");
                    socket.write("  [0x40-0x43]  Stack Canary (4 bytes) <- The Protection\n");
                    socket.write("  [0x44-0x53]  Saved Registers (16 bytes)\n");
                    socket.write("  [0x54-0x57]  Return Address (4 bytes)\n\n");
                    reprompt();
                    break;

                case 'analyze':
                    if (!authenticated) { socket.write("  [!] Auth required.\n"); } 
                    else {
                        socket.write("\n  Analyzing Phase 4 Flag (0x52455350454354):\n");
                        socket.write("  ──────────────────────────────────────────\n");
                        socket.write("  ASCII Decode: RESPECT\n");
                        socket.write("  First 4 bytes: 0x52 0x45 0x53 0x50 ('RESP')\n");
                        socket.write("  [!] This matches the Canary size (4 bytes).\n\n");
                    }
                    reprompt();
                    break;

                case 'functions':
                    if (!authenticated) { socket.write("  [!] Auth required.\n"); }
                    else {
                        socket.write("\n  Binary Symbol Table:\n");
                        socket.write("  ────────────────────\n");
                        socket.write("  main()          @ 0x401000\n");
                        socket.write("  processInput()  @ 0x401100\n");
                        socket.write("  say_my_name()   @ 0x401337  [TARGET]\n");
                        socket.write("  exit()          @ 0x401300\n\n");
                        functionsFound = true;
                    }
                    reprompt();
                    break;

                case 'memory':
                    if (!authenticated) { socket.write("  [!] Auth required.\n"); }
                    else {
                        socket.write("\n  Current Memory State:\n");
                        socket.write("  ─────────────────────\n");
                        for (let offset = 0; offset < 96; offset += 16) {
                            const line = [];
                            for (let i = 0; i < 16 && offset + i < 96; i++) {
                                line.push(memory[offset + i].toString(16).padStart(2, '0'));
                            }
                            let label = "";
                            if (offset === 64) label = " <- Canary";
                            if (offset === 80) label = " <- Return @ +4";
                            socket.write(`  ${offset.toString(16).padStart(2, '0')}: ${line.join(' ')}${label}\n`);
                        }
                        socket.write("\n");
                    }
                    reprompt();
                    break;

                case 'send':
                    if (args.length < 2) {
                        socket.write("  [!] Usage: send <hex_string>\n");
                        reprompt();
                    } else {
                        // The logic handles reprompting internally if not a win
                        handleSend(args.slice(1).join(''));
                        if (authenticated) reprompt(); 
                    }
                    break;

                case 'hint':
                    hints++;
                    if (hints === 1) socket.write("\n  [HINT 1] Auth with Phase 4 flag, then 'analyze' to find the canary value.\n\n");
                    else if (hints === 2) socket.write("\n  [HINT 2] Canary is 'RESP' (0x52455350). It's at offset 64.\n\n");
                    else if (hints === 3) socket.write("\n  [HINT 3] Payload: [64 bytes junk] [4 bytes Canary] [16 bytes junk] [Return Address]\n\n");
                    else if (hints === 4) socket.write("\n  [HINT 4] Target: 0x401337. In Little Endian: 37 13 40 00.\n\n");
                    else socket.write("\n  [!] No more hints.\n\n");
                    reprompt();
                    break;

                case 'quit':
                case 'exit':
                    socket.write("\n  \"I am the one who knocks.\"\n");
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
