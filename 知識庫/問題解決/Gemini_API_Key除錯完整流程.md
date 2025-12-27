# Gemini API Key 除錯完整流程

## 問題描述

**錯誤現象**:
- Gemini API Key 無法正常運作
- API 呼叫失敗或無回應

**發生場景**:
- 專案: 福至心靈籤  
- 對話: `9eb84981` - Gemini API Key Debugging
- 時間: 2025-12-19
- 卡關時長: **僅 8 分鐘** ⚡ (極短,成功案例)

## 系統化排查流程

### 階段 1: 環境變數檢查 ✅

```bash
# 檢查環境變數是否正確設定
echo $GEMINI_API_KEY

# 或在 Node.js 中
console.log(process.env.GEMINI_API_KEY);
```

**常見問題**:
- ❌ 環境變數名稱拼錯
- ❌ `.env` 檔案未被正確載入
- ❌ 環境變數包含多餘空白或引號

**解決方案**:
```javascript
// 使用 dotenv 確保載入
require('dotenv').config();

// 驗證 API Key 格式
const apiKey = process.env.GEMINI_API_KEY?.trim();
if (!apiKey || !apiKey.startsWith('AIza')) {
  throw new Error('Invalid Gemini API Key format');
}
```

### 階段 2: API Key 權限驗證 🔐

```bash
# 使用 curl 測試 API Key
curl -H "Content-Type: application/json" \
     -d '{"contents":[{"parts":[{"text":"Hello"}]}]}' \
     "https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=YOUR_API_KEY"
```

**檢查項目**:
- [ ] API Key 是否已啟用
- [ ] 配額是否已用完
- [ ] 是否有地區限制
- [ ] 模型權限是否正確

**Google AI Studio 檢查清單**:
1. 前往 [Google AI Studio](https://makersuite.google.com/app/apikey)
2. 確認 API Key 狀態為「Active」
3. 檢查「Quota」頁面的使用量
4. 驗證已啟用的模型列表

### 階段 3: 測試替代方案 🔄

如果 Gemini API 持續失敗,立即切換到備用方案:

#### 選項 A: LM Studio (本地 AI)

```typescript
// geminiService.ts
const API_ENDPOINT = process.env.USE_LOCAL_AI 
  ? 'http://localhost:1234/v1/chat/completions'  // LM Studio
  : 'https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent';
```

**優點**:
- ✅ 完全免費
- ✅ 無配額限制
- ✅ 隱私性高
- ✅ 離線可用

**缺點**:
- ⚠️ 需要本地運算資源
- ⚠️ 回應品質可能較低

#### 選項 B: OpenAI API

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const response = await openai.chat.completions.create({
  model: "gpt-3.5-turbo",
  messages: [{ role: "user", content: prompt }]
});
```

### 階段 4: 錯誤處理強化 🛡️

```typescript
async function callGeminiWithFallback(prompt: string) {
  try {
    // 嘗試 Gemini
    return await callGemini(prompt);
  } catch (error) {
    console.error('Gemini API failed:', error);
    
    // 自動降級到 LM Studio
    if (process.env.LM_STUDIO_AVAILABLE) {
      console.log('Falling back to LM Studio...');
      return await callLMStudio(prompt);
    }
    
    // 最後備案: 使用預設回應
    return getDefaultResponse();
  }
}
```

## 成功要素分析

此問題在 **8 分鐘內** 快速解決,關鍵成功因素:

### 1. 系統化排查 ✅
- 按照「環境→權限→替代方案」的順序
- 不跳步驟,逐一驗證

### 2. 保留備用方案 ✅
- 事先準備 LM Studio 作為備援
- 不依賴單一 API 提供商

### 3. 快速決策 ✅
- 發現問題立即切換方案
- 不浪費時間在無法控制的外部服務上

## 預防性檢查清單

### 開發階段
```markdown
- [ ] 在 .env.example 中記錄所有必要的 API Key
- [ ] 實作 API Key 格式驗證
- [ ] 設定 API 呼叫逾時 (timeout)
- [ ] 準備至少一個備用 AI 服務
- [ ] 撰寫 API 健康檢查腳本
```

### 部署階段
```markdown
- [ ] 確認生產環境的環境變數已設定
- [ ] 測試 API Key 在生產環境的可用性
- [ ] 設定 API 錯誤監控與告警
- [ ] 準備 API Key 輪替機制
- [ ] 文檔化 API Key 取得流程
```

## 常見錯誤碼

| 錯誤碼 | 原因 | 解決方案 |
|--------|------|----------|
| 400 | 請求格式錯誤 | 檢查 JSON 結構 |
| 401 | API Key 無效 | 重新生成 API Key |
| 403 | 權限不足 | 檢查 API Key 權限設定 |
| 429 | 超過配額 | 等待配額重置或升級方案 |
| 500 | 伺服器錯誤 | 稍後重試或切換備用方案 |

## 監控與告警

### 實作健康檢查

```typescript
// healthCheck.ts
export async function checkGeminiHealth(): Promise<boolean> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-pro?key=${API_KEY}`
    );
    return response.ok;
  } catch {
    return false;
  }
}

// 定期檢查 (每 5 分鐘)
setInterval(async () => {
  const isHealthy = await checkGeminiHealth();
  if (!isHealthy) {
    console.error('⚠️ Gemini API is down, switching to fallback');
    switchToFallback();
  }
}, 5 * 60 * 1000);
```

## 工具腳本

### API Key 測試腳本

```javascript
// test_gemini_key.js
require('dotenv').config();

async function testGeminiKey() {
  const apiKey = process.env.GEMINI_API_KEY;
  
  console.log('🔍 Testing Gemini API Key...');
  console.log('Key prefix:', apiKey?.substring(0, 10) + '...');
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Hello' }] }]
        })
      }
    );
    
    if (response.ok) {
      console.log('✅ API Key is valid!');
    } else {
      console.error('❌ API Key test failed:', response.status);
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

testGeminiKey();
```

## 標籤

#Gemini #API #除錯 #環境變數 #錯誤處理 #備援機制

## 專案

福至心靈籤

## 相關對話

- `9eb84981` - Gemini API Key Debugging (2025-12-19, 8分鐘解決)

## 延伸閱讀

- [Google AI Studio 文檔](https://ai.google.dev/docs)
- [LM Studio 設定指南](https://lmstudio.ai/docs)
- [API Key 安全最佳實踐](https://owasp.org/www-community/vulnerabilities/API_Key_Exposure)
