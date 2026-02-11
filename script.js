// --- 状態管理 ---
let db = { questions: [], learning_content: [], formulas: [] };
let currentSubject = "";
let currentIndex = 0;
let activeQueue = [];
let currentMode = ""; // 'drill', 'learn', 'quiz', 'flash'

// --- ユーティリティ ---
const $ = (id) => document.getElementById(id);

const showView = (id) => {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    const target = $(id);
    if (target) target.classList.remove('hidden');
};

// --- LocalStorage ---
const STORAGE_KEY = "denken3_plus_data";
let userData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
    history: {}, streak: 0, totalTime: 0
};

// --- データ読み込み ---
async function init() {
    try {
        const res = await fetch('data.json');
        db = await res.json();
        console.log("Database loaded:", db);
    } catch (e) {
        console.error("Load failed", e);
        alert("データの読み込みに失敗しました。サーバーを確認してください。");
    }
}

// --- Home 画面アクション ---
$('nav-brand').onclick = () => showView('home-view');

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

// --- 各モード開始 ---
$('btn-infinite-drill').onclick = () => startDrill();
$('btn-formula-book').onclick = () => showFormulas();
$('start-learn').onclick = () => startLearnMode();
$('start-quiz').onclick = () => startQuizMode();
$('start-flashcard').onclick = () => startFlashcardMode();

// 1. 無限ドリル (シャッフル & 制限なし)
function startDrill() {
    currentMode = 'quiz';
    activeQueue = [...db.questions].sort(() => Math.random() - 0.5);
    if (activeQueue.length === 0) return alert("問題がありません");
    currentIndex = 0;
    showView('learning-view');
    // 重要: 各コンテナの表示状態をリセット
    $('quiz-container').classList.remove('hidden');
    $('flashcard-container').classList.add('hidden');
    renderQuiz();
}

// 2. 学習モード (インプット中心)
function startLearnMode() {
    currentMode = 'learn';
    activeQueue = db.learning_content.filter(l => l.subject === currentSubject);
    if (activeQueue.length === 0) return alert("準備中です");
    currentIndex = 0;
    showView('learn-view');
    renderLearnContent();
}

function renderLearnContent() {
    const item = activeQueue[currentIndex];
    $('learn-title').textContent = item.title;
    $('learn-body').textContent = item.body;
    $('learn-example').textContent = item.example;
    $('learn-url').href = item.url || "#";
    $('learn-url').style.display = item.url ? 'block' : 'none';
}

$('btn-learn-next').onclick = () => {
    if (currentIndex < activeQueue.length - 1) {
        currentIndex++;
        renderLearnContent();
    } else {
        alert("この科目の学習完了です！");
        showView('home-view');
    }
};

$('btn-learn-prev').onclick = () => {
    if (currentIndex > 0) {
        currentIndex--;
        renderLearnContent();
    }
};

// 3. 公式集
function showFormulas(filter = "すべて") {
    showView('formula-view');
    const container = $('formula-list');
    container.innerHTML = '';

    const list = filter === "すべて" ? db.formulas : db.formulas.filter(f => f.subject === filter);

    list.forEach(f => {
        const card = document.createElement('div');
        card.className = 'formula-card';
        card.innerHTML = `
            <h4>${f.title} (${f.subject})</h4>
            <code>${f.formula}</code>
            <p>${f.desc}</p>
            ${f.url ? `<a href="${f.url}" target="_blank" class="small-link">詳しく見る</a>` : ''}
        `;
        container.appendChild(card);
    });
}

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        showFormulas(btn.dataset.filter);
    };
});

// 4. クイズ/フラッシュカード
function startQuizMode() {
    currentMode = 'quiz';
    activeQueue = db.questions.filter(q => q.subject === currentSubject);
    if (activeQueue.length === 0) return alert("まだ問題がありません");
    currentIndex = 0;
    showView('learning-view');
    $('quiz-container').classList.remove('hidden'); // 明示的に表示
    $('flashcard-container').classList.add('hidden');
    renderQuiz();
}

function renderQuiz() {
    const q = activeQueue[currentIndex];
    $('quiz-q').textContent = q.question;
    $('quiz-options').innerHTML = '';
    $('quiz-explanation').classList.add('hidden');

    q.options.forEach(opt => {
        const div = document.createElement('div');
        div.className = 'quiz-option';
        div.textContent = opt;
        div.onclick = () => {
            if (!$('quiz-explanation').classList.contains('hidden')) return;

            if (opt === q.answer) {
                div.classList.add('correct');
            } else {
                div.classList.add('wrong');
            }

            $('explanation-text').textContent = q.explanation;
            $('quiz-url').href = q.url || "#";
            $('quiz-url').style.display = q.url ? 'block' : 'none';
            $('quiz-explanation').classList.remove('hidden');
        };
        $('quiz-options').appendChild(div);
    });
    updateProgress();
}

function updateProgress() {
    const percent = Math.floor((currentIndex / activeQueue.length) * 100);
    $('progress-fill').style.width = `${percent}%`;
}

$('btn-next').onclick = () => {
    currentIndex++;
    if (currentIndex < activeQueue.length) {
        renderQuiz();
    } else {
        alert("セッション終了です！");
        showView('home-view');
    }
};

function startFlashcardMode() {
    currentMode = 'flash';
    activeQueue = db.questions.filter(q => q.subject === currentSubject);
    if (activeQueue.length === 0) return alert("問題がありません");
    currentIndex = 0;
    showView('learning-view');
    $('quiz-container').classList.add('hidden');
    $('flashcard-container').classList.remove('hidden'); // 明示的に表示
    renderFlashcard();
}

function renderFlashcard() {
    const q = activeQueue[currentIndex];
    $('card-q').textContent = q.question;
    $('card-a').textContent = q.answer;
    $('card-url').href = q.url || "#";
    $('card-url').style.display = q.url ? 'inline' : 'none';
    $('main-card').classList.remove('is-flipped');
    updateProgress();
}

// 初期化
init();
