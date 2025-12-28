// 題庫資料
const questions = [
    // ========== 元素定位題 (10題) ==========
    {
        id: 1,
        category: 'elementLocation',
        categoryName: '元素定位',
        difficulty: 'easy',
        type: 'input',
        question: '請找出標題元素的 class 名稱',
        demoHTML: '<h1 class="main-title" style="font-size: 32px; color: #667eea;">福至心靈籤</h1>',
        correctAnswer: 'main-title',
        acceptableAnswers: ['main-title', '.main-title'],
        hint: '💡 在 Elements 面板查看元素的 class 屬性',
        explanation: '正確答案是 <code>main-title</code>。在 DevTools 的 Elements 面板中,可以直接看到元素的 class 屬性。'
    },
    {
        id: 2,
        category: 'elementLocation',
        categoryName: '元素定位',
        difficulty: 'medium',
        type: 'input',
        question: '請寫出 header 內第一個 div 的 CSS selector',
        demoHTML: '<header style="background: #f0f0f0; padding: 20px;"><div class="container" style="max-width: 1200px;">內容區域</div></header>',
        correctAnswer: 'header > div.container',
        acceptableAnswers: ['header > div.container', 'header > div:first-child', 'header > .container', 'header div.container'],
        hint: '💡 右鍵元素 → Copy → Copy selector,或使用 > 表示直接子元素',
        explanation: '正確答案是 <code>header > div.container</code>。使用 > 符號表示直接子元素關係。'
    },
    {
        id: 3,
        category: 'elementLocation',
        categoryName: '元素定位',
        difficulty: 'easy',
        type: 'input',
        question: '這個按鈕的 id 是什麼?',
        demoHTML: '<button id="submit-btn" style="padding: 12px 24px; background: #667eea; color: white; border: none; border-radius: 8px;">提交</button>',
        correctAnswer: 'submit-btn',
        acceptableAnswers: ['submit-btn', '#submit-btn'],
        hint: '💡 在 Elements 面板查看 id 屬性',
        explanation: '正確答案是 <code>submit-btn</code>。id 是元素的唯一識別符。'
    },
    {
        id: 4,
        category: 'elementLocation',
        categoryName: '元素定位',
        difficulty: 'medium',
        type: 'choice',
        question: '如何快速定位到頁面上的某個元素?',
        choices: [
            'A. 在 Console 輸入 document.querySelector()',
            'B. 按 Ctrl+Shift+C 然後點擊元素',
            'C. 在 Elements 面板手動展開所有節點',
            'D. 重新整理頁面'
        ],
        correctAnswer: 'B',
        hint: '💡 DevTools 提供了快速選取工具',
        explanation: '正確答案是 <code>B</code>。按 Ctrl+Shift+C (Mac: Cmd+Shift+C) 可啟動元素選取模式,然後直接點擊頁面上的元素即可定位。'
    },
    {
        id: 5,
        category: 'elementLocation',
        categoryName: '元素定位',
        difficulty: 'hard',
        type: 'choice',
        question: '以下哪個 CSS selector 可以選取第三個 li 元素?',
        choices: [
            'A. li:nth-child(3)',
            'B. li[3]',
            'C. li:third',
            'D. li.3'
        ],
        correctAnswer: 'A',
        hint: '💡 使用 :nth-child() 偽類選擇器',
        explanation: '正確答案是 <code>A</code>。:nth-child(3) 可以選取第三個子元素。'
    },
    {
        id: 6,
        category: 'elementLocation',
        categoryName: '元素定位',
        difficulty: 'easy',
        type: 'input',
        question: '請找出這個段落的 class 名稱',
        demoHTML: '<p class="description-text" style="color: #666; line-height: 1.6;">這是一段描述文字</p>',
        correctAnswer: 'description-text',
        acceptableAnswers: ['description-text', '.description-text'],
        hint: '💡 查看 class 屬性',
        explanation: '正確答案是 <code>description-text</code>。'
    },
    {
        id: 7,
        category: 'elementLocation',
        categoryName: '元素定位',
        difficulty: 'medium',
        type: 'choice',
        question: '在 DevTools 中,如何複製元素的 CSS selector?',
        choices: [
            'A. 右鍵元素 → Copy → Copy selector',
            'B. 雙擊元素',
            'C. 按 Ctrl+C',
            'D. 在 Console 輸入 copy()'
        ],
        correctAnswer: 'A',
        hint: '💡 使用右鍵選單',
        explanation: '正確答案是 <code>A</code>。右鍵元素後選擇 Copy → Copy selector 即可複製。'
    },
    {
        id: 8,
        category: 'elementLocation',
        categoryName: '元素定位',
        difficulty: 'hard',
        type: 'input',
        question: '寫出選取所有 class 為 "item" 的元素的 selector',
        demoHTML: '<div><span class="item">項目1</span><span class="item">項目2</span></div>',
        correctAnswer: '.item',
        acceptableAnswers: ['.item', 'span.item', '.item, .item'],
        hint: '💡 使用 . 表示 class',
        explanation: '正確答案是 <code>.item</code>。點號 . 用於選取 class。'
    },
    {
        id: 9,
        category: 'elementLocation',
        categoryName: '元素定位',
        difficulty: 'medium',
        type: 'choice',
        question: '以下哪個不是有效的 CSS selector?',
        choices: [
            'A. #header',
            'B. .container',
            'C. div > p',
            'D. @element'
        ],
        correctAnswer: 'D',
        hint: '💡 @ 符號不用於 selector',
        explanation: '正確答案是 <code>D</code>。@ 符號用於 CSS at-rules (如 @media),不是 selector。'
    },
    {
        id: 10,
        category: 'elementLocation',
        categoryName: '元素定位',
        difficulty: 'easy',
        type: 'choice',
        question: '在 Elements 面板中,被刪除線劃掉的 CSS 屬性表示什麼?',
        choices: [
            'A. 語法錯誤',
            'B. 被其他規則覆蓋',
            'C. 瀏覽器不支援',
            'D. 已被刪除'
        ],
        correctAnswer: 'B',
        hint: '💡 CSS 的層疊特性',
        explanation: '正確答案是 <code>B</code>。刪除線表示該屬性被更高優先級的規則覆蓋了。'
    },

    // ========== 數值讀取題 (10題) ==========
    {
        id: 11,
        category: 'valueReading',
        categoryName: '數值讀取',
        difficulty: 'easy',
        type: 'input',
        question: 'header 的 padding-top 是多少?',
        demoHTML: '<header style="padding-top: 20px; padding-bottom: 10px; background: #667eea; color: white;">網站標題</header>',
        correctAnswer: '20px',
        acceptableAnswers: ['20px', '20'],
        hint: '💡 在 Computed 面板 → Box Model 查看 padding 值',
        explanation: '正確答案是 <code>20px</code>。在 Computed 面板的 Box Model 圖中可以清楚看到各方向的 padding 值。'
    },
    {
        id: 12,
        category: 'valueReading',
        categoryName: '數值讀取',
        difficulty: 'medium',
        type: 'input',
        question: '元素的總寬度是多少? (content + padding + border)',
        demoHTML: '<div style="width: 200px; padding: 10px; border: 2px solid #667eea; background: #f0f0f0;">寬度計算: 200px (content) + 10px×2 (padding) + 2px×2 (border) = ?</div>',
        correctAnswer: '224px',
        acceptableAnswers: ['224px', '224'],
        hint: '💡 計算公式: width + padding-left + padding-right + border-left + border-right',
        explanation: '正確答案是 <code>224px</code>。計算: 200 + 10×2 + 2×2 = 200 + 20 + 4 = 224px'
    },
    {
        id: 13,
        category: 'valueReading',
        categoryName: '數值讀取',
        difficulty: 'easy',
        type: 'input',
        question: '這個元素的 margin-left 是多少?',
        demoHTML: '<div style="margin-left: 30px; padding: 10px; background: #f0f0f0;">測試元素</div>',
        correctAnswer: '30px',
        acceptableAnswers: ['30px', '30'],
        hint: '💡 在 Computed → Box Model 查看',
        explanation: '正確答案是 <code>30px</code>。'
    },
    {
        id: 14,
        category: 'valueReading',
        categoryName: '數值讀取',
        difficulty: 'medium',
        type: 'choice',
        question: '在 Box Model 中,從內到外的順序是?',
        choices: [
            'A. Content → Padding → Border → Margin',
            'B. Margin → Border → Padding → Content',
            'C. Content → Border → Padding → Margin',
            'D. Padding → Content → Border → Margin'
        ],
        correctAnswer: 'A',
        hint: '💡 記憶口訣: 內容穿衣戴帽出門 (Content Padding Border Margin)',
        explanation: '正確答案是 <code>A</code>。Box Model 從內到外依序為: Content → Padding → Border → Margin。'
    },
    {
        id: 15,
        category: 'valueReading',
        categoryName: '數值讀取',
        difficulty: 'hard',
        type: 'input',
        question: '如果 box-sizing: border-box, width: 200px, padding: 10px, border: 2px, 則 content 寬度是?',
        demoHTML: '<div style="box-sizing: border-box; width: 200px; padding: 10px; border: 2px solid #667eea; background: #f0f0f0;">border-box 模式</div>',
        correctAnswer: '176px',
        acceptableAnswers: ['176px', '176'],
        hint: '💡 border-box: content = width - padding×2 - border×2',
        explanation: '正確答案是 <code>176px</code>。計算: 200 - 10×2 - 2×2 = 200 - 20 - 4 = 176px'
    },
    {
        id: 16,
        category: 'valueReading',
        categoryName: '數值讀取',
        difficulty: 'easy',
        type: 'input',
        question: '元素的 border-width 是多少?',
        demoHTML: '<div style="border: 5px solid #667eea; padding: 15px;">邊框測試</div>',
        correctAnswer: '5px',
        acceptableAnswers: ['5px', '5'],
        hint: '💡 查看 border 屬性',
        explanation: '正確答案是 <code>5px</code>。'
    },
    {
        id: 17,
        category: 'valueReading',
        categoryName: '數值讀取',
        difficulty: 'medium',
        type: 'choice',
        question: '在哪個面板可以看到 Box Model 圖?',
        choices: [
            'A. Console',
            'B. Network',
            'C. Computed',
            'D. Sources'
        ],
        correctAnswer: 'C',
        hint: '💡 Computed 面板顯示計算後的樣式',
        explanation: '正確答案是 <code>C</code>。Computed 面板中有完整的 Box Model 視覺化圖表。'
    },
    {
        id: 18,
        category: 'valueReading',
        categoryName: '數值讀取',
        difficulty: 'hard',
        type: 'input',
        question: '元素總高度? (height: 100px, padding: 15px, border: 3px, margin: 20px)',
        demoHTML: '<div style="height: 100px; padding: 15px; border: 3px solid #667eea; margin: 20px; background: #f0f0f0;">高度計算</div>',
        correctAnswer: '136px',
        acceptableAnswers: ['136px', '136'],
        hint: '💡 總高度 = height + padding×2 + border×2 (margin 不計入)',
        explanation: '正確答案是 <code>136px</code>。計算: 100 + 15×2 + 3×2 = 136px (margin 不計入元素本身高度)'
    },
    {
        id: 19,
        category: 'valueReading',
        categoryName: '數值讀取',
        difficulty: 'medium',
        type: 'choice',
        question: 'line-height: 1.5 表示什麼?',
        choices: [
            'A. 行高是 1.5px',
            'B. 行高是字體大小的 1.5 倍',
            'C. 行高是 15px',
            'D. 行高是 150%'
        ],
        correctAnswer: 'B',
        hint: '💡 無單位的 line-height 是相對於 font-size',
        explanation: '正確答案是 <code>B</code>。無單位的 line-height 表示字體大小的倍數。'
    },
    {
        id: 20,
        category: 'valueReading',
        categoryName: '數值讀取',
        difficulty: 'easy',
        type: 'input',
        question: '這個元素的 padding 四個方向都是多少? (簡寫形式)',
        demoHTML: '<div style="padding: 20px; background: #f0f0f0;">統一 padding</div>',
        correctAnswer: '20px',
        acceptableAnswers: ['20px', '20'],
        hint: '💡 padding: 20px 表示四個方向都是 20px',
        explanation: '正確答案是 <code>20px</code>。簡寫 padding: 20px 表示上下左右都是 20px。'
    },

    // ========== 顏色吸取題 (10題) ==========
    {
        id: 21,
        category: 'colorPicking',
        categoryName: '顏色吸取',
        difficulty: 'easy',
        type: 'input',
        question: '背景色的 HEX 值是?',
        demoHTML: '<div style="background: #450a0a; color: white; padding: 20px; border-radius: 8px;">深紅色背景</div>',
        correctAnswer: '#450a0a',
        acceptableAnswers: ['#450a0a', '450a0a'],
        hint: '💡 在 Styles 面板點擊顏色方塊,查看 HEX 值',
        explanation: '正確答案是 <code>#450a0a</code>。點擊 Styles 面板中的顏色方塊即可看到 HEX 值。'
    },
    {
        id: 22,
        category: 'colorPicking',
        categoryName: '顏色吸取',
        difficulty: 'medium',
        type: 'input',
        question: '文字顏色的 RGB 值是? (格式: rgb(r,g,b))',
        demoHTML: '<p style="color: rgb(102, 126, 234); font-size: 18px; font-weight: 600;">這段文字是紫藍色</p>',
        correctAnswer: 'rgb(102,126,234)',
        acceptableAnswers: ['rgb(102,126,234)', 'rgb(102, 126, 234)', '102,126,234'],
        hint: '💡 點擊顏色方塊,使用 Shift 切換格式到 RGB',
        explanation: '正確答案是 <code>rgb(102, 126, 234)</code>。在顏色選擇器中按 Shift 可切換格式。'
    },
    {
        id: 23,
        category: 'colorPicking',
        categoryName: '顏色吸取',
        difficulty: 'easy',
        type: 'input',
        question: '這個按鈕的背景色 HEX 值是?',
        demoHTML: '<button style="background: #28a745; color: white; padding: 10px 20px; border: none;">綠色按鈕</button>',
        correctAnswer: '#28a745',
        acceptableAnswers: ['#28a745', '28a745'],
        hint: '💡 點擊顏色方塊查看',
        explanation: '正確答案是 <code>#28a745</code>。'
    },
    {
        id: 24,
        category: 'colorPicking',
        categoryName: '顏色吸取',
        difficulty: 'medium',
        type: 'choice',
        question: '在 DevTools 顏色選擇器中,如何切換顏色格式?',
        choices: [
            'A. 按 Shift 鍵',
            'B. 雙擊顏色方塊',
            'C. 右鍵選單',
            'D. 按 Ctrl+C'
        ],
        correctAnswer: 'A',
        hint: '💡 使用鍵盤快捷鍵',
        explanation: '正確答案是 <code>A</code>。在顏色選擇器中按 Shift 可在 HEX、RGB、HSL 之間切換。'
    },
    {
        id: 25,
        category: 'colorPicking',
        categoryName: '顏色吸取',
        difficulty: 'hard',
        type: 'input',
        question: '這個元素的透明度是多少? (0-1)',
        demoHTML: '<div style="background: rgba(102, 126, 234, 0.5); padding: 20px; color: white;">半透明背景</div>',
        correctAnswer: '0.5',
        acceptableAnswers: ['0.5', '.5', '50%'],
        hint: '💡 RGBA 的最後一個值是透明度',
        explanation: '正確答案是 <code>0.5</code>。RGBA 格式中,最後一個參數表示透明度 (0 完全透明, 1 完全不透明)。'
    },
    {
        id: 26,
        category: 'colorPicking',
        categoryName: '顏色吸取',
        difficulty: 'easy',
        type: 'choice',
        question: '#FFFFFF 代表什麼顏色?',
        choices: [
            'A. 黑色',
            'B. 白色',
            'C. 紅色',
            'D. 藍色'
        ],
        correctAnswer: 'B',
        hint: '💡 F 是最大值',
        explanation: '正確答案是 <code>B</code>。#FFFFFF 是白色,所有顏色通道都是最大值。'
    },
    {
        id: 27,
        category: 'colorPicking',
        categoryName: '顏色吸取',
        difficulty: 'medium',
        type: 'choice',
        question: 'rgb(255, 0, 0) 是什麼顏色?',
        choices: [
            'A. 綠色',
            'B. 藍色',
            'C. 紅色',
            'D. 黃色'
        ],
        correctAnswer: 'C',
        hint: '💡 第一個值是紅色通道',
        explanation: '正確答案是 <code>C</code>。RGB 中第一個值是紅色,255 是最大值,所以是純紅色。'
    },
    {
        id: 28,
        category: 'colorPicking',
        categoryName: '顏色吸取',
        difficulty: 'hard',
        type: 'choice',
        question: '以下哪個顏色格式支援透明度?',
        choices: [
            'A. HEX (#RRGGBB)',
            'B. RGB (rgb(r,g,b))',
            'C. RGBA (rgba(r,g,b,a))',
            'D. 以上皆非'
        ],
        correctAnswer: 'C',
        hint: '💡 A 代表 Alpha (透明度)',
        explanation: '正確答案是 <code>C</code>。RGBA 和 HSLA 格式支援透明度,HEX 需要 8 位數 (#RRGGBBAA) 才支援。'
    },
    {
        id: 29,
        category: 'colorPicking',
        categoryName: '顏色吸取',
        difficulty: 'medium',
        type: 'input',
        question: '邊框顏色的 HEX 值是?',
        demoHTML: '<div style="border: 3px solid #ffc107; padding: 15px;">黃色邊框</div>',
        correctAnswer: '#ffc107',
        acceptableAnswers: ['#ffc107', 'ffc107'],
        hint: '💡 查看 border-color 屬性',
        explanation: '正確答案是 <code>#ffc107</code>。'
    },
    {
        id: 30,
        category: 'colorPicking',
        categoryName: '顏色吸取',
        difficulty: 'easy',
        type: 'choice',
        question: '#000000 代表什麼顏色?',
        choices: [
            'A. 白色',
            'B. 黑色',
            'C. 灰色',
            'D. 透明'
        ],
        correctAnswer: 'B',
        hint: '💡 0 是最小值',
        explanation: '正確答案是 <code>B</code>。#000000 是黑色,所有顏色通道都是 0。'
    },

    // ========== CSS 屬性題 (10題) ==========
    {
        id: 31,
        category: 'cssProperties',
        categoryName: 'CSS 屬性',
        difficulty: 'easy',
        type: 'input',
        question: '元素的 display 屬性是?',
        demoHTML: '<div style="display: flex; gap: 12px; align-items: center;"><span>項目1</span><span>項目2</span><span>項目3</span></div>',
        correctAnswer: 'flex',
        acceptableAnswers: ['flex'],
        hint: '💡 在 Computed 面板搜尋 "display"',
        explanation: '正確答案是 <code>flex</code>。Flexbox 佈局是現代網頁開發的常用佈局方式。'
    },
    {
        id: 32,
        category: 'cssProperties',
        categoryName: 'CSS 屬性',
        difficulty: 'medium',
        type: 'input',
        question: '元素的 z-index 是多少?',
        demoHTML: '<div style="position: relative; z-index: 9999; background: #667eea; color: white; padding: 16px;">最上層元素</div>',
        correctAnswer: '9999',
        acceptableAnswers: ['9999'],
        hint: '💡 在 Computed 面板搜尋 "z-index"',
        explanation: '正確答案是 <code>9999</code>。z-index 控制元素的堆疊順序,數值越大越在上層。'
    },
    {
        id: 33,
        category: 'cssProperties',
        categoryName: 'CSS 屬性',
        difficulty: 'easy',
        type: 'input',
        question: '元素的 position 屬性是?',
        demoHTML: '<div style="position: absolute; top: 20px; left: 30px; background: #f0f0f0; padding: 10px;">絕對定位</div>',
        correctAnswer: 'absolute',
        acceptableAnswers: ['absolute'],
        hint: '💡 查看 position 屬性',
        explanation: '正確答案是 <code>absolute</code>。絕對定位會脫離正常文檔流。'
    },
    {
        id: 34,
        category: 'cssProperties',
        categoryName: 'CSS 屬性',
        difficulty: 'medium',
        type: 'choice',
        question: 'display: none 和 visibility: hidden 的區別是?',
        choices: [
            'A. 完全相同',
            'B. display:none 不佔空間, visibility:hidden 佔空間',
            'C. visibility:hidden 不佔空間, display:none 佔空間',
            'D. 都不佔空間'
        ],
        correctAnswer: 'B',
        hint: '💡 display:none 會從文檔流中移除',
        explanation: '正確答案是 <code>B</code>。display:none 完全移除元素,不佔空間;visibility:hidden 只是隱藏,仍佔空間。'
    },
    {
        id: 35,
        category: 'cssProperties',
        categoryName: 'CSS 屬性',
        difficulty: 'hard',
        type: 'choice',
        question: 'position: sticky 的作用是?',
        choices: [
            'A. 固定在視窗頂部',
            'B. 相對定位',
            'C. 滾動到特定位置後固定',
            'D. 絕對定位'
        ],
        correctAnswer: 'C',
        hint: '💡 sticky = 黏性定位',
        explanation: '正確答案是 <code>C</code>。sticky 在滾動到設定的閾值後會固定,結合了 relative 和 fixed 的特性。'
    },
    {
        id: 36,
        category: 'cssProperties',
        categoryName: 'CSS 屬性',
        difficulty: 'easy',
        type: 'input',
        question: '元素的 font-size 是多少?',
        demoHTML: '<p style="font-size: 18px; color: #333;">這段文字大小是 18px</p>',
        correctAnswer: '18px',
        acceptableAnswers: ['18px', '18'],
        hint: '💡 查看 font-size 屬性',
        explanation: '正確答案是 <code>18px</code>。'
    },
    {
        id: 37,
        category: 'cssProperties',
        categoryName: 'CSS 屬性',
        difficulty: 'medium',
        type: 'choice',
        question: 'overflow: hidden 的作用是?',
        choices: [
            'A. 隱藏元素',
            'B. 隱藏超出容器的內容',
            'C. 隱藏背景',
            'D. 隱藏邊框'
        ],
        correctAnswer: 'B',
        hint: '💡 overflow 控制溢出內容',
        explanation: '正確答案是 <code>B</code>。overflow:hidden 會裁切超出容器範圍的內容。'
    },
    {
        id: 38,
        category: 'cssProperties',
        categoryName: 'CSS 屬性',
        difficulty: 'hard',
        type: 'choice',
        question: 'flex-direction: column 表示?',
        choices: [
            'A. 水平排列',
            'B. 垂直排列',
            'C. 反向排列',
            'D. 換行排列'
        ],
        correctAnswer: 'B',
        hint: '💡 column = 列 = 垂直',
        explanation: '正確答案是 <code>B</code>。flex-direction:column 使子元素垂直排列。'
    },
    {
        id: 39,
        category: 'cssProperties',
        categoryName: 'CSS 屬性',
        difficulty: 'medium',
        type: 'input',
        question: '元素的 opacity 是多少?',
        demoHTML: '<div style="opacity: 0.8; background: #667eea; color: white; padding: 15px;">透明度 0.8</div>',
        correctAnswer: '0.8',
        acceptableAnswers: ['0.8', '.8', '80%'],
        hint: '💡 查看 opacity 屬性',
        explanation: '正確答案是 <code>0.8</code>。opacity 範圍是 0-1。'
    },
    {
        id: 40,
        category: 'cssProperties',
        categoryName: 'CSS 屬性',
        difficulty: 'easy',
        type: 'choice',
        question: 'text-align: center 的作用是?',
        choices: [
            'A. 垂直置中',
            'B. 水平置中文字',
            'C. 元素置中',
            'D. 圖片置中'
        ],
        correctAnswer: 'B',
        hint: '💡 text-align 只影響文字',
        explanation: '正確答案是 <code>B</code>。text-align:center 使文字水平置中對齊。'
    },

    // ========== 溝通模板題 (10題) ==========
    {
        id: 41,
        category: 'templates',
        categoryName: '溝通模板',
        difficulty: 'medium',
        type: 'input',
        question: '將問題轉換為正確格式: "這個元素太小了"',
        demoHTML: '<div style="width: 200px; height: 100px; background: #f0f0f0; border: 1px solid #ccc;">當前寬度 200px</div><p style="margin-top: 12px; color: #666;">提示: 正確格式應包含 [元素] [屬性] [當前值] [期望值]</p>',
        correctAnswer: 'width',
        acceptableAnswers: ['width', 'header width', 'div width', 'width 200px', 'width 200px 300px'],
        hint: '💡 格式: "[元素] 的 [屬性] 當前 [值],需要改為 [值]"',
        explanation: '正確答案範例: "div 元素的 width 當前 200px,需要增加到 300px"。關鍵是要明確指出元素、屬性、當前值和期望值。'
    },
    {
        id: 42,
        category: 'templates',
        categoryName: '溝通模板',
        difficulty: 'hard',
        type: 'input',
        question: '動畫太快,應該使用哪個模板? (輸入: ui 或 animation 或 layout)',
        demoHTML: '<div style="animation: slide 1.5s ease-out;">卷軸展開動畫</div><p style="margin-top: 12px; color: #666;">場景: 卷軸展開動畫 duration 1.5s 太快,需要改為 2.2s</p>',
        correctAnswer: 'animation',
        acceptableAnswers: ['animation', '動畫', 'animation模板', '動畫模板'],
        hint: '💡 動畫相關問題應使用「動畫調整模板」',
        explanation: '正確答案是 <code>animation</code> (動畫調整模板)。動畫相關的問題應該使用專門的動畫調整模板,包含 duration、timing-function 等參數。'
    },
    {
        id: 43,
        category: 'templates',
        categoryName: '溝通模板',
        difficulty: 'medium',
        type: 'choice',
        question: '描述 UI 問題時,最重要的是?',
        choices: [
            'A. 使用專業術語',
            'B. 提供截圖',
            'C. 明確指出元素、屬性、當前值、期望值',
            'D. 描述感受'
        ],
        correctAnswer: 'C',
        hint: '💡 精確的資訊最重要',
        explanation: '正確答案是 <code>C</code>。明確的元素、屬性、數值資訊可以大幅減少溝通成本。'
    },
    {
        id: 44,
        category: 'templates',
        categoryName: '溝通模板',
        difficulty: 'easy',
        type: 'choice',
        question: '以下哪個描述最精確?',
        choices: [
            'A. "這個元素太大了"',
            'B. "header 的 width 當前 500px,需要改為 400px"',
            'C. "寬度不對"',
            'D. "改小一點"'
        ],
        correctAnswer: 'B',
        hint: '💡 包含具體數值的描述最精確',
        explanation: '正確答案是 <code>B</code>。明確指出元素、屬性、當前值和期望值。'
    },
    {
        id: 45,
        category: 'templates',
        categoryName: '溝通模板',
        difficulty: 'hard',
        type: 'choice',
        question: '佈局錯亂問題應該提供什麼資訊?',
        choices: [
            'A. 只描述問題',
            'B. display、flex-direction、justify-content 等屬性',
            'C. 只提供截圖',
            'D. 重新整理頁面'
        ],
        correctAnswer: 'B',
        hint: '💡 佈局問題需要提供佈局相關屬性',
        explanation: '正確答案是 <code>B</code>。佈局問題需要提供 display、flex/grid 相關屬性的當前值。'
    },
    {
        id: 46,
        category: 'templates',
        categoryName: '溝通模板',
        difficulty: 'medium',
        type: 'choice',
        question: '使用圖片溝通可以減少多少溝通成本?',
        choices: [
            'A. 10%',
            'B. 30%',
            'C. 60%',
            'D. 90%'
        ],
        correctAnswer: 'C',
        hint: '💡 根據實際數據分析',
        explanation: '正確答案是 <code>C</code>。根據分析,使用圖片可以減少約 60% 的溝通成本。'
    },
    {
        id: 47,
        category: 'templates',
        categoryName: '溝通模板',
        difficulty: 'easy',
        type: 'choice',
        question: '描述顏色問題時,應該提供?',
        choices: [
            'A. "太淡了"',
            'B. HEX 或 RGB 值',
            'C. "不好看"',
            'D. "改一下"'
        ],
        correctAnswer: 'B',
        hint: '💡 提供具體的顏色值',
        explanation: '正確答案是 <code>B</code>。提供 HEX 或 RGB 值可以精確表達顏色。'
    },
    {
        id: 48,
        category: 'templates',
        categoryName: '溝通模板',
        difficulty: 'hard',
        type: 'choice',
        question: '以下哪個不是有效的溝通模板?',
        choices: [
            'A. UI 調整模板',
            'B. 動畫調整模板',
            'C. 佈局問題模板',
            'D. 感覺不對模板'
        ],
        correctAnswer: 'D',
        hint: '💡 "感覺" 太主觀',
        explanation: '正確答案是 <code>D</code>。"感覺不對" 太主觀,無法提供有效資訊。'
    },
    {
        id: 49,
        category: 'templates',
        categoryName: '溝通模板',
        difficulty: 'medium',
        type: 'choice',
        question: '使用 CSS 術語可以減少多少誤解?',
        choices: [
            'A. 10%',
            'B. 20%',
            'C. 40%',
            'D. 60%'
        ],
        correctAnswer: 'C',
        hint: '💡 專業術語提升溝通效率',
        explanation: '正確答案是 <code>C</code>。使用 CSS 術語可以減少約 40% 的誤解。'
    },
    {
        id: 50,
        category: 'templates',
        categoryName: '溝通模板',
        difficulty: 'easy',
        type: 'choice',
        question: '開始與 AI 溝通前,最應該做什麼?',
        choices: [
            'A. 直接描述感受',
            'B. 打開 DevTools 查看具體數值',
            'C. 猜測問題原因',
            'D. 重新整理頁面'
        ],
        correctAnswer: 'B',
        hint: '💡 先獲取精確資訊',
        explanation: '正確答案是 <code>B</code>。使用 DevTools 獲取精確的元素、屬性、數值資訊,可以大幅提升溝通效率。'
    }
];

// 類別中文名稱對照
const categoryNames = {
    elementLocation: '元素定位',
    valueReading: '數值讀取',
    colorPicking: '顏色吸取',
    cssProperties: 'CSS 屬性',
    templates: '溝通模板'
};

// 類別重要性權重 (用於計算優先級)
const categoryWeights = {
    templates: 1.5,
    valueReading: 1.3,
    colorPicking: 1.2,
    elementLocation: 1.1,
    cssProperties: 1.0
};
