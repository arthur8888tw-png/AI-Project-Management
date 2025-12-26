# UI 框架掌握與學習計劃 (UI Framework Mastery Plan)

針對本專案使用的技術棧（Vanilla HTML/JS + Tailwind CSS），以下是為您量身打造的學習路徑。

## 第一階段：佈局地基 (Flexbox & Grid)
*   **重點**：掌握現代 Web 的佈局核心。
*   **學習目標**：
    *   Flexbox 的軸線概念（`justify-content`, `align-items`）。
    *   Responsive Design (響應式設計) 的斷點邏輯。
*   **推薦中文資源**：
    *   [Flexbox Froggy (支援繁中)](https://flexboxfroggy.com/#zh-tw) - 透過幫青蛙找家學習 Flexbox。
    *   [Grid Garden (支援繁中)](https://cssgridgarden.com/#zh-tw) - 透過種菜學習 CSS Grid。
    *   [圖解 Flexbox 基礎](https://kamadiam.com/flexbox-basic/) - 高品質的中文視覺化教學。

## 第二階段：Tailwind CSS 原子化思維
*   **重點**：學會不再寫 CSS 檔案，而是組合「原子標記」。
*   **學習目標**：
    *   間距系統 (Spacing: `p-x`, `m-y`, `gap-x`)。
    *   排版系統 (Typography: `tracking-tight`, `leading-relaxed`)。
    *   顏色階層 (Color Shade: `slate-50` 到 `slate-900`)。
*   **推薦中文資源**：
    *   [Tailwind CSS 中文網](https://tailwindcss.cn/docs/installation) - 官方文檔的中文同步版。
    *   [菜鳥教程 - Tailwind CSS 教程](https://www.runoob.com/tailwind/tailwind-tutorial.html) - 適合初學者的保姆級入門。

## 第三階段：Vanilla JS 與 DOM 互動
*   **重點**：實現「不依賴框架」的高效數據渲染（本專案核心）。
*   **學習目標**：
    *   掌握 `fetch` 或自定義 `loadJSON` 邏輯。
    *   使用 `.map().join('')` 渲染動態 HTML。
*   **推薦中文資源**：
    *   [MDN 繁體中文 - JavaScript 基礎](https://developer.mozilla.org/zh-TW/docs/Learn/JavaScript/Objects/JSON) - 最權威的開發者指南。

## 第四階段：數據視覺化 (Chart.js)
*   **重點**：將數據轉換為儀表板動能。
*   **學習目標**：
    *   Chart.js 的 Canvas 設定與響應式處理。
*   **推薦中文資源**：
    *   [Chart.js 中文文檔](https://chartjs.bootcss.com/docs/) - 雖然是簡中，但非常詳盡。

---

## 📅 每週實踐建議
*   **Day 1-2**：嘗試將一個靜態卡片改寫為 Flexbox 佈局。
*   **Day 3-4**：練習在 Tailwind Playground 中組合一個進階的「Glassmorphism」按鈕。
*   **Day 5**：閱讀本專案的 `ProjectDashboard.html` 中 `renderDashboard` 函數，理解數據如何變成畫面的過程。
