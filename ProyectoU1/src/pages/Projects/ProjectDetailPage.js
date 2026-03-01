// =============================================
// Project Detail Page — KittyTasks
// Shows project tasks + linked notes
// =============================================
import { state, navigate } from '../../main.js';
import { db } from '../../firebase/firestore.js';
import {
  listenProjectTasks, addProjectTask, listenNotes,
  updateProject, deleteProject as deleteProjectDoc, updateTask, archiveProject,
  deleteTask, completeTask,
  addProjectMember, removeProjectMember, getUserProfile,

  listenProjectNotes, addProjectNote, deleteProjectNote, listenFriends
} from '../../firebase/firestore.js';



import { showToast } from '../../components/Toast.js';
import { celebrate } from '../../components/Particles.js';
import { setCatState } from '../../components/Cat/Cat.js';
import { doc, getDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let projectTasks = [];
let projectNotes = [];
let project = null;
let detailTab = 'tasks';
let selectedDiff = 'easy';
let friendsList = [];


export async function renderProjectDetail(container, projectId) {
  const root = container || document.getElementById('page-content');
  if (!root || !projectId) return;

  // Fetch project
  try {
    const snap = await getDoc(doc(db, 'projects', projectId));
    project = snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch { project = null; }

  if (!project) {
    root.innerHTML = `<div class="empty-state"><h3>Proyecto no encontrado</h3><button class="btn btn-primary" onclick="navigate('/projects')">← Volver</button></div>`;
    return;
  }

  root.innerHTML = `
    <style>
      .proj-header { display:flex; align-items:center; gap:var(--space-4); margin-bottom:var(--space-5); flex-wrap:wrap; }
      .proj-color-bar { width:6px; height:40px; border-radius:3px; flex-shrink:0; }
      .task-item { display:flex; align-items:flex-start; gap:var(--space-3); padding:var(--space-3) var(--space-4); background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-lg); animation:slideUp 0.25s ease; transition:all var(--transition-base); }
      .task-item:hover { border-color:var(--accent); transform:translateX(3px); }
      .task-item.done { opacity:0.6; border-left:3px solid var(--success); }
      .check-circle { width:22px; height:22px; border-radius:50%; border:2px solid var(--border-color); cursor:pointer; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:12px; transition:all var(--transition-fast); background:transparent; }
      .check-circle.checked { background:var(--success); border-color:var(--success); color:white; }
      .check-circle:hover { border-color:var(--success); }
      .task-list { display:flex; flex-direction:column; gap:var(--space-2); }
      .note-card-sm { background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-lg); padding:var(--space-4); animation:slideUp 0.25s ease; border-left:4px solid var(--accent); }
      .note-cards-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:var(--space-3); }
      .diff-badge { padding:1px 7px; border-radius:var(--radius-full); font-size:10px; font-weight:700; }
      .diff-badge.easy { background:rgba(74,222,128,0.15); color:var(--success-dark); }
      .diff-badge.normal { background:rgba(251,191,36,0.15); color:#b45309; }
      .diff-badge.hard { background:rgba(248,113,113,0.15); color:var(--danger); }
    </style>

    <div class="proj-header">
      <button class="btn btn-ghost btn-sm" onclick="navigate('/projects')">← Proyectos</button>
      <div class="proj-color-bar" style="background:${project.color || '#7c6ff7'}"></div>
      <h1 style="font-size:var(--text-2xl); font-weight:800; flex:1">${esc(project.name)}</h1>
      <button class="btn btn-ghost btn-sm" onclick="openEditProjectModal()">✏️ Editar</button>
    </div>

    ${project.description ? `<p class="text-muted" style="margin-bottom:var(--space-5)">${esc(project.description)}</p>` : ''}

    <div class="tabs" style="margin-bottom:var(--space-5)">
      <button class="tab active" data-dtab="tasks" onclick="switchDetailTab('tasks')">✅ Tareas</button>
      <button class="tab" data-dtab="notes" onclick="switchDetailTab('notes')">📝 Notas Vinculadas</button>
      <button class="tab" data-dtab="members" onclick="switchDetailTab('members')">👥 Miembros (${(project.members || []).length})</button>
    </div>


    <div id="proj-detail-content"></div>

    <!-- Add Task Modal -->
    <div class="modal-overlay" id="proj-task-modal" style="display:none">
      <div class="modal-box">
        <div class="modal-header">
          <h2>✏️ Nueva tarea del proyecto</h2>
          <button class="btn-icon" onclick="closeProjTaskModal()">✕</button>
        </div>
        <form id="proj-task-form">
          <div class="form-group">
            <label class="form-label">Título *</label>
            <input class="form-input" type="text" id="proj-task-title" placeholder="Nombre de la tarea" required />
          </div>
          <div class="form-group">
            <label class="form-label">Dificultad</label>
            <div style="display:flex;gap:var(--space-2)">
              <button type="button" class="diff-btn easy selected" data-pdiff="easy">🟢 Fácil</button>
              <button type="button" class="diff-btn normal" data-pdiff="normal">🟡 Normal</button>
              <button type="button" class="diff-btn hard" data-pdiff="hard">🔴 Difícil</button>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-ghost" onclick="closeProjTaskModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary">Agregar</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit Project Modal -->
    <div class="modal-overlay" id="edit-proj-modal" style="display:none">
      <div class="modal-box">
        <div class="modal-header">
          <h2>✏️ Editar Proyecto</h2>
          <button class="btn-icon" onclick="closeEditModal()">✕</button>
        </div>
        <form id="edit-proj-form">
          <div class="form-group">
            <label class="form-label">Nombre</label>
            <input class="form-input" id="edit-proj-name" value="${esc(project.name)}" />
          </div>
          <div class="form-group">
            <label class="form-label">Descripción</label>
            <textarea class="form-input" id="edit-proj-desc" rows="2">${esc(project.description || '')}</textarea>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-ghost" onclick="closeEditModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  `;

  initDetailPage(projectId);
}

function initDetailPage(projectId) {
  // Load tasks
  const unsub1 = listenProjectTasks(projectId, (t) => {
    projectTasks = t;
    if (detailTab === 'tasks') renderDetailContent();
  });
  if (state.listeners) state.listeners.push(unsub1);

  // Load shared project notes
  const unsub2 = listenProjectNotes(projectId, (notes) => {
    projectNotes = notes;
    if (detailTab === 'notes') renderDetailContent();
  });
  if (state.listeners) state.listeners.push(unsub2);

  // Load real-time friends
  const unsubFriends = listenFriends(state.user.uid, (f) => {
    friendsList = f;
    // Also sync to state for other components
    if (state.profile) state.profile.friends = f;
    if (detailTab === 'members') renderDetailContent();
  });
  if (state.listeners) state.listeners.push(unsubFriends);




  // Diff buttons
  document.querySelectorAll('[data-pdiff]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-pdiff]').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedDiff = btn.dataset.pdiff;
    });
  });

  // Task form
  document.getElementById('proj-task-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('proj-task-title').value.trim();
    if (!title || !state.user?.uid) return;
    try {
      await addProjectTask(state.user.uid, projectId, { title, difficulty: selectedDiff });
      showToast('✅ Tarea añadida', 'success');
      closeProjTaskModal();
      document.getElementById('proj-task-form').reset();
    } catch { showToast('Error al añadir tarea', 'error'); }
  });

  // Edit project form
  document.getElementById('edit-proj-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('edit-proj-name').value.trim();
    const desc = document.getElementById('edit-proj-desc').value.trim();
    if (!name) return;
    try {
      await updateProject(projectId, { name, description: desc });
      // Update header
      document.querySelector('.proj-header h1').textContent = name;
      showToast('✏️ Proyecto actualizado', 'success');
      closeEditModal();
    } catch { showToast('Error al actualizar', 'error'); }
  });

  // Tab handlers
  window.switchDetailTab = (tab) => {
    detailTab = tab;
    document.querySelectorAll('[data-dtab]').forEach(t => t.classList.toggle('active', t.dataset.dtab === tab));
    renderDetailContent();
  };

  window.openProjTaskModal = () => document.getElementById('proj-task-modal').style.display = 'flex';
  window.closeProjTaskModal = () => document.getElementById('proj-task-modal').style.display = 'none';
  window.openEditProjectModal = () => document.getElementById('edit-proj-modal').style.display = 'flex';
  window.closeEditModal = () => document.getElementById('edit-proj-modal').style.display = 'none';

  window.toggleProjTask = async (taskId, done) => {
    try {
      const task = projectTasks.find(t => t.id === taskId);
      if (done) {
        await updateTask(state.user.uid, taskId, {
          completed: false,
          completedAt: null
        }, projectId);
      } else {
        await completeTask(state.user.uid, taskId, task?.difficulty || 'normal', projectId);
        celebrate(window.innerWidth / 2, window.innerHeight / 2, 'stars');
        setCatState('celebrating');
        showToast('¡Tarea completada! ⭐', 'success');
      }
    } catch (err) {
      console.error('[ProjectDetail] toggle error:', err);
      showToast('Error', 'error');
    }
  };


  window.deleteProjTask = async (taskId) => {
    if (!confirm('¿Eliminar tarea?')) return;
    try {
      await deleteTask(state.user.uid, taskId, projectId);
      showToast('🗑️ Eliminada', 'info');
    } catch (err) {
      console.error('[ProjectDetail] delete error:', err);
      showToast('Error', 'error');
    }
  };


  window.addMemberToProject = async () => {
    const sel = document.getElementById('add-member-select');
    const uid = sel?.value;
    if (!uid) { showToast('Selecciona un amigo', 'warning'); return; }
    const members = project.members || [];
    if (members.includes(uid)) { showToast('Ya es miembro del proyecto', 'info'); return; }
    try {
      await addProjectMember(projectId, uid);
      // Update local project state immediately
      project.members = [...members, uid];
      // Update the tab badge count
      const tabBtn = document.querySelector('[data-dtab="members"]');
      if (tabBtn) tabBtn.textContent = `👥 Miembros (${project.members.length})`;
      const content = document.getElementById('proj-detail-content');
      if (content) renderMembersTab(content);
      showToast('👥 Amigo añadido al proyecto', 'success');
    } catch (err) {
      console.error('[KittyTasks] addMember error:', err);
      showToast('Error al añadir miembro', 'error');
    }
  };

  window.removeMemberFromProject = async (uid) => {
    if (!confirm('¿Eliminar este miembro del proyecto?')) return;
    try {
      await removeProjectMember(projectId, uid);
      project.members = (project.members || []).filter(m => m !== uid);
      const tabBtn = document.querySelector('[data-dtab="members"]');
      if (tabBtn) tabBtn.textContent = `👥 Miembros (${project.members.length})`;
      const content = document.getElementById('proj-detail-content');
      if (content) renderMembersTab(content);
      showToast('Miembro eliminado del proyecto', 'info');
    } catch (err) {
      showToast('Error al eliminar miembro', 'error');
    }
  };

  window.deleteProjNote = async (noteId) => {
    if (!confirm('¿Eliminar esta nota compartida?')) return;
    try {
      await deleteProjectNote(projectId, noteId);
      showToast('🗑️ Nota eliminada', 'info');
    } catch { showToast('Error', 'error'); }
  };


  renderDetailContent();
}


