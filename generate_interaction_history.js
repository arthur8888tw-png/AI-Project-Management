#!/usr/bin/env node
/**
 * CPDM 專案互動歷史報告產生器
 * 自動掃描 Antigravity 對話記錄並產生報告
 * 
 * 使用方式:
 *   node generate_interaction_history.js [選項]
 * 
 * 選項:
 *   --project=<名稱>    篩選特定專案 (例如: --project=福至心靈籤)
 *   --start=<日期>      開始日期 (例如: --start=2025-12-17)
 *   --end=<日期>        結束日期 (例如: --end=2025-12-23)
 *   --format=<格式>     輸出格式: md (預設), json, dashboard
 *   --output=<路徑>     自訂輸出檔案路徑
 *   --help              顯示說明
 * 
 * 範例:
 *   node generate_interaction_history.js --project=福至心靈籤 --format=json
 *   node generate_interaction_history.js --start=2025-12-20 --end=2025-12-23
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

// ====== 配置區 ======
const ANTIGRAVITY_BASE = path.join(os.homedir(), '.gemini', 'antigravity');
const CONVERSATIONS_DIR = path.join(ANTIGRAVITY_BASE, 'conversations');
const BRAIN_DIR = path.join(ANTIGRAVITY_BASE, 'brain');
const CHAT_LOGS_DIR = path.join(process.cwd(), 'chat_logs'); // 存放對話日誌的目錄
const OUTPUT_DIR = process.cwd(); // 自動偵測當前專案目錄

// ====== 對話元數據勘誤表 ======
// 從外部 JSON 檔案載入，方便人工維護
const METADATA_FILE = path.join(OUTPUT_DIR, 'conversation_metadata.json');
let MANUAL_METADATA = {};

try {
    if (fs.existsSync(METADATA_FILE)) {
        const metaContent = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf8'));
        MANUAL_METADATA = metaContent.conversations || {};
        console.log(`📋 已載入勘誤表: ${Object.keys(MANUAL_METADATA).length} 筆對話元數據`);
    } else {
        console.log('⚠️ 找不到勘誤表檔案: conversation_metadata.json');
    }
} catch (e) {
    console.error('❌ 載入勘誤表失敗:', e.message);
}

// 嘗試載入第二來源的 metadata (從 code_tracker)
try {
    const backupMetaPath = path.join(os.homedir(), '.gemini\\antigravity\\code_tracker\\active\\no_repo\\2083909a17657481e7371579e8a4ce40_conversation_metadata.json');
    if (fs.existsSync(backupMetaPath)) {
        let rawContent = fs.readFileSync(backupMetaPath).toString('utf8');
        // 清除 BOM 和非 JSON 開頭/結尾的垃圾字元
        const firstBrace = rawContent.indexOf('{');
        const lastBrace = rawContent.lastIndexOf('}');
        if (firstBrace >= 0 && lastBrace > firstBrace) {
            rawContent = rawContent.substring(firstBrace, lastBrace + 1);
        }
        const backupContent = JSON.parse(rawContent);
        const backupConvs = backupContent.conversations || {};
        // 合併到 MANUAL_METADATA (如果不存在才覆蓋)
        for (const [id, data] of Object.entries(backupConvs)) {
            if (!MANUAL_METADATA[id]) {
                MANUAL_METADATA[id] = data;
            }
        }
        console.log(`📋 已從備份載入額外元數據: ${Object.keys(backupConvs).length} 筆`);
    }
} catch (e) {
    console.error('⚠️ 載入備份元數據失敗:', e.message);
}

/**
 * 自動掃描所有對話並收集資訊
 */
