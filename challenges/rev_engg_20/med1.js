const http = require('http');

module.exports = {
    id: "badgers_cipher",
    name: "Badger's Intercepted Cipher",
    port: 2003,      // Netcat Port
    webPort: 2673,   // Web Port (Hosts the Bytecode file)
    flag: "HEISENBERG{mAGnEtS_yo}",

    // We store the server instance here
    httpServer: null,

    // === THE CHALLENGE SOURCE CODE ===
    // This is the Python Disassembly the user must reverse.
    // I have calculated the 'LOAD_CONST' numbers so that:
    // Numbers XOR "J_o3t" = "HEISENBERG{mAGnEtS_yo}"
    bytecodeSource: `
  1           0 LOAD_CONST               0 (2)
              2 LOAD_CONST               1 (26)
              4 LOAD_CONST               2 (46)
              6 LOAD_CONST               3 (32)
              8 LOAD_CONST               4 (53)
             10 LOAD_CONST               5 (8)
             12 LOAD_CONST               6 (26)
             14 LOAD_CONST               7 (13)
             16 LOAD_CONST               8 (3)
             18 LOAD_CONST               9 (55)
             20 LOAD_CONST              10 (59)
             22 LOAD_CONST              11 (18)
             24 LOAD_CONST              12 (58)
             26 LOAD_CONST              13 (59)
             28 LOAD_CONST              14 (53)
             30 LOAD_CONST              15 (36)
             32 LOAD_CONST              16 (12)
             34 LOAD_CONST              17 (58)
             36 LOAD_CONST              18 (111)
             38 LOAD_CONST              19 (116)
             40 LOAD_CONST              20 (50)
             42 LOAD_CONST              21 (126)
             44 BUILD_LIST              22
             46 STORE_NAME               0 (input_list)

  2          48 LOAD_CONST              22 ('J')
             50 STORE_NAME               1 (key_str)

  3          52 LOAD_NAME                1 (key_str)
             54 LOAD_CONST              23 ('_')
             56 BINARY_ADD
             58 STORE_NAME               1 (key_str)

  4          60 LOAD_NAME                1 (key_str)
             62 LOAD_CONST              24 ('o')
             64 BINARY_ADD
             66 STORE_NAME               1 (key_str)

  5          68 LOAD_NAME                1 (key_str)
             70 LOAD_CONST              25 ('3')
             72 BINARY_ADD
             74 STORE_NAME               1 (key_str)

  6          76 LOAD_NAME                1 (key_str)
             78 LOAD_CONST              26 ('t')
             80 BINARY_ADD
             82 STORE_NAME               1 (key_str)

  9          84 LOAD_CONST              27 (<code object <listcomp>>)
             86 LOAD_CONST              28 ('<listcomp>')
             88 MAKE_FUNCTION            0
             90 LOAD_NAME                1 (key_str)
             92 GET_ITER
             94 CALL_FUNCTION            1
             96 STORE_NAME               2 (key_list)

 11     >>   98 LOAD_NAME                3 (len)
            100 LOAD_NAME                2 (key_list)
            102 CALL_FUNCTION            1
            104 LOAD_NAME                3 (len)
            106 LOAD_NAME                0 (input_list)
            108 CALL_FUNCTION            1
            110 COMPARE_OP               0 (<)
            112 POP_JUMP_IF_FALSE      122

 12         114 LOAD_NAME                2 (key_list)
            116 LOAD_METHOD              4 (extend)
            118 LOAD_NAME                2 (key_list)
            120 CALL_METHOD              1
            122 POP_TOP
            124 JUMP_ABSOLUTE           98

 15     >>  126 LOAD_CONST              29 (<code object <listcomp>>)
            128 LOAD_CONST              28 ('<listcomp>')
            130 MAKE_FUNCTION            0
            132 LOAD_NAME                5 (zip)
            134 LOAD_NAME                0 (input_list)
            136 LOAD_NAME                2 (key_list)
            138 CALL_FUNCTION            2
            140 GET_ITER
            142 CALL_FUNCTION            1
            144 STORE_NAME               6 (result)
            146 RETURN_VALUE
`,

    start: (socket, onWin) => {
        
        // === SINGLETON PATTERN (Web Server) ===
        if (!module.exports.httpServer) {
            
            console.log(`[WEB] Starting Badger's File Server on ${module.exports.webPort}`);

            module.exports.httpServer = http.createServer((req, res) => {
                // 1. Serve the Disassembly File
                if (req.url === '/snake.dis') {
                    res.writeHead(200, { 'Content-Type': 'text/plain' });
                    res.end(module.exports.bytecodeSource);
                    return;
                }

                // 2. Default Page
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end("<h1>Badger's Cloud Storage</h1><p>Yo, I found this weird file.</p><p>Download: <a href='/snake.dis'>snake.dis</a></p>");
            });

            module.exports.httpServer.listen(module.exports.webPort, '0.0.0.0', () => {
                console.log(`[WEB] File Server active on port ${module.exports.webPort}`);
            });

            module.exports.httpServer.on('error', (err) => {
                console.error(`[WEB ERR] Server error: ${err.message}`);
            });
        }

        // === USER INTERFACE (Netcat) ===
        socket.write("=== BADGER'S INTERCEPTED CIPHER ===\n");
        socket.write("[+] MSG: Yo, check this out. Skinny Pete found this python file.\n");
        socket.write("[+] PROBLEM: It's all compiled or disassembled or whatever.\n");
        socket.write(`[+] DOWNLOAD: http://cookcrackcapture.in:${module.exports.webPort}/snake.dis\n`);
        socket.write("[+] MISSION: Be the Python interpreter. Reverse the logic manually.\n");
        socket.write("Enter the Secret Phrase (Flag): ");

        return (input) => {
            if (input.trim() === module.exports.flag) {
                socket.write("\n[+] YEAH! Magnets! Science!\n");
                onWin();
                socket.destroy();
            } else {
                socket.write("\n[-] Nah, that's not it, yo.\n");
                socket.write("Try again: ")
            }
        };
    }
};