function renderDetailContent() {
  const content = document.getElementById('proj-detail-content');
  if (!content) return;
  if (detailTab === 'tasks') content.innerHTML = renderTasksTab();
  else if (detailTab === 'notes') content.innerHTML = renderNotesTab();
  else if (detailTab === 'members') renderMembersTab(content);
}

async function renderMembersTab(content) {
  const members = project.members || [];
  const friends = friendsList || [];

  const isOwner = state.user?.uid === project.ownerUid;

  // Fetch display names for all members
  const memberProfiles = await Promise.all(
    members.map(uid => getUserProfile(uid).catch(() => ({ id: uid, displayName: null, email: null })))
  );

  // Friends not yet in project
  const availableFriends = friends.filter(uid => !members.includes(uid));
  const friendProfiles = await Promise.all(
    availableFriends.map(uid => getUserProfile(uid).catch(() => ({ id: uid, displayName: null, email: uid })))
  );

  content.innerHTML = `
    <div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-4)">
        <div style="font-weight:700">👥 Miembros del proyecto (${members.length})</div>
        ${isOwner && availableFriends.length ? `
          <div style="display:flex;gap:var(--space-2);align-items:center">
            <select class="form-input" id="add-member-select" style="max-width:200px;padding:6px 10px">
              <option value="">— Añadir amigo —</option>
              ${friendProfiles.map(fp => `
                <option value="${fp.id}">${fp.displayName || fp.email || fp.id.substring(0, 12)}</option>
              `).join('')}
            </select>
            <button class="btn btn-primary btn-sm" onclick="addMemberToProject()">+ Añadir</button>
          </div>
        ` : isOwner ? '<p class="text-muted" style="font-size:var(--text-sm)">Añade amigos para invitarlos</p>' : ''}
      </div>

      ${!members.length ? `
        <div class="empty-state">
          <div style="font-size:48px">👥</div>
          <h3>Solo tú en este proyecto</h3>
          <p>Añade amigos aceptados para colaborar</p>
        </div>
      ` : `
        <div style="display:flex;flex-direction:column;gap:var(--space-2)">
          ${memberProfiles.map((mp, i) => {
    const uid = members[i];
    const name = mp?.displayName || mp?.email || uid?.substring(0, 14);
    const initial = name?.charAt(0)?.toUpperCase() || '?';
    const isProjectOwner = uid === project.ownerUid;
    return `
              <div style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3) var(--space-4);background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-lg)">
                <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent-dark));color:white;display:flex;align-items:center;justify-content:center;font-weight:700">${initial}</div>
                <div style="flex:1">
                  <div style="font-weight:600">${name}</div>
                  <div style="font-size:var(--text-xs);color:var(--text-muted)">${isProjectOwner ? '👑 Propietario' : '🧳 Miembro'}</div>
                </div>
                ${isOwner && !isProjectOwner ? `
                  <button class="btn-icon" style="color:var(--danger)" onclick="removeMemberFromProject('${uid}')" title="Eliminar miembro">✖️</button>
                ` : ''}
              </div>`;
  }).join('')}
        </div>
      `}
    </div>
  `;
}