function scanAllConversations() {
    const conversations = [];

    // 掃描 conversations 目錄中的所有 .pb 檔案
    try {
        const files = fs.readdirSync(CONVERSATIONS_DIR);
        const pbFiles = files.filter(f => f.endsWith('.pb') && !f.includes('.tmp'));

        console.log(`🔍 掃描到 ${pbFiles.length} 個對話檔案...`);

        for (const pbFile of pbFiles) {
            const convId = pbFile.replace('.pb', '');
            const pbPath = path.join(CONVERSATIONS_DIR, pbFile);
            const stat = fs.statSync(pbPath);

            const brainFolder = path.join(BRAIN_DIR, convId);
            let metadata = {};
            let artifacts = [];
            let brainBirthtime = stat.birthtime;
            let brainMtime = stat.mtime;

            if (fs.existsSync(brainFolder)) {
                // 原本只取資料夾的 stat，現在改為掃描內部的所有檔案以取得真實起訖時間
                const brainFiles = fs.readdirSync(brainFolder);

                let minTime = Infinity;
                let maxTime = 0;

                brainFiles.forEach(f => {
                    const fPath = path.join(brainFolder, f);
                    try {
                        const fStat = fs.statSync(fPath);
                        // 取 birthtime (創建) 與 mtime (修改) 的聯集極值
                        const times = [];
                        if (fStat.birthtimeMs > 0) times.push(fStat.birthtimeMs);
                        if (fStat.mtimeMs > 0) times.push(fStat.mtimeMs);

                        if (times.length > 0) {
                            minTime = Math.min(minTime, ...times);
                            maxTime = Math.max(maxTime, ...times);
                        }
                    } catch (e) { }
                });

                if (minTime !== Infinity && maxTime > 0) {
                    brainBirthtime = new Date(minTime);
                    brainMtime = new Date(maxTime);

                    // 修正：如果起訖時間完全相同（秒級以下誤差），人為加上 1 秒間隔，確保 UI 顯示不會是點狀時間
                    if (brainBirthtime.getTime() === brainMtime.getTime()) {
                        brainMtime = new Date(brainBirthtime.getTime() + 1000);
                    }
                } else {
                    const bStat = fs.statSync(brainFolder);
                    brainBirthtime = bStat.birthtime;
                    brainMtime = bStat.mtime;
                }

                // 讀取所有 metadata.json 檔案
                artifacts = brainFiles.filter(f => f.endsWith('.md') && !f.includes('metadata'));

                // 從 metadata.json 提取摘要
                const metaFiles = brainFiles.filter(f => f.endsWith('.metadata.json'));
                for (const mf of metaFiles) {
                    try {
                        const metaContent = JSON.parse(fs.readFileSync(path.join(brainFolder, mf), 'utf8'));
                        if (metaContent.summary) {
                            metadata.summary = metaContent.summary;
                        }
                    } catch (e) { /* ignore */ }
                }

                // 嘗試從所有 .md 檔案中提取標題與專案資訊
                let mdFiles = brainFiles.filter(f => f.endsWith('.md') && !f.includes('metadata'));

                // 將 implementation_plan.md 移到最前面優先處理
                if (mdFiles.includes('implementation_plan.md')) {
                    mdFiles = mdFiles.filter(f => f !== 'implementation_plan.md');
                    mdFiles.unshift('implementation_plan.md');
                }

                for (const mdFile of mdFiles) {
                    try {
                        const content = fs.readFileSync(path.join(brainFolder, mdFile), 'utf8');

                        // 1. 提取標題 (若尚未找到)
                        if (!metadata.title) {
                            const titleMatch = content.match(/^#\s*(?:Implementation Plan\s*[-–—]\s*)?(.+?)[\r\n]/m);
                            if (titleMatch && titleMatch[1]) {
                                metadata.title = titleMatch[1].trim();
                            }
                        }

                        const lowerContent = content.toLowerCase();

                        // 2. 推斷專案 (若尚未分類)
                        if (!metadata.project || metadata.project === '未分類') {
                            if (lowerContent.includes('fortune') || lowerContent.includes('籤') || lowerContent.includes('temple')) {
                                metadata.project = '福至心靈籤';
                            } else if (lowerContent.includes('cpdm') || lowerContent.includes('gddm') || lowerContent.includes('methodology') || lowerContent.includes('dashboard')) {
                                metadata.project = 'AI專案管理';
                                if (lowerContent.includes('dashboard')) metadata.category = '開發模式';
                            } else if (lowerContent.includes('game') || lowerContent.includes('互動遊戲') || lowerContent.includes('尾牙')) {
                                metadata.project = '常春藤尾牙互動遊戲';
                            }
                        }

                        // 3. 推斷類別 (若尚未分類)
                        if (!metadata.category || metadata.category === '其他') {
                            if (lowerContent.includes('fix') || lowerContent.includes('bug') || lowerContent.includes('error') || lowerContent.includes('修復')) {
                                metadata.category = 'DEBUG';
                            } else if (lowerContent.includes('ui') || lowerContent.includes('style') || lowerContent.includes('介面')) {
                                metadata.category = 'UI 調整';
                            } else if (lowerContent.includes('refactor') || lowerContent.includes('架構') || lowerContent.includes('schema')) {
                                metadata.category = '架構變更';
                            } else if (lowerContent.includes('data') || lowerContent.includes('json') || lowerContent.includes('資料') || lowerContent.includes('populate')) {
                                metadata.category = '資料處理'; // 新增資料處理偵測
                            }
                        }
                    } catch (e) { /* ignore */ }
                }

                // 如果沒有從 implementation_plan 找到，嘗試 task.md
                if (!metadata.title) {
                    const taskPath = path.join(brainFolder, 'task.md');
                    if (fs.existsSync(taskPath)) {
                        try {
                            const content = fs.readFileSync(taskPath, 'utf8');
                            const titleMatch = content.match(/^#\s*(.+?)[\r\n]/m);
                            if (titleMatch && titleMatch[1]) {
                                metadata.title = titleMatch[1].trim().replace(/Task:?\s*/i, '');
                            }
                        } catch (e) { /* ignore */ }
                    }
                }
            }

            // 合併手動元數據 (優先)
            const manual = MANUAL_METADATA[convId] || {};

            // --- 新增: 讀取對話日誌以獲取更精確的活動資訊 ---
            const chatLog = parseChatLog(convId);
            if (chatLog) {
                // 如果日誌中的時間戳記更廣，則採用日誌時間
                if (chatLog.startTime && chatLog.startTime < brainBirthtime) {
                    brainBirthtime = chatLog.startTime;
                }
                if (chatLog.endTime && chatLog.endTime > brainMtime) {
                    brainMtime = chatLog.endTime;
                }
                // 如果日誌中有標題且目前尚未獲取，可以嘗試從中提取 (後續可擴充)
            }

            // --- 新增: 以時間起訖估算工時 ---
            // 1. 計算原始起訖時長 (小時)
            const rawSpanHours = (brainMtime.getTime() - brainBirthtime.getTime()) / 3600000;

            // 1.5 加權：根據 modify/resolved 檔案或圖片上傳量判斷是否為「高頻互動」
            let iterationCount = 0;
            try {
                if (fs.existsSync(brainFolder)) {
                    const files = fs.readdirSync(brainFolder);
                    // 包含 .resolved, .backup 與 uploaded_image，反映真實的操作頻率
                    iterationCount = files.filter(f =>
                        f.includes('.resolved') ||
                        f.includes('.backup') ||
                        f.includes('uploaded_image') ||
                        f.includes('session_')
                    ).length;
                }
            } catch (e) { }

            // 如果有對話日誌，將對話圈數加入計次
            if (chatLog && chatLog.rounds) {
                iterationCount += chatLog.rounds;
            }

            // 2. 扣除合理思考/空閒時間
            // 修正：完全承認 AI 運算期間的監控工時，增加彈性
            const isHeavyTask = ['資料處理', '架構變更', '開發模式'].includes(metadata.category || manual.category) || iterationCount > 5;
            const MAX_AUTO_SESSION_HOURS = isHeavyTask ? 18.0 : 4.0; // 從 6.0/1.2 大幅放寬

            // 不再打折，完全採信物理時間。甚至給予 1.05 倍的補償以覆蓋微小間隙
            let timeBasedHours = Math.min(MAX_AUTO_SESSION_HOURS, rawSpanHours * 1.05);

            // 如果互動次數極高 (反覆修改)，給予額外補償
            if (iterationCount > 1) { // 只要有互動就補償
                // 每個 resolved 檔補償 +25分鐘，這包含了等待 AI 生成的監控成本
                const bonus = iterationCount * 0.42;
                // 解鎖上限至 20.0h
                const base = Math.max(timeBasedHours, Math.min(rawSpanHours * 1.0, 20.0));
                timeBasedHours = Math.min(rawSpanHours, base + bonus);
            }

            if (rawSpanHours < 0.1) timeBasedHours = 0.1;

            // 3. 複雜度門檻
            const complexityCap = Math.max(0.2, stat.size / 1000000);

            // 4. 取得最終估算值
            let estimatedHours = Math.round(Math.min(timeBasedHours, Math.max(timeBasedHours, complexityCap)) * 10) / 10 || 0.1;

            // --- 新增: 互動後衰減 (Post-Interaction Decay) 邏輯 ---
            // 若有對話日誌，區分「最後一筆 User Input」之後的時間
            let activeTimeEnd = brainMtime;
            let passiveDiscountedHours = 0;
            let finalHours = estimatedHours;

            if (chatLog && chatLog.lastInputTime) {
                // 最後互動時間 + 15 分鐘冷卻 (視為總結/檢查時間)
                const coolDownMs = 15 * 60 * 1000;
                activeTimeEnd = new Date(chatLog.lastInputTime.getTime() + coolDownMs);

                if (activeTimeEnd < brainMtime) {
                    // 存在背景作業時間
                    const passiveMs = brainMtime - activeTimeEnd;
                    const passiveRawHours = passiveMs / 3600000;

                    // 背景作業打 2 折 (20%)，視為管理工時
                    passiveDiscountedHours = passiveRawHours * 0.2;

                    // 重新計算主動時長
                    const activeRawHours = Math.max(0.1, (activeTimeEnd - brainBirthtime) / 3600000);
                    finalHours = Math.round((activeRawHours + passiveDiscountedHours) * 10) / 10;

                    // 確保不會比原本算出的還多
                    finalHours = Math.min(estimatedHours, finalHours);

                    console.log(`📡 對話 ${convId.substring(0, 8)}: 背景作業 ${passiveRawHours.toFixed(1)}h -> 衰減為 ${passiveDiscountedHours.toFixed(1)}h`);
                }
            }

            estimatedHours = finalHours;

            // --- 補強: 若日誌無時間戳記或無日誌，改採 Brain 檔案間隔分析 (Brain File Gap Analysis) ---
            if ((!chatLog || !chatLog.lastInputTime) && fs.existsSync(brainFolder)) {
                try {
                    const brainFiles = fs.readdirSync(brainFolder);
                    const fileStats = brainFiles.map(f => {
                        try {
                            const s = fs.statSync(path.join(brainFolder, f));
                            return Math.max(s.mtime.getTime(), s.birthtime.getTime());
                        } catch (e) { return null; }
                    }).filter(t => t !== null).sort((a, b) => a - b);

                    if (fileStats.length >= 2) {
                        let totalAdjustedMs = 0;
                        const GAP_THRESHOLD_MS = 6 * 60 * 60 * 1000; // 從 4 小時放寬至 6 小時，容許更長的研究/思考時間

                        for (let i = 1; i < fileStats.length; i++) {
                            const gap = fileStats[i] - fileStats[i - 1];
                            if (gap > GAP_THRESHOLD_MS) {
                                // 該大間隙打 3 折 (30%)
                                totalAdjustedMs += (gap * 0.3);
                                console.log(`🕵️ 偵測到 Brain 大間隙: ${(gap / 3600000).toFixed(1)}h -> 衰減為 ${(gap * 0.3 / 3600000).toFixed(1)}h`);
                            } else {
                                totalAdjustedMs += gap;
                            }
                        }

                        // 計算修正後的總時長 (包含基礎 15 分鐘冷卻)
                        const finalAdjustedHours = Math.round((totalAdjustedMs / 3600000 + 0.25) * 10) / 10;
                        estimatedHours = Math.min(rawSpanHours, finalAdjustedHours);
                    }
                } catch (e) { }
            }

            // 計算基礎複雜度積分
            const sizeScore = Math.log2(stat.size / 1024 + 1) * 2;
            const artifactScore = artifacts.length * 2;
            const complexityScore = Math.round((sizeScore + artifactScore) * 10) / 10;

            conversations.push({
                id: convId,
                title: manual.title || metadata.title || `對話 ${convId.substring(0, 8)}`,
                project: manual.project || metadata.project || '未分類',
                category: manual.category || metadata.category || '其他',
                activeHours: manual.hours ? manual.hours : estimatedHours,
                hours: manual.hours || estimatedHours,
                summary: metadata.summary || manual.summary || (chatLog ? chatLog.summary : ''),
                modifiedTime: brainMtime.toISOString(),
                createdTime: brainBirthtime.toISOString(),
                sizeKb: Math.round(stat.size / 1024 * 10) / 10,
                artifacts: artifacts,
                complexityScore: complexityScore,
                chatAudit: !!chatLog,
                _manual: !!manual.title
            });
        }

        // 依時間排序
        conversations.sort((a, b) => new Date(a.modifiedTime) - new Date(b.modifiedTime));

        // --- 新增: 時間軸連續性與工時校正 ---
        for (let i = 1; i < conversations.length; i++) {
            const prev = conversations[i - 1];
            const current = conversations[i];

            const prevEnd = new Date(prev.modifiedTime);
            const currStart = new Date(current.createdTime);
            const currEnd = new Date(current.modifiedTime);

            if (currStart < prevEnd) {
                current.createdTime = prev.modifiedTime;
                const realSessionSpan = Math.max(0, (currEnd.getTime() - prevEnd.getTime()) / 3600000);

                // --- 修正: 時間重疊時的工時處理 ---
                // 之前的邏輯會強行重算並壓低工時 (newEstimated)，導致那些在背景執行或剛好接續的任務工時被誤殺 (變成 0.6)
                // 現在改為：取「原本估算值」與「剩餘物理空間」的較小值，確保不會無故縮水
                let adjustedHours = Math.min(current.activeHours, realSessionSpan);

                // 如果原本估算值很大 (例如高互動任務)，但被物理空間壓得很小，嘗試給予一點彈性 (最多不超過 1.5 倍物理空間)
                // 這是為了處理「秒接」任務導致物理空間幾乎為 0 的極端情況
                if (adjustedHours < 0.1 && current.activeHours > 1) {
                    adjustedHours = 0.1;
                }

                current.activeHours = Math.round(adjustedHours * 10) / 10;
            }
        }

        const lastEndByEngineer = {};

        conversations.forEach(current => {
            const eng = current.engineer || '未指定';
            const manual = MANUAL_METADATA[current.id] || {};

            if (lastEndByEngineer[eng]) {
                const prevEnd = new Date(lastEndByEngineer[eng]);
                const currStart = new Date(current.createdTime);
                const gapMs = currStart - prevEnd;
                current.thinkingGapMinutes = Math.max(0, Math.round(gapMs / 60000));
            } else {
                current.thinkingGapMinutes = 0;
            }

            // 修正：回歸使用者建議的休息判定
            const gapMinutes = current.thinkingGapMinutes;
            const isHeavy = ['資料處理', '架構變更', '開發模式'].includes(current.category);

            // 判定門檻：重型任務給予 120 分鐘準備空間，輕型任務 (Debug) 給予 60 分鐘
            const breakThreshold = isHeavy ? 120 : 60;

            // 恢復研究時間：重型任務上限給予 60 分鐘 (找資料)，輕型給予 15 分鐘
            const reasonableResearchMins = isHeavy ? 60 : 15;
            const effectiveResearchMins = (gapMinutes > breakThreshold) ? reasonableResearchMins : gapMinutes;

            current.researchHours = Math.round((effectiveResearchMins / 60) * 10) / 10;

            // 3. 重新計算總工時: 實作 + 校正後的研究
            const originalActive = current.activeHours || 0.1;
            const cappedTotal = Math.round((originalActive + current.researchHours) * 10) / 10;

            if (!manual.hours) {
                current.hours = cappedTotal;
            } else {
                current.hours = manual.hours;
            }

            // 最後防線：物理現實天花板 (Physical Ceiling)
            // 確保「算出來的工時」絕對不會大於「從上一筆結束到本筆結束」的物理跨度
            if (lastEndByEngineer[eng]) {
                const prevEndFinal = new Date(lastEndByEngineer[eng]);
                const currEndFinal = new Date(current.modifiedTime);
                const maxPhysicalPossibleHours = Math.max(0.1, (currEndFinal - prevEndFinal) / 3600000);

                if (current.hours > maxPhysicalPossibleHours) {
                    current.hours = Math.round(maxPhysicalPossibleHours * 10) / 10;
                }
            }

            // 更新該工程師的最後結束時間 (務必在天花板檢查後才更新)
            lastEndByEngineer[eng] = current.modifiedTime;

            if (current.activeHours > current.hours) {
                current.activeHours = current.hours;
            }
        });

        // 處理最近一筆進行中的對話 (如果沒有標題或標題是預設的 ID，且沒有手動設定)
        if (conversations.length > 0) {
            const latest = conversations[conversations.length - 1];
            // 判斷是否為預設標題/未分類 (表示沒有找到 metadata)
            if (latest.title.startsWith('對話 ') && latest.project === '未分類') {
                console.log(`✨ 為進行中的對話 (${latest.id.substring(0, 8)}...) 套用預設值`);
                latest.title = "進行中的對話";
                latest.project = "AI專案管理";
                latest.category = "開發模式";
                latest.summary = "CPDM 工時統計儀表板開發與維護";
            }
        }

    } catch (e) {
        console.error('掃描對話目錄失敗:', e.message);
    }

    return conversations;
}

/**
 * 取得對話檔案資訊
 */
function getConversationFileInfo(convId) {
    const pbFile = path.join(CONVERSATIONS_DIR, `${convId}.pb`);
    try {
        const stat = fs.statSync(pbFile);
        return {
            sizeBytes: stat.size,
            modifiedTime: stat.mtime,
            createdTime: stat.birthtime
        };
    } catch (e) {
        return null;
    }
}

/**
 * 取得對話產生的 artifacts
 */
function getBrainArtifacts(convId) {
    const brainFolder = path.join(BRAIN_DIR, convId);
    try {
        const files = fs.readdirSync(brainFolder);
        return files.filter(f => f.endsWith('.md') && !f.includes('metadata'));
    } catch (e) {
        return [];
    }
}

/**
 * 根據檔案大小估算工時
 */
function estimateHoursFromSize(sizeBytes) {
    return Math.round((sizeBytes / 800000) * 10) / 10;
}

/**
 * 解析對話日誌以獲取更精確的活動資訊
 */
function parseChatLog(convId) {
    const logFile = path.join(CHAT_LOGS_DIR, `${convId}.md`);
    if (!fs.existsSync(logFile)) return null;

    try {
        const content = fs.readFileSync(logFile, 'utf8');
        const lines = content.split('\n');
        let userInputs = 0;
        let plannerResponses = 0;
        let fileEdits = 0;
        let commandExecs = 0;
        const timestamps = [];

        // 使用 Regex 尋找 ISO 時間戳記 (導出日誌中常見的格式)
        const isoRegex = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g;

        let firstInputTime = null;
        let lastInputTime = null;

        lines.forEach(line => {
            if (line.includes('### User Input')) {
                userInputs++;
                const tsMatch = line.match(isoRegex);
                if (tsMatch) {
                    const ts = new Date(tsMatch[0]);
                    if (!firstInputTime || ts < firstInputTime) firstInputTime = ts;
                    if (!lastInputTime || ts > lastInputTime) lastInputTime = ts;
                }
            }
            if (line.includes('### Planner Response')) plannerResponses++;
            if (line.includes('*Edited relevant file*')) fileEdits++;
            if (line.includes('*User accepted the command')) commandExecs++;

            // 全域時間戳收集
            const globalMatches = line.match(isoRegex);
            if (globalMatches) {
                globalMatches.forEach(m => timestamps.push(new Date(m)));
            }
        });

        // 排序時間戳記以找到範圍
        timestamps.sort((a, b) => a - b);

        // 提取摘要：尋找第一個非標題的段落
        let summary = "";
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line && !line.startsWith('#') && !line.startsWith('*') && !line.startsWith('Note:')) {
                summary = line.substring(0, 100) + (line.length > 100 ? '...' : '');
                break;
            }
        }

        return {
            interactionCount: userInputs + plannerResponses,
            rounds: userInputs,
            actionCount: fileEdits + commandExecs,
            startTime: timestamps.length > 0 ? timestamps[0] : null,
            endTime: timestamps.length > 0 ? timestamps[timestamps.length - 1] : null,
            firstInputTime,
            lastInputTime,
            summary: summary,
            foundLog: true
        };
    } catch (e) {
        return null;
    }
}

