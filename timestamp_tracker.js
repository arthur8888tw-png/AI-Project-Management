/**
 * 時間戳記追蹤核心模組
 * 用於記錄使用者提問和 AI 完成作業的精確時間戳記
 * 
 * @module timestamp_tracker
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 配置
const CONFIG = {
  timestampDir: 'timestamps',
  encoding: 'utf-8'
};

/**
 * 確保時間戳記目錄存在
 * @param {string} conversationId - 對話 ID
 * @returns {string} 時間戳記目錄路徑
 */
function ensureTimestampDir(conversationId) {
  const baseDir = path.join(process.cwd(), CONFIG.timestampDir);
  const conversationDir = path.join(baseDir, conversationId);
  
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }
  
  if (!fs.existsSync(conversationDir)) {
    fs.mkdirSync(conversationDir, { recursive: true });
  }
  
  return conversationDir;
}

/**
 * 生成唯一的事件 ID
 * @returns {string} 唯一事件 ID
 */
function generateEventId() {
  const timestamp = Date.now();
  const randomHex = crypto.randomBytes(4).toString('hex');
  return `evt_${timestamp}_${randomHex}`;
}

/**
 * 生成時間戳記檔案名稱
 * @param {string} eventType - 事件類型 (user_question | ai_completion)
 * @param {string} timestamp - ISO 時間戳記
 * @param {string} eventId - 事件 ID
 * @returns {string} 檔案名稱
 */
function generateFilename(eventType, timestamp, eventId) {
  // 將時間戳記中的冒號替換為連字號,避免檔案系統問題
  const safeTimestamp = timestamp.replace(/:/g, '-').replace(/\./g, '-');
  return `${eventType}_${safeTimestamp}_${eventId}.json`;
}

/**
 * 生成時間戳記檔案
 * @param {string} conversationId - 對話 ID
 * @param {string} eventType - 事件類型 (user_question | ai_completion)
 * @param {Object} data - 事件數據
 * @returns {Object} 生成的時間戳記數據
 */
function generateTimestampFile(conversationId, eventType, data) {
  const timestamp = new Date().toISOString();
  const eventId = generateEventId();
  const timestampDir = ensureTimestampDir(conversationId);
  
  const timestampData = {
    conversationId,
    eventType,
    timestamp,
    eventId,
    metadata: data
  };
  
  const filename = generateFilename(eventType, timestamp, eventId);
  const filepath = path.join(timestampDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(timestampData, null, 2), CONFIG.encoding);
  
  console.log(`✓ 時間戳記已記錄: ${filename}`);
  return timestampData;
}

/**
 * 記錄使用者提問時間
 * @param {string} conversationId - 對話 ID
 * @param {string} questionText - 問題內容
 * @returns {Object} 時間戳記數據
 */
function recordUserQuestion(conversationId, questionText) {
  const data = {
    questionText: questionText.substring(0, 200), // 只記錄前 200 字
    questionLength: questionText.length
  };
  
  return generateTimestampFile(conversationId, 'user_question', data);
}

/**
 * 記錄 AI 完成作業時間
 * @param {string} conversationId - 對話 ID
 * @param {string} taskSummary - 任務摘要
 * @param {number} complexity - 複雜度 (1-10)
 * @param {Array<string>} modifiedFiles - 修改的檔案清單
 * @returns {Object} 時間戳記數據
 */
function recordAICompletion(conversationId, taskSummary, complexity = 5, modifiedFiles = []) {
  const data = {
    taskSummary: taskSummary.substring(0, 200),
    complexity,
    modifiedFiles,
    fileCount: modifiedFiles.length
  };
  
  return generateTimestampFile(conversationId, 'ai_completion', data);
}

/**
 * 載入特定對話的所有時間戳記檔案
 * @param {string} conversationId - 對話 ID
 * @returns {Array<Object>} 時間戳記事件陣列
 */
function loadTimestampFiles(conversationId) {
  const timestampDir = path.join(process.cwd(), CONFIG.timestampDir, conversationId);
  
  if (!fs.existsSync(timestampDir)) {
    return [];
  }
  
  const files = fs.readdirSync(timestampDir)
    .filter(f => f.endsWith('.json'))
    .sort(); // 按檔名排序,確保時間順序
  
  const events = files.map(filename => {
    const filepath = path.join(timestampDir, filename);
    const content = fs.readFileSync(filepath, CONFIG.encoding);
    return JSON.parse(content);
  });
  
  // 修正: 依據時間戳記排序,而不是檔名
  events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  
  return events;
}

/**
 * 計算特定對話的互動工時
 * @param {string} conversationId - 對話 ID
 * @returns {Object} 工時統計數據
 */
