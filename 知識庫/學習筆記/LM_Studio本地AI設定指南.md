# LM Studio 本地 AI 設定與整合指南

## 學習目標

- 了解 LM Studio 的基本概念與優勢
- 學會安裝與配置 LM Studio
- 掌握與 Node.js 後端的整合方法
- 實作 Gemini + LM Studio 雙重備援機制

## 什麼是 LM Studio?

**LM Studio** 是一個桌面應用程式,讓你在本地電腦上運行大型語言模型 (LLM),無需依賴雲端 API。

### 核心優勢

| 特性 | LM Studio | 雲端 API (Gemini) |
|------|-----------|-------------------|
| **成本** | ✅ 完全免費 | ⚠️ 有配額限制 |
| **隱私** | ✅ 資料不外傳 | ⚠️ 資料上傳雲端 |
| **離線** | ✅ 可離線使用 | ❌ 需要網路 |
| **速度** | ⚠️ 依硬體而定 | ✅ 通常較快 |
| **模型選擇** | ✅ 多種開源模型 | ⚠️ 僅限 Gemini |

### 適用場景

**✅ 適合使用 LM Studio**:
- 開發/測試階段,需要大量 API 呼叫
- 處理敏感資料,不希望上傳雲端
- 網路不穩定或離線環境
- 作為雲端 API 的備援方案

**❌ 不適合使用 LM Studio**:
- 硬體資源不足 (建議至少 16GB RAM)
- 需要極高的回應速度
- 需要處理圖片 (LM Studio 主要支援文字)

## 安裝與設定

### 步驟 1: 下載 LM Studio

1. 前往 [LM Studio 官網](https://lmstudio.ai/)
2. 下載對應作業系統的版本 (Windows/Mac/Linux)
3. 安裝並啟動應用程式

### 步驟 2: 下載模型

**推薦模型** (按品質排序):

| 模型名稱 | 大小 | RAM 需求 | 品質 | 速度 |
|----------|------|----------|------|------|
| `llama-3.1-8b-instruct` | 4.7GB | 8GB | ⭐⭐⭐⭐ | ⚡⚡⚡ |
| `mistral-7b-instruct` | 4.1GB | 8GB | ⭐⭐⭐⭐ | ⚡⚡⚡⚡ |
| `phi-3-mini-4k-instruct` | 2.3GB | 4GB | ⭐⭐⭐ | ⚡⚡⚡⚡⚡ |
| `qwen2.5-7b-instruct` | 4.4GB | 8GB | ⭐⭐⭐⭐⭐ | ⚡⚡⚡ |

**下載步驟**:
1. 在 LM Studio 中點擊 **"Search"** 標籤
2. 搜尋模型名稱 (例如: `llama-3.1-8b`)
3. 選擇 **GGUF** 格式的版本
4. 點擊 **Download** 下載

### 步驟 3: 啟動本地伺服器

1. 在 LM Studio 中點擊 **"Local Server"** 標籤
2. 選擇已下載的模型
3. 點擊 **"Start Server"**
4. 確認伺服器運行在 `http://localhost:1234`

**驗證伺服器**:
```bash
# 使用 curl 測試
curl http://localhost:1234/v1/models

# 應該返回模型列表
{
  "data": [
    {
      "id": "llama-3.1-8b-instruct",
      "object": "model",
      ...
    }
  ]
}
```

## 與 Node.js 整合

### 基本整合

```javascript
// server/index.js
const fetch = require('node-fetch');

async function callLMStudio(prompt) {
  const response = await fetch('http://localhost:1234/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'local-model',  // 可以是任意名稱
      messages: [
        {
          role: 'system',
          content: '你是一位專業的廟公,為信眾解籤...'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    })
  });
  
  if (!response.ok) {
    throw new Error(`LM Studio error: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.choices[0].message.content;
}

// 測試
callLMStudio('請解釋第一籤的含義')
  .then(result => console.log(result))
  .catch(err => console.error(err));
```

### 進階整合: 雙重備援機制

```javascript
// server/index.js
const USE_GEMINI = process.env.USE_GEMINI !== 'false';

async function callLLM(prompt, imageData = null) {
  // 優先使用 Gemini
  if (USE_GEMINI) {
    try {
      console.log('[AI] Attempting Gemini...');
      return await callGemini(prompt, imageData);
    } catch (error) {
      // 429: 配額耗盡
      if (error.code === 429) {
        console.log('[AI] Gemini quota exceeded, falling back to LM Studio');
      } else {
        console.error('[AI] Gemini error:', error.message);
      }
    }
  }
  
  // 降級到 LM Studio
  console.log('[AI] Using LM Studio (local)');
  return await callLMStudio(prompt);
}

// API 端點
app.post('/api/fortune', async (req, res) => {
  try {
    const { question, lotNumber, fortuneType } = req.body;
    
    const prompt = `
      籤號: ${lotNumber}
      問題: ${question}
      神明: ${fortuneType}
      
      請提供解籤內容...
    `;
    
    const interpretation = await callLLM(prompt);
    
    res.json({ interpretation });
    
  } catch (error) {
    res.status(500).json({ 
      error: '解籤服務暫時無法使用' 
    });
  }
});
```

## 提示詞優化

### 基本提示詞

```javascript
const SYSTEM_PROMPT = `
你是一位經驗豐富的廟公,專門為信眾解籤。

解籤格式:
1. 聖意概括 (一句話總結)
2. 詳細解析 (分析籤詩含義)
3. 建議事項 (給予實際建議)

請用繁體中文回答,語氣莊重但親切。
`;
```

### 進階提示詞 (結構化輸出)

```javascript
const SYSTEM_PROMPT = `
你是專業的廟公,請以 JSON 格式回答:

{
  "summary": "聖意概括 (一句話)",
  "interpretation": "詳細解析 (100-200字)",
  "advice": "建議事項 (50-100字)",
  "lucky_direction": "吉方 (東/西/南/北)",
  "lucky_color": "吉色 (紅/黃/藍/綠/白)"
}

請確保回答是有效的 JSON 格式。
`;