/**
 * 跨日工時拆分與時間軸合併演算法 (Timeline Merging)
 * 解決多個對話重複計算重疊時間的問題，確保每日總工時符合人類物理極限。
 */
function calculateDailySplits(conversations) {
    const segmentsByDay = {}; // { "2025/12/18": { "engineer": [ {start, end, hours} ] } }

    // 1. 先將所有對話拆分到對應的日期 segments 中
    conversations.forEach(c => {
        const eng = c.engineer || '未指定';
        const startTime = new Date(c.createdTime);
        const endTime = new Date(c.modifiedTime);
        const totalHours = c.hours || 0;

        if (endTime <= startTime || isNaN(startTime.getTime()) || (endTime - startTime) < 1000) {
            const d = endTime.toLocaleDateString('zh-TW');
            if (!segmentsByDay[d]) segmentsByDay[d] = {};
            if (!segmentsByDay[d][eng]) segmentsByDay[d][eng] = [];
            segmentsByDay[d][eng].push({ start: endTime, end: endTime, hours: totalHours });
            return;
        }

        let tempStart = new Date(startTime);
        const totalSpanMs = endTime - startTime;

        while (tempStart < endTime) {
            const nextDay = new Date(tempStart);
            nextDay.setHours(24, 0, 0, 0);
            const endOfSegment = nextDay < endTime ? nextDay : endTime;
            const segmentRatio = (endOfSegment - tempStart) / totalSpanMs;
            const segmentHours = totalHours * segmentRatio;

            const dateStr = tempStart.toLocaleDateString('zh-TW');
            if (!segmentsByDay[dateStr]) segmentsByDay[dateStr] = {};
            if (!segmentsByDay[dateStr][eng]) segmentsByDay[dateStr][eng] = [];

            segmentsByDay[dateStr][eng].push({
                start: new Date(tempStart),
                end: new Date(endOfSegment),
                hours: segmentHours
            });

            tempStart = nextDay;
        }
    });

    // 2. 針對每一天、每一位工程師進行重疊合併
    const dailyFinal = {};

    for (const [date, engineers] of Object.entries(segmentsByDay)) {
        dailyFinal[date] = {};

        for (const [eng, segments] of Object.entries(engineers)) {
            if (segments.length === 0) continue;

            // 分離「零秒對話」(直接加總) 與 「有長度的區間」(需合併)
            const zeroWidthHours = segments.filter(s => s.start.getTime() === s.end.getTime()).reduce((sum, s) => sum + s.hours, 0);
            const intervals = segments.filter(s => s.start.getTime() < s.end.getTime());

            if (intervals.length === 0) {
                dailyFinal[date][eng] = Math.round(zeroWidthHours * 10) / 10;
                continue;
            }

            // 合併區間演算法: 計算區間的聯集 (Union) 的物理時長
            intervals.sort((a, b) => a.start - b.start);

            let mergedIntervals = [];
            let current = { start: intervals[0].start, end: intervals[0].end };

            for (let i = 1; i < intervals.length; i++) {
                if (intervals[i].start < current.end) {
                    current.end = new Date(Math.max(current.end, intervals[i].end));
                } else {
                    mergedIntervals.push(current);
                    current = { start: intervals[i].start, end: intervals[i].end };
                }
            }
            mergedIntervals.push(current);

            // 計算合併後的「物理上限時間」
            const unionPhysicalHours = mergedIntervals.reduce((sum, inv) => sum + (inv.end - inv.start), 0) / 3600000;
            const totalRawHours = segments.reduce((sum, s) => sum + s.hours, 0);

            // 最終工時取「計算值」與「物理跨度值」的較小者
            // 這樣即便是多個對話，只要在同一時段發生，且累加超過了這段時間的物理長度，就會被修正
            const finalHours = Math.min(totalRawHours, unionPhysicalHours);

            dailyFinal[date][eng] = Math.round(finalHours * 10) / 10;
        }
    }

    return dailyFinal;
}

