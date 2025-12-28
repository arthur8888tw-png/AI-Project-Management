// 應用程式狀態
let currentQuestionIndex = 0;
let userAnswers = [];
let quizStartTime = null;

// 從 LocalStorage 載入進度
function loadProgress() {
    const saved = localStorage.getItem('devtools-training-progress');
    if (saved) {
        return JSON.parse(saved);
    }
    return {
        totalAttempted: 0,
        totalCorrect: 0,
        categoryScores: {},
        history: []
    };
}

// 儲存進度到 LocalStorage
function saveProgress(progress) {
    localStorage.setItem('devtools-training-progress', JSON.stringify(progress));
}

// 初始化頁面
function init() {
    updateHomePage();
}

// 更新首頁統計
function updateHomePage() {
    const progress = loadProgress();
    const totalQuestions = questions.length;

    // 更新進度條
    const percentage = progress.totalAttempted > 0
        ? Math.round((progress.totalCorrect / progress.totalAttempted) * 100)
        : 0;

    document.getElementById('overallProgress').style.width = percentage + '%';
    document.getElementById('overallProgress').textContent = percentage + '%';

    // 更新統計卡片
    document.getElementById('totalAttempted').textContent = progress.totalAttempted;
    document.getElementById('totalCorrect').textContent = progress.totalCorrect;
    document.getElementById('accuracyRate').textContent = percentage + '%';

    // 分析弱點和強項
    analyzePerformance(progress);
}

// 分析表現
function analyzePerformance(progress) {
    const weaknesses = [];
    const strengths = [];

    for (const [category, scores] of Object.entries(progress.categoryScores)) {
        const accuracy = scores.total > 0 ? (scores.correct / scores.total) * 100 : 0;
        const categoryData = {
            name: categoryNames[category],
            accuracy: Math.round(accuracy),
            correct: scores.correct,
            total: scores.total
        };

        if (accuracy < 70 && scores.total >= 2) {
            weaknesses.push(categoryData);
        } else if (accuracy >= 85 && scores.total >= 2) {
            strengths.push(categoryData);
        }
    }

    // 顯示弱點
    const weaknessSection = document.getElementById('weaknessSection');
    const weaknessList = document.getElementById('weaknessList');

    if (weaknesses.length > 0) {
        weaknessSection.classList.remove('hidden');
        weaknessList.innerHTML = weaknesses.map(w =>
            `<li class="weakness-item">
                <strong>${w.name}</strong>: ${w.accuracy}% (${w.correct}/${w.total}) - 建議加強練習
            </li>`
        ).join('');
    } else {
        weaknessSection.classList.add('hidden');
    }

    // 顯示強項
    const strengthSection = document.getElementById('strengthSection');
    const strengthList = document.getElementById('strengthList');

    if (strengths.length > 0) {
        strengthSection.classList.remove('hidden');
        strengthList.innerHTML = strengths.map(s =>
            `<li class="strength-item">
                <strong>${s.name}</strong>: ${s.accuracy}% (${s.correct}/${s.total}) - 表現優秀! 🎉
            </li>`
        ).join('');
    } else {
        strengthSection.classList.add('hidden');
    }
}

// 開始測驗
function startQuiz() {
    currentQuestionIndex = 0;
    userAnswers = [];
    quizStartTime = Date.now();

    document.getElementById('homePage').classList.add('hidden');
    document.getElementById('quizPage').classList.remove('hidden');
    document.getElementById('quizPage').classList.add('active');

    loadQuestion();
}

// 載入題目
function loadQuestion() {
    const question = questions[currentQuestionIndex];

    // 更新題號和類別
    document.getElementById('questionNumber').textContent =
        `題目 ${currentQuestionIndex + 1}/${questions.length}`;
    document.getElementById('categoryBadge').textContent = question.categoryName;

    // 更新題目文字
    document.getElementById('questionText').textContent = question.question;

    // 更新示範內容
    if (question.demoHTML) {
        document.getElementById('demoBox').style.display = 'block';
        document.getElementById('demoContent').innerHTML = question.demoHTML;
    } else {
        document.getElementById('demoBox').style.display = 'none';
    }

    // 根據題型顯示不同的輸入方式
    const answerInput = document.getElementById('answerInput');
    const choicesContainer = document.getElementById('choicesContainer');

    if (question.type === 'choice') {
        // 選擇題
        answerInput.style.display = 'none';
        choicesContainer.style.display = 'block';

        // 生成選項
        choicesContainer.innerHTML = question.choices.map((choice, index) => `
            <div class="choice-option" onclick="selectChoice('${choice.charAt(0)}')">
                <input type="radio" name="choice" value="${choice.charAt(0)}" id="choice${index}">
                <label for="choice${index}">${choice}</label>
            </div>
        `).join('');
    } else {
        // 輸入題
        answerInput.style.display = 'block';
        choicesContainer.style.display = 'none';
        answerInput.value = '';
        answerInput.focus();

        // 允許 Enter 鍵提交
        answerInput.onkeypress = function (e) {
            if (e.key === 'Enter') {
                submitAnswer();
            }
        };
    }

    // 隱藏反饋和提示
    document.getElementById('feedback').classList.remove('show');
    document.getElementById('hintBox').classList.remove('show');
}