// 解析回應
async function callLMStudioStructured(prompt) {
  const response = await callLMStudio(prompt);
  
  try {
    // 嘗試解析 JSON
    return JSON.parse(response);
  } catch (error) {
    // 如果不是 JSON,使用正則提取
    console.warn('[AI] Response is not JSON, using fallback parsing');
    return {
      summary: '籤詩解析',
      interpretation: response,
      advice: '請依循聖意行事',
      lucky_direction: '東',
      lucky_color: '紅'
    };
  }
}
```

## 效能優化

### 1. 調整模型參數

```javascript
{
  temperature: 0.7,      // 創造性 (0-1,越高越隨機)
  max_tokens: 500,       // 最大輸出長度
  top_p: 0.9,           // 核採樣 (保留前 90% 機率的詞)
  frequency_penalty: 0.5 // 降低重複 (0-2)
}
```

**參數調整建議**:

| 場景 | temperature | max_tokens | top_p |
|------|-------------|------------|-------|
| 解籤 (需要穩定) | 0.5-0.7 | 500-800 | 0.9 |
| 創意文案 | 0.8-1.0 | 1000+ | 0.95 |
| 事實查詢 | 0.1-0.3 | 200-500 | 0.8 |

### 2. 快取系統提示詞

```javascript
// 避免每次都傳送長系統提示詞
const cachedSystemPrompt = SYSTEM_PROMPT;

async function callLMStudioCached(prompt) {
  return await fetch('http://localhost:1234/v1/chat/completions', {
    method: 'POST',
    body: JSON.stringify({
      messages: [
        { role: 'system', content: cachedSystemPrompt },
        { role: 'user', content: prompt }
      ]
    })
  });
}
```

### 3. 批次處理

```javascript
// 一次處理多個請求
async function batchProcess(prompts) {
  const results = await Promise.all(
    prompts.map(prompt => callLMStudio(prompt))
  );
  return results;
}
```

## 常見問題

### Q1: LM Studio 無法啟動伺服器

**可能原因**:
- 埠號 1234 被佔用
- 模型未正確載入
- 防火牆阻擋

**解決方案**:
```bash
# 檢查埠號佔用 (Windows)
netstat -ano | findstr :1234

# 更換埠號
# 在 LM Studio 設定中修改為 1235
```

### Q2: 回應速度很慢

**優化方案**:
1. 使用較小的模型 (phi-3-mini)
2. 降低 `max_tokens`
3. 啟用 GPU 加速 (在 LM Studio 設定中)

### Q3: 回應品質不佳

**改善方法**:
1. 更換更大的模型 (qwen2.5-7b)
2. 優化提示詞
3. 調整 temperature (降低隨機性)

## 實戰案例

### 案例: 福至心靈籤整合

**需求**: Gemini 配額耗盡時自動切換到 LM Studio

**實作**:
```javascript
// .env
GEMINI_API_KEY=your_key
USE_GEMINI=true
LM_STUDIO_URL=http://localhost:1234/v1/chat/completions

// server/index.js
const FORTUNE_SYSTEM_PROMPT = `
你是福至心靈籤的解籤大師。

神明類型:
- 土地公: 財運、事業
- 觀音佛祖: 健康、平安
- 關聖帝君: 正義、守護
- 月下老人: 姻緣、感情
- 文昌帝君: 學業、考試

請根據籤號和問題,提供莊重且實用的解析。
`;

async function interpretFortune(lotNumber, question, fortuneType) {
  const prompt = `
籤號: ${lotNumber}
問題: ${question}
神明: ${fortuneType}

請解籤。
  `;
  
  try {
    // 優先 Gemini
    return await callGemini(prompt);
  } catch (error) {
    if (error.code === 429) {
      console.log('[AI] Switching to LM Studio due to quota');
      // 降級 LM Studio
      return await callLMStudio(prompt);
    }
    throw error;
  }
}
```

**效果**:
- ✅ Gemini 配額內: 使用雲端 API (快速)
- ✅ Gemini 配額耗盡: 自動切換本地 (無縫)
- ✅ 使用者無感知切換

## 學習資源

### 官方資源
- [LM Studio 官網](https://lmstudio.ai/)
- [LM Studio Discord](https://discord.gg/lmstudio)

### 模型資源
- [Hugging Face](https://huggingface.co/models)
- [GGUF 模型搜尋](https://huggingface.co/models?library=gguf)

### 相關文檔
- [Gemini API 配額管理](../問題解決/Gemini配額管理與自動降級.md)

## 標籤

#學習筆記 #LMStudio #本地AI #備援機制 #效能優化

## 專案

福至心靈籤

## 相關對話

- `f62a0ee0` - Supabase Schema Fixes (2025-12-21)
