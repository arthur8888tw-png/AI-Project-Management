# SQLite 綁定錯誤 - Object 型別處理

## 問題描述

**錯誤訊息**:
```
SQLite3Error: Unsupported bind() argument type: object
Transaction Failed, Rolling back
```

**發生場景**: 
- 專案: 福至心靈籤
- 對話: `bf5a9afd` - 卷軸展開動態展示
- 時間: 2025-12-19

## 問題根本原因

### 1. AI 回傳資料格式問題
AI (Gemini) 有時會回傳結構化物件而非純字串:
```javascript
{
  "聖意概括": "...",
  "策略建議": "...",
  "心靈指引": "..."
}
```

### 2. React 渲染錯誤
```
Error: Objects are not valid as a React child
```
React 無法直接渲染物件,導致 UI 崩潰。

### 3. SQLite 儲存失敗
當嘗試將物件直接綁定到 SQL 參數時,SQLite 的 `bind()` 函數拒絕接受物件型態。

## 解決方案

### 方案 1: 前端防禦性程式碼 (TempleScreen.tsx)

```typescript
// 在顯示前檢查並轉換物件
const displayInterpretation = typeof interpretation === 'object' 
  ? JSON.stringify(interpretation, null, 2)
  : interpretation;
```

**優點**: 
- 立即解決 React 渲染問題
- 保留完整資料結構

**缺點**:
- JSON 格式對使用者不友善

### 方案 2: 儲存層強制字串化 (storageService.ts) ⭐ 推薦

```typescript
// 在存入資料庫前強制轉換
const saveRecord = async (record) => {
  const sanitizedRecord = {
    ...record,
    question: typeof record.question === 'object' 
      ? JSON.stringify(record.question) 
      : record.question,
    interpretation: typeof record.interpretation === 'object'
      ? JSON.stringify(record.interpretation)
      : record.interpretation
  };
  
  await db.insert(sanitizedRecord);
};
```

**優點**:
- 根本解決 SQLite 綁定問題
- 確保資料庫資料一致性
- 不影響 UI 顯示邏輯

### 方案 3: AI 輸出格式控制 (geminiService.ts)

```typescript
// 在 Prompt 中明確要求純文字輸出
const systemPrompt = `
請以純文字格式回覆,不要使用 JSON 物件。
每個段落之間使用雙換行分隔。
`;
```

**優點**:
- 從源頭避免問題
- 輸出格式更適合閱讀

**缺點**:
- AI 不一定完全遵守
- 仍需要防禦性程式碼

## 最佳實踐

### 完整防禦策略

1. **AI 層**: Prompt 中明確要求文字格式
2. **處理層**: 接收後立即檢查並轉換
3. **儲存層**: 存入資料庫前再次確保字串化
4. **顯示層**: UI 加上 `whitespace-pre-wrap` 保留格式

### 程式碼檢查清單

```markdown
- [ ] 檢查所有 AI 回傳值的型別
- [ ] 在 bind() 前確保資料為原始型別
- [ ] 使用 typeof 檢查而非 instanceof
- [ ] 考慮使用 JSON.stringify() 作為備案
- [ ] 在 UI 層加入錯誤邊界 (Error Boundary)
```

## 相關錯誤

### 外部資源載入錯誤
```
ERR_BLOCKED_BY_RESPONSE.NotSameOriginAfterDefaultedToSameOriginByCoep
```

**解決方案**: 使用本地資源或 CSS 替代外部圖片
```css
/* 替代外部 pinstriped-suit.png */
background: repeating-linear-gradient(
  45deg,
  #f5e6d3,
  #f5e6d3 10px,
  #f0dcc0 10px,
  #f0dcc0 20px
);
```

## 預防措施

### TypeScript 型別定義

```typescript
interface FortuneRecord {
  id: string;
  question: string;  // 明確定義為 string
  interpretation: string;  // 明確定義為 string
  lotNumber: number;
  timestamp: number;
}

// 使用型別守衛
function isValidRecord(record: any): record is FortuneRecord {
  return typeof record.question === 'string' 
    && typeof record.interpretation === 'string';
}
```

### 單元測試

```typescript
describe('saveRecord', () => {
  it('should handle object interpretation', async () => {
    const record = {
      interpretation: { 聖意概括: "test" }
    };
    
    await expect(saveRecord(record)).resolves.not.toThrow();
  });
});
```

## 標籤

#SQLite #錯誤處理 #資料庫 #型別轉換 #React #防禦性程式設計

## 專案

福至心靈籤

## 相關對話

- `bf5a9afd` - 卷軸展開動態展示 (2025-12-19)

## 參考資源

- [SQLite Bind Parameters](https://www.sqlite.org/c3ref/bind_blob.html)
- [React Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