/**
 * 產生報告
 */
function generateReport(projectFilter = null, startDate = null, endDate = null) {
    // 使用自動掃描取得所有對話
    let conversations = scanAllConversations();

    // 套用篩選條件
    conversations = conversations.filter(c => {
        if (projectFilter && c.project !== projectFilter) return false;
        const modTime = new Date(c.modifiedTime);
        if (startDate && modTime < startDate) return false;
        if (endDate && modTime > endDate) return false;
        return true;
    });

    // 統計
    const totalHours = conversations.reduce((sum, c) => sum + c.hours, 0);
    const projects = {};
    const categories = {};

    conversations.forEach(c => {
        if (!projects[c.project]) projects[c.project] = [];
        projects[c.project].push(c);

        if (!categories[c.category]) categories[c.category] = [];
        categories[c.category].push(c);
    });

    // 產生 Markdown
    const lines = [];
    const now = new Date();

    lines.push('# 專案互動歷史報告');
    lines.push('');
    lines.push(`> **自動產生於**: ${now.toLocaleString('zh-TW')}`);
    if (conversations.length > 0) {
        const firstDate = new Date(conversations[0].modifiedTime);
        const lastDate = new Date(conversations[conversations.length - 1].modifiedTime);
        lines.push(`> **分析期間**: ${firstDate.toLocaleDateString('zh-TW')} ~ ${lastDate.toLocaleDateString('zh-TW')}`);
    }
    lines.push('');
    lines.push('---');
    lines.push('');

    // 總覽
    lines.push('## 📊 統計總覽');
    lines.push('');
    lines.push('| 指標 | 數值 |');
    lines.push('|------|------|');
    lines.push(`| 對話總數 | ${conversations.length} 個 |`);
    lines.push(`| 總工時 | ${totalHours.toFixed(1)} 小時 |`);
    lines.push(`| 涉及專案 | ${Object.keys(projects).length} 個 |`);
    lines.push(`| 分類數 | ${Object.keys(categories).length} 類 |`);
    lines.push('');

    // 專案分布
    lines.push('### 專案分布');
    lines.push('');
    for (const [proj, convs] of Object.entries(projects)) {
        const hours = convs.reduce((s, c) => s + c.hours, 0);
        lines.push(`- **${proj}**: ${convs.length} 次對話, ${hours.toFixed(1)} 小時`);
    }
    lines.push('');

    // 類別分布
    lines.push('### 類別分布');
    lines.push('');
    const categoryEmoji = {
        'DEBUG': '🐛',
        'UI 調整': '🎨',
        '架構變更': '🏗️',
        '知識收集': '📚',
        '資料處理': '💾',
        '開發模式': '📌'
    };
    for (const [cat, convs] of Object.entries(categories)) {
        const hours = convs.reduce((s, c) => s + c.hours, 0);
        const emoji = categoryEmoji[cat] || '📌';
        lines.push(`- ${emoji} **${cat}**: ${convs.length} 項, ${hours.toFixed(1)} 小時`);
    }
    lines.push('');
    lines.push('---');
    lines.push('');

    // 人員時數統計
    const engineers = [...new Set(conversations.map(c => c.engineer || '未指定'))].sort();

    lines.push('## 👥 人員時數統計');
    lines.push('');
    lines.push('| 人員 | 總計工時 | 佔比 |');
    lines.push('|------|----------|------|');

    engineers.forEach(eng => {
        const hours = conversations.filter(c => (c.engineer || '未指定') === eng).reduce((s, c) => s + c.hours, 0);
        const pct = ((hours / (totalHours || 1)) * 100).toFixed(1) + '%';
        lines.push(`| ${eng} | ${hours.toFixed(1)}h | ${pct} |`);
    });
    lines.push('');

    // 每日工時拆分
    const dailyData = calculateDailySplits(conversations);
    const dates = Object.keys(dailyData).sort((a, b) => new Date(a) - new Date(b));

    lines.push('### 📅 每日工時拆分統計');
    lines.push('');
    lines.push(`| 日期 | ${engineers.join(' | ')} | 當日總計 |`);
    lines.push(`|------|${engineers.map(() => '---|').join('')}---|`);

    dates.forEach(date => {
        const row = engineers.map(eng => (dailyData[date][eng] || 0).toFixed(1) + 'h');
        const dayTotal = engineers.reduce((s, eng) => s + (dailyData[date][eng] || 0), 0);
        lines.push(`| ${date} | ${row.join(' | ')} | **${dayTotal.toFixed(1)}h** |`);
    });
    lines.push('');
    lines.push('');
    lines.push('---');
    lines.push('');

    // 詳細記錄
    lines.push('## 📋 詳細互動記錄');
    lines.push('');

    conversations.forEach((conv, i) => {
        const emoji = i % 2 === 0 ? '🔹' : '🔷';
        lines.push(`### ${emoji} ${i + 1}. ${conv.title}`);
        lines.push('');
        lines.push(`**對話 ID**: \`${conv.id}\`  `);
        lines.push(`**所屬專案**: ${conv.project}  `);
        lines.push(`**分類**: ${conv.category}  `);
        lines.push(`**最後更新**: ${conv.modifiedTime.toLocaleString('zh-TW')}  `);
        lines.push(`**工時**: ${conv.hours.toFixed(1)} 小時  `);
        lines.push(`**檔案大小**: ${conv.sizeKb} KB`);
        lines.push('');

        if (conv.summary) {
            lines.push(`**摘要**: ${conv.summary}`);
            lines.push('');
        }

        if (conv.artifacts.length > 0) {
            lines.push('**產出 Artifacts**:');
            conv.artifacts.forEach(a => lines.push(`- \`${a}\``));
            lines.push('');
        }

        lines.push('---');
        lines.push('');
    });

    // 工時分布圖
    lines.push('## 📈 工時分布圖');
    lines.push('');
    lines.push('```');
    const maxHours = Math.max(...conversations.map(c => c.hours), 1);
    conversations.forEach(conv => {
        const barLen = Math.round((conv.hours / maxHours) * 25);
        const bar = '█'.repeat(barLen) + '░'.repeat(25 - barLen);
        const title = conv.title.substring(0, 18).padEnd(18);
        lines.push(`${title} ${bar} ${conv.hours.toFixed(1)}h`);
    });
    lines.push('```');
    lines.push('');

    lines.push('---');
    lines.push('');
    lines.push(`**資料完整性簽章 (Integrity Checksum)**: \`${scanAllConversations().integrity || 'N/A'}\`  `);
    lines.push('*此報告由 CPDM 專案互動歷史產生器自動生成*');

    return lines.join('\n');
}

