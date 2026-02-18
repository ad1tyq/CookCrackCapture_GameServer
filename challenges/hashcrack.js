const TIMEOUT = 600 * 1000;
const FLAG = "CTF{n0d3js_event_l00p_is_f4st}";
const CHALLENGES = [
    {
        "hash": "482c811da5d5b4bc6d497ffa98491e38", 
        "plain": "password123", 
        "type": "MD5"
    },
    {
        "hash": "b7a875fc1ea228b9061041b7cec4bd3c52ab3ce3", 
        "plain": "letmein", 
        "type": "SHA1"
    },
    {
        "hash": "916e8c4f79b25028c9e467f1eb8eee6d6bbdff965f9928310ad30a8d88697745", 
        "plain": "qwerty098", 
        "type": "SHA256"
    }
];

module.exports = {
    id: "hashcrack",
    name: "Hash Code Cracking",
    port: 1337, 
    flag: FLAG,

    start: (socket, onWin) => {
        let currentLevel = 0;
        socket.write("=== HASHCRACK CHALLENGE ===\n");
        socket.write(`You must crack 3 hashes in a row to get the flag.\n`);
        socket.write(`You have ${TIMEOUT / 1000} seconds total.\n\n`);

        const sendPrompt = () => {
            const challenge = CHALLENGES[currentLevel];
            socket.write(`[LEVEL ${currentLevel + 1}/${CHALLENGES.length}]\n`);
            socket.write(`Algo:   ${challenge.type}\n`);
            socket.write(`Hash:   ${challenge.hash}\n`);
            socket.write("Enter Password: ");
        }
        socket.reprompt = () => {
            socket.write("\n");
            sendPrompt();
        };

        sendPrompt();

        const timer = setTimeout(() => {
            if(!socket.destroyed){
                socket.write("\n\n[!] Too slow! The challenge closes.\n");
                socket.write(`[-] Game Over.\n`);
                socket.destroy();
            }
        }, TIMEOUT);
    
        // == handling player input ==
        return (input) =>  {
            const correctPassword = CHALLENGES[currentLevel].plain;
            if(input == correctPassword){
                socket.write(`\n[+] Level ${currentLevel + 1} Cleared!\n\n`);
                currentLevel++;
                socket.gameData.currentLevel = currentLevel;
                socket.gameData.status = `Level ${currentLevel + 1}`;
                if(currentLevel < CHALLENGES.length){
                    sendPrompt();
                } else {
                    socket.write(`[+] CONGRATULATIONS! You beat the challenge.\n`);
                    socket.write(`[+] Here is your captured flag: ${FLAG}\n`);
                    socket.gameData.status = "WINNER";
                    onWin(); // telling the main server to close connection
                    clearTimeout(timer);
                    socket.destroy();
                }
            } else {
                socket.write(`\n[-] WRONG PASSWORD!`);
                sendPrompt();
            }
        };
    }
};