// 選擇選項
function selectChoice(value) {
    const radios = document.getElementsByName('choice');
    radios.forEach(radio => {
        if (radio.value === value) {
            radio.checked = true;
        }
    });
}

// 驗證答案
function validateAnswer(userAnswer, question) {
    const normalized = userAnswer.trim().toLowerCase().replace(/\s+/g, '');

    for (const acceptable of question.acceptableAnswers) {
        const acceptableNormalized = acceptable.toLowerCase().replace(/\s+/g, '');
        if (normalized === acceptableNormalized) {
            return true;
        }

        // 數值比對 (忽略單位)
        const userNum = parseFloat(normalized);
        const acceptableNum = parseFloat(acceptableNormalized);
        if (!isNaN(userNum) && !isNaN(acceptableNum)) {
            if (Math.abs(userNum - acceptableNum) < 0.01) {
                return true;
            }
        }
    }

    return false;
}

// 提交答案
function submitAnswer() {
    const question = questions[currentQuestionIndex];
    let userAnswer;

    if (question.type === 'choice') {
        // 選擇題
        const selected = document.querySelector('input[name="choice"]:checked');
        if (!selected) {
            alert('請選擇一個答案!');
            return;
        }
        userAnswer = selected.value;
    } else {
        // 輸入題
        userAnswer = document.getElementById('answerInput').value;
        if (!userAnswer.trim()) {
            alert('請輸入答案!');
            return;
        }
    }

    const isCorrect = question.type === 'choice'
        ? userAnswer === question.correctAnswer
        : validateAnswer(userAnswer, question);

    // 記錄答案
    userAnswers.push({
        questionId: question.id,
        category: question.category,
        userAnswer: userAnswer,
        correctAnswer: question.correctAnswer,
        isCorrect: isCorrect,
        timestamp: Date.now()
    });

    // 顯示反饋
    showFeedback(isCorrect, question);
}

// 顯示反饋
function showFeedback(isCorrect, question) {
    const feedback = document.getElementById('feedback');
    const feedbackTitle = document.getElementById('feedbackTitle');
    const feedbackContent = document.getElementById('feedbackContent');

    feedback.classList.remove('correct', 'incorrect');
    feedback.classList.add(isCorrect ? 'correct' : 'incorrect');
    feedback.classList.add('show');

    if (isCorrect) {
        feedbackTitle.textContent = '✅ 答對了!';
        feedbackContent.innerHTML = `
            <p><strong>你的答案:</strong> ${userAnswers[userAnswers.length - 1].userAnswer}</p>
            <p style="margin-top: 8px;">${question.explanation}</p>
        `;
    } else {
        feedbackTitle.textContent = '❌ 答錯了';
        feedbackContent.innerHTML = `
            <p><strong>你的答案:</strong> ${userAnswers[userAnswers.length - 1].userAnswer}</p>
            <p><strong>正確答案:</strong> ${question.correctAnswer}</p>
            <p style="margin-top: 8px;">${question.explanation}</p>
        `;
    }

    // 禁用輸入
    document.getElementById('answerInput').disabled = true;
}

// 顯示提示
function showHint() {
    const question = questions[currentQuestionIndex];
    const hintBox = document.getElementById('hintBox');

    hintBox.textContent = question.hint;
    hintBox.classList.add('show');
}

// 跳過題目
function skipQuestion() {
    if (confirm('確定要跳過這題嗎?')) {
        const question = questions[currentQuestionIndex];
        userAnswers.push({
            questionId: question.id,
            category: question.category,
            userAnswer: '(跳過)',
            correctAnswer: question.correctAnswer,
            isCorrect: false,
            skipped: true,
            timestamp: Date.now()
        });

        nextQuestion();
    }
}

