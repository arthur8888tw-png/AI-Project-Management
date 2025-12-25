const fs = require('fs');
const path = require('path');

const pbFile = 'C:\\Users\\Arthur8888tw\\.gemini\\antigravity\\conversations\\7c6870ca-d1bd-4574-a1e5-952df7709e03.pb';

try {
    const buffer = fs.readFileSync(pbFile);
    console.log('File size:', buffer.length);

    // Search for common model substrings
    const models = ['gemini', 'claude', 'gpt', 'sonnet', 'opus', 'flash', 'pro'];
    models.forEach(m => {
        let count = 0;
        let pos = buffer.indexOf(m);
        while (pos !== -1) {
            count++;
            pos = buffer.indexOf(m, pos + 1);
        }
        if (count > 0) console.log(`${m}: ${count}`);
    });

} catch (e) {
    console.error(e.message);
}
