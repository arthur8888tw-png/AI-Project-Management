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
    if (fileName.endsWith('.json') && !fileName.includes('metadata')) return; // ignore usage logs

    let type = '其他';
    if (fileName.endsWith('.png') || fileName.endsWith('.webp') || fileName.endsWith('.jpg')) type = '視覺辨識';
    else if (fileName.includes('task.md') || fileName.includes('implementation_plan.md') || fileName.includes('walkthrough.md') || fileName.includes('system_analysis.md')) type = '規劃/文檔';
    else if (fileName.includes('.resolved')) type = '工作執行';
    else if (fileName.endsWith('.js') || fileName.endsWith('.py') || fileName.endsWith('.ps1') || fileName.endsWith('.html') || fileName.endsWith('.css')) type = '程式實作';

    rawEvents.push({
        convID,
        type,
        fileName,
        time: stats.mtime,
        ctime: stats.birthtime
    });
});

// Group nearby events (within 10 seconds of each other) into high-level "Turns"
// This avoids 0-second turns for multiple file updates from one AI response
rawEvents.sort((a, b) => a.time - b.time);

const turns = [];
if (rawEvents.length > 0) {
    let currentTurn = {
        convID: rawEvents[0].convID,
        type: rawEvents[0].type,
        files: [rawEvents[0].fileName],
        endTime: rawEvents[0].time,
        firstFileTime: rawEvents[0].time
    };

    for (let i = 1; i < rawEvents.length; i++) {
        const e = rawEvents[i];
        const gap = (e.time - currentTurn.endTime) / 1000;

        if (gap < 10 && e.convID === currentTurn.convID) {
            // Same turn
            currentTurn.files.push(e.fileName);
            currentTurn.endTime = e.time;
            // Prefer the "best" type (Working > Planning > Other)
            if (e.type === '工作執行') currentTurn.type = '工作執行';
            else if (e.type === '程式實作' && currentTurn.type !== '工作執行') currentTurn.type = '程式實作';
            else if (e.type === '視覺辨識' && currentTurn.type === '其他') currentTurn.type = '視覺辨識';
        } else {
            turns.push(currentTurn);
            currentTurn = {
                convID: e.convID,
                type: e.type,
                files: [e.fileName],
                endTime: e.time,
                firstFileTime: e.time
            };
        }
    }
    turns.push(currentTurn);
}

// Generate report with Start and End times
const report = [];
let prevEndTime = null;

// For start time logic: 
// 1. If it's within a conversation sequence, start = previous end.
// 2. If it's a new conversation or large gap, start = first file creation time (or heuristic).
// Let's use birthtime of first file in turn as a hint for when the AI started working if gap is large.

for (let i = 0; i < turns.length; i++) {
    const t = turns[i];
    let startTime = prevEndTime;

    const gapFromPrev = prevEndTime ? (t.firstFileTime - prevEndTime) / 1000 : Infinity;

    if (gapFromPrev > 600) { // More than 10 mins gap
        // Reset start time to roughly when the AI might have started.
        // We don't have user prompt time, so let's estimate 10s before the first file update if it was fast, 
        // or just use the first file update minus a small buffer.
        startTime = new Date(t.firstFileTime.getTime() - 20000); // 20s buffer
    }

    const duration = (t.endTime - startTime) / 1000;
    const gapType = (duration < 300) ? 'AI連續處理' : '使用者思考/閒置';

    // Local Time Formatting
    const pad = (n) => n.toString().padStart(2, '0');
    const fmtDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const fmtTime = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

    report.push({
        ConvID: t.convID,
        Type: t.type,
        FileName: t.files[0] + (t.files.length > 1 ? ` (+${t.files.length - 1} 個檔案)` : ''),
        Start_Date: fmtDate(startTime),
        Start_Time: fmtTime(startTime),
        End_Date: fmtDate(t.endTime),
        End_Time: fmtTime(t.endTime),
        Duration_Sec: duration.toFixed(1),
        Gap_Type: gapType,
        Status: (fmtDate(startTime) !== fmtDate(t.endTime)) ? '【跨日跨度】' : ''
    });

    prevEndTime = t.endTime;
}

const header = 'ConvID,Type,Representative_File,Start_Date,Start_Time,End_Date,End_Time,Duration_Sec,Gap_Type,Status';
const csvContent = [header, ...report.map(r =>
    `${r.ConvID},${r.Type},"${r.FileName}",${r.Start_Date},${r.Start_Time},${r.End_Date},${r.End_Time},${r.Duration_Sec},${r.Gap_Type},${r.Status}`
)].join('\n');

fs.writeFileSync('turn_lifecycle_report_final.csv', '\ufeff' + csvContent, 'utf8');
console.log('Report generated: turn_lifecycle_report_final.csv');