/**
 * 產生 JSON 格式 (供 Dashboard 使用)
 */
function generateJSON(projectFilter = null, startDate = null, endDate = null) {
    // 使用自動掃描取得所有對話
    let conversations = scanAllConversations();

    // 套用篩選條件
    conversations = conversations.filter(c => {
        if (projectFilter && c.project !== projectFilter) return false;
        const modTime = new Date(c.modifiedTime);
        if (startDate && modTime < startDate) return false;
        if (endDate && modTime > endDate) return false;
        return true;
    });

    // 統計
    const totalHours = conversations.reduce((sum, c) => sum + c.hours, 0);
    const projects = {};
    const categories = {};

    conversations.forEach(c => {
        if (!projects[c.project]) projects[c.project] = { count: 0, hours: 0 };
        projects[c.project].count++;
        projects[c.project].hours += c.hours;

        if (!categories[c.category]) categories[c.category] = { count: 0, hours: 0 };
        categories[c.category].count++;
        categories[c.category].hours += c.hours;
    });

    const result = {
        generatedAt: new Date().toISOString(),
        summary: {
            totalConversations: conversations.length,
            totalHours: Math.round(totalHours * 10) / 10,
            projectCount: Object.keys(projects).length,
            categoryCount: Object.keys(categories).length
        },
        projects,
        categories,
        conversations,
        staffDailyStats: calculateDailySplits(conversations)
    };

    // 計算資料完整性雜湊 (Integrity Hash)
    const contentToHash = JSON.stringify(result.conversations);
    result.integrity = crypto.createHash('sha256').update(contentToHash).digest('hex');

    return result;
}

