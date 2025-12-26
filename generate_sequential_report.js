const fs = require('fs');
const path = require('path');

const brainDir = 'C:\\Users\\Arthur8888tw\\.gemini\\antigravity\\brain';

function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);
    arrayOfFiles = arrayOfFiles || [];
    files.forEach(function (file) {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            getAllFiles(fullPath, arrayOfFiles);
        } else {
            arrayOfFiles.push(fullPath);
        }
    });
    return arrayOfFiles;
}

const allFiles = getAllFiles(brainDir);
const rawEvents = [];

allFiles.forEach(file => {
    const stats = fs.statSync(file);
    const relPath = path.relative(brainDir, file);
    const parts = relPath.split(path.sep);
    if (parts.length < 2) return;

    const convID = parts[0].substring(0, 8);
    const fileName = parts.slice(1).join('/');

    if (fileName.includes('.system_generated')) return;
    if (fileName.endsWith('.json') && !fileName.includes('metadata')) return;

    rawEvents.push({
        convID,
        start: stats.birthtime,
        end: stats.mtime,
        fileName
    });
});

// Sort by potential start time
rawEvents.sort((a, b) => a.start - b.start);

const sequentialTurns = [];
if (rawEvents.length > 0) {
    let currentTurn = {
        convID: rawEvents[0].convID,
        start: rawEvents[0].start,
        end: rawEvents[0].end,
        files: [rawEvents[0].fileName]
    };

    for (let i = 1; i < rawEvents.length; i++) {
        const e = rawEvents[i];

        // Define overlap: if event starts BEFORE current turn ends, it is physically part of the same execution block
        // Also if the gap is very small (e.g. < 30 seconds), group them as one interaction
        const gap = (e.start - currentTurn.end) / 1000;

        if (gap < 30) {
            // Merge into current Turn
            currentTurn.end = new Date(Math.max(currentTurn.end, e.end));
            currentTurn.files.push(e.fileName);
            // If the conversation ID switched in a tiny gap, it's likely a rapid window switch, 
            // but we group the time block to maintain "no overlap" logic.
            if (currentTurn.convID !== e.convID) {
                currentTurn.convID = currentTurn.convID + "/" + e.convID;
            }
        } else {
            // New Turn
            sequentialTurns.push(currentTurn);
            currentTurn = {
                convID: e.convID,
                start: e.start,
                end: e.end,
                files: [e.fileName]
            };
        }
    }
    sequentialTurns.push(currentTurn);
}

// Convert to CSV with Gap calculation
const report = [];
const pad = (n) => n.toString().padStart(2, '0');
const fmtDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fmtTime = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

for (let i = 0; i < sequentialTurns.length; i++) {
    const t = sequentialTurns[i];
    const duration = (t.end - t.start) / 1000;

    let gapToNext = 0;
    if (i < sequentialTurns.length - 1) {
        gapToNext = (sequentialTurns[i + 1].start - t.end) / 1000;
    }

    report.push({
        TurnID: i + 1,
        ConvID: t.convID,
        Start: `${fmtDate(t.start)} ${fmtTime(t.start)}`,
        End: `${fmtDate(t.end)} ${fmtTime(t.end)}`,
        Execution_Sec: duration.toFixed(1),
        Gap_To_Next_Sec: gapToNext.toFixed(0),
        First_File: t.files[0],
        File_Count: t.files.length
    });
}

const header = 'TurnID,ConvID,Start,End,Execution_Sec,Gap_To_Next_Sec,First_File,File_Count';
const csvContent = [header, ...report.map(r =>
    `${r.TurnID},${r.ConvID},${r.Start},${r.End},${r.Execution_Sec},${r.Gap_To_Next_Sec},"${r.First_File}",${r.File_Count}`
)].join('\n');

fs.writeFileSync('turn_lifecycle_sequential_report.csv', '\ufeff' + csvContent, 'utf8');

console.log('Sequentialized Report generated: turn_lifecycle_sequential_report.csv');
console.log('Total sequential turns detected: ' + report.length);
