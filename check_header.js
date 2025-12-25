const fs = require('fs');
const pbFile = 'C:\\Users\\Arthur8888tw\\.gemini\\antigravity\\conversations\\7c6870ca-d1bd-4574-a1e5-952df7709e03.pb';
const fd = fs.openSync(pbFile, 'r');
const buffer = Buffer.alloc(16);
fs.readSync(fd, buffer, 0, 16, 0);
console.log(buffer.toString('hex'));
fs.closeSync(fd);
