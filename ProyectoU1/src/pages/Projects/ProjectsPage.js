// =============================================
// Projects Page — KittyTasks
// Create, Edit, Archive, Delete projects
// =============================================
import { state, navigate } from '../../main.js';
import {
  listenProjects, createProject, updateProject, archiveProject, deleteProject,
  addProjectMember, getUserProfile, getFriends
} from '../../firebase/firestore.js';

import { showToast } from '../../components/Toast.js';


let projects = [];
let selectedColor = '#7c6ff7';
let projFilter = 'active';
let editingProjectId = null;
let taskCountMap = {}; // projectId -> { total, done }
let taskListeners = []; // cleanup


const PROJECT_COLORS = ['#7c6ff7', '#f472b6', '#4ade80', '#fbbf24', '#60a5fa', '#f87171', '#a78bfa', '#34d399', '#fb923c', '#e879f9'];

export function renderProjects(container) {
  const root = container || document.getElementById('page-content');
  if (!root) return;

  root.innerHTML = `
    <style>
      .projects-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:var(--space-6); flex-wrap:wrap; gap:var(--space-3); }
      .projects-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:var(--space-5); }

      .project-card { background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-xl); padding:var(--space-5); box-shadow:var(--shadow-card); cursor:pointer; transition:all var(--transition-base); animation:slideUp 0.3s ease; position:relative; overflow:hidden; }
      .project-card::before { content:''; position:absolute; top:0; left:0; right:0; height:4px; background:var(--project-color, var(--accent)); }
      .project-card:hover { box-shadow:var(--shadow-card-hover); transform:translateY(-4px); border-color:var(--accent); }
      .project-card.archived-proj { opacity:0.6; }

      .project-icon { width:48px; height:48px; border-radius:var(--radius-lg); display:flex; align-items:center; justify-content:center; font-size:24px; margin-bottom:var(--space-3); }
      .project-name { font-size:var(--text-lg); font-weight:700; margin-bottom:4px; }
      .project-desc { font-size:var(--text-sm); color:var(--text-muted); margin-bottom:var(--space-3); min-height:20px; }
      .project-meta { display:flex; align-items:center; gap:var(--space-3); font-size:var(--text-xs); color:var(--text-muted); }
      .project-actions { position:absolute; top:var(--space-3); right:var(--space-3); display:flex; gap:var(--space-1); opacity:0; transition:opacity var(--transition-fast); }
      .project-card:hover .project-actions { opacity:1; }
      @media (max-width:640px) { .project-actions { opacity:1; } }

      .color-picker-row { display:flex; gap:var(--space-2); flex-wrap:wrap; }
      .color-dot { width:28px; height:28px; border-radius:50%; cursor:pointer; border:3px solid transparent; transition:border-color var(--transition-fast); flex-shrink:0; }
      .color-dot.selected { border-color:var(--text-primary); }

      .tabs-archived { display:flex; gap:var(--space-2); margin-bottom:var(--space-5); }
    </style>

    <div class="projects-header">
      <div>
        <h1 style="font-size:var(--text-3xl); font-weight:800;">📁 Mis Proyectos</h1>
        <p class="text-muted">Organiza tu trabajo en proyectos</p>
      </div>
      <button class="btn btn-primary" onclick="openProjectModal()">+ Nuevo Proyecto</button>
    </div>

    <div class="tabs-archived">
      <button class="tab active" data-proj-filter="active">📂 Activos</button>
      <button class="tab" data-proj-filter="archived">📦 Archivados</button>
    </div>

    <div class="projects-grid" id="projects-grid">
      <div class="loading-center"><div class="spinner"></div></div>
    </div>

    <!-- Create / Edit Project Modal -->
    <div class="modal-overlay" id="project-modal" style="display:none">
      <div class="modal-box">
        <div class="modal-header">
          <h2 id="proj-modal-title">📁 Nuevo Proyecto</h2>
          <button class="btn-icon" onclick="closeProjectModal()">✕</button>
        </div>
        <form id="project-form" novalidate>
          <div class="form-group">
            <label class="form-label">Nombre *</label>
            <input class="form-input" type="text" id="proj-name" placeholder="Nombre del proyecto" required maxlength="60" />
          </div>
          <div class="form-group">
            <label class="form-label">Descripción</label>
            <textarea class="form-input" id="proj-desc" placeholder="¿De qué trata este proyecto?" rows="2"></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Color</label>
            <div class="color-picker-row" id="color-picker">
              ${PROJECT_COLORS.map((c, i) =>
    `<div class="color-dot ${i === 0 ? 'selected' : ''}" style="background:${c}" data-color="${c}" onclick="selectColor('${c}', this)"></div>`
  ).join('')}
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-ghost" onclick="closeProjectModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary" id="proj-submit-btn">Crear Proyecto</button>
          </div>
        </form>
      </div>
    </div>
  `;

  initProjects();

  window.openProjectModal = (id) => {
    editingProjectId = id || null;
    const titleEl = document.getElementById('proj-modal-title');
    const submitBtn = document.getElementById('proj-submit-btn');

    if (id) {
      const proj = projects.find(p => p.id === id);
      if (proj) {
        titleEl.textContent = '✏️ Editar Proyecto';
        submitBtn.textContent = 'Guardar cambios';
        document.getElementById('proj-name').value = proj.name;
        document.getElementById('proj-desc').value = proj.description || '';
        selectedColor = proj.color || '#7c6ff7';
        document.querySelectorAll('.color-dot').forEach(d => {
          d.classList.toggle('selected', d.dataset.color === selectedColor);
        });
      }
    } else {
      titleEl.textContent = '📁 Nuevo Proyecto';
      submitBtn.textContent = 'Crear Proyecto';
      document.getElementById('project-form').reset();
      selectedColor = '#7c6ff7';
      document.querySelectorAll('.color-dot').forEach((d, i) => d.classList.toggle('selected', i === 0));
    }
    document.getElementById('project-modal').style.display = 'flex';
    document.getElementById('proj-name').focus();
  };

  window.closeProjectModal = () => {
    document.getElementById('project-modal').style.display = 'none';
    editingProjectId = null;
  };

  window.selectColor = (color, el) => {
    selectedColor = color;
    document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('selected'));
    el.classList.add('selected');
  };

  window.archiveProjectById = async (id, archived) => {
    await archiveProject(id, !archived);
    showToast(archived ? '📂 Proyecto restaurado' : '📦 Proyecto archivado', 'success');
  };

  window.deleteProjectById = async (id) => {
    if (!confirm('¿Eliminar este proyecto permanentemente?')) return;
    await deleteProject(id);
    showToast('🗑️ Proyecto eliminado', 'info');
  };
}

