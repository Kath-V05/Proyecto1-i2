// =============================================
// Notes Page — KittyTasks
// Create, edit, delete notes with project/task linking
// Cache-burst: v1.0.4 - fix-stability-and-friends
// =============================================
import { state } from '../../main.js';
import {
  listenNotes, addNote, updateNote, deleteNote, listenProjects,
  listenProjectNotes, addProjectNote, updateProjectNote, deleteProjectNote,
  listenFriends
} from '../../firebase/firestore.js';

import { showToast } from '../../components/Toast.js';


let notes = [];
let projects = [];
let friendsList = []; // Real-time friends UIDs
const NOTE_COLORS = ['#fef3c7', '#ddd6fe', '#bbf7d0', '#fce7f3', '#bfdbfe', '#fed7aa', '#f1f5f9'];

export function renderNotes(container) {
  const root = container || document.getElementById('page-content');
  if (!root) return;

  root.innerHTML = `
    <style>
      .notes-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:var(--space-6); flex-wrap:wrap; gap:var(--space-3); }
      .notes-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(240px, 1fr)); gap:var(--space-4); }

      .note-card { border-radius:var(--radius-xl); padding:var(--space-5); box-shadow:var(--shadow-card); cursor:default; transition:all var(--transition-base); animation:slideUp 0.3s ease; position:relative; border:1px solid rgba(0,0,0,0.06); min-height:140px; }
      .note-card:hover { transform:translateY(-4px) rotate(-0.5deg); box-shadow:var(--shadow-lg); }
      [data-theme="dark"] .note-card { filter:brightness(0.75); }
      [data-theme="dark"] .note-card:hover { filter:brightness(0.85); }

      .note-title { font-size:var(--text-base); font-weight:700; margin-bottom:var(--space-2); color:#1a1830; }
      .note-content { font-size:var(--text-sm); color:#4a4669; line-height:1.5; margin-bottom:var(--space-3); display:-webkit-box; -webkit-line-clamp:4; -webkit-box-orient:vertical; overflow:hidden; }
      .note-tags { display:flex; flex-wrap:wrap; gap:var(--space-1); margin-bottom:var(--space-2); }
      .note-tag { padding:2px 8px; border-radius:var(--radius-full); background:rgba(124,111,247,0.15); color:#7c6ff7; font-size:10px; font-weight:600; }
      .note-proj-badge { padding:2px 8px; border-radius:var(--radius-full); font-size:10px; font-weight:700; background:rgba(0,0,0,0.07); color:#4a4669; margin-bottom:var(--space-2); display:inline-flex; align-items:center; gap:4px; }
      .note-footer { display:flex; align-items:center; justify-content:space-between; }
      .note-score { font-size:var(--text-xs); font-weight:600; color:#9990c8; }
      .note-actions { display:flex; gap:4px; opacity:0; transition:opacity var(--transition-fast); }
      .note-card:hover .note-actions { opacity:1; }
      .note-btn { background:rgba(0,0,0,0.08); border:none; border-radius:var(--radius-sm); padding:4px 8px; cursor:pointer; font-size:12px; }
      .note-btn:hover { background:rgba(0,0,0,0.16); }
      .note-color-row { display:flex; gap:var(--space-2); flex-wrap:wrap; margin-bottom:var(--space-2); }
      .note-color-dot { width:24px; height:24px; border-radius:50%; cursor:pointer; border:3px solid transparent; transition:border-color var(--transition-fast); }
      .note-color-dot.selected { border-color:#1a1830; }
    </style>

    <div class="notes-header">
      <div>
        <h1 style="font-size:var(--text-3xl); font-weight:800;">📝 Mis Notas</h1>
        <p class="text-muted">Ideas, apuntes y más</p>
      </div>
      <button class="btn btn-primary" onclick="openNoteModal()">+ Nueva Nota</button>
    </div>

    <div class="notes-grid" id="notes-grid">
      <div class="loading-center"><div class="spinner"></div></div>
    </div>

    <!-- Note Modal -->
    <div class="modal-overlay" id="note-modal" style="display:none">
      <div class="modal-box">
        <div class="modal-header">
          <h2 id="note-modal-title">📝 Nueva Nota</h2>
          <button class="btn-icon" onclick="closeNoteModal()">✕</button>
        </div>
        <form id="note-form">
          <div class="form-group">
            <label class="form-label">Título *</label>
            <input class="form-input" type="text" id="note-title-input" placeholder="Título de la nota" required />
          </div>
          <div class="form-group">
            <label class="form-label">Contenido</label>
            <textarea class="form-input" id="note-content-input" rows="4" placeholder="Escribe aquí..."></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Etiquetas (separadas por coma)</label>
            <input class="form-input" type="text" id="note-tags-input" placeholder="trabajo, ideas, importante" />
          </div>
          <div class="form-group">
            <label class="form-label">Proyecto (opcional)</label>
            <select class="form-input" id="note-project-select">
              <option value="">— Sin proyecto —</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Color</label>
            <div class="note-color-row" id="note-color-row">
              ${NOTE_COLORS.map((c, i) =>
    `<div class="note-color-dot ${i === 0 ? 'selected' : ''}" style="background:${c}" data-color="${c}" onclick="selectNoteColor('${c}', this)"></div>`
  ).join('')}
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-ghost" onclick="closeNoteModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary" id="note-submit-btn">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  `;

  initNotes();

  let selectedNoteColor = NOTE_COLORS[0];
  let editingNoteId = null;
  let originalProjectId = null; // Important to avoid 'No document to update'

  window.openNoteModal = (id) => {
    editingNoteId = id || null;
    const modal = document.getElementById('note-modal');
    const titleEl = document.getElementById('note-modal-title');
    if (id) {
      const note = notes.find(n => n.id === id);
      if (note) {
        originalProjectId = note.projectId || null;
        titleEl.textContent = '✏️ Editar Nota';
        document.getElementById('note-title-input').value = note.title;
        document.getElementById('note-content-input').value = note.content || '';
        document.getElementById('note-tags-input').value = (note.tags || []).join(', ');
        const projSel = document.getElementById('note-project-select');
        if (projSel) projSel.value = note.projectId || '';
        selectedNoteColor = note.color || NOTE_COLORS[0];
        document.querySelectorAll('.note-color-dot').forEach(d => {
          d.classList.toggle('selected', d.dataset.color === selectedNoteColor);
        });
      }
    } else {
      originalProjectId = null;
      titleEl.textContent = '📝 Nueva Nota';
      document.getElementById('note-form').reset();
      selectedNoteColor = NOTE_COLORS[0];
      document.querySelectorAll('.note-color-dot').forEach((d, i) => d.classList.toggle('selected', i === 0));
    }
    modal.style.display = 'flex';
  };

  window.closeNoteModal = () => document.getElementById('note-modal').style.display = 'none';
  window.selectNoteColor = (color, el) => {
    selectedNoteColor = color;
    document.querySelectorAll('.note-color-dot').forEach(d => d.classList.remove('selected'));
    el.classList.add('selected');
  };
  window.deleteNoteById = async (id) => {
    if (!confirm('¿Eliminar esta nota?')) return;
    const note = notes.find(n => n.id === id);
    if (!note) return;

    try {
      if (note.projectId) {
        await deleteProjectNote(note.projectId, id);
      } else {
        await deleteNote(state.user.uid, id);
      }
      showToast('🗑️ Nota eliminada', 'info');
    } catch (err) {
      console.error('[KittyTasks] deleteNote error:', err);
      showToast('Error al eliminar', 'error');
    }
  };


  document.getElementById('note-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const uid = state.user?.uid;
    const title = document.getElementById('note-title-input').value.trim();
    if (!title || !uid) return;

    const btn = document.getElementById('note-submit-btn');
    if (btn) btn.disabled = true;

    try {
      const tags = document.getElementById('note-tags-input').value
        .split(',').map(t => t.trim()).filter(Boolean);

      const noteData = {
        title,
        content: document.getElementById('note-content-input').value.trim(),
        tags,
        color: selectedNoteColor,
        projectId: document.getElementById('note-project-select').value || null,
      };

      if (editingNoteId) {
        // Migration logic: compare with originalProjectId
        if (originalProjectId !== noteData.projectId) {
          // DELETE from old
          if (originalProjectId) {
            await deleteProjectNote(originalProjectId, editingNoteId);
          } else {
            await deleteNote(uid, editingNoteId);
          }
          // ADD to new (new ID generated)
          if (noteData.projectId) {
            await addProjectNote(uid, noteData.projectId, noteData);
          } else {
            await addNote(uid, noteData);
          }
        } else {
          // UPDATE in place
          if (noteData.projectId) {
            await updateProjectNote(noteData.projectId, editingNoteId, noteData);
          } else {
            await updateNote(uid, editingNoteId, noteData);
          }
        }
        showToast('✏️ Nota actualizada', 'success');
        editingNoteId = null;
      } else {
        if (noteData.projectId) {
          await addProjectNote(uid, noteData.projectId, noteData);
        } else {
          await addNote(uid, noteData);
        }
        showToast('📝 Nota guardada', 'success');
      }
      window.closeNoteModal();
    } catch (err) {
      console.error('[KittyTasks] saveNote error:', err);
      if (err.message.includes('No document to update')) {
        showToast('Error: La nota ya no existe en la ubicación original. Intenta guardarla como nueva.', 'error');
      } else {
        showToast('Error al guardar la nota. Revisa tu conexión.', 'error');
      }
    } finally {
      if (btn) btn.disabled = false;
    }
  });
}

