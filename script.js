// --- تهيئة ---
const prayers = [
    { name: 'الفجر', icon: '🌅' },
    { name: 'الظهر', icon: '☀️' },
    { name: 'العصر', icon: '🌤️' },
    { name: 'المغرب', icon: '🌆' },
    { name: 'العشاء', icon: '🌙' }
];

let currentUser = null; 
let currentTab = 1;
let userProgress = { k1: {}, k2: {} };
const DB_KEY = 'ramadan_users_db';

// --- تأثيرات ---
function createStars() {
    const container = document.getElementById('stars');
    if(container.children.length > 0) return; // منع التكرار
    for(let i=0; i<60; i++) {
        const s = document.createElement('div');
        s.className = 'star';
        s.style.left = Math.random() * 100 + '%';
        s.style.top = Math.random() * 100 + '%';
        s.style.width = Math.random() * 3 + 'px';
        s.style.height = s.style.width;
        s.style.animationDelay = Math.random() * 5 + 's';
        container.appendChild(s);
    }
}
createStars();

// --- دوال مساعدة ---
function showLoader(show) {
    document.getElementById('loader').style.display = show ? 'flex' : 'none';
}

function togglePasswordVisibility() {
    const input = document.getElementById('password');
    const icon = document.querySelector('.toggle-password');
    if (input.type === "password") {
        input.type = "text";
        icon.innerText = "🙈";
    } else {
        input.type = "password";
        icon.innerText = "👁️";
    }
}

function showError(msg) {
    const el = document.getElementById('error-msg');
    el.innerText = msg;
    el.style.display = 'block';
    el.style.animation = 'none';
    el.offsetHeight; 
    el.style.animation = 'shake 0.3s ease-in-out';
}

function switchPage(pageId) {
    document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
    setTimeout(() => {
        document.getElementById(pageId).classList.add('active');
    }, 100);
}

// --- نظام المصادقة (المعدل لإصلاح مشكلة التحميل) ---
function handleAuth(e) {
    e.preventDefault();
    const name = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value;
    const errorMsg = document.getElementById('error-msg');
    
    errorMsg.style.display = 'none';

    if (!name || !pass) return;

    showLoader(true);

    // تأخير بسيط لمحاكاة الاتصال
    setTimeout(() => {
        try {
            let users = {};
            const storedUsers = localStorage.getItem(DB_KEY);
            if (storedUsers) {
                try {
                    users = JSON.parse(storedUsers);
                } catch (parseError) {
                    console.error("Data corrupted, resetting DB", parseError);
                    users = {};
                }
            }

            const email = name.toLowerCase().replace(/\s/g, '') + '@ramadan.app';

            if (users[email]) {
                // تسجيل دخول
                if (users[email].password === pass) {
                    loginSuccess(users[email]);
                } else {
                    showLoader(false);
                    showError('⚠️ كلمة المرور غير صحيحة');
                }
            } else {
                // إنشاء حساب جديد
                const newUser = { name: name, email: email, password: pass };
                users[email] = newUser;
                localStorage.setItem(DB_KEY, JSON.stringify(users));
                loginSuccess(newUser);
            }
        } catch (err) {
            console.error(err);
            showLoader(false);
            showError('حدث خطأ أثناء محاولة الدخول');
        }
    }, 800);
}

function handleGoogleLogin() {
    showLoader(true);
    setTimeout(() => {
        const guestUser = { name: 'ضيف', email: 'guest@ramadan.app', password: '' };
        loginSuccess(guestUser);
    }, 1000);
}

function loginSuccess(user) {
    showLoader(false); // <--- هنا الإصلاح: إخفاء اللودر فوراً عند النجاح
    currentUser = user;
    document.getElementById('welcome-text').innerText = `مرحباً بك يا ${user.name} 👋`;
    loadUserData();
    switchPage('app-page');
    renderGrid();
}

function logout() {
    currentUser = null;
    userProgress = { k1: {}, k2: {} };
    document.getElementById('login-form').reset();
    document.getElementById('error-msg').style.display = 'none';
    switchPage('login-page');
}

// --- إدارة البيانات ---
function getProgressKey() {
    return `ramadan_progress_${currentUser.email}`;
}