/**
 * 產生 Dashboard Markdown 格式 (與 ProjectDashboard.html 相容)
 */
function generateDashboardMarkdown(projectFilter = null, startDate = null, endDate = null) {
    const data = generateJSON(projectFilter, startDate, endDate);

    const lines = [];
    lines.push('# 專案進度追蹤');
    lines.push('');
    lines.push('## 子項目進度');
    lines.push('');
    lines.push('| 子項目 | 負責人 | 狀態 | 進度 | 實際工時 | 預估剩餘 | 問題 |');
    lines.push('|--------|--------|------|------|----------|----------|------|');

    const statusMap = {
        'DEBUG': '🟡 卡關',
        'UI 調整': '🟢 進行中',
        '架構變更': '🟢 進行中',
        '知識收集': '✅ 完成',
        '資料處理': '✅ 完成',
        '開發模式': '🟢 進行中'
    };

    data.conversations.forEach(c => {
        const status = statusMap[c.category] || '🔵 規劃中';
        const progress = c.category === '知識收集' || c.category === '資料處理' ? '100%' : '80%';
        const issue = c.category === 'DEBUG' ? c.summary.substring(0, 20) : '無';
        lines.push(`| ${c.title} | AI 助理 | ${status} | ${progress} | ${c.hours}h | 0h | ${issue} |`);
    });

    return lines.join('\n');
}