function initProjects() {
  const uid = state.user?.uid;
  if (!uid) return;

  const unsub = listenProjects(uid, (fetched) => {
    projects = fetched;
    renderProjectsGrid();
  });
  if (state.listeners) state.listeners.push(unsub);

  // Filter tabs
  document.querySelectorAll('[data-proj-filter]').forEach(tab => {
    tab.addEventListener('click', () => {
      projFilter = tab.dataset.projFilter;
      document.querySelectorAll('[data-proj-filter]').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderProjectsGrid();
    });
  });

  // Form submit — handles both create and edit
  document.getElementById('project-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('proj-name').value.trim();
    if (!name) return;

    const btn = document.getElementById('proj-submit-btn');
    btn.disabled = true;

    try {
      const data = {
        name,
        description: document.getElementById('proj-desc').value.trim(),
        color: selectedColor,
      };

      if (editingProjectId) {
        await updateProject(editingProjectId, data);
        showToast('✏️ Proyecto actualizado', 'success');
      } else {
        await createProject(uid, data);
        showToast('📁 Proyecto creado', 'success');
      }
      window.closeProjectModal();
      document.getElementById('project-form').reset();
    } catch (err) {
      showToast('Error al guardar el proyecto', 'error');
    } finally {
      btn.disabled = false;
    }
  });

  // Close on overlay click
  document.addEventListener('click', (e) => {
    if (e.target.id === 'project-modal') window.closeProjectModal();
  });

  window.navigate = navigate;
}

function subscribeProjectTaskCounts(projectIds) {
  // Unsubscribe old listeners
  taskListeners.forEach(u => u());
  taskListeners = [];
  taskCountMap = {};
  const { listenProjectTasks } = window._kt_firestore || {};
  if (!listenProjectTasks) return;
  projectIds.forEach(id => {
    const unsub = listenProjectTasks(id, (tasks) => {
      taskCountMap[id] = { total: tasks.length, done: tasks.filter(t => t.completed).length };
      renderProjectsGrid();
    });
    taskListeners.push(unsub);
  });
}



