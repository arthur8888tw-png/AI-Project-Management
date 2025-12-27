# Node.js 埠號佔用問題 - EADDRINUSE

## 問題描述

**錯誤訊息**:
```
Error: listen EADDRINUSE: address already in use :::3001
code: 'EADDRINUSE'
```

**發生場景**:
- 專案: 福至心靈籤
- 對話: `9eb84981` - Gemini API Key Debugging  
- 時間: 2025-12-19

## 問題根本原因

### 為什麼會發生?

1. **背景程序未關閉**: 之前啟動的 Node.js 伺服器仍在背景執行
2. **異常終止**: 使用 Ctrl+C 強制中斷時,程序可能未完全清理
3. **多次啟動**: 不小心在多個終端視窗啟動同一服務
4. **埠號衝突**: 其他應用程式佔用了相同埠號

## 快速解決方案

### Windows 系統 ⚡

#### 步驟 1: 找出佔用埠號的程序

```powershell
# 查找佔用 3001 埠的程序
netstat -ano | findstr :3001
```

輸出範例:
```
TCP    0.0.0.0:3001    0.0.0.0:0    LISTENING    23772
TCP    [::]:3001       [::]:0       LISTENING    23772
```

最後一欄 `23772` 就是 **PID (Process ID)**

#### 步驟 2: 強制終止程序

```powershell
# 使用 PID 終止程序
taskkill /F /PID 23772
```

**參數說明**:
- `/F`: 強制終止 (Force)
- `/PID`: 指定程序 ID

#### 步驟 3: 驗證埠號已釋放

```powershell
# 再次檢查,應該沒有輸出
netstat -ano | findstr :3001
```

### Linux / macOS 系統 🐧🍎

#### 步驟 1: 找出佔用埠號的程序

```bash
# 方法 1: 使用 lsof
lsof -i :3001

# 方法 2: 使用 netstat
netstat -tulpn | grep :3001
```

#### 步驟 2: 終止程序

```bash
# 使用 kill 指令
kill -9 <PID>

# 或一行指令完成
lsof -ti:3001 | xargs kill -9
```

## 預防措施

### 1. 優雅關閉伺服器 ✅

```javascript
// server/index.js
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// 監聽終止信號
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

function gracefulShutdown() {
  console.log('Received shutdown signal, closing server...');
  
  server.close(() => {
    console.log('Server closed successfully');
    process.exit(0);
  });
  
  // 強制終止 (10秒後)
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}
```

### 2. 自動檢測並處理埠號衝突 🔄

```javascript
// 方法 1: 自動切換到可用埠號
const getAvailablePort = async (preferredPort) => {
  const net = require('net');
  
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.listen(preferredPort, () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
    
    server.on('error', () => {
      // 埠號被佔用,嘗試下一個
      resolve(getAvailablePort(preferredPort + 1));
    });
  });
};

// 使用
const PORT = await getAvailablePort(3001);
app.listen(PORT);
```

```javascript
// 方法 2: 啟動前先檢查並清理
const killPort = require('kill-port');

async function startServer() {
  try {
    // 先終止佔用該埠號的程序
    await killPort(3001);
    console.log('Cleared port 3001');
  } catch (error) {
    console.log('Port 3001 was already free');
  }
  
  app.listen(3001, () => {
    console.log('Server started on port 3001');
  });
}
```

### 3. 使用 Process Manager 📦

#### 使用 PM2

```bash
# 安裝 PM2
npm install -g pm2

# 啟動服務
pm2 start server/index.js --name "fortune-server"

# 停止服務 (自動清理)
pm2 stop fortune-server

# 重啟服務
pm2 restart fortune-server

# 查看狀態
pm2 status
```

**優點**:
- ✅ 自動管理程序生命週期
- ✅ 崩潰自動重啟
- ✅ 日誌管理
- ✅ 優雅關閉

#### 使用 nodemon (開發環境)

```bash
# 安裝 nodemon
npm install --save-dev nodemon

# package.json
{
  "scripts": {
    "dev": "nodemon server/index.js"
  }
}
```

**優點**:
- ✅ 檔案變更自動重啟
- ✅ 自動清理舊程序
- ✅ 開發體驗佳

## 進階除錯

### 找出所有 Node.js 程序

```powershell
# Windows
tasklist | findstr node

# Linux/macOS
ps aux | grep node
```

### 批次終止所有 Node.js 程序

```powershell
# Windows (小心使用!)
taskkill /F /IM node.exe

# Linux/macOS
pkill -9 node
```

⚠️ **警告**: 這會終止所有 Node.js 程序,包括其他專案!

### 檢查埠號使用情況

```javascript
// check-port.js
const net = require('net');

function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`❌ Port ${port} is in use`);
        resolve(false);
      }
    });
    
    server.once('listening', () => {
      console.log(`✅ Port ${port} is available`);
      server.close();
      resolve(true);
    });
    
    server.listen(port);
  });
}

// 檢查多個埠號
[3000, 3001, 3002, 8080].forEach(checkPort);
```

## 最佳實踐

### 開發環境配置

```javascript
// .env
PORT=3001
NODE_ENV=development

// server/index.js
const PORT = process.env.PORT || 3001;

// 開發環境下自動處理埠號衝突
if (process.env.NODE_ENV === 'development') {
  app.listen(PORT)
    .on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is busy, trying ${PORT + 1}...`);
        app.listen(PORT + 1);
      }
    });
} else {
  // 生產環境嚴格使用指定埠號
  app.listen(PORT);
}
```

### npm scripts 優化

```json
{
  "scripts": {
    "prestart": "kill-port 3001 || true",
    "start": "node server/index.js",
    "dev": "nodemon server/index.js",
    "stop": "kill-port 3001"
  }
}
```

## 相關工具

### npm 套件

| 套件 | 用途 | 安裝指令 |
|------|------|----------|
| `kill-port` | 終止佔用特定埠號的程序 | `npm i -D kill-port` |
| `detect-port` | 檢測埠號可用性 | `npm i detect-port` |
| `get-port` | 取得可用埠號 | `npm i get-port` |
| `pm2` | 程序管理器 | `npm i -g pm2` |
| `nodemon` | 開發環境自動重啟 | `npm i -D nodemon` |

### 使用範例

```javascript
// 使用 detect-port
const detect = require('detect-port');

detect(3001).then(port => {
  if (port === 3001) {
    console.log('Port 3001 is available');
  } else {
    console.log(`Port 3001 is in use, using ${port} instead`);
  }
  app.listen(port);
});
```

## 標籤

#Node.js #埠號衝突 #EADDRINUSE #程序管理 #除錯 #伺服器

## 專案

福至心靈籤

## 相關對話

- `9eb84981` - Gemini API Key Debugging (2025-12-19)

## 參考資源

- [Node.js net module](https://nodejs.org/api/net.html)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [kill-port on npm](https://www.npmjs.com/package/kill-port)