function loadUserData() {
    const saved = localStorage.getItem(getProgressKey());
    if (saved) {
        try {
            userProgress = JSON.parse(saved);
        } catch(e) { userProgress = { k1: {}, k2: {} }; }
    } else {
        userProgress = { k1: {}, k2: {} };
    }
}

function saveUserData() {
    if (!currentUser) return;
    try {
        localStorage.setItem(getProgressKey(), JSON.stringify(userProgress));
        updateStats();
    } catch(e) { console.error("Could not save progress", e); }
}

// --- منطق التتبع ---
function renderGrid() {
    const container = document.getElementById('days-grid');
    container.innerHTML = '';
    
    for (let day = 1; day <= 15; day++) {
        const startPage = (day - 1) * 40 + 1;
        const card = document.createElement('div');
        card.className = 'day-card';
        card.id = `card-day-${day}`;
        
        let prayersHTML = '';
        prayers.forEach((p, idx) => {
            const pStart = startPage + (idx * 8);
            const pEnd = pStart + 7;
            const uniqueId = `d${day}-p${idx}`;
            
            const isDone = userProgress[`k${currentTab}`][uniqueId];
            const doneClass = isDone ? 'done' : '';
            
            prayersHTML += `
                <div class="prayer-row ${doneClass}" id="row-${uniqueId}" onclick="togglePrayer('${uniqueId}')">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="font-size:1.2rem">${p.icon}</span>
                        <span class="p-name">${p.name}</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:15px;">
                        <span style="font-size:0.85rem; color:#94a3b8;">${pStart}-${pEnd}</span>
                        <div class="checkbox"></div>
                    </div>
                </div>
            `;
        });

        card.innerHTML = `
            <div class="d-header">
                <span class="d-title">اليوم ${day}</span>
                <span class="d-pages">صفحة ${startPage} - ${startPage+39}</span>
            </div>
            ${prayersHTML}
        `;
        container.appendChild(card);
        checkDayVisuals(day);
    }
    updateStats();
}

function togglePrayer(id) {
    const currentData = userProgress[`k${currentTab}`];
    
    if (currentData[id]) {
        delete currentData[id];
        document.getElementById(`row-${id}`).classList.remove('done');
    } else {
        currentData[id] = true;
        document.getElementById(`row-${id}`).classList.add('done');
        createConfetti();
    }
    
    const dayNum = id.split('-')[0].replace('d', '');
    checkDayVisuals(dayNum);
    saveUserData();
}

function checkDayVisuals(day) {
    let allDone = true;
    for(let i=0; i<5; i++) {
        if(!userProgress[`k${currentTab}`][`d${day}-p${i}`]) allDone = false;
    }
    const card = document.getElementById(`card-day-${day}`);
    if(allDone) card.classList.add('finished');
    else card.classList.remove('finished');
}

function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.k-tab').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    renderGrid();
}

function updateStats() {
    const k1Count = Object.keys(userProgress.k1).length;
    const k2Count = Object.keys(userProgress.k2).length;
    const total = k1Count + k2Count;
    const max = 75;

    document.getElementById('stat-k1').innerText = Math.round((k1Count/max)*100) + '%';
    document.getElementById('stat-k2').innerText = Math.round((k2Count/max)*100) + '%';
    document.getElementById('stat-total').innerText = `${total}/150`;
}

function createConfetti() {
    for(let i=0; i<15; i++) {
        const c = document.createElement('div');
        c.style.position = 'fixed';
        c.style.left = '50%';
        c.style.top = '50%';
        c.style.width = '8px';
        c.style.height = '8px';
        c.style.backgroundColor = ['#d4af37', '#fff', '#10b981'][Math.floor(Math.random()*3)];
        c.style.borderRadius = '50%';
        c.style.pointerEvents = 'none';
        c.style.zIndex = '9999';
        c.style.transition = 'all 1s ease-out';
        document.body.appendChild(c);

        setTimeout(() => {
            const x = (Math.random() - 0.5) * 300;
            const y = (Math.random() - 0.5) * 300;
            c.style.transform = `translate(${x}px, ${y}px) scale(0)`;
            c.style.opacity = '0';
        }, 10);
        setTimeout(() => c.remove(), 1000);
    }
}