# 時間戳記追蹤系統

本目錄儲存所有對話互動的精確時間戳記,用於實現「超精準工時審計」。

## 目錄結構

```
timestamps/
├── README.md                          # 本說明文件
├── {conversation-id-1}/               # 對話 1 的時間戳記
│   ├── user_question_2025-12-30T21-19-47+08-00_evt_1735564787_abc123.json
│   ├── ai_completion_2025-12-30T21-21-29+08-00_evt_1735564889_def456.json
│   └── ...
├── {conversation-id-2}/               # 對話 2 的時間戳記
│   └── ...
└── ...
```

## 時間戳記檔案格式

每個時間戳記檔案都是一個 JSON 檔案,包含以下欄位:

```json
{
  "conversationId": "336b26f3-3f2a-4fad-beb5-0a8bda46a425",
  "eventType": "user_question",
  "timestamp": "2025-12-30T21:19:47+08:00",
  "eventId": "evt_1735564787_abc123",
  "metadata": {
    "questionText": "我查看交互歷史紀錄發現...",
    "questionLength": 150
  }
}
```

### 欄位說明

- **conversationId**: 對話的唯一識別符
- **eventType**: 事件類型
  - `user_question`: 使用者提問
  - `ai_completion`: AI 完成作業
- **timestamp**: ISO 8601 格式的時間戳記
- **eventId**: 事件的唯一識別符,格式: `evt_{timestamp}_{random}`
- **metadata**: 事件相關的元數據
  - 對於 `user_question`:
    - `questionText`: 問題內容(前 200 字)
    - `questionLength`: 問題總長度
  - 對於 `ai_completion`:
    - `taskSummary`: 任務摘要(前 200 字)
    - `complexity`: 複雜度 (1-10)
    - `modifiedFiles`: 修改的檔案清單
    - `fileCount`: 修改的檔案數量

## 檔案命名規範

時間戳記檔案的命名格式:

```
{eventType}_{timestamp}_{eventId}.json
```

範例:
```
user_question_2025-12-30T21-19-47+08-00_evt_1735564787_abc123.json
ai_completion_2025-12-30T21-21-29+08-00_evt_1735564889_def456.json
```

**注意**: 時間戳記中的冒號 `:` 和點 `.` 會被替換為連字號 `-`,以避免檔案系統相容性問題。

## 工時計算邏輯

### 互動工時計算

系統會配對 `user_question` 和 `ai_completion` 事件,計算每次互動的工時:

```
互動工時 = AI 完成時間 - 使用者提問時間
```

### 使用者思考時間

系統會計算兩次互動之間的間隔,作為「使用者思考時間」:

```
思考時間 = 下一次提問時間 - 上一次完成時間
```

**限制**: 只計算合理範圍內的思考時間 (< 2 小時),超過此範圍視為休息或離開。

### 總工時統計

```
總互動工時 = Σ(所有互動工時)
總思考工時 = Σ(所有思考時間,限制 < 2h)
總工作時間 = 總互動工時 + 總思考工時
```

## 使用方式

### 記錄時間戳記

使用 `timestamp_tracker.js` 模組:

```javascript
const tracker = require('./timestamp_tracker');

// 記錄使用者提問
tracker.recordUserQuestion(
  'conversation-id',
  '這是使用者的問題內容'
);

// 記錄 AI 完成
tracker.recordAICompletion(
  'conversation-id',
  '完成了某項任務',
  7,  // 複雜度
  ['file1.js', 'file2.html']  // 修改的檔案
);
```

### 計算工時

```javascript
// 計算特定對話的工時
const hours = tracker.calculateInteractionHours('conversation-id');
console.log(hours);
// {
//   conversationId: '...',
//   totalInteractionHours: 1.234,
//   userThinkingHours: 0.456,
//   aiProcessingHours: 1.234,
//   interactionCount: 5,
//   interactions: [...]
// }

// 取得所有對話的工時
const allHours = tracker.getAllConversationHours();

// 匯出為 JSON
tracker.exportHoursToJSON('hours_summary.json');
```

### 命令列工具

```bash
# 匯出所有工時統計
node timestamp_tracker.js export [輸出檔案路徑]

# 計算特定對話的工時
node timestamp_tracker.js calculate <對話ID>

# 執行測試
node timestamp_tracker.js test
```

## 與 CPDM 系統整合

時間戳記數據會與現有的 CPDM 工時估算系統整合:

1. **雙重驗證**: 時間戳記工時 vs 檔案時間戳記工時
2. **精確度提升**: 提供更細粒度的互動時間記錄
3. **審計友善**: 完整的時間軌跡,便於工時審計

在 `ProjectDashboard.html` 中會顯示:
- 時間戳記工時統計頁籤
- 互動時間軸視圖
- 工時來源對比表

## 資料完整性保證

1. **唯一識別符**: 每個事件都有唯一的 `eventId`,確保檔案不會被覆蓋
2. **時間順序**: 檔案按時間戳記排序,確保正確的時間順序
3. **Git 追蹤**: 所有時間戳記檔案都會被 Git 追蹤,確保歷史記錄完整
4. **不可變性**: 時間戳記檔案一旦生成就不會被修改或覆蓋

## 常見問題

### Q: 時間戳記檔案會佔用多少空間?

A: 每個時間戳記檔案約 300-500 bytes。假設每天 50 次互動,一個月約 30-50 KB,非常輕量。

### Q: 如果忘記記錄時間戳記怎麼辦?

A: 系統仍然可以使用 brain 檔案的時間戳記進行估算。時間戳記系統是額外的精確度提升,不會影響現有功能。

### Q: 時間戳記可以手動編輯嗎?

A: 技術上可以,但不建議。時間戳記系統的目的是提供客觀、不可篡改的工時記錄。如需調整,應該在工時統計階段進行。

### Q: 跨日對話如何處理?

A: 時間戳記系統會忠實記錄實際時間。在工時統計時,會根據時間戳記自動拆分到各個日期。

## 維護與備份

- **定期備份**: 建議定期備份 `timestamps/` 目錄
- **Git 提交**: 時間戳記檔案應該隨專案一起提交到 Git
- **清理策略**: 不建議刪除舊的時間戳記檔案,它們是工時審計的重要證據

---

**文件維護**: Antigravity AI Assistant  
**最後更新**: 2025-12-30  
**版本**: 1.0.0
