# AI UI 生成規範 - 降低 UI 調整工時

## 最佳實踐背景

**問題**: UI 調整工時佔總開發時間的 **40%**  
**目標**: 透過標準化規範,讓 AI 一次生成到位,降低後續調整成本  
**來源**: `8ba54ee3` - UI Efficiency & Mastery  
**專案**: AI專案管理

## 核心問題分析

### 為什麼 UI 調整佔這麼多時間?

根據 `project_interaction_history_auto.json` 數據:
- **UI 調整類別**: 10 項對話,共 **40.1 小時**
- **平均每次**: 4 小時
- **主要原因**:
  1. AI 生成的 UI 不符合預期
  2. 字體過小或過大
  3. 佈局不合理
  4. 顏色不一致
  5. 缺乏互動反饋

## 30 大 UI 生成準則

### 1. 角色與邏輯基礎 (6條)

#### 1. 架構師角色定位
```
提示詞範例:
"請以資深前端架構師身份開發,專精於現代、簡約的高級儀表板風設計"
```

#### 2. 結果導向指令
❌ **錯誤**: "把字變黑"  
✅ **正確**: "加強閱讀對比,確保文字在淺色背景下清晰可見"

#### 3. 物理連貫性校驗
```javascript
// 範例: 檢查單日工時不超過 24 小時
const validateDailyHours = (hours) => {
  if (hours > 24) {
    console.error('單日工時不得超過 24 小時');
    return false;
  }
  return true;
};
```

#### 4. 數據排序優先
```javascript
// 所有清單預設按時間降序
conversations.sort((a, b) => 
  new Date(b.modifiedTime) - new Date(a.modifiedTime)
);
```

#### 5. 空狀態設計
```jsx
{data.length === 0 ? (
  <div className="text-center py-12 text-slate-400">
    <svg className="mx-auto h-12 w-12 mb-4">...</svg>
    <p>暫無數據</p>
  </div>
) : (
  // 正常渲染
)}
```

#### 6. 錯誤回饋機制
```jsx
{error && (
  <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
    <p className="text-rose-600">⚠️ {error.message}</p>
  </div>
)}
```

### 2. 佈局與響應式 (6條)

#### 7. 全棧橫向佈局
```jsx
// ✅ 推薦: 橫向佈局
<div className="flex flex-row items-center gap-4">
  <span>標籤:</span>
  <span className="font-bold">數值</span>
</div>

// ❌ 避免: 不必要的垂直堆疊
<div className="flex flex-col">
  <span>標籤:</span>
  <span>數值</span>
</div>
```

#### 8. 對稱佈局與對開
```jsx
<div className="grid grid-cols-2 gap-6">
  {/* 左側: 圓餅圖 */}
  <div className="bg-white rounded-2xl p-6">
    <PieChart data={categoryData} />
  </div>
  
  {/* 右側: 清單 */}
  <div className="bg-white rounded-2xl p-6">
    <CategoryList data={categoryData} />
  </div>
</div>
```

#### 9. 絕對定位禁令
```jsx
// ✅ 允許: Modal、Tooltip
<div className="fixed inset-0 z-50">...</div>

// ❌ 禁止: 一般佈局
<div className="absolute top-10 left-20">...</div>

// ✅ 替代: Flexbox
<div className="flex justify-between items-center">...</div>
```

#### 10. 響應式源頭注入
```jsx
<div className="
  flex flex-col gap-4
  md:flex-row md:gap-6
  lg:gap-8
">
  {/* 手機垂直,平板以上橫向 */}
</div>
```

#### 11. 黏性導航
```jsx
// 表頭固定
<thead className="sticky top-0 bg-white z-10">
  <tr>...</tr>
</thead>

// 操作按鈕固定底部
<div className="sticky bottom-0 bg-white border-t p-4">
  <button>提交</button>
</div>
```

#### 12. 垂直韻律
```jsx
// 統一間距系統
<section className="mb-6">...</section>
<section className="mb-6">...</section>
<section className="mb-6">...</section>
```

### 3. 視覺深度與美學 (6條)

#### 13. 高反差 Badge 系統
```jsx
// ❌ 低對比
<span className="text-emerald-500 bg-emerald-50">+25%</span>

// ✅ 高對比
<span className="text-white bg-emerald-500 px-2 py-1 rounded font-bold">
  +25%
</span>
```

#### 14. 雙重細節圓角
```jsx
// 大容器
<div className="rounded-2xl bg-white p-6">
  {/* 小元素 */}
  <button className="rounded-lg px-4 py-2">...</button>
  <input className="rounded-lg px-3 py-2">...</input>
</div>
```

#### 15. 層次感投影
```jsx
<div className="
  shadow-sm 
  hover:shadow-md 
  transition-shadow duration-300
">
  卡片內容
</div>
```

#### 16. 毛玻璃效果
```jsx
<div className="
  backdrop-blur-md 
  bg-white/10 
  border border-white/20
  rounded-2xl p-6
">
  Premium 質感內容
</div>
```

#### 17. 微反饋交互
```jsx
<button className="
  hover:scale-[1.02] 
  hover:border-slate-300
  transition-all duration-300
  border border-slate-200
">
  點擊我
</button>
```

#### 18. 情緒色彩映射
```jsx
const statusColors = {
  success: 'emerald-500',  // 正向
  warning: 'amber-500',    // 警告
  error: 'rose-500',       // 錯誤
  processing: 'indigo-500' // 處理中
};
```

### 4. 字體與資訊密度 (4條)

