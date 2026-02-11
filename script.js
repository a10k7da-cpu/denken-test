// --- 状態管理 ---
let questions = [];
let currentSubject = "";
let currentMode = ""; // 'flash' or 'quiz'
let currentIndex = 0;
let queue = [];
let startTime = Date.now();

// --- ユーティリティ ---
const $ = (id) => document.getElementById(id);
const showView = (id) => {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    $(id).classList.remove('hidden');
};

// --- LocalStorage 管理 ---
const STORAGE_KEY = "denken3_user_data";
let userData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
    history: {}, // { qid: { score, nextReview, intervals } }
    streak: 0,
    lastStudyDate: null,
    totalTime: 0,
    weakList: []
};

function saveUserData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    updateStats();
}

// --- データ読み込み ---
async function init() {
    try {
        const res = await fetch('data.json');
        questions = await res.json();
        updateStats();
    } catch (e) {
        console.error("データの読み込みに失敗しました", e);
    }
}

// --- 統計更新 ---
function updateStats() {
    $('streak-count').textContent = `🔥 ${userData.streak || 0}日`;
    $('stat-time').textContent = `${Math.floor((userData.totalTime || 0) / 60)}h ${userData.totalTime % 60}m`;

    const totalAnswered = Object.keys(userData.history).length;
    const correctCount = Object.values(userData.history).filter(h => h.score >= 3).length;
    $('stat-accuracy').textContent = totalAnswered ? `${Math.floor((correctCount / totalAnswered) * 100)}%` : '0%';
}

// --- 事件リスナー ---
document.querySelectorAll('.subject-card').forEach(btn => {
    btn.onclick = () => {
        currentSubject = btn.dataset.subject;
        $('selected-subject-title').textContent = currentSubject;
        showView('mode-select-view');
    };
});

document.querySelectorAll('.btn-back').forEach(btn => {
    btn.onclick = () => showView('home-view');
});

$('start-flashcard').onclick = () => startMode('flash');
$('start-quiz').onclick = () => startMode('quiz');

// --- モード開始 ---
function startMode(mode) {
    currentMode = mode;
    currentIndex = 0;
    // 該当科目の問題をフィルタリング
    queue = questions.filter(q => q.subject === currentSubject);

    showView('learning-view');
    if (mode === 'flash') {
        $('flashcard-container').classList.remove('hidden');
        $('quiz-container').classList.add('hidden');
        renderFlashcard();
    } else {
        $('flashcard-container').classList.add('hidden');
        $('quiz-container').classList.remove('hidden');
        renderQuiz();
    }
}

// --- フラッシュカード ロジック ---
function renderFlashcard() {
    const q = queue[currentIndex];
    $('card-q').textContent = q.question;
    $('card-a').textContent = q.explanation;
    $('main-card').classList.remove('is-flipped');
    updateProgress();
}

$('main-card').onclick = () => {
    $('main-card').classList.toggle('is-flipped');
};

document.querySelectorAll('.card-controls button').forEach(btn => {
    btn.onclick = (e) => {
        e.stopPropagation();
        const score = parseInt(btn.dataset.score);
        applySRS(queue[currentIndex].id, score);
        nextQuestion();
    };
});

// --- クイズ ロジック ---
function renderQuiz() {
    const q = queue[currentIndex];
    $('quiz-q').textContent = q.question;
    $('quiz-options').innerHTML = '';
    $('quiz-explanation').classList.add('hidden');

    q.options.forEach(opt => {
        const div = document.createElement('div');
        div.className = 'quiz-option';
        div.textContent = opt;
        div.onclick = () => checkAnswer(div, opt, q);
        $('quiz-options').appendChild(div);
    });
    updateProgress();
}

function checkAnswer(el, selected, q) {
    if (!$('quiz-explanation').classList.contains('hidden')) return;

    if (selected === q.answer) {
        el.classList.add('correct');
        applySRS(q.id, 5);
    } else {
        el.classList.add('wrong');
        applySRS(q.id, 1);
        // 苦手リストに追加
        if (!userData.weakList.includes(q.id)) userData.weakList.push(q.id);
    }

    $('explanation-text').textContent = q.explanation;
    $('quiz-explanation').classList.remove('hidden');
}

$('btn-next').onclick = () => nextQuestion();

// --- 共通進行管理 ---
function nextQuestion() {
    currentIndex++;
    if (currentIndex < queue.length) {
        currentMode === 'flash' ? renderFlashcard() : renderQuiz();
    } else {
        alert("本日の学習完了です！");
        showView('home-view');
        updateStreak();
    }
}

function updateProgress() {
    const percent = Math.floor((currentIndex / queue.length) * 100);
    $('progress-fill').style.width = `${percent}%`;
}

// --- SRS (簡易) ---
function applySRS(qid, score) {
    if (!userData.history[qid]) {
        userData.history[qid] = { interval: 1, nextReview: Date.now() };
    }
    const h = userData.history[qid];
    if (score >= 3) {
        h.interval *= 2; // 簡単なら間隔を倍に
    } else {
        h.interval = 1; // 苦手なら最初から
    }
    h.nextReview = Date.now() + h.interval * 24 * 60 * 60 * 1000;
    saveUserData();
}

function updateStreak() {
    const today = new Date().toDateString();
    if (userData.lastStudyDate !== today) {
        userData.streak++;
        userData.lastStudyDate = today;
        saveUserData();
    }
}

// --- 今日の5問 ---
$('btn-today-5').onclick = () => {
    currentSubject = "今日の5問";
    const daySeed = new Date().getDate();
    // 簡易シャッフル
    queue = questions.sort(() => 0.5 - (daySeed / 31)).slice(0, 5);
    currentIndex = 0;
    currentMode = 'quiz';
    showView('learning-view');
    $('flashcard-container').classList.add('hidden');
    $('quiz-container').classList.remove('hidden');
    renderQuiz();
};

// 起動
init();

// --- 通知設定 (Service Worker 経由) ---
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(reg => {
        console.log('SW registered');
    });
}

function requestNotification() {
    Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
            console.log('Notification permission granted');
        }
    });
}
window.addEventListener('load', requestNotification);
