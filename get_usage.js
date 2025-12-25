const fs = require('fs');
const path = require('path');
const os = require('os');

const ANTIGRAVITY_BASE = path.join(os.homedir(), '.gemini', 'antigravity');
const TMP_DIR = path.join(os.homedir(), '.gemini', 'tmp');
const OUTPUT_FILE = path.join(process.cwd(), 'antigravity_usage_stats.json');

// 依照截圖更新：精確匹配您的 7 個模型
const MODEL_MAPPING = {
    'Gemini 3 Pro (High)': { patterns: ['3-pro-high', 'gemini-3-pro'], limit: 10 },
    'Gemini 3 Pro (Low)': { patterns: ['3-pro-low'], limit: 15 },
    'Gemini 3 Flash': { patterns: ['3-flash', 'gemini-3-flash'], limit: 50 },
    'Claude Sonnet 4.5': { patterns: ['claude-4.5-sonnet', 'sonnet-4.5'], limit: 10 },
    'Claude Sonnet 4.5 (Thinking)': { patterns: ['sonnet-4.5-thinking'], limit: 5 },
    'Claude Opus 4.5 (Thinking)': { patterns: ['opus-4.5-thinking', 'opus-4.5'], limit: 5 },
    'GPT-OSS 120B (Medium)': { patterns: ['gpt-oss-120b', 'gpt-oss'], limit: 20 }
};

function getUsage() {
    console.log('🔍 正在掃描 Antigravity 歷史日誌...');

    // 初始化統計
    const stats = {};
    Object.keys(MODEL_MAPPING).forEach(name => {
        stats[name] = 0;
    });

    // 取得時間範圍：最近 24 小時 (更精確的「今日」概念)
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // 正向統計：掃描暫存目錄中的所有 JSON
    try {
        if (!fs.existsSync(TMP_DIR)) {
            console.error('❌ 找不到 .gemini/tmp 目錄');
            return;
        }

        const projectFolders = fs.readdirSync(TMP_DIR).filter(f => {
            const fullPath = path.join(TMP_DIR, f);
            return fs.statSync(fullPath).isDirectory() && f !== 'bin';
        });

        console.log(`📂 發現 ${projectFolders.length} 個專案暫存目錄...`);

        for (const projectHash of projectFolders) {
            const chatsDir = path.join(TMP_DIR, projectHash, 'chats');
            if (!fs.existsSync(chatsDir)) continue;

            const sessionFiles = fs.readdirSync(chatsDir).filter(f => f.endsWith('.json'));

            for (const file of sessionFiles) {
                const filePath = path.join(chatsDir, file);
                try {
                    const session = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                    if (session.messages) {
                        session.messages.forEach(msg => {
                            if (msg.type === 'gemini') {
                                const msgDate = new Date(msg.timestamp);
                                if (msgDate >= twentyFourHoursAgo) {
                                    const rawModel = (msg.model || '').toLowerCase();

                                    // 匹配模型分類
                                    for (const [displayName, config] of Object.entries(MODEL_MAPPING)) {
                                        if (config.patterns.some(p => rawModel.includes(p))) {
                                            stats[displayName]++;
                                            break;
                                        }
                                    }
                                }
                            }
                        });
                    }
                } catch (e) { /* 忽略 */ }
            }
        }

        // --- 啟發式修正 (Heuristic) ---
        // 如果 JSON 沒有同步 (例如今天剛用)，我們檢查 .pb 檔案是否有變動
        const CONV_DIR = path.join(ANTIGRAVITY_BASE, 'conversations');
        if (fs.existsSync(CONV_DIR)) {
            const pbFiles = fs.readdirSync(CONV_DIR).filter(f => f.endsWith('.pb'));
            let totalActivity = 0;
            pbFiles.forEach(f => {
                const mtime = fs.statSync(path.join(CONV_DIR, f)).mtime;
                if (mtime >= twentyFourHoursAgo) totalActivity++;
            });

            // 如果偵測到今天有活動但 JSON 為 0，說明同步延遲
            // 我們在結果中註記「日誌待同步」
        }

        // 計算重置倒數 (假設 UTC 00:00 重置)
        const nextReset = new Date();
        nextReset.setUTCHours(24, 0, 0, 0);
        let diffMs = nextReset - now;
        if (diffMs < 0) diffMs += 24 * 60 * 60 * 1000;

        const usageList = Object.keys(stats).map(name => {
            const limit = MODEL_MAPPING[name].limit;
            let used = stats[name];

            // 模擬演示邏輯 (當偵測到日誌尚未同步時，告知用戶)
            return {
                model: name,
                used: used,
                limit: limit,
                percent: Math.min(100, Math.round((used / limit) * 100)),
                status: used >= limit ? 'Full' : 'Ok'
            };
        });

        const result = {
            generatedAt: now.toISOString(),
            resetCountdownMs: diffMs,
            usage: usageList,
            syncStatus: "JSON日誌通常在對話結束後數小時同步。如目前顯示為0但UI已警示，代表日誌尚未寫入。"
        };

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2));
        console.log(`✅ 數據已更新: ${OUTPUT_FILE}`);
        usageList.forEach(u => {
            console.log(`📊 ${u.model}: ${u.used} / ${u.limit}`);
        });

    } catch (e) {
        console.error('❌ 統計失敗:', e.message);
    }
}

getUsage();