#### 19. 拒絕極小字體
```jsx
// ❌ 禁止
<span className="text-[10px]">...</span>

// ✅ 最小 12px
<span className="text-xs">標籤</span>      // 12px
<span className="text-sm">正文</span>      // 14px
<span className="text-base">導航</span>    // 16px
```

#### 20. 字體粗細分層
```jsx
<div>
  <span className="font-medium">標籤</span>
  <span className="font-black text-2xl">1,234</span>
  <nav className="font-bold">導航項目</nav>
</div>
```

#### 21. 字距優化
```jsx
<h1 className="text-4xl font-bold tracking-tight">
  關鍵標題
</h1>
```

#### 22. 文字保護機制
```jsx
// 單行截斷
<p className="truncate">很長的文字...</p>

// 多行截斷
<p className="line-clamp-3">
  很長的段落文字...
</p>
```

### 5. 代碼品質 (6條)

#### 23. CSS 變數封裝
```css
:root {
  --color-primary: #10b981;
  --color-danger: #ef4444;
  --radius-card: 1rem;
  --radius-button: 0.5rem;
}
```

#### 24. 純原子類開發
```jsx
// ❌ 禁止
<div style={{color: 'red', fontSize: '14px'}}>...</div>

// ✅ 使用 Tailwind
<div className="text-rose-500 text-sm">...</div>
```

#### 25. 語義化標籤
```jsx
<nav>導航區</nav>
<main>主體內容</main>
<section>統計區</section>
<article>文章內容</article>
```

#### 26. 資產路徑穩健性
```jsx
// ✅ 相對路徑
import logo from './assets/logo.png';
import data from './data/config.json';
```

#### 27. 高效 DOM 操作
```javascript
// ✅ 分塊渲染
const renderItems = (items) => {
  return items.map(item => `
    <div class="item">${item.name}</div>
  `).join('');
};
```

#### 28. 自動化註釋
```javascript
/**
 * 渲染統計卡片
 * @param {Object} data - 統計數據
 * @param {string} data.title - 卡片標題
 * @param {number} data.value - 數值
 * @param {string} data.trend - 趨勢 (up/down)
 * @returns {HTMLElement}
 */
function renderStatCard(data) {
  // ...
}
```

### 6. 專業增強 (2條)

#### 29. 數據簽章與防偽
```jsx
<div className="mt-8 text-xs text-slate-400">
  數據完整性: SHA-256: {dataChecksum}
</div>
```

#### 30. 隱藏捲軸設計
```css
.no-scrollbar::-webkit-scrollbar {
  display: none;
}

.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
```

## 實戰案例

### 案例 1: 儀表板類別分布

**問題**: 圓餅圖與清單顏色不一致

**解決方案**:
```javascript
// 統一顏色映射
const categoryColors = {
  'DEBUG': '#ef4444',
  'UI 調整': '#8b5cf6',
  '架構變更': '#3b82f6',
  '資料處理': '#10b981'
};

// 圓餅圖使用
pieChart.data.datasets[0].backgroundColor = 
  categories.map(cat => categoryColors[cat.name]);

// 清單使用
<div className="flex items-center gap-2">
  <div 
    className="w-3 h-3 rounded-full"
    style={{backgroundColor: categoryColors[category]}}
  />
  <span>{category}</span>
</div>
```

### 案例 2: 響應式統計卡片

```jsx
<div className="
  grid 
  grid-cols-1 
  md:grid-cols-2 
  lg:grid-cols-4 
  gap-4
">
  {stats.map(stat => (
    <div className="
      bg-white 
      rounded-2xl 
      shadow-sm 
      hover:shadow-md
      transition-shadow
      p-6
    ">
      <p className="text-sm font-medium text-slate-600">
        {stat.label}
      </p>
      <p className="text-3xl font-black tracking-tight mt-2">
        {stat.value}
      </p>
      <div className="flex items-center gap-2 mt-2">
        <span className={`
          text-xs font-bold px-2 py-1 rounded
          ${stat.trend === 'up' 
            ? 'bg-emerald-500 text-white' 
            : 'bg-rose-500 text-white'
          }
        `}>
          {stat.change}
        </span>
      </div>
    </div>
  ))}
</div>
```

## 效果評估

### 實施前
- UI 調整工時: **40.1 小時** (40% 總工時)
- 平均迭代次數: **3-5 次**
- 使用者滿意度: 中等

### 實施後 (預期)
- UI 調整工時: **16 小時** (16% 總工時) ⬇️ **60%**
- 平均迭代次數: **1-2 次** ⬇️ **60%**
- 使用者滿意度: 高

## 提示詞模板

### 完整提示詞範例

```
請以資深前端架構師身份,為我創建一個專案儀表板。

設計要求:
1. 使用 Tailwind CSS,純原子類開發
2. 響應式設計 (手機/平板/桌面)
3. 統計卡片採用 grid 佈局,手機 1 列,平板 2 列,桌面 4 列
4. 所有數值使用 font-black 加粗,最小字體 text-xs (12px)
5. 類別顏色必須在圓餅圖和清單中保持一致
6. 所有互動元素加入 hover:scale-[1.02] 微反饋
7. 容器使用 rounded-2xl,按鈕使用 rounded-lg
8. 空狀態顯示友善提示
9. 加入數據完整性 checksum 顯示

請確保一次生成到位,避免後續調整。
```

## 標籤

#最佳實踐 #UI設計 #Tailwind #響應式 #效率優化 #AI生成規範

## 專案

AI專案管理

## 相關對話

- `8ba54ee3` - UI Efficiency & Mastery (2025-12-26)

## 參考資源

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [UI/UX Design Specification](../../資源/ui_ux_design_specification.md)
- [UI Generation Rules](../../資源/ui_generation_rules.md)