/**
 * 解析命令列參數
 */
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        project: null,
        start: null,
        end: null,
        format: 'md',
        output: null,
        sync: false,
        help: false
    };

    args.forEach(arg => {
        if (arg === '--help' || arg === '-h') {
            options.help = true;
        } else if (arg === '--sync') {
            options.sync = true;
        } else if (arg.startsWith('--project=')) {
            options.project = arg.split('=')[1];
        } else if (arg.startsWith('--start=')) {
            options.start = new Date(arg.split('=')[1]);
        } else if (arg.startsWith('--end=')) {
            options.end = new Date(arg.split('=')[1]);
            options.end.setHours(23, 59, 59, 999); // 包含結束日當天
        } else if (arg.startsWith('--format=')) {
            options.format = arg.split('=')[1];
        } else if (arg.startsWith('--output=')) {
            options.output = arg.split('=')[1];
        }
    });

    return options;
}

/**
 * 顯示說明
 */
function showHelp() {
    console.log(`
CPDM 專案互動歷史報告產生器
=============================

使用方式:
  node generate_interaction_history.js [選項]

選項:
  --project=<名稱>    篩選特定專案
                      例如: --project=福至心靈籤
                      
  --start=<日期>      開始日期 (YYYY-MM-DD)
                      例如: --start=2025-12-17
                      
  --end=<日期>        結束日期 (YYYY-MM-DD)
                      例如: --end=2025-12-23
                      
  --format=<格式>     輸出格式:
                      - md: Markdown (預設)
                      - json: JSON 格式 (供程式使用)
                      - dashboard: Dashboard 相容格式
                      
  --output=<路徑>     自訂輸出檔案路徑
  
  --sync              自動將掃描結果同步回 conversation_metadata.json
                      (僅新增不存在的 ID，不覆寫手動調整過內容)
  
  --help, -h          顯示此說明

範例:
  # 產生完整報告
  node generate_interaction_history.js
  
  # 只看福至心靈籤專案
  node generate_interaction_history.js --project=福至心靈籤
  
  # 只看最近三天
  node generate_interaction_history.js --start=2025-12-20 --end=2025-12-23
  
  # 輸出 JSON 格式
  node generate_interaction_history.js --format=json
  
  # 輸出 Dashboard 相容格式
  node generate_interaction_history.js --format=dashboard --output=dashboard_data.md
`);
}

