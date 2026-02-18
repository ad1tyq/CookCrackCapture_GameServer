module.exports = {
    id: "pollos_cipher",
    name: "Phase 2: The Pollos Cipher",
    port: 7002,      // Netcat Port
    flag: "blueskymethylamine",
    // const flag = "GALE_BOETTICHER_1307";
    phase1_password: "HEISENBERG_99",

    // === EMBEDDED ASSETS ===
    
    // The Menu: Hides "BLUESKYMETHYLAMINE" via Null Cipher (First char after punctuation)
    menuText: `
    *****************************************
    * LOS POLLOS HERMANOS           *
    * "The Brothers"              *
    *****************************************

    Welcome to the family! Here is our standard.
    Best ingredients are guaranteed.

    Our chicken is slow-cooked! Loved by everyone
    in Albuquerque. It is prepared fresh, Under
    the strict supervision of our owner.

    Do you like spice? Everyone says our
    signature batter is unique.

    SIDE DISHES
    -----------
    Curly Fries....... Spice blend perfection.
    Coleslaw.......... Kick of flavor!
    Corn.............. You will love it.

    BEVERAGES
    ---------
    Soda.............. Mouth watering.
    Iced Tea.......... Excellent service!
    Coffee............ Taste the difference.

    DESSERTS
    --------
    Cinnamon Twists?.. Hunger satisfied.
    Ice Cream......... Yum!

    EMPLOYEE NOTICE
    ---------------
    Remember our motto! Los Pollos Hermanos
    stands for quality. Always fresh,
    never frozen. Made with care!
    Incredible standards required.

    Any issues? Never hesitate to ask.
    We are here to serve? Enjoy your meal!

    -----------------------------------------
    (Note to self: The boss hides messages 
     where the grammar stops. Look past the 
     dots and marks.)
    `,

    // The Poem: Contains chemistry clues
    poemText: `
    LEAVES OF GRASS (Annotated Copy)
    --------------------------------

    1. I celebrate myself, and sing myself,
       And what I assume you shall assume,
       For every atom belonging to me as good belongs to you.

    2. The atmosphere is not a perfume, it has no taste of the distillation,
       It is odorless, it is for my mouth forever, I am in love with it.
       (Note: Purity is essential. 99.1% or nothing.)

    3. The smoke of my own breath,
       Echoes, ripples, buzzed whispers, love-root, silk-thread, crotch and vine,
       My respiration and inspiration, the beating of my heart, the passing of blood and air through my lungs.

    4. Use the Blue to chase the Sky.
       The color tells the story. The synthesis is art.
       Wait for the crystallization.

    5. Methylamine is the lifeblood.
       Without it, the reaction fails. 
       Heavy machinery, hidden labs, the hum of the ventilation.

    6. Have you reckoned a thousand acres much? have you reckoned the earth much?
       Have you practiced so long to learn to read?
       Have you felt so proud to get at the meaning of poems?
    `,

    start: (socket, onWin) => {
        
        // === GAME STATE ===
        let authenticated = false;
        let hints = 0;

        // --- HELPER: Banner ---
        const showBanner = () => {
            socket.write("\n╔════════════════════════════════════════════════════════════╗\n");
            socket.write("║      PHASE 2: THE POLLOS CIPHER 🐔                         ║\n");
            socket.write("╚════════════════════════════════════════════════════════════╝\n");
            socket.write("\n  You found a locked safety deposit box at Los Pollos Hermanos.\n");
            socket.write("  It contains a menu and a book of poetry.\n");
            socket.write("\n  \"I hide in plain sight.\" - Gustavo Fring\n");
            socket.write("═══════════════════════════════════════════════════════════════\n");
    socket.write("                          📖 THE STORY\n");
    socket.write("═══════════════════════════════════════════════════════════════\n");
    socket.write("\n");
    socket.write("  The hint from the RV led you to a Los Pollos Hermanos\n");
    socket.write("  restaurant. Behind the counter, you find a locked safety\n");
    socket.write("  deposit box - it needs the password you found in Phase 1.\n");
    socket.write("\n");
    socket.write("  Inside, you discover two items:\n");
    socket.write("    • A worn Los Pollos Hermanos menu with strange markings\n");
    socket.write("    • Gale Boetticher's copy of 'Leaves of Grass' by Whitman\n");
    socket.write("\n");
    socket.write("  There's an employee note scribbled on the menu... something\n");
    socket.write("  about extracting letters after punctuation. And Gale's poem\n");
    socket.write("  has chemistry references that don't belong to Whitman...\n");
    socket.write("\n");
    socket.write("  \"I hide in plain sight, same as you.\" - Gustavo Fring\n");
    socket.write("\n");
    socket.write("═══════════════════════════════════════════════════════════════\n");
    socket.write("                        🎯 YOUR MISSION\n");
    socket.write("═══════════════════════════════════════════════════════════════\n");
    socket.write("\n");
    socket.write("  1. Login with the Phase 1 password (login command)\n");
    socket.write("  2. Read the menu carefully (menu command)\n");
    socket.write("  3. Study Gale's poem for chemistry keywords (poem, search)\n");
    socket.write("  4. Extract hidden letters from the menu (extract command)\n");
    socket.write("  5. Combine the clues to find the flag (submit command)\n");
    socket.write("\n");
    socket.write("  💡 HINT: The null cipher hides letters after punctuation...\n");
    socket.write("\n");
    socket.write("═══════════════════════════════════════════════════════════════\n");
            socket.write("\n  Type 'help' for commands.\n\n");
            socket.write("pollos> ");
        };

        // --- HELPER: Help ---
        const showHelp = () => {
            socket.write("\n  login <password>  - Authenticate (Use Phase 1 flag)\n");
            socket.write("  menu              - View the menu\n");
            socket.write("  poem [line]       - Read 'Leaves of Grass'\n");
            socket.write("  extract <pattern> - Apply decryption pattern\n");
            socket.write("  search <keyword>  - Search poem text\n");
            socket.write("  submit <answer>   - Submit final answer\n");
            socket.write("  hint              - Get help\n");
            socket.write("  quit              - Exit\n\n");
        };

        // --- LOGIC: Extraction Patterns ---
        const extractPattern = (pattern) => {
            if (!authenticated) {
                socket.write("  [!] Access denied. Login first.\n");
                return;
            }

            let extracted = '';
            
            // Clean up menu text for processing
            const cleanMenu = module.exports.menuText;

            if (pattern === 'first') {
                // First letter of each line
                cleanMenu.split('\n').forEach(line => {
                    const match = line.match(/[A-Za-z]/);
                    if (match) extracted += match[0];
                });
            } else if (pattern === 'after_punct' || pattern === 'punctuation') {
                // THE SOLUTION: First letter after punctuation [.!?,]
                // Regex matches punctuation, followed by whitespace(s), then captures the letter
                const matches = cleanMenu.matchAll(/[.!?,]\s*([A-Za-z])/g);
                for (const m of matches) {
                    extracted += m[1];
                }
            } else if (pattern === 'caps') {
                // All caps
                extracted = cleanMenu.replace(/[^A-Z]/g, '');
            } else {
                socket.write("  Available patterns:\n");
                socket.write("    first       - First letter of each line\n");
                socket.write("    after_punct - First letter after punctuation\n");
                socket.write("    caps        - All capital letters\n");
                return;
            }

            socket.write(`\n  Pattern: ${pattern}\n`);
            socket.write(`  Extracted: ${extracted}\n`);
            socket.write(`  Length: ${extracted.length} chars\n\n`);
        };

        // Start interaction
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

                case 'login':
                    if (args.length < 2) {
                        socket.write("  [!] Usage: login <password>\n");
                    } else {
                        const pwd = args.slice(1).join('_').toUpperCase();
                        if (pwd === module.exports.phase1_password) {
                            authenticated = true;
                            socket.write("\n  [✓] Authentication successful!\n");
                            socket.write("  [*] You opened the box. Commands 'menu', 'poem', 'extract' are now active.\n\n");
                        } else {
                            socket.write("  [✗] Invalid password. (Hint: It was the flag from Phase 1)\n\n");
                        }
                    }
                    break;

                case 'menu':
                    if (authenticated) {
                        socket.write(module.exports.menuText + "\n\n");
                    } else {
                        socket.write("  [!] Access denied. Login first.\n");
                    }
                    break;

                case 'poem':
                    if (authenticated) {
                        if (args[1]) {
                            const lineNum = parseInt(args[1]);
                            const lines = module.exports.poemText.split('\n');
                            if (lineNum > 0 && lineNum < lines.length) {
                                socket.write(`\n  Line ${lineNum}: ${lines[lineNum-1]}\n\n`);
                            } else {
                                socket.write("  [!] Invalid line number.\n");
                            }
                        } else {
                            socket.write(module.exports.poemText + "\n\n");
                        }
                    } else {
                        socket.write("  [!] Access denied. Login first.\n");
                    }
                    break;

                case 'extract':
                    if (args.length < 2) socket.write("  [!] Usage: extract <pattern>\n");
                    else extractPattern(args[1]);
                    break;

                case 'search':
                    if (!authenticated) {
                        socket.write("  [!] Access denied. Login first.\n");
                    } else if (args.length < 2) {
                        socket.write("  [!] Usage: search <keyword>\n");
                    } else {
                        const kw = args[1].toLowerCase();
                        const lines = module.exports.poemText.split('\n');
                        let found = false;
                        socket.write(`\n  Searching for "${kw}"...\n`);
                        lines.forEach((line, i) => {
                            if (line.toLowerCase().includes(kw)) {
                                socket.write(`  Line ${i+1}: ${line.trim()}\n`);
                                found = true;
                            }
                        });
                        if (!found) socket.write("  No matches found.\n");
                        socket.write("\n");
                    }
                    break;

                case 'submit':
                    if (args.length < 2) {
                        socket.write("  [!] Usage: submit <answer>\n");
                    } else {
                        // Normalize answer (remove spaces/underscores)
                        const answer = args.slice(1).join('').replace(/_/g, '').toLowerCase();
                        if (answer === module.exports.flag) {
                            socket.write("\n╔════════════════════════════════════════════════════════════╗\n");
                            socket.write("║  ✓ CORRECT! You've decoded the Pollos cipher!              ║\n");
                            socket.write("╚════════════════════════════════════════════════════════════╝\n");
                            socket.write(`\n  FLAG: ${module.exports.flag}\n\n`);
                            
                            onWin();
                            socket.destroy();
                            return;
                        } else {
                            socket.write("\n  [✗] Incorrect. Keep looking for the hidden message.\n\n");
                        }
                    }
                    break;

                case 'hint':
                    if (!authenticated) {
                        socket.write("  [!] Login first.\n");
                    } else {
                        hints++;
                        if (hints === 1) socket.write("\n  [HINT 1] Check the employee note at the bottom of the menu.\n\n");
                        else if (hints === 2) socket.write("\n  [HINT 2] The note mentions grammar marks. Try 'extract after_punct'.\n\n");
                        else if (hints === 3) socket.write("\n  [HINT 3] The answer combines 3 words: A color, where clouds are, and a chemical.\n\n");
                        else socket.write("\n  [!] No more hints.\n\n");
                    }
                    break;

                case 'quit':
                case 'exit':
                    socket.write("\n  \"I hide in plain sight.\"\n");
                    socket.destroy();
                    return;

                default:
                    if (cmd && cmd.length > 0) {
                        socket.write(`  [!] Unknown command: ${cmd}\n`);
                        socket.write("  Try again.\n");
                    }
                    break;
            }

            // Always reprompt unless destroyed
            const prompt = authenticated ? "pollos[auth]> " : "pollos> ";
            socket.write(prompt);
        };
    }
};