function renderProjectsGrid() {
  const grid = document.getElementById('projects-grid');
  if (!grid) return;

  const filtered = projects.filter(p =>
    projFilter === 'archived' ? p.archived : !p.archived
  );

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div style="font-size:64px">📁</div>
        <h3>${projFilter === 'archived' ? 'No hay proyectos archivados' : '¡Sin proyectos aún!'}</h3>
        <p>${projFilter === 'archived' ? 'Los proyectos archivados aparecerán aquí' : 'Crea tu primer proyecto para organizar tu trabajo'}</p>
      </div>
    `;
    return;
  }

  // Sort by createdAt desc (handle Firestore Timestamp and null)
  const sorted = [...filtered].sort((a, b) => {
    const ta = a.createdAt?.seconds || 0;
    const tb = b.createdAt?.seconds || 0;
    return tb - ta;
  });

  grid.innerHTML = sorted.map(p => {
    const counts = taskCountMap[p.id];
    const taskLabel = counts
      ? `✅ ${counts.done}/${counts.total} tarea${counts.total !== 1 ? 's' : ''}`
      : '○ Sin tareas';
    const dateLabel = p.createdAt?.seconds
      ? new Date(p.createdAt.seconds * 1000).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })
      : '';
    return `
    <div class="project-card ${p.archived ? 'archived-proj' : ''}"
         style="--project-color:${p.color || '#7c6ff7'}"
         onclick="navigate('/projects/${p.id}')">
      <div class="project-actions" onclick="event.stopPropagation()">
        ${!p.archived ? `<button class="btn-icon" onclick="openProjectModal('${p.id}')" title="Editar">✏️</button>` : ''}
        ${!p.archived ? `<button class="btn-icon" onclick="openAddMemberModal('${p.id}')" title="Añadir miembro" style="color:var(--accent)">👥</button>` : ''}
        <button class="btn-icon" onclick="archiveProjectById('${p.id}', ${!!p.archived})" title="${p.archived ? 'Restaurar' : 'Archivar'}">
          ${p.archived ? '📂' : '📦'}
        </button>
        <button class="btn-icon" onclick="deleteProjectById('${p.id}')" title="Eliminar" style="color:var(--danger)">🗑️</button>
      </div>

      <div class="project-icon" style="background:${p.color || '#7c6ff7'}22">📁</div>
      <div class="project-name">${escapeHtml(p.name)}</div>
      <div class="project-desc">${p.description ? escapeHtml(p.description) : '<span style="opacity:0.4">Sin descripción</span>'}</div>
      <div class="project-meta">
        <span>📅 ${dateLabel}</span>
        <span>${taskLabel}</span>
        <span>👥 ${p.members?.length || 1}</span>
        ${p.archived ? '<span class="badge">📦 Archivado</span>' : `<span style="width:10px;height:10px;border-radius:50%;background:${p.color || '#7c6ff7'};display:inline-block"></span>`}
      </div>
    </div>`;
  }).join('');

}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ─── ADD MEMBER TO PROJECT (from grid) ────────────────────────────────────────

window.openAddMemberModal = async (projectId) => {
  const project = projects.find(p => p.id === projectId);
  if (!project) return;

  // Always fetch fresh friends list derived from friendRequests
  let friends = [];
  try {
    friends = await getFriends(state.user?.uid);
    console.log('[KittyTasks] openAddMemberModal (new getFriends) — friends:', friends);
  } catch (err) {
    console.warn('[KittyTasks] could not fetch friends:', err);
    friends = state.profile?.friends || [];
  }


  const members = project.members || [];
  const available = friends.filter(uid => !members.includes(uid));

  // Remove old modal if exists
  document.getElementById('add-member-modal')?.remove();

  // Build friend options with display names
  let options = '';
  if (friends.length === 0) {
    options = '<option disabled value="">— No tienes amigos aceptados aún —</option>';
  } else if (available.length === 0) {
    options = '<option disabled value="">— Todos tus amigos ya están en este proyecto —</option>';
  } else {
    const profiles = await Promise.all(
      available.map(uid => getUserProfile(uid).catch(() => ({ id: uid, displayName: null, email: uid })))
    );
    options = '<option value="">— Selecciona un amigo —</option>' +
      profiles.map(fp =>
        `<option value="${fp.id}">${fp.displayName || fp.email || fp.id.substring(0, 14)}</option>`
      ).join('');
  }

  const modal = document.createElement('div');
  modal.id = 'add-member-modal';
  modal.className = 'modal-overlay';
  modal.style.display = 'flex';
  modal.innerHTML = `
    <div class="modal-box" style="max-width:400px">
      <div class="modal-header">
        <h2>👥 Añadir miembro</h2>
        <button class="btn-icon" onclick="document.getElementById('add-member-modal').remove()">✕</button>
      </div>
      <p class="text-muted" style="margin-bottom:var(--space-4);font-size:var(--text-sm)">
        <strong>${escapeHtml(project.name)}</strong>
        &nbsp;·&nbsp; ${members.length} miembro${members.length !== 1 ? 's' : ''}
        &nbsp;·&nbsp; ${friends.length} amigo${friends.length !== 1 ? 's' : ''}
      </p>
      <div class="form-group">
        <label class="form-label">Amigo a invitar</label>
        <select class="form-input" id="am-friend-select">${options}</select>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="document.getElementById('add-member-modal').remove()">Cancelar</button>
        <button class="btn btn-primary" onclick="confirmAddMember('${projectId}')"
          ${available.length === 0 ? 'disabled' : ''}>
          👥 Añadir al proyecto
        </button>
      </div>
    </div>
  `;
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
};


window.confirmAddMember = async (projectId) => {
  const sel = document.getElementById('am-friend-select');
  const friendUid = sel?.value;
  if (!friendUid) { showToast('Selecciona un amigo', 'warning'); return; }

  const project = projects.find(p => p.id === projectId);
  if (!project) return;
  if ((project.members || []).includes(friendUid)) {
    showToast('Este usuario ya es miembro', 'info');
    return;
  }

  try {
    await addProjectMember(projectId, friendUid);
    // Update local state immediately
    const idx = projects.findIndex(p => p.id === projectId);
    if (idx !== -1) {
      projects[idx].members = [...(projects[idx].members || []), friendUid];
    }
    document.getElementById('add-member-modal')?.remove();
    renderProjectsGrid();
    showToast('👥 Amigo añadido al proyecto', 'success');
  } catch (err) {
    console.error('[KittyTasks] addMember error:', err);
    showToast('Error al añadir miembro', 'error');
  }
};

