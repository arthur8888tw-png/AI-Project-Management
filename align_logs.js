const fs = require('fs');
const path = require('path');

const METADATA_FILE = 'conversation_metadata.json';
const CHAT_LOGS_DIR = 'chat_logs';

if (!fs.existsSync(METADATA_FILE)) {
    console.error('Metadata file not found');
    process.exit(1);
}

const metadata = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf8')).conversations;
const files = fs.readdirSync(CHAT_LOGS_DIR);

const idMap = {}; // Title -> ID

for (const [id, data] of Object.entries(metadata)) {
    idMap[data.title.toLowerCase()] = id;
}

// Special hand-mapped cases where title in metadata != title in file name
const overrides = {
    'analyzing project history and future.md': 'c3b6572d-88d2-4298-a4ae-6feb9823bcaf',
    'audit log refinement.md': 'f58e9bae-ccf3-4659-9736-c778adbc8527',
    'daily hours & data integrity.md': '9b18c3e6-e79b-4628-996c-e12849421eeb',
    'fix mobile table count.md': 'c0118b5a-ded4-45c7-9392-3d601d8d6b1e',
    'fix model usage data.md': '7c6870ca-d1bd-4574-a1e5-952df7709e03',
    'fixing lm studio json parsing.md': 'bf5a9afd-c25c-4535-b425-70c900b37a74',
    'fixing pdf poem line breaks.md': 'da22efa1-38d5-4098-b059-de93b121db79',
    'gemini api key debugging.md': '9eb84981-2b06-4168-856e-827d06ff1035',
    'google account model balance.md': 'd2679a94-9409-4328-a1aa-0651d6f4ae1e',
    'history display enhancements.md': 'd1b790ad-8b63-43aa-b47e-34b7fb67efc3',
    'locate fortune poem data.md': '26e36f3a-92c1-4dcd-aef8-fae1a832dccc',
    'optimize game display.md': '4c0b2de1-f775-42b5-8342-b2b7bbe7ff3e',
    'populating fortune data.md': '89329067-656d-4c37-b766-174f78e61554',
    'refining scroll layout aesthetics.md': '771a2bfa-9c6d-4133-b9ee-725885ee45d6',
    'sqlite stability and repair.md': 'f62a0ee0-d82b-4475-a603-6a572354cd49',
    'sourcing authentic fortune data.md': 'cb1c0e2e-e316-4f43-a3e0-92c0a29a42f5',
    'submit project to github.md': '176a1e82-c390-404a-b0c4-092f525dd42f',
    'ui documentation generation.md': '8588a97a-d3b9-4a53-bed1-978fffd3955e',
    'ui efficiency & mastery.md': '8ba54ee3-5ec9-42f0-b39e-8165788b74dd',
    '系統分析、在地化與部署.md': '4411fd3b-3cc1-4d45-90e1-64a261dabf86'
};

files.forEach(file => {
    if (file.endsWith('.md') && !/^[0-9a-f]{8}-/.test(file)) {
        const lowerName = file.toLowerCase();
        let targetId = overrides[lowerName];

        if (!targetId) {
            // Try title match
            const titlePart = file.replace('.md', '').toLowerCase();
            targetId = idMap[titlePart];
        }

        if (targetId) {
            const oldPath = path.join(CHAT_LOGS_DIR, file);
            const newPath = path.join(CHAT_LOGS_DIR, `${targetId}.md`);
            console.log(`Renaming: ${file} -> ${targetId}.md`);
            fs.renameSync(oldPath, newPath);
        } else {
            console.log(`No match found for: ${file}`);
        }
    }
});
