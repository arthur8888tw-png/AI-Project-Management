/**
 * 自動放行邏輯處理器
 * 判斷操作是否需要使用者確認,並記錄決策過程
 * 
 * @module auto_approval_handler
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');

// 配置檔案路徑
const CONFIG_PATH = path.join(__dirname, 'auto_approval_config.json');
const LOG_PATH = path.join(__dirname, 'auto_approval_decisions.log');

let config = null;

/**
 * 載入自動放行配置
 * @returns {Object} 配置物件
 */
function loadConfig() {
    if (config) {
        return config;
    }

    try {
        const configContent = fs.readFileSync(CONFIG_PATH, 'utf-8');
        config = JSON.parse(configContent);
        return config;
    } catch (error) {
        console.error('無法載入自動放行配置:', error.message);
        // 返回預設配置
        return {
            requireApproval: {
                artifacts: ['implementation_plan.md', 'task.md'],
                filePatterns: ['**/implementation_plan.md', '**/task.md'],
                operations: ['create_plan', 'update_plan', 'create_task', 'update_task']
            },
            autoApprove: {
                operations: ['code_edit', 'test_execution', 'documentation'],
                filePatterns: ['**/*.js', '**/*.html', '**/*.css']
            },
            timestampTracking: {
                enabled: true
            }
        };
    }
}

/**
 * 重新載入配置(用於配置更新後)
 */
function reloadConfig() {
    config = null;
    return loadConfig();
}

/**
 * 檢查檔案路徑是否符合模式
 * @param {string} filePath - 檔案路徑
 * @param {Array<string>} patterns - 模式陣列
 * @returns {boolean} 是否符合
 */
function matchesPattern(filePath, patterns) {
    if (!patterns || patterns.length === 0) {
        return false;
    }

    // 正規化路徑
    const normalizedPath = filePath.replace(/\\/g, '/');

    for (const pattern of patterns) {
        // 處理排除模式 (以 ! 開頭)
        if (pattern.startsWith('!')) {
            const excludePattern = pattern.substring(1);
            if (simpleMatch(normalizedPath, excludePattern)) {
                return false; // 明確排除
            }
        } else {
            if (simpleMatch(normalizedPath, pattern)) {
                return true;
            }
        }
    }

    return false;
}

/**
 * 簡單的 glob 模式匹配
 * @param {string} str - 字串
 * @param {string} pattern - 模式
 * @returns {boolean} 是否匹配
 */
function simpleMatch(str, pattern) {
    // 將 glob 模式轉換為正則表達式
    const regexPattern = pattern
        .replace(/\./g, '\\.')
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*')
        .replace(/\?/g, '.');

    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(str);
}

/**
 * 判斷操作是否需要使用者確認
 * @param {string} operation - 操作類型
 * @param {string} filePath - 檔案路徑 (可選)
 * @returns {Object} { requiresApproval: boolean, reason: string }
 */
function shouldRequireApproval(operation, filePath = '') {
    const cfg = loadConfig();

    // 檢查安全規則 - 危險操作總是需要確認
    if (cfg.safetyRules && cfg.safetyRules.alwaysConfirm) {
        if (cfg.safetyRules.alwaysConfirm.includes(operation)) {
            return {
                requiresApproval: true,
                reason: '安全規則: 危險操作需要確認'
            };
        }
    }

    // 檢查危險路徑模式
    if (filePath && cfg.safetyRules && cfg.safetyRules.dangerousPatterns) {
        if (matchesPattern(filePath, cfg.safetyRules.dangerousPatterns)) {
            return {
                requiresApproval: true,
                reason: '安全規則: 危險路徑需要確認'
            };
        }
    }

    // 檢查是否為需要確認的 artifact
    if (filePath && cfg.requireApproval.artifacts) {
        for (const artifact of cfg.requireApproval.artifacts) {
            if (filePath.includes(artifact)) {
                return {
                    requiresApproval: true,
                    reason: `需要確認的 artifact: ${artifact}`
                };
            }
        }
    }

    // 檢查檔案路徑模式
    if (filePath && cfg.requireApproval.filePatterns) {
        if (matchesPattern(filePath, cfg.requireApproval.filePatterns)) {
            return {
                requiresApproval: true,
                reason: '檔案路徑符合需要確認的模式'
            };
        }
    }

    // 檢查操作類型
    if (cfg.requireApproval.operations && cfg.requireApproval.operations.includes(operation)) {
        return {
            requiresApproval: true,
            reason: `操作類型需要確認: ${operation}`
        };
    }

    // 檢查是否在自動放行清單中
    if (cfg.autoApprove.operations && cfg.autoApprove.operations.includes(operation)) {
        return {
            requiresApproval: false,
            reason: `操作類型自動放行: ${operation}`
        };
    }

    if (filePath && cfg.autoApprove.filePatterns) {
        if (matchesPattern(filePath, cfg.autoApprove.filePatterns)) {
            return {
                requiresApproval: false,
                reason: '檔案路徑符合自動放行模式'
            };
        }
    }

    // 預設: 需要確認
    return {
        requiresApproval: true,
        reason: '未明確定義的操作,預設需要確認'
    };
}