function calculateInteractionHours(conversationId) {
  const events = loadTimestampFiles(conversationId);
  const interactions = [];
  let totalHours = 0;
  let userThinkingHours = 0;
  let aiProcessingHours = 0;
  
  // 配對 user_question 和 ai_completion
  for (let i = 0; i < events.length; i++) {
    if (events[i].eventType === 'user_question') {
      // 尋找下一個 ai_completion
      let completionIndex = -1;
      for (let j = i + 1; j < events.length; j++) {
        if (events[j].eventType === 'ai_completion') {
          completionIndex = j;
          break;
        }
      }
      
      if (completionIndex !== -1) {
        const questionTime = new Date(events[i].timestamp);
        const completionTime = new Date(events[completionIndex].timestamp);
        const hours = (completionTime - questionTime) / (1000 * 60 * 60);
        
        interactions.push({
          questionTime: questionTime.toISOString(),
          completionTime: completionTime.toISOString(),
          hours: parseFloat(hours.toFixed(3)),
          questionText: events[i].metadata.questionText,
          taskSummary: events[completionIndex].metadata.taskSummary,
          complexity: events[completionIndex].metadata.complexity,
          modifiedFiles: events[completionIndex].metadata.modifiedFiles || []
        });
        
        totalHours += hours;
        aiProcessingHours += hours;
      }
    }
  }
  
  // 計算使用者思考時間 (兩次互動之間的間隔)
  for (let i = 0; i < interactions.length - 1; i++) {
    const currentEnd = new Date(interactions[i].completionTime);
    const nextStart = new Date(interactions[i + 1].questionTime);
    const thinkingTime = (nextStart - currentEnd) / (1000 * 60 * 60);
    
    // 只計算合理範圍內的思考時間 (< 2 小時)
    if (thinkingTime > 0 && thinkingTime < 2) {
      userThinkingHours += thinkingTime;
    }
  }
  
  return {
    conversationId,
    totalInteractionHours: parseFloat(totalHours.toFixed(3)),
    userThinkingHours: parseFloat(userThinkingHours.toFixed(3)),
    aiProcessingHours: parseFloat(aiProcessingHours.toFixed(3)),
    interactionCount: interactions.length,
    interactions
  };
}

/**
 * 取得所有對話的工時統計
 * @returns {Array<Object>} 所有對話的工時統計
 */
function getAllConversationHours() {
  const timestampDir = path.join(process.cwd(), CONFIG.timestampDir);
  
  if (!fs.existsSync(timestampDir)) {
    return [];
  }
  
  const conversationIds = fs.readdirSync(timestampDir)
    .filter(item => {
      const itemPath = path.join(timestampDir, item);
      return fs.statSync(itemPath).isDirectory();
    });
  
  return conversationIds.map(id => calculateInteractionHours(id));
}

/**
 * 匯出工時統計為 JSON 檔案
 * @param {string} outputPath - 輸出檔案路徑
 */
function exportHoursToJSON(outputPath) {
  const allHours = getAllConversationHours();
  const summary = {
    generatedAt: new Date().toISOString(),
    totalConversations: allHours.length,
    totalInteractionHours: parseFloat(allHours.reduce((sum, c) => sum + c.totalInteractionHours, 0).toFixed(3)),
    totalInteractions: allHours.reduce((sum, c) => sum + c.interactionCount, 0),
    conversations: allHours
  };
  
  fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2), CONFIG.encoding);
  console.log(`✓ 工時統計已匯出至: ${outputPath}`);
}

// 模組匯出
module.exports = {
  recordUserQuestion,
  recordAICompletion,
  generateTimestampFile,
  calculateInteractionHours,
  getAllConversationHours,
  exportHoursToJSON,
  loadTimestampFiles
};

// CLI 支援
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (command === 'export') {
    const outputPath = args[1] || 'timestamp_hours_summary.json';
    exportHoursToJSON(outputPath);
  } else if (command === 'calculate') {
    const conversationId = args[1];
    if (!conversationId) {
      console.error('錯誤: 請提供對話 ID');
      process.exit(1);
    }
    const result = calculateInteractionHours(conversationId);
    console.log(JSON.stringify(result, null, 2));
  } else if (command === 'test') {
    // 測試功能
    const testConvId = '336b26f3-3f2a-4fad-beb5-0a8bda46a425';
    console.log('測試: 記錄使用者提問...');
    recordUserQuestion(testConvId, '這是一個測試問題,用於驗證時間戳記系統是否正常運作。');
    
    setTimeout(() => {
      console.log('測試: 記錄 AI 完成...');
      recordAICompletion(testConvId, '完成測試任務', 5, ['test_file.js']);
      
      console.log('\n測試: 計算工時...');
      const hours = calculateInteractionHours(testConvId);
      console.log(JSON.stringify(hours, null, 2));
    }, 2000);
  } else {
    console.log('用法:');
    console.log('  node timestamp_tracker.js export [輸出檔案路徑]');
    console.log('  node timestamp_tracker.js calculate <對話ID>');
    console.log('  node timestamp_tracker.js test');
  }
}
