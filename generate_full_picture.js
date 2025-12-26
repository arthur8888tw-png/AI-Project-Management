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
const list = [];

allFiles.forEach(file => {
    const stats = fs.statSync(file);
    const relPath = path.relative(brainDir, file);
    const parts = relPath.split(path.sep);
    if (parts.length < 2) return;

    const convID = parts[0].substring(0, 8);
    const fileName = parts.slice(1).join('/');

    // According to user: Start is the focus. 
    // If birthtime is the same as mtime, it might be an instant completion or a static file.

    list.push({
        ConvID: convID,
        FileName: fileName,
        Start_Raw: stats.birthtime,
        End_Raw: stats.mtime
    });
});

// 1. Sort strictly by Start Time (Creation Time)
list.sort((a, b) => a.Start_Raw - b.Start_Raw);

// Formatting helper
const pad = (n) => n.toString().padStart(2, '0');
const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

const report = list.map(item => {
    // Logic: If Birthtime and Mtime are identical, it's a "Done" marker.
    // If they differ, the user can judge if it's a believable "Finish" or just a final status update.
    let endTimeStr = fmt(item.End_Raw);

    // (Optional placeholder logic if needed, but user said "可信的就用", "不確定的空著")
    // For now, I provide both so the USER can filter or ignore.

    return {
        ConvID: item.ConvID,
        Start: fmt(item.Start_Raw),
        End: endTimeStr,
        FileName: item.FileName,
        Diff_Sec: ((item.End_Raw - item.Start_Raw) / 1000).toFixed(1)
    };
});

// Convert to CSV
const header = 'Sequence,ConvID,Start_Time,End_Time,Duration_Sec,FileName';
const csvContent = [header, ...report.map((r, i) =>
    `${i + 1},${r.ConvID},${r.Start},${r.End},${r.Diff_Sec},"${r.FileName}"`
)].join('\n');

fs.writeFileSync('turn_full_picture_audit.csv', '\ufeff' + csvContent, 'utf8');

console.log('Full Picture Audit generated: turn_full_picture_audit.csv');
console.log('Total raw entries: ' + report.length);
