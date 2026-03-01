// =============================================
// Calendar Page — KittyTasks
// Monthly calendar with task due dates and times
// =============================================
import { state } from '../../main.js';
import { listenTasks } from '../../firebase/firestore.js';

let currentDate = new Date();
let tasks = [];

export function renderCalendar(container) {
  const root = container || document.getElementById('page-content');
  if (!root) return;

  root.innerHTML = `
    <style>
      .calendar-wrapper { max-width:800px; margin:0 auto; }
      .calendar-header-row { display:flex; align-items:center; justify-content:space-between; margin-bottom:var(--space-6); }
      .cal-nav { display:flex; align-items:center; gap:var(--space-3); }
      .cal-month-title { font-size:var(--text-2xl); font-weight:800; font-family:var(--font-display); }
      .cal-nav-btn { width:36px; height:36px; border-radius:var(--radius-md); border:1.5px solid var(--border-color); background:var(--bg-secondary); cursor:pointer; font-size:18px; display:flex; align-items:center; justify-content:center; transition:all var(--transition-fast); }
      .cal-nav-btn:hover { background:var(--accent); color:white; border-color:var(--accent); }

      .calendar-grid { background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-xl); overflow:hidden; box-shadow:var(--shadow-md); }
      .cal-weekdays { display:grid; grid-template-columns:repeat(7,1fr); background:var(--bg-tertiary); }
      .cal-weekday { text-align:center; padding:var(--space-3); font-size:var(--text-xs); font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em; }
      .cal-weekday:first-child, .cal-weekday:last-child { color:var(--accent); }

      .cal-days { display:grid; grid-template-columns:repeat(7,1fr); }
      .cal-day { min-height:84px; padding:var(--space-2); border-right:1px solid var(--border-subtle); border-bottom:1px solid var(--border-subtle); cursor:pointer; transition:background var(--transition-fast); position:relative; }
      .cal-day:hover { background:var(--bg-hover); }
      .cal-day.other-month { opacity:0.35; }
      .cal-day.today { background:rgba(124,111,247,0.08); }
      .cal-day.today .cal-day-num { background:var(--accent); color:white; border-radius:50%; width:24px; height:24px; display:flex; align-items:center; justify-content:center; }
      .cal-day-num { font-size:var(--text-sm); font-weight:600; color:var(--text-secondary); margin-bottom:4px; width:24px; height:24px; display:flex; align-items:center; justify-content:center; }
      .cal-task-chip { margin-bottom:2px; padding:1px 5px; border-radius:var(--radius-full); font-size:9px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; background:var(--accent-glow); color:var(--accent); display:flex; align-items:center; gap:3px; }
      .cal-task-chip.overdue { background:rgba(248,113,113,0.15); color:var(--danger); }
      .cal-task-chip.completed { background:rgba(74,222,128,0.15); color:var(--success-dark); }
      .cal-time-badge { font-size:8px; opacity:0.8; flex-shrink:0; }

      @media (max-width:640px) {
        .cal-day { min-height:52px; }
        .cal-task-chip { display:none; }
        .cal-day.has-tasks::after { content:'●'; color:var(--accent); font-size:8px; position:absolute; bottom:4px; right:4px; }
      }

      .cal-day-detail { background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-xl); padding:var(--space-5); margin-top:var(--space-5); box-shadow:var(--shadow-md); animation:slideUp 0.3s ease; display:none; }
      .cal-day-detail.show { display:block; }
    </style>

    <div class="calendar-wrapper page-enter">
      <div>
        <h1 style="font-size:var(--text-3xl); font-weight:800; margin-bottom:var(--space-1);">📅 Calendario</h1>
        <p class="text-muted" style="margin-bottom:var(--space-5)">Visualiza tus tareas y fechas</p>
      </div>

      <div class="calendar-header-row" style="margin-top:var(--space-5)">
        <div class="cal-nav">
          <button class="cal-nav-btn" onclick="prevMonth()">◀</button>
          <div class="cal-month-title" id="cal-month-title"></div>
          <button class="cal-nav-btn" onclick="nextMonth()">▶</button>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="goToday()">Hoy</button>
      </div>

      <div class="calendar-grid">
        <div class="cal-weekdays">
          ${['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => `<div class="cal-weekday">${d}</div>`).join('')}
        </div>
        <div class="cal-days" id="cal-days"></div>
      </div>

      <div class="cal-day-detail" id="cal-day-detail">
        <div style="font-size:var(--text-lg); font-weight:700; margin-bottom:var(--space-3);" id="cal-detail-title"></div>
        <div id="cal-detail-tasks"></div>
      </div>
    </div>
  `;

  initCalendar();
  window.prevMonth = () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCalGrid(); };
  window.nextMonth = () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCalGrid(); };
  window.goToday = () => { currentDate = new Date(); renderCalGrid(); };
  window.showDayDetail = (dateStr) => showDayDetail(dateStr);
}

