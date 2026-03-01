// =============================================
// Timer Page — KittyTasks
// Stopwatch and Countdown with flags
// =============================================
import { state } from '../../main.js';
import { saveTimerSession } from '../../firebase/firestore.js';
import { setCatState, showCatBubble } from '../../components/Cat/Cat.js';
import { showToast } from '../../components/Toast.js';

let timerInterval = null;
let elapsed = 0; // ms
let isRunning = false;
let mode = 'stopwatch'; // 'stopwatch' | 'countdown'
let countdownTotal = 0;
let flags = [];

export function renderTimer(container) {
  const root = container || document.getElementById('page-content');
  if (!root) return;

  root.innerHTML = `
    <style>
      .timer-page { max-width:560px; margin:0 auto; }
      .timer-header { text-align:center; margin-bottom:var(--space-8); }
      .timer-display {
        text-align:center;
        font-family:var(--font-display);
        font-size:5rem;
        font-weight:800;
        color:var(--accent);
        letter-spacing:-2px;
        margin-bottom:var(--space-6);
        text-shadow:0 0 40px var(--accent-glow);
        transition:color var(--transition-base);
      }
      .timer-display.running { animation:pulse 2s ease-in-out infinite; }

      .timer-mode-tabs { margin-bottom:var(--space-6); }

      .timer-controls {
        display:flex;
        justify-content:center;
        gap:var(--space-4);
        margin-bottom:var(--space-6);
      }
      .btn-timer {
        width:64px; height:64px;
        border-radius:50%;
        border:none;
        font-size:24px;
        cursor:pointer;
        transition:all var(--transition-spring);
        display:flex;
        align-items:center;
        justify-content:center;
        box-shadow:var(--shadow-md);
      }
      .btn-play {
        background:linear-gradient(135deg, var(--accent), var(--accent-dark));
        color:white;
        width:80px; height:80px; font-size:28px;
        box-shadow:0 6px 24px var(--accent-glow);
      }
      .btn-play:hover { transform:scale(1.1); box-shadow:0 8px 32px var(--accent-glow); }
      .btn-reset { background:var(--bg-tertiary); color:var(--text-secondary); border:1.5px solid var(--border-color); }
      .btn-flag { background:rgba(251,191,36,0.15); color:var(--warning); border:1.5px solid rgba(251,191,36,0.3); }
      .btn-flag:hover { background:rgba(251,191,36,0.25); }

      .countdown-setup {
        background:var(--bg-card);
        border:1px solid var(--border-color);
        border-radius:var(--radius-xl);
        padding:var(--space-6);
        margin-bottom:var(--space-6);
        box-shadow:var(--shadow-card);
        animation:slideUp 0.3s ease;
      }
      .countdown-inputs { display:grid; grid-template-columns:repeat(3,1fr); gap:var(--space-3); }
      .time-input-wrap { text-align:center; }
      .time-input-wrap label { font-size:var(--text-xs); font-weight:600; color:var(--text-muted); display:block; margin-bottom:4px; }
      .time-input { width:100%; text-align:center; font-size:var(--text-xl); font-weight:700; }

      .flags-list {
        background:var(--bg-card);
        border:1px solid var(--border-color);
        border-radius:var(--radius-xl);
        padding:var(--space-5);
        box-shadow:var(--shadow-card);
        margin-bottom:var(--space-6);
      }
      .flag-item {
        display:flex;
        align-items:center;
        gap:var(--space-3);
        padding:var(--space-2) 0;
        border-bottom:1px solid var(--border-subtle);
        font-size:var(--text-sm);
        color:var(--text-secondary);
      }
      .flag-item:last-child { border-bottom:none; }
      .flag-dot { width:8px; height:8px; border-radius:50%; background:var(--warning); flex-shrink:0; }

      .timer-cat-msg { text-align:center; margin-bottom:var(--space-4); font-size:var(--text-sm); color:var(--text-muted); }
    </style>

    <div class="timer-page page-enter">
      <div class="timer-header">
        <h1 style="font-size:var(--text-3xl); font-weight:800;">⏱ Cronómetro</h1>
        <p class="text-muted">¡Tu gatito toma té mientras corres el tiempo! 🍵</p>
      </div>

      <div class="timer-mode-tabs">
        <div class="tabs">
          <button class="tab active" data-mode="stopwatch" id="mode-stopwatch" onclick="switchMode('stopwatch')">⏱ Cronómetro</button>
          <button class="tab" data-mode="countdown" id="mode-countdown" onclick="switchMode('countdown')">⏳ Temporizador</button>
        </div>
      </div>

      <!-- Countdown setup (hidden by default) -->
      <div class="countdown-setup" id="countdown-setup" style="display:none">
        <div class="countdown-inputs">
          <div class="time-input-wrap">
            <label>Horas</label>
            <input class="form-input time-input" type="number" id="timer-h" min="0" max="99" value="0" />
          </div>
          <div class="time-input-wrap">
            <label>Minutos</label>
            <input class="form-input time-input" type="number" id="timer-m" min="0" max="59" value="25" />
          </div>
          <div class="time-input-wrap">
            <label>Segundos</label>
            <input class="form-input time-input" type="number" id="timer-s" min="0" max="59" value="0" />
          </div>
        </div>
      </div>

      <!-- Timer Display -->
      <div class="timer-display" id="timer-display">00:00:00</div>

      <div class="timer-cat-msg" id="timer-cat-msg">Presiona ▶ para empezar</div>

      <!-- Controls -->
      <div class="timer-controls">
        <button class="btn-timer btn-flag" onclick="addFlag()" title="Añadir bandera" id="flag-btn">🚩</button>
        <button class="btn-timer btn-play" id="play-btn" onclick="toggleTimer()">▶</button>
        <button class="btn-timer btn-reset" onclick="resetTimer()" title="Reiniciar">↺</button>
      </div>

      <!-- Time Alarm section -->
      <div class="card" style="margin-bottom:var(--space-4);padding:var(--space-4)">
        <div style="font-weight:700;margin-bottom:var(--space-3)">⏰ Programar Alarma</div>
        <div style="display:flex;gap:var(--space-3);align-items:center;flex-wrap:wrap">
          <input class="form-input" type="time" id="alarm-time" style="width:auto" />
          <input class="form-input" type="text" id="alarm-label" placeholder="Etiqueta (opcional)" style="flex:1;min-width:120px" />
          <button class="btn btn-primary btn-sm" onclick="addFutureAlarm()">+ Alarma</button>
        </div>
        <div id="alarms-list" style="margin-top:var(--space-3)"></div>
      </div>

      <!-- Flags list -->
      <div class="flags-list" id="flags-list" style="display:none">
        <div class="section-title">🚩 Banderas
          <button class="btn-ghost btn-sm" onclick="clearFlags()" style="font-size:10px;margin-left:var(--space-3)">Limpiar</button>
        </div>
        <div id="flags-container"></div>
      </div>
    </div>
  `;

  // Expose globals
  window.switchMode = (m) => {
    mode = m;
    const stopSetup = document.getElementById('countdown-setup');
    if (stopSetup) stopSetup.style.display = m === 'countdown' ? 'block' : 'none';
    document.querySelectorAll('[data-mode]').forEach(t => t.classList.toggle('active', t.dataset.mode === m));
    resetTimer();
  };
  window.toggleTimer = () => {
    if (isRunning) pauseTimer();
    else startTimer();
  };
  window.resetTimer = () => {
    pauseTimer();
    elapsed = 0;
    flags = [];
    updateDisplay();
    updateFlagsList();
    const playBtn = document.getElementById('play-btn');
    if (playBtn) playBtn.textContent = '▶';
    const catMsg = document.getElementById('timer-cat-msg');
    if (catMsg) catMsg.textContent = 'Presiona ▶ para empezar';
    setCatState('idle');
  };
  window.addFlag = () => {
    if (!isRunning) return;
    const t = mode === 'stopwatch' ? elapsed : (countdownTotal - elapsed);
    flags.push(t);
    updateFlagsList();
    showToast(`🚩 Bandera: ${formatTime(t)}`, 'info');
  };

  window.clearFlags = () => { flags = []; updateFlagsList(); };

  // Active alarms: [{time: 'HH:MM', label, timerId}]
  window._activeAlarms = window._activeAlarms || [];

  window.addFutureAlarm = () => {
    const timeInput = document.getElementById('alarm-time');
    const labelInput = document.getElementById('alarm-label');
    const timeVal = timeInput?.value;
    if (!timeVal) { showToast('Elige una hora para la alarma', 'warning'); return; }

    const [h, m] = timeVal.split(':').map(Number);
    const now = new Date();
    const alarm = new Date(now);
    alarm.setHours(h, m, 0, 0);
    if (alarm <= now) alarm.setDate(alarm.getDate() + 1); // next day if past
    const ms = alarm - now;
    const label = labelInput?.value.trim() || `Alarma ${timeVal}`;

    const timerId = setTimeout(() => {
      showToast(`⏰ ${label}`, 'success');
      setCatState('celebrating');
      if (Notification.permission === 'granted') {
        new Notification(`KittyTasks ⏰ ${label}`, { body: '¡Hora de Tu alarma!', icon: '/icons/icon-192.png' });
      }
      // Remove from list
      window._activeAlarms = window._activeAlarms.filter(a => a.timerId !== timerId);
      renderAlarmList();
    }, ms);

    window._activeAlarms.push({ timeVal, label, timerId });
    renderAlarmList();
    showToast(`⏰ Alarma para las ${timeVal} programada`, 'success');
    if (timeInput) timeInput.value = '';
    if (labelInput) labelInput.value = '';
  };

  function renderAlarmList() {
    const el = document.getElementById('alarms-list');
    if (!el) return;
    if (!window._activeAlarms.length) { el.innerHTML = ''; return; }
    el.innerHTML = window._activeAlarms.map(a => `
      <div style="display:flex;align-items:center;gap:var(--space-2);padding:var(--space-1) 0;font-size:var(--text-sm)">
          <span>⏰</span>
          <span style="flex:1"><strong>${a.timeVal}</strong> — ${a.label}</span>
          <button class="btn-icon" onclick="cancelAlarm(${a.timerId})" style="font-size:11px">✕</button>
      </div>`).join('');
  }

  window.cancelAlarm = (timerId) => {
    clearTimeout(timerId);
    window._activeAlarms = window._activeAlarms.filter(a => a.timerId !== timerId);
    renderAlarmList();
    showToast('Alarma cancelada', 'info');
  };

  // Render existing alarms on re-mount
  renderAlarmList();


  // Request notification permission
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function startTimer() {
  isRunning = true;
  const playBtn = document.getElementById('play-btn');
  if (playBtn) playBtn.textContent = '⏸';
  const catMsg = document.getElementById('timer-cat-msg');
  if (catMsg) catMsg.textContent = mode === 'stopwatch' ? '¡Cronómetro corriendo! ☕🍵' : '¡Tiempo corriendo! 🍵';
  setCatState('tea');

  const display = document.getElementById('timer-display');
  if (display) display.classList.add('running');

  if (mode === 'countdown') {
    const h = parseInt(document.getElementById('timer-h')?.value || 0);
    const m = parseInt(document.getElementById('timer-m')?.value || 0);
    const s = parseInt(document.getElementById('timer-s')?.value || 0);
    countdownTotal = (h * 3600 + m * 60 + s) * 1000;
    if (countdownTotal <= 0) { showToast('Establece un tiempo primero', 'warning'); return; }
    if (elapsed <= 0) elapsed = countdownTotal;
  }

  timerInterval = setInterval(() => {
    if (mode === 'stopwatch') {
      elapsed += 100;
    } else {
      elapsed -= 100;
      if (elapsed <= 0) {
        elapsed = 0;
        updateDisplay();
        finishCountdown();
        return;
      }
    }
    updateDisplay();
  }, 100);
}

function pauseTimer() {
  isRunning = false;
  clearInterval(timerInterval);
  timerInterval = null;
  const playBtn = document.getElementById('play-btn');
  if (playBtn) playBtn.textContent = '▶';
  const display = document.getElementById('timer-display');
  if (display) display.classList.remove('running');
  setCatState('idle');
}



function finishCountdown() {
  pauseTimer();
  setCatState('celebrating');
  showToast('⏰ ¡Tiempo terminado!', 'success');

  // Browser notification
  if (Notification.permission === 'granted') {
    new Notification('KittyTasks ⏰', {
      body: '¡Tu tiempo ha terminado! 🐱',
      icon: '/icons/icon-192.png',
    });
  }

  const catMsg = document.getElementById('timer-cat-msg');
  if (catMsg) catMsg.textContent = '¡Tiempo terminado! ¡Gran trabajo! 🎉';

  // Save session
  if (state.user) {
    saveTimerSession(state.user.uid, {
      type: 'countdown',
      duration: countdownTotal,
    }).catch(console.error);
  }
}

function updateDisplay() {
  const el = document.getElementById('timer-display');
  if (!el) return;
  const t = mode === 'countdown' ? elapsed : elapsed;
  el.textContent = formatTime(t);
}

function formatTime(ms) {
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function updateFlagsList() {
  const list = document.getElementById('flags-list');
  const container = document.getElementById('flags-container');
  if (!list || !container) return;

  if (flags.length === 0) {
    list.style.display = 'none';
    return;
  }

  list.style.display = 'block';
  container.innerHTML = flags.map((f, i) =>
    `<div class="flag-item"><div class="flag-dot"></div><span>Bandera ${i + 1}:</span><strong>${formatTime(f)}</strong></div>`
  ).join('');
}