// ====== 主程式 ======
const options = parseArgs();

if (options.help) {
    showHelp();
    process.exit(0);
}

console.log('='.repeat(50));
console.log('CPDM 專案互動歷史報告產生器');
console.log('='.repeat(50));
console.log();

// 顯示篩選條件
if (options.project) console.log(`🔍 篩選專案: ${options.project}`);
if (options.start) console.log(`📅 開始日期: ${options.start.toLocaleDateString('zh-TW')}`);
if (options.end) console.log(`📅 結束日期: ${options.end.toLocaleDateString('zh-TW')}`);
console.log(`📄 輸出格式: ${options.format}`);
console.log();

// 檢查目錄
if (!fs.existsSync(CONVERSATIONS_DIR)) {
    console.log(`❌ 找不到對話目錄: ${CONVERSATIONS_DIR}`);
    process.exit(1);
}

console.log(`📁 對話目錄: ${CONVERSATIONS_DIR}`);
console.log(`📁 Brain 目錄: ${BRAIN_DIR}`);
console.log();

// 根據格式產生報告
let report, outputExt;
const conversations = scanAllConversations();

// ====== 執行同步邏輯 (如果啟動 --sync) ======
if (options.sync) {
    console.log('🔄 啟動同步模式...');
    let syncCount = 0;

    // 讀取原始檔案以保留註解與標頭
    let fullMetadata = {
        "_說明": "對話元數據勘誤表 - 用於補充自動掃描無法取得的資訊",
        "conversations": {}
    };

    if (fs.existsSync(METADATA_FILE)) {
        try {
            fullMetadata = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf8'));
        } catch (e) {
            console.error('⚠️ 無法解析現有勘誤檔，將建立新內容');
        }
    }

    if (!fullMetadata.conversations) fullMetadata.conversations = {};

    conversations.forEach(c => {
        const existing = fullMetadata.conversations[c.id];

        // 判斷是否需要更新：
        // 1. 原本不存在
        // 2. 存在但未鎖定 (locked !== true) 且目前的標題是預設的「對話 xxxx」格式
        const isDefaultTitle = existing && (existing.title.startsWith('對話 ') || existing.title === '進行中的對話');
        const isLocked = existing && existing.locked === true;

        if (!existing || (!isLocked && isDefaultTitle)) {
            // 如果是更新現有條目，保留可能的 locked 屬性或其他自訂欄位
            fullMetadata.conversations[c.id] = {
                ...(existing || {}),
                title: c.title,
                project: c.project,
                category: c.category,
                hours: c.hours
            };
            syncCount++;
        }
    });

    if (syncCount > 0) {
        fullMetadata["_最後更新"] = new Date().toISOString().split('T')[0];
        fs.writeFileSync(METADATA_FILE, JSON.stringify(fullMetadata, null, 4), 'utf8');
        console.log(`✅ 同步完成！已新增 ${syncCount} 筆對話元數據至 ${METADATA_FILE}`);
    } else {
        console.log('ℹ️ 所有對話已在勘誤表中，無需更新。');
    }
}

switch (options.format) {
    case 'json':
        // 修改 generateJSON 以接受已掃描的資料，避免重複掃描
        const jsonData = generateJSON(options.project, options.start, options.end);
        report = JSON.stringify(jsonData, null, 2);
        outputExt = '.json';
        break;
    case 'dashboard':
        report = generateDashboardMarkdown(options.project, options.start, options.end);
        outputExt = '.md';
        break;
    default:
        report = generateReport(options.project, options.start, options.end);
        outputExt = '.md';
}

// 輸出
const defaultOutputName = options.format === 'json'
    ? 'project_interaction_history_auto.json'
    : 'project_interaction_history_auto.md';
const outputFile = options.output || path.join(OUTPUT_DIR, defaultOutputName);

fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(outputFile, report, 'utf8');

console.log(`✅ 報告已產生: ${outputFile}`);
console.log();

// 預覽
if (options.format !== 'json') {
    console.log('='.repeat(50));
    console.log('報告預覽 (前 30 行):');
    console.log('='.repeat(50));
    report.split('\n').slice(0, 30).forEach(line => console.log(line));
} else {
    console.log('JSON 資料已產生，可供 Dashboard 匯入使用。');
}
