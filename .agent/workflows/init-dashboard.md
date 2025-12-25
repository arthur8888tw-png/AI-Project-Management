---
description: 為新專案初始化 AI 專案管理儀表板 (Dashboard)
---

這個工作流將自動把專案監控所需的 Dashboard 與工具指令複製到當前專案目錄中。

// turbo-all
1. 建立儀表板與管理腳本
   - 複製 `ProjectDashboard.html` 到當前目錄
   - 複製 `generate_interaction_history.js` (核心掃描工具)
   - 複製 `get_usage.js` (模型額度監控)
   - 建立預設的 `conversation_metadata.json` (勘誤表模板)

2. 初始化數據
   - 執行 `node generate_interaction_history.js --format=json` 建立初次統計
   - 執行 `node get_usage.js` 建立初次使用量統計

3. 完成
   - 提示使用者已可在瀏覽器打開 `ProjectDashboard.html` 管理專案
