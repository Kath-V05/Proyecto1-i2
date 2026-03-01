// =============================================
// Dashboard Page — KittyTasks
// Main task management view
// Cache-burst: v1.0.5 - fix-deletion-and-linking
// =============================================
import { state } from '../../main.js';
import {
  listenTasks, addTask, updateTask, deleteTask, completeTask,
  archiveTask, listenProjects, listenProjectTasks,
  listenFriends
} from '../../firebase/firestore.js';

import { showToast } from '../../components/Toast.js';
import { celebrate } from '../../components/Particles.js';
import { setCatState, showCatBubble } from '../../components/Cat/Cat.js';

let tasks = [];
let projects = [];
let friendsList = [];
let filter = 'all';
let searchQuery = '';
let projectTaskListeners = {};

export function renderDashboard(container) {
  const root = container || document.getElementById('page-content');
  if (!root) return;

  root.innerHTML = `
    <style>
      .dashboard-header { margin-bottom: var(--space-6); }
      .dashboard-greeting { font-size: var(--text-3xl); font-weight: 800; color: var(--text-primary); margin-bottom: var(--space-1); }
      .dashboard-greeting span { color: var(--accent); }
      .dashboard-subtitle { color: var(--text-muted); font-size: var(--text-base); }

      .dashboard-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-4); margin-bottom: var(--space-6); }
      @media (max-width: 768px) { .dashboard-stats { grid-template-columns: repeat(2, 1fr); } }
      @media (max-width: 400px) { .dashboard-stats { grid-template-columns: 1fr; } }

      .stat-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: var(--space-4) var(--space-5); text-align: center; box-shadow: var(--shadow-card); transition: all var(--transition-base); }
      .stat-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-card-hover); }
      .stat-card .stat-icon { font-size: 28px; margin-bottom: var(--space-2); }
      .stat-card .stat-value { font-size: var(--text-2xl); font-weight: 800; color: var(--accent); font-family: var(--font-display); }
      .stat-card .stat-label { font-size: var(--text-xs); color: var(--text-muted); font-weight: 500; }

      .tasks-toolbar { display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-4); flex-wrap: wrap; }
      .tasks-list { display: flex; flex-direction: column; gap: var(--space-3); }

      .task-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: var(--space-4) var(--space-5); display: flex; align-items: flex-start; gap: var(--space-3); box-shadow: var(--shadow-card); transition: all var(--transition-base); cursor: default; animation: slideUp 0.3s ease; position:relative; }
      .task-card:hover { box-shadow: var(--shadow-card-hover); border-color: var(--accent); transform: translateX(3px); }
      .task-card.completed { opacity: 0.7; border-left: 3px solid var(--success); }
      .task-card.archived-card { opacity: 0.55; border-left: 3px solid var(--border-color); }

      .task-check-btn { width: 26px; height: 26px; border-radius: 50%; border: 2px solid var(--border-color); display: flex; align-items: center; justify-content: center; flex-shrink: 0; cursor: pointer; transition: all var(--transition-base); background: transparent; font-size: 14px; margin-top: 2px; }
      .task-check-btn:hover { border-color: var(--success); background: rgba(74,222,128,0.1); }
      .task-check-btn.checked { background: linear-gradient(135deg, var(--success), var(--success-dark)); border-color: var(--success); color: white; animation: pop 0.3s ease; }

      .task-content { flex: 1; min-width: 0; }
      .task-title { font-weight: 600; font-size: var(--text-base); color: var(--text-primary); margin-bottom: 2px; display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; }
      .task-title.done { text-decoration: line-through; color: var(--text-muted); }
      .task-desc { font-size: var(--text-sm); color: var(--text-muted); margin-bottom: var(--space-2); }
      .task-meta { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; }
      .task-due { font-size: var(--text-xs); color: var(--text-muted); display: flex; align-items: center; gap: 4px; }
      .task-due.overdue { color: var(--danger); }

      .task-actions { display: flex; gap: var(--space-1); flex-shrink: 0; opacity: 0; transition: opacity var(--transition-fast); }
      .task-card:hover .task-actions { opacity: 1; }
      @media (max-width: 640px) { .task-actions { opacity: 1; } }

      .difficulty-btn-group { display: flex; gap: var(--space-2); }
      .diff-btn { flex: 1; padding: var(--space-2) var(--space-3); border-radius: var(--radius-md); border: 2px solid var(--border-color); background: transparent; cursor: pointer; font-size: var(--text-sm); font-weight: 600; font-family: var(--font-sans); transition: all var(--transition-fast); color: var(--text-secondary); }
      .diff-btn.easy { color: var(--easy); }
      .diff-btn.easy.selected { background: rgba(74,222,128,0.1); border-color: var(--easy); }
      .diff-btn.normal { color: var(--warning); }
      .diff-btn.normal.selected { background: rgba(251,191,36,0.1); border-color: var(--warning); }
      .diff-btn.hard { color: var(--danger); }
      .diff-btn.hard.selected { background: rgba(248,113,113,0.1); border-color: var(--danger); }

      .section-title { font-size: var(--text-lg); font-weight: 700; color: var(--text-primary); margin-bottom: var(--space-4); display: flex; align-items: center; gap: var(--space-2); }

      .streak-banner { background: linear-gradient(135deg, rgba(251,191,36,0.15), rgba(251,191,36,0.05)); border: 1.5px solid rgba(251,191,36,0.3); border-radius: var(--radius-lg); padding: var(--space-4) var(--space-5); display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-6); animation: slideDown 0.4s ease; }
      .streak-fire { font-size: 32px; animation: fireFlicker 1.5s ease-in-out infinite; }
      .streak-text { flex: 1; }
      .streak-text strong { color: var(--warning); font-size: var(--text-xl); }

      .badge-proj { padding:2px 8px; border-radius:var(--radius-full); background:rgba(124,111,247,0.12); color:var(--accent); font-size:10px; font-weight:700; }
    </style>

    <div class="dashboard-header">
      <h1 class="dashboard-greeting">Hola, <span id="dash-username">...</span>! 👋</h1>
      <p class="dashboard-subtitle">Aquí tienes tu resumen de hoy</p>
    </div>

    <div id="streak-banner" class="streak-banner" style="display:none"></div>

    <div class="dashboard-stats">
      <div class="stat-card"><div class="stat-icon">📋</div><div class="stat-value" id="stat-total">0</div><div class="stat-label">Tareas totales</div></div>
      <div class="stat-card"><div class="stat-icon">⏳</div><div class="stat-value" id="stat-pending">0</div><div class="stat-label">Pendientes</div></div>
      <div class="stat-card"><div class="stat-icon">✅</div><div class="stat-value" id="stat-done">0</div><div class="stat-label">Completadas</div></div>
      <div class="stat-card"><div class="stat-icon">⭐</div><div class="stat-value" id="stat-points">0</div><div class="stat-label">Puntos ganados</div></div>
    </div>

    <div class="tasks-toolbar">
      <div class="tabs" style="flex:1; max-width:320px;">
        <button class="tab active" data-filter="all" id="tab-all">📋 Todas</button>
        <button class="tab" data-filter="pending" id="tab-pending">⏳ Pendientes</button>
        <button class="tab" data-filter="archived" id="tab-archived">📦 Archivadas</button>
      </div>
      <div class="search-bar" style="flex:1; max-width:280px; position:relative">
        <span class="search-icon">🔍</span>
        <input class="form-input" type="text" placeholder="Buscar..." id="task-search" autocomplete="off"/>
        <button id="search-clear" onclick="clearSearch()" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:16px;display:none">✕</button>
      </div>
    </div>
    <div id="search-results-info" style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-2);min-height:18px"></div>

    <div class="section-title"><span>📝</span> Mis Tareas</div>
    <div class="tasks-list" id="tasks-list">
      <div class="loading-center"><div class="spinner"></div></div>
    </div>

    <button class="fab" title="Nueva tarea" onclick="openAddTaskModal()" id="add-task-fab">+</button>

    <!-- Add/Edit Task Modal -->
    <div class="modal-overlay" id="task-modal" style="display:none">
      <div class="modal-box">
        <div class="modal-header">
          <h2 id="modal-title">✏️ Nueva tarea</h2>
          <button class="btn-icon" onclick="closeTaskModal()">✕</button>
        </div>
        <form id="task-form" novalidate>
          <div class="form-group">
            <label class="form-label" for="task-title-input">Título *</label>
            <input class="form-input" type="text" id="task-title-input" placeholder="¿Qué necesitas hacer?" required maxlength="100" />
          </div>
          <div class="form-group">
            <label class="form-label" for="task-desc-input">Descripción (opcional)</label>
            <textarea class="form-input" id="task-desc-input" placeholder="Más detalles..." rows="2"></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Dificultad</label>
            <div class="difficulty-btn-group">
              <button type="button" class="diff-btn easy selected" data-diff="easy">🟢 Fácil (+10)</button>
              <button type="button" class="diff-btn normal" data-diff="normal">🟡 Normal (+25)</button>
              <button type="button" class="diff-btn hard" data-diff="hard">🔴 Difícil (+50)</button>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3)">
            <div class="form-group">
              <label class="form-label" for="task-due-input">Fecha límite</label>
              <input class="form-input" type="date" id="task-due-input" />
            </div>
            <div class="form-group">
              <label class="form-label" for="task-time-input">Hora</label>
              <input class="form-input" type="time" id="task-time-input" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Proyecto (opcional)</label>
            <select class="form-input" id="task-project-select">
              <option value="">— Sin proyecto —</option>
            </select>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-ghost" onclick="closeTaskModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary" id="task-submit-btn">
              <div class="btn-spinner" style="display:none"></div>
              <span class="btn-text">Guardar tarea</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  initDashboard();

  let selectedDifficulty = 'easy';
  let editingTaskId = null;
  let originalProjectId = null;

  window.openAddTaskModal = () => openTaskModal();
  window.closeTaskModal = () => closeModal();
  window.openEditTaskModal = (id) => openTaskModal(id);
  window.deleteTaskById = (id) => handleDeleteTask(id);
  window.toggleTask = (id, completed, difficulty) => handleToggleTask(id, completed, difficulty);
  window.archiveTaskById = (id) => handleArchiveTask(id);
  window.unarchiveTaskById = (id) => handleUnarchiveTask(id);

  window.selectDifficulty = (diff) => {
    selectedDifficulty = diff;
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.toggle('selected', b.dataset.diff === diff));
  };

  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => selectDifficulty(btn.dataset.diff));
  });

  function openTaskModal(taskId) {
    editingTaskId = taskId || null;
    const modal = document.getElementById('task-modal');
    if (!modal) return;
    const titleInput = document.getElementById('task-title-input');
    if (taskId) {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        // Explicitly handle null for private tasks
        originalProjectId = task.projectId || null;
        document.getElementById('modal-title').textContent = '✏️ Editar tarea';
        titleInput.value = task.title;
        document.getElementById('task-desc-input').value = task.description || '';
        document.getElementById('task-due-input').value = task.dueDate || '';
        document.getElementById('task-time-input').value = task.dueTime || '';
        document.getElementById('task-project-select').value = task.projectId || '';
        selectDifficulty(task.difficulty || 'easy');
      }
    } else {
      originalProjectId = null;
      document.getElementById('modal-title').textContent = '✏️ Nueva tarea';
      document.getElementById('task-form').reset();
      selectDifficulty('easy');
    }
    modal.style.display = 'flex';
    titleInput.focus();
  }

  function closeModal() {
    document.getElementById('task-modal').style.display = 'none';
  }

  document.getElementById('task-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const uid = state.user?.uid;
    const title = document.getElementById('task-title-input').value.trim();
    if (!title || !uid) return;

    const btn = document.getElementById('task-submit-btn');
    btn.disabled = true;
    btn.querySelector('.btn-spinner').style.display = 'block';
    btn.querySelector('.btn-text').style.display = 'none';

    try {
      const taskData = {
        title,
        description: document.getElementById('task-desc-input').value.trim(),
        difficulty: selectedDifficulty,
        dueDate: document.getElementById('task-due-input').value || null,
        dueTime: document.getElementById('task-time-input').value || null,
        projectId: document.getElementById('task-project-select').value || null,
      };

      if (editingTaskId) {
        // Normalize for comparison
        const oldPid = originalProjectId || null;
        const newPid = taskData.projectId || null;

        if (oldPid !== newPid) {
          // Migration: DELETE from old, ADD to new
          await deleteTask(uid, editingTaskId, oldPid);
          await addTask(uid, taskData);
        } else {
          // UPDATE in place
          await updateTask(uid, editingTaskId, taskData, newPid);
        }
        showToast('✏️ Tarea actualizada', 'success');
        editingTaskId = null;
      } else {
        await addTask(uid, taskData);
        showToast('✅ Tarea añadida', 'success');
      }
      closeModal();
    } catch (err) {
      console.error('[Dashboard] saveTask error:', err);
      showToast('Error al guardar la tarea. Revisa tu consola para más detalles.', 'error');
    } finally {
      btn.disabled = false;
      btn.querySelector('.btn-spinner').style.display = 'none';
      btn.querySelector('.btn-text').style.display = 'block';
    }
  });
}

function initDashboard() {
  const uid = state.user?.uid;
  if (!uid) return;

  const nameEl = document.getElementById('dash-username');
  if (nameEl) nameEl.textContent = state.profile?.displayName || state.user?.displayName || 'amigo';

  const ptsEl = document.getElementById('stat-points');
  if (ptsEl) ptsEl.textContent = state.profile?.points || 0;

  const streak = state.profile?.streak || 0;
  const streakBanner = document.getElementById('streak-banner');
  if (streakBanner && streak >= 2) {
    streakBanner.style.display = 'flex';
    streakBanner.innerHTML = `
      <div class="streak-fire">🔥</div>
      <div class="streak-text">
        <strong>${streak} días</strong> de racha<br>
        <span style="color:var(--text-muted); font-size:var(--text-sm)">¡Sigue así! Tu gatito está orgulloso 🐾</span>
      </div>
    `;
  }

  let allTasks = { private: [], projects: {} };

  // Cleanup previous listeners
  if (projectTaskListeners) {
    Object.values(projectTaskListeners).forEach(un => un());
  }
  projectTaskListeners = {};

  const mergeAndRender = () => {
    const flatProjects = Object.values(allTasks.projects).flat();
    const combined = [...allTasks.private, ...flatProjects];
    // Module-level tasks variable updated
    tasks = combined.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    renderTasksList();
    updateStats();
  };

  const unsubFriends = listenFriends(uid, (f) => {
    friendsList = f;
  });
  if (state.listeners) state.listeners.push(unsubFriends);

  const unsubProjects = listenProjects(uid, (pList) => {
    projects = pList;
    const sel = document.getElementById('task-project-select');
    if (sel) {
      const current = sel.value;
      sel.innerHTML = '<option value="">— Sin proyecto —</option>' +
        pList.map(proj => `<option value="${proj.id}">${proj.name}</option>`).join('');
      sel.value = current;
    }

    const activePids = pList.map(p => p.id);
    Object.keys(projectTaskListeners).forEach(pid => {
      if (!activePids.includes(pid)) {
        projectTaskListeners[pid]();
        delete projectTaskListeners[pid];
        delete allTasks.projects[pid];
      }
    });

    pList.forEach(proj => {
      if (!projectTaskListeners[proj.id]) {
        console.log('[Dashboard] Starting listener for project:', proj.id);
        projectTaskListeners[proj.id] = listenProjectTasks(proj.id, (pTasks) => {
          allTasks.projects[proj.id] = pTasks;
          mergeAndRender();
        });
      }
    });
    mergeAndRender();
  });
  if (state.listeners) state.listeners.push(unsubProjects);

  const unsubTasks = listenTasks(uid, (privateTasks) => {
    allTasks.private = privateTasks;
    mergeAndRender();
  });
  if (state.listeners) state.listeners.push(unsubTasks);

  if (state.listeners) {
    state.listeners.push(() => {
      Object.values(projectTaskListeners).forEach(un => un());
    });
  }

  // Toolbar events
  document.querySelectorAll('.tab[data-filter]').forEach(tab => {
    tab.addEventListener('click', () => {
      filter = tab.dataset.filter;
      document.querySelectorAll('.tab[data-filter]').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderTasksList();
    });
  });

  let searchTimer = null;
  document.getElementById('task-search')?.addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    const val = e.target.value;
    const clearBtn = document.getElementById('search-clear');
    if (clearBtn) clearBtn.style.display = val ? 'block' : 'none';
    searchTimer = setTimeout(() => {
      searchQuery = val.toLowerCase().trim();
      renderTasksList();
    }, 120);
  });

  window.clearSearch = () => {
    const input = document.getElementById('task-search');
    const clearBtn = document.getElementById('search-clear');
    if (input) input.value = '';
    if (clearBtn) clearBtn.style.display = 'none';
    searchQuery = '';
    renderTasksList();
  };
}

async function handleToggleTask(taskId, isCompleted, difficulty) {
  const uid = state.user?.uid;
  if (!uid) return;

  // Get Correct PID from DOM
  const card = document.querySelector(`[data-task-id="${taskId}"]`);
  const projectId = card?.dataset.projectId || null;

  if (!isCompleted) {
    try {
      const earned = await completeTask(uid, taskId, difficulty, projectId);
      if (card) {
        card.classList.add('completed');
        const btn = card.querySelector('.task-check-btn');
        if (btn) { btn.classList.add('checked'); btn.textContent = '✓'; }
        const rect = btn?.getBoundingClientRect();
        celebrate(rect?.x + 12 || window.innerWidth / 2, rect?.y + 12 || window.innerHeight / 2, 'confetti');
      }
      showToast(`🎉 +${earned} pts`, 'success');
      setTimeout(async () => {
        try { await archiveTask(uid, taskId, projectId); } catch (_) { }
      }, 2500);
    } catch (err) {
      console.error('[Dashboard] toggle error:', err);
      showToast('Error', 'error');
    }
  } else {
    try {
      await updateTask(uid, taskId, { completed: false, completedAt: null, archived: false }, projectId);
    } catch (err) { showToast('Error', 'error'); }
  }
}

async function handleArchiveTask(taskId) {
  const uid = state.user?.uid;
  if (!uid) return;
  const card = document.querySelector(`[data-task-id="${taskId}"]`);
  const projectId = card?.dataset.projectId || null;
  try {
    await archiveTask(uid, taskId, projectId);
    showToast('📦 Archivada', 'info');
  } catch (err) { showToast('Error', 'error'); }
}

async function handleUnarchiveTask(taskId) {
  const uid = state.user?.uid;
  if (!uid) return;
  const card = document.querySelector(`[data-task-id="${taskId}"]`);
  const projectId = card?.dataset.projectId || null;
  try {
    await updateTask(uid, taskId, { archived: false, completed: false, completedAt: null }, projectId);
    showToast('📂 Restaurada', 'success');
  } catch (err) { showToast('Error', 'error'); }
}

async function handleDeleteTask(taskId) {
  const uid = state.user?.uid;
  if (!uid || !confirm('¿Eliminar esta tarea?')) return;

  // Get correct PROJECT ID directly from DOM to avoid array desync
  const card = document.querySelector(`[data-task-id="${taskId}"]`);
  const projectId = card?.dataset.projectId || null;

  console.log(`[Dashboard] Deleting task: ${taskId}, from project: ${projectId}`);

  try {
    await deleteTask(uid, taskId, projectId);
    showToast('🗑️ Eliminada', 'info');
  } catch (err) {
    console.error('[Dashboard] delete error:', err);
    showToast('Error al eliminar', 'error');
  }
}

function renderTasksList() {
  const container = document.getElementById('tasks-list');
  if (!container) return;

  const filtered = filter === 'archived' ? tasks.filter(t => t.archived) :
    filter === 'pending' ? tasks.filter(t => !t.completed && !t.archived) : tasks;

  const searchQuerySafe = searchQuery.trim().toLowerCase();
  const searchResults = searchQuerySafe ? filtered.filter(t => {
    const proj = t.projectId ? projects.find(p => p.id === t.projectId) : null;
    return t.title.toLowerCase().includes(searchQuerySafe) ||
      (t.description || '').toLowerCase().includes(searchQuerySafe) ||
      (proj?.name || '').toLowerCase().includes(searchQuerySafe);
  }) : filtered;

  if (searchResults.length === 0) {
    container.innerHTML = `<div class="empty-state"><h3>Sin tareas</h3></div>`;
    return;
  }

  const today = new Date().toISOString().split('T')[0];
  container.innerHTML = searchResults.map(task => {
    const isOverdue = task.dueDate && !task.completed && task.dueDate < today;
    const proj = task.projectId ? projects.find(p => p.id === task.projectId) : null;
    return `
      <div class="task-card ${task.completed ? 'completed' : ''} ${task.archived ? 'archived-card' : ''}" 
           data-task-id="${task.id}" 
           data-project-id="${task.projectId || ''}">
        <div class="task-check-btn ${task.completed ? 'checked' : ''}" onclick="toggleTask('${task.id}', ${task.completed}, '${task.difficulty}')">${task.completed ? '✓' : ''}</div>
        <div class="task-content">
          <div class="task-title ${task.completed ? 'done' : ''}">${escapeHtml(task.title)}</div>
          ${task.description ? `<div class="task-desc">${escapeHtml(task.description)}</div>` : ''}
          <div class="task-meta">
            ${task.dueDate ? `<span class="task-due ${isOverdue ? 'overdue' : ''}">📅 ${task.dueDate}</span>` : ''}
            ${proj ? `<span class="badge-proj" style="border-left:3px solid ${proj.color || 'var(--accent)'}">📁 ${escapeHtml(proj.name)}</span>` : ''}
          </div>
        </div>
        <div class="task-actions">
          <button class="btn-icon" onclick="openEditTaskModal('${task.id}')">✏️</button>
          <button class="btn-icon" onclick="deleteTaskById('${task.id}')">🗑️</button>
          ${task.archived ? `<button class="btn-icon" onclick="unarchiveTaskById('${task.id}')">📂</button>` : `<button class="btn-icon" onclick="archiveTaskById('${task.id}')">📦</button>`}
        </div>
      </div>
    `;
  }).join('');
}

function updateStats() {
  const total = tasks.length;
  const pending = tasks.filter(t => !t.completed && !t.archived).length;
  const done = tasks.filter(t => t.completed).length;
  const totalEl = document.getElementById('stat-total');
  const pendingEl = document.getElementById('stat-pending');
  const doneEl = document.getElementById('stat-done');
  if (totalEl) totalEl.textContent = total;
  if (pendingEl) pendingEl.textContent = pending;
  if (doneEl) doneEl.textContent = done;
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