function renderTasksTab() {
  const pending = projectTasks.filter(t => !t.completed);
  const done = projectTasks.filter(t => t.completed);
  const renderTask = (t) => `
    <div class="task-item ${t.completed ? 'done' : ''}">
      <button class="check-circle ${t.completed ? 'checked' : ''}" onclick="toggleProjTask('${t.id}', ${t.completed})">${t.completed ? '✓' : ''}</button>
      <div style="flex:1">
        <div style="font-weight:600;${t.completed ? 'text-decoration:line-through;color:var(--text-muted)' : ''}">${esc(t.title)}</div>
        ${t.difficulty ? `<span class="diff-badge ${t.difficulty}">${t.difficulty === 'easy' ? '🟢 Fácil' : t.difficulty === 'hard' ? '🔴 Difícil' : '🟡 Normal'}</span>` : ''}
      </div>
      <button class="btn-icon" style="opacity:0.5" onclick="deleteProjTask('${t.id}')">🗑️</button>
    </div>`;

  return `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-4)">
      <span style="font-weight:700">${projectTasks.length} tareas · ${done.length} completadas</span>
      <button class="btn btn-primary btn-sm" onclick="openProjTaskModal()">+ Tarea</button>
    </div>
    <div class="task-list">
      ${pending.length ? pending.map(renderTask).join('') : '<p class="text-muted">Sin tareas pendientes 🎉</p>'}
      ${done.length ? `<div style="margin-top:var(--space-4);font-size:var(--text-xs);font-weight:700;color:var(--text-muted);margin-bottom:var(--space-2)">COMPLETADAS</div>${done.map(renderTask).join('')}` : ''}
    </div>`;
}