// 下一題
function nextQuestion() {
    // 重新啟用輸入
    document.getElementById('answerInput').disabled = false;

    // 清除選擇題的選擇
    const radios = document.getElementsByName('choice');
    radios.forEach(radio => radio.checked = false);

    currentQuestionIndex++;

    if (currentQuestionIndex < questions.length) {
        loadQuestion();
    } else {
        finishQuiz();
    }
}

// 完成測驗
function finishQuiz() {
    const quizEndTime = Date.now();
    const timeSpent = Math.round((quizEndTime - quizStartTime) / 1000); // 秒

    // 計算成績
    const totalQuestions = userAnswers.length;
    const correctAnswers = userAnswers.filter(a => a.isCorrect).length;
    const accuracy = Math.round((correctAnswers / totalQuestions) * 100);

    // 計算各類別成績
    const categoryScores = {};
    userAnswers.forEach(answer => {
        if (!categoryScores[answer.category]) {
            categoryScores[answer.category] = { correct: 0, total: 0 };
        }
        categoryScores[answer.category].total++;
        if (answer.isCorrect) {
            categoryScores[answer.category].correct++;
        }
    });

    // 載入並更新進度
    const progress = loadProgress();
    progress.totalAttempted += totalQuestions;
    progress.totalCorrect += correctAnswers;

    // 更新類別成績
    for (const [category, scores] of Object.entries(categoryScores)) {
        if (!progress.categoryScores[category]) {
            progress.categoryScores[category] = { correct: 0, total: 0 };
        }
        progress.categoryScores[category].correct += scores.correct;
        progress.categoryScores[category].total += scores.total;
    }

    // 記錄歷史
    progress.history.push({
        date: new Date().toISOString(),
        totalQuestions,
        correctAnswers,
        accuracy,
        timeSpent,
        categoryScores
    });

    // 儲存進度
    saveProgress(progress);

    // 顯示結果
    showResults(correctAnswers, totalQuestions, accuracy, timeSpent);
}

// 顯示結果
function showResults(correct, total, accuracy, timeSpent) {
    const minutes = Math.floor(timeSpent / 60);
    const seconds = timeSpent % 60;

    alert(`🎉 測驗完成!\n\n答對: ${correct}/${total}\n準確率: ${accuracy}%\n用時: ${minutes}分${seconds}秒\n\n點擊確定返回首頁查看詳細分析`);

    backToHome();
}

// 返回首頁
function backToHome() {
    document.getElementById('quizPage').classList.remove('active');
    document.getElementById('quizPage').classList.add('hidden');
    document.getElementById('statsPage').classList.add('hidden');
    document.getElementById('homePage').classList.remove('hidden');

    updateHomePage();
}

// 查看成績
function showStats() {
    const progress = loadProgress();

    document.getElementById('homePage').classList.add('hidden');
    document.getElementById('statsPage').classList.remove('hidden');

    // 更新總體統計
    const totalAccuracy = progress.totalAttempted > 0
        ? Math.round((progress.totalCorrect / progress.totalAttempted) * 100)
        : 0;

    document.getElementById('statsTotal').textContent = progress.totalAttempted;
    document.getElementById('statsCorrect').textContent = progress.totalCorrect;
    document.getElementById('statsAccuracy').textContent = totalAccuracy + '%';

    // 顯示各類別統計
    const categoryStatsDiv = document.getElementById('categoryStats');
    let categoryHTML = '';

    for (const [category, scores] of Object.entries(progress.categoryScores)) {
        const accuracy = scores.total > 0
            ? Math.round((scores.correct / scores.total) * 100)
            : 0;

        const barColor = accuracy >= 85 ? '#28a745' : accuracy >= 70 ? '#ffc107' : '#dc3545';

        categoryHTML += `
            <div style="margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <strong>${categoryNames[category]}</strong>
                    <span>${scores.correct}/${scores.total} (${accuracy}%)</span>
                </div>
                <div style="width: 100%; height: 24px; background: #f0f0f0; border-radius: 12px; overflow: hidden;">
                    <div style="width: ${accuracy}%; height: 100%; background: ${barColor}; transition: width 0.5s;"></div>
                </div>
            </div>
        `;
    }

    categoryStatsDiv.innerHTML = categoryHTML || '<p style="color: #999;">尚無數據,請先完成練習</p>';
}

// 重置進度
function resetProgress() {
    if (confirm('確定要重置所有進度嗎?此操作無法復原!')) {
        localStorage.removeItem('devtools-training-progress');
        updateHomePage();
        alert('進度已重置!');
    }
}

// 頁面載入時初始化
window.addEventListener('DOMContentLoaded', init);