function initCalendar() {
  const uid = state.user?.uid;
  if (!uid) return;
  const unsub = listenTasks(uid, (fetched) => {
    tasks = fetched.filter(t => !t.archived);
    renderCalGrid();
  });
  if (state.listeners) state.listeners.push(unsub);
  renderCalGrid();
}

function renderCalGrid() {
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const titleEl = document.getElementById('cal-month-title');
  if (titleEl) titleEl.textContent = `${months[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

  const grid = document.getElementById('cal-days');
  if (!grid) return;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  let cells = [];
  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = firstDay - 1; i >= 0; i--) {
    const pMonth = month === 0 ? 11 : month - 1;
    const pYear = month === 0 ? year - 1 : year;
    cells.push({ day: prevMonthDays - i, month: pMonth, year: pYear, current: false });
  }
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, month, year, current: true });
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    const nMonth = month === 11 ? 0 : month + 1;
    const nYear = month === 11 ? year + 1 : year;
    cells.push({ day: d, month: nMonth, year: nYear, current: false });
  }

  grid.innerHTML = cells.map(cell => {
    const dateStr = `${cell.year}-${String(cell.month + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`;
    const dayTasks = tasks.filter(t => t.dueDate === dateStr);
    const isToday = dateStr === todayStr && cell.current;

    const chips = dayTasks.slice(0, 3).map(t => {
      const cls = t.completed ? 'completed' : (t.dueDate < todayStr ? 'overdue' : '');
      const timeStr = t.dueTime ? `<span class="cal-time-badge">${t.dueTime}</span>` : '';
      return `<div class="cal-task-chip ${cls}" title="${t.title} ${t.dueTime || ''}">${timeStr}${escapeHtml(t.title.substring(0, 14))}${t.title.length > 14 ? '…' : ''}</div>`;
    }).join('');

    return `
      <div class="cal-day ${!cell.current ? 'other-month' : ''} ${isToday ? 'today' : ''} ${dayTasks.length ? 'has-tasks' : ''}"
           onclick="showDayDetail('${dateStr}')">
        <div class="cal-day-num">${cell.day}</div>
        ${chips}
        ${dayTasks.length > 3 ? `<div style="font-size:9px; color:var(--text-muted)">+${dayTasks.length - 3} más</div>` : ''}
      </div>
    `;
  }).join('');
}

function showDayDetail(dateStr) {
  const detail = document.getElementById('cal-day-detail');
  const titleEl = document.getElementById('cal-detail-title');
  const tasksEl = document.getElementById('cal-detail-tasks');
  if (!detail || !titleEl || !tasksEl) return;

  const dayTasks = tasks.filter(t => t.dueDate === dateStr);
  const [year, month, day] = dateStr.split('-');
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  titleEl.textContent = `📅 ${parseInt(day)} de ${months[parseInt(month) - 1]} de ${year}`;

  if (!dayTasks.length) {
    tasksEl.innerHTML = `<p class="text-muted">Sin tareas para este día. 🐾</p>`;
  } else {
    // Sort by time
    const sorted = [...dayTasks].sort((a, b) => (a.dueTime || '99:99').localeCompare(b.dueTime || '99:99'));
    const diffMap = { easy: '🟢 Fácil', normal: '🟡 Normal', hard: '🔴 Difícil' };
    tasksEl.innerHTML = sorted.map(t => {
      const timeDisplay = t.dueTime
        ? `<span style="font-size:var(--text-xs);color:var(--accent);font-weight:700;margin-right:var(--space-2)">⏰ ${t.dueTime}</span>`
        : '';
      const today = new Date().toISOString().split('T')[0];
      const isOverdue = t.dueDate < today && !t.completed;
      return `
      <div style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3) 0;border-bottom:1px solid var(--border-subtle)">
        <span style="font-size:20px">${t.completed ? '✅' : (isOverdue ? '🔴' : '📌')}</span>
        <div style="flex:1">
          <div style="font-weight:600;${t.completed ? 'text-decoration:line-through;color:var(--text-muted)' : ''}">
            ${timeDisplay}${escapeHtml(t.title)}
          </div>
          ${t.description ? `<div style="font-size:var(--text-xs);color:var(--text-muted)">${escapeHtml(t.description)}</div>` : ''}
        </div>
        <span class="badge badge-${t.difficulty || 'normal'}">${diffMap[t.difficulty || 'normal']}</span>
      </div>
    `;
    }).join('');
  }

  detail.classList.add('show');
  detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