function initNotes() {
  const uid = state.user?.uid;
  if (!uid) return;

  // Track aggregated notes and listeners
  let allNotes = { private: [], projects: {} };
  let projectListeners = {};

  const mergeAndRender = () => {
    const flatProjects = Object.values(allNotes.projects).flat();
    const combined = [...allNotes.private, ...flatProjects];
    notes = combined.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    renderNotesGrid();
  };

  // Real-time friend listener (ensures project members are synced)
  const unsubFriends = listenFriends(uid, (f) => {
    friendsList = f;
    // Potentially refresh projects list to ensure memberships are correct
  });
  if (state.listeners) state.listeners.push(unsubFriends);


  // Real-time listener for projects list
  const unsubProjects = listenProjects(uid, (pList) => {
    projects = pList;
    const sel = document.getElementById('note-project-select');
    if (sel) {
      const currentVal = sel.value;
      sel.innerHTML = '<option value="">— Sin proyecto —</option>' +
        pList.map(proj => `<option value="${proj.id}">${proj.name}</option>`).join('');
      sel.value = currentVal;
    }

    const activeProjectIds = pList.map(p => p.id);
    Object.keys(projectListeners).forEach(pid => {
      if (!activeProjectIds.includes(pid)) {
        projectListeners[pid]();
        delete projectListeners[pid];
        delete allNotes.projects[pid];
      }
    });

    pList.forEach(proj => {
      if (!projectListeners[proj.id]) {
        projectListeners[proj.id] = listenProjectNotes(proj.id, (pNotes) => {
          allNotes.projects[proj.id] = pNotes;
          mergeAndRender();
        });
      }
    });
    mergeAndRender();
  });
  if (state.listeners) state.listeners.push(unsubProjects);

  // Private notes listener
  const unsubNotes = listenNotes(uid, (privateNotes) => {
    allNotes.private = privateNotes;
    mergeAndRender();
  });
  if (state.listeners) state.listeners.push(unsubNotes);

  if (state.listeners) {
    state.listeners.push(() => {
      Object.values(projectListeners).forEach(un => un());
    });
  }
}

