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

    // Skip some system files if needed, but let's keep most for now
    if (fileName.includes('.system_generated')) return;
    if (fileName.endsWith('.json') && !fileName.includes('metadata')) {
        // usually usage logs, ignore for turns
        // return;
    }

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

// Also add conversation directory creation as "Start" events
const convDirs = fs.readdirSync(brainDir).filter(f => fs.statSync(path.join(brainDir, f)).isDirectory());
convDirs.forEach(dir => {
    const stats = fs.statSync(path.join(brainDir, dir));
    events.push({
        convID: dir.substring(0, 8),
        type: '系統日誌',
        fileName: '[對話開始]',
        mtime: stats.birthtime,
        ctime: stats.birthtime,
        isStartMarker: true
    });
});

// Sort ALL events globally by mtime
events.sort((a, b) => a.mtime - b.mtime);

const report = [];
let lastEndTime = null;

for (let i = 0; i < events.length; i++) {
    const e = events[i];

    // We want to group closely spaced modifications into one "Turn" or use each modification as an end of a segment
    // Let's use the previous modification as the Start of the current segment

    let startTime = lastEndTime || e.ctime;

    // If it's the very first event ever, or if the gap is too large (> 4 hours), maybe reset start to ctime
    if (lastEndTime && (e.mtime - lastEndTime > 4 * 3600 * 1000)) {
        startTime = e.ctime;
    }

    // Also, if it's a [對話開始] marker, we skip it but use its time for the next event if it belongs to the same conv
    if (e.isStartMarker) {
        lastEndTime = e.mtime;
        continue;
    }

    const duration = (e.mtime - startTime) / 1000;
    const gapType = (duration < 300) ? 'AI連續處理' : '使用者思考/閒置';

    const formatDate = (d) => d.toISOString().split('T')[0];
    const formatTime = (d) => d.toTimeString().split(' ')[0];

    report.push({
        ConvID: e.convID,
        Type: e.type,
        FileName: e.fileName,
        Start_Date: formatDate(startTime),
        Start_Time: formatTime(startTime),
        End_Date: formatDate(e.mtime),
        End_Time: formatTime(e.mtime),
        Duration_Sec: duration.toFixed(1),
        Gap_Type: gapType,
        Status: (formatDate(startTime) !== formatDate(e.mtime)) ? '【跨日跨度】' : ''
    });

    lastEndTime = e.mtime;
}

// Convert to CSV
const header = 'ConvID,Type,FileName,Start_Date,Start_Time,End_Date,End_Time,Duration_Sec,Gap_Type,Status';
const csvContent = [header, ...report.map(r =>
    `${r.ConvID},${r.Type},"${r.FileName}",${r.Start_Date},${r.Start_Time},${r.End_Date},${r.End_Time},${r.Duration_Sec},${r.Gap_Type},${r.Status}`
)].join('\n');

fs.writeFileSync('turn_lifecycle_report_v2.csv', '\ufeff' + csvContent, 'utf8');

console.log('Report generated: turn_lifecycle_report_v2.csv');
