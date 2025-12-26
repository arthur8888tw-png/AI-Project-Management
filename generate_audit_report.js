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
const events = [];

allFiles.forEach(file => {
    const stats = fs.statSync(file);
    const relPath = path.relative(brainDir, file);
    const parts = relPath.split(path.sep);
    if (parts.length < 2) return;

    const convID = parts[0].substring(0, 8);
    const fileName = parts.slice(1).join('/');

    if (fileName.includes('.system_generated')) return;
    if (fileName.endsWith('.json') && !fileName.includes('metadata')) return; // Usage logs

    let type = '其他';
    if (fileName.endsWith('.png') || fileName.endsWith('.webp') || fileName.endsWith('.jpg')) type = '視覺辨識';
    else if (fileName.includes('task.md') || fileName.includes('implementation_plan.md') || fileName.includes('walkthrough.md') || fileName.includes('system_analysis.md')) type = '規劃/文檔';
    else if (fileName.includes('.resolved')) type = '工作執行';
    else if (fileName.endsWith('.js') || fileName.endsWith('.py') || fileName.endsWith('.ps1') || fileName.endsWith('.html') || fileName.endsWith('.css')) type = '程式實作';

    events.push({
        convID,
        type,
        fileName,
        mtime: stats.mtime,
        ctime: stats.birthtime
    });
});

// Sort ALL events globally by mtime (actual completion order)
events.sort((a, b) => a.mtime - b.mtime);

const report = [];
let lastEndTime = null;

for (let i = 0; i < events.length; i++) {
    const e = events[i];

    // According to user: "Turn truly determined by Start Time"
    // We use ctime as the physical start of this file's lifecycle,
    // or the previous event's end time if it was part of a continuous flow.

    let startTime = e.ctime;

    // If the file was created long before the previous event ended (e.g. system noise), we stick to ctime.
    // However, usually we want to see the sequence.
    // To satisfy "核算" (audit), every single file modification result is a line.

    const duration = (e.mtime - startTime) / 1000;
    const gapType = (duration < 300) ? 'AI連續處理' : '使用者思考/閒置';

    const pad = (n) => n.toString().padStart(2, '0');
    const fmtDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const fmtTime = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

    report.push({
        ConvID: e.convID,
        Type: e.type,
        FileName: e.fileName,
        Start_Date: fmtDate(startTime),
        Start_Time: fmtTime(startTime),
        End_Date: fmtDate(e.mtime),
        End_Time: fmtTime(e.mtime),
        Duration_Sec: duration.toFixed(1),
        Gap_Type: gapType,
        Status: (fmtDate(startTime) !== fmtDate(e.mtime)) ? '【跨日跨度】' : ''
    });

    lastEndTime = e.mtime;
}

// Convert to CSV
const header = 'ConvID,Type,FileName,Start_Date,Start_Time,End_Date,End_Time,Duration_Sec,Gap_Type,Status';
const csvContent = [header, ...report.map(r =>
    `${r.ConvID},${r.Type},"${r.FileName}",${r.Start_Date},${r.Start_Time},${r.End_Date},${r.End_Time},${r.Duration_Sec},${r.Gap_Type},${r.Status}`
)].join('\n');

fs.writeFileSync('turn_lifecycle_audit_report.csv', '\ufeff' + csvContent, 'utf8');

console.log('Audit Report generated: turn_lifecycle_audit_report.csv');
console.log('Total entries: ' + report.length);