function renderNotesGrid() {
  const grid = document.getElementById('notes-grid');
  if (!grid) return;

  if (!notes.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div style="font-size:64px">📝</div>
      <h3>¡Sin notas aún!</h3>
      <p>Crea tu primera nota para guardar ideas importantes.</p>
    </div>`;
    return;
  }

  grid.innerHTML = notes.map(n => {
    const proj = n.projectId ? projects.find(p => p.id === n.projectId) : null;
    const projBadge = proj
      ? `<div class="note-proj-badge" style="border-left:3px solid ${proj.color || 'var(--accent)'}">📁 ${escapeHtml(proj.name)}</div>`
      : '';
    return `
    <div class="note-card" style="background:${n.color || '#fef3c7'}">
      <div class="note-title">${escapeHtml(n.title)}</div>
      <div class="note-content">${escapeHtml(n.content || '')}</div>
      ${n.tags?.length ? `<div class="note-tags">${n.tags.map(t => `<span class="note-tag">#${escapeHtml(t)}</span>`).join('')}</div>` : ''}
      ${projBadge}
      <div class="note-footer">
        <span class="note-score">⚡ ${n.utilityScore || 0} pts útil</span>
        <div class="note-actions">
          <button class="note-btn" onclick="openNoteModal('${n.id}')">✏️</button>
          <button class="note-btn" onclick="deleteNoteById('${n.id}')">🗑️</button>
        </div>
      </div>
    </div>
  `;
  }).join('');
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
