const fs = require('fs');
const meta = JSON.parse(fs.readFileSync('conversation_metadata.json', 'utf8'));

for (const id in meta.conversations) {
    delete meta.conversations[id].hours;
    // We can also delete summary if it's going to be auto-generated from logs
    if (meta.conversations[id]._manual_bonus_reason) {
        // Keep these as they are "manual" notes
    }
}

fs.writeFileSync('conversation_metadata.json', JSON.stringify(meta, null, 4), 'utf8');
console.log('Stripped manual hours from conversation_metadata.json');