function renderNotesTab() {
  if (!projectNotes.length) return `
    <div class="empty-state">
      <div style="font-size:52px">📝</div>
      <h3>Sin notas vinculadas</h3>
      <p>Ve a <a href="#" onclick="navigate('/notes');return false" style="color:var(--accent)">Notas</a> y selecciona este proyecto al crear una nota.</p>
    </div>`;

  return `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-4)">
      <div style="font-weight:700">${projectNotes.length} nota${projectNotes.length !== 1 ? 's' : ''} compartida${projectNotes.length !== 1 ? 's' : ''}</div>
      <button class="btn btn-primary btn-sm" onclick="navigate('/notes')">+ Nueva Nota</button>
    </div>
    <div class="note-cards-grid">
      ${projectNotes.map(n => `
        <div class="note-card-sm" style="border-left-color:${n.color || 'var(--accent)'}; position:relative;">
          <button class="btn-icon" style="position:absolute; top:8px; right:8px; opacity:0; transition:opacity 0.2s;" onclick="deleteProjNote('${n.id}')">✕</button>
          <div style="font-weight:700;margin-bottom:4px">${esc(n.title)}</div>
          <div style="font-size:var(--text-sm);color:var(--text-muted);display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">${esc(n.content || '')}</div>
          ${n.tags?.length ? `<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:var(--space-2)">${n.tags.map(t => `<span style="font-size:10px;background:rgba(124,111,247,0.12);color:var(--accent);padding:1px 6px;border-radius:var(--radius-full)">#${esc(t)}</span>`).join('')}</div>` : ''}
        </div>`).join('')}
    </div>
    <style> .note-card-sm:hover .btn-icon { opacity:1 !important; } </style>
    `;

}

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
