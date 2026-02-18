const http = require('http');

module.exports = {
    id: "say_my_name_hard",
    name: "The King of Albuquerque",
    port: 6005,      // Netcat Port
    webPort: 6675,   // Web Port (Hosts the "Territory Map")
    flag: "HEISENBERG{y0u_4r3_g0dd4mn_r1ght_7732}",

    // Server instance
    httpServer: null,

    start: (socket, onWin) => {
        
        // === SINGLETON PATTERN (Web Server) ===
        if (!module.exports.httpServer) {
            
            console.log(`[WEB] Starting Territory Server on ${module.exports.webPort}`);

            module.exports.httpServer = http.createServer((req, res) => {
                // 1. The Territory Map (Multi-step hint)
                if (req.url === '/territory.map') {
                    res.writeHead(200, { 'Content-Type': 'text/plain' });
                    res.end(
                        "TERRITORY DATA DUMP\n" +
                        "-------------------\n" +
                        "1. Convert the Binary stream back to Bytes.\n" +
                        "2. Each byte has been XORed with the secret value: 0x55\n" +
                        "3. Reverse the XOR and map to ASCII.\n" +
                        "4. Note: The king's name is the flag."
                    );
                    return;
                }

                // 2. Default Page
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end("<h1>Declan's Desert Meet</h1><p>Who are you working for?</p><ul><li><a href='/territory.map'>territory.map</a></li></ul>");
            });

            module.exports.httpServer.listen(module.exports.webPort, '0.0.0.0', () => {
                console.log(`[WEB] File Server active on port ${module.exports.webPort}`);
            });
        }

        // === CHALLENGE LOGIC ===
        // We convert the flag into an XORed binary stream to force scripting
        const binaryStream = module.exports.flag
            .split('')
            .map(char => {
                // XOR with 0x55 then convert to 8-bit binary
                let xored = char.charCodeAt(0) ^ 0x55;
                return xored.toString(2).padStart(8, '0');
            })
            .join(' ');

        socket.write("=== THE DESERT ENCOUNTER ===\n");
        socket.write("Declan: 'I don't know who you are. I don't know who you think you are.'\n");
        socket.write("Walt: 'If you don't know who I am, then maybe your best course is to tread lightly.'\n\n");
        socket.write(`[+] MISSION INTEL: http://cookcrackcapture.in:${module.exports.webPort}/territory.map\n`);
        socket.write("[+] INCOMING RAW DATA:\n");
        socket.write("--------------------------------------------------------------------------------\n");
        socket.write(binaryStream + "\n");
        socket.write("--------------------------------------------------------------------------------\n\n");
        socket.write("Walt: 'Say my name.'\n");
        socket.write("Declan: ");

        return (input) => {
            const cleanInput = input.trim();
            if (cleanInput === module.exports.flag) {
                socket.write("\nDeclan: '...Heisenberg.'\n");
                socket.write("Walt: 'You're goddamn right.'\n");
                onWin();
                socket.destroy();
            } else {
                socket.write("\nDeclan: 'I've never heard of you. Get out of the desert.'\n");
                socket.write("Try again: ")
            }
        };
    }
};