/**
 * 記錄決策過程
 * @param {string} operation - 操作類型
 * @param {Object} decision - 決策結果
 * @param {string} filePath - 檔案路徑
 */
function logDecision(operation, decision, filePath = '') {
    const cfg = loadConfig();

    if (!cfg.logging || !cfg.logging.enabled) {
        return;
    }

    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        operation,
        filePath,
        requiresApproval: decision.requiresApproval,
        reason: decision.reason
    };

    const logLine = JSON.stringify(logEntry) + '\n';

    try {
        fs.appendFileSync(LOG_PATH, logLine, 'utf-8');
    } catch (error) {
        console.error('無法寫入決策日誌:', error.message);
    }
}

/**
 * 處理操作並返回是否需要確認
 * @param {string} operation - 操作類型
 * @param {string} filePath - 檔案路徑
 * @returns {boolean} 是否需要確認
 */
function handleOperation(operation, filePath = '') {
    const decision = shouldRequireApproval(operation, filePath);
    logDecision(operation, decision, filePath);

    if (decision.requiresApproval) {
        console.log(`⚠️  需要確認: ${operation} - ${decision.reason}`);
    } else {
        console.log(`✓ 自動放行: ${operation} - ${decision.reason}`);
    }

    return decision.requiresApproval;
}

/**
 * 取得決策統計
 * @returns {Object} 統計數據
 */
function getDecisionStats() {
    if (!fs.existsSync(LOG_PATH)) {
        return {
            totalDecisions: 0,
            approvalRequired: 0,
            autoApproved: 0
        };
    }

    const logContent = fs.readFileSync(LOG_PATH, 'utf-8');
    const lines = logContent.trim().split('\n').filter(line => line);

    let approvalRequired = 0;
    let autoApproved = 0;

    for (const line of lines) {
        try {
            const entry = JSON.parse(line);
            if (entry.requiresApproval) {
                approvalRequired++;
            } else {
                autoApproved++;
            }
        } catch (error) {
            // 忽略無效的日誌行
        }
    }

    return {
        totalDecisions: lines.length,
        approvalRequired,
        autoApproved,
        autoApprovalRate: lines.length > 0 ? (autoApproved / lines.length * 100).toFixed(2) + '%' : '0%'
    };
}

/**
 * 清除決策日誌
 */
function clearDecisionLog() {
    if (fs.existsSync(LOG_PATH)) {
        fs.unlinkSync(LOG_PATH);
        console.log('✓ 決策日誌已清除');
    }
}

// 模組匯出
module.exports = {
    loadConfig,
    reloadConfig,
    shouldRequireApproval,
    handleOperation,
    logDecision,
    getDecisionStats,
    clearDecisionLog
};

// CLI 支援
if (require.main === module) {
    const args = process.argv.slice(2);
    const command = args[0];

    if (command === 'test') {
        console.log('測試自動放行邏輯...\n');

        const testCases = [
            { operation: 'code_edit', filePath: 'src/utils.js' },
            { operation: 'update_plan', filePath: 'brain/implementation_plan.md' },
            { operation: 'test_execution', filePath: 'tests/test.js' },
            { operation: 'create_task', filePath: 'brain/task.md' },
            { operation: 'documentation', filePath: 'docs/README.md' },
            { operation: 'delete_database', filePath: 'data/production.db' }
        ];

        testCases.forEach(testCase => {
            console.log(`\n測試: ${testCase.operation} - ${testCase.filePath}`);
            handleOperation(testCase.operation, testCase.filePath);
        });

        console.log('\n決策統計:');
        console.log(getDecisionStats());

    } else if (command === 'stats') {
        console.log('決策統計:');
        console.log(getDecisionStats());

    } else if (command === 'clear') {
        clearDecisionLog();

    } else {
        console.log('用法:');
        console.log('  node auto_approval_handler.js test   - 執行測試案例');
        console.log('  node auto_approval_handler.js stats  - 顯示決策統計');
        console.log('  node auto_approval_handler.js clear  - 清除決策日誌');
    }
}
