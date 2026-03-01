// =============================================
// Profile Page — KittyTasks
// Stats, Cat Customization, Friends
// =============================================
import { state, computeLevel, getXpProgress } from '../../main.js';
import {
  db, updateUserProfile, sendFriendRequest, listenFriendRequests,
  respondFriendRequest, getUserProfile, getFriends, listenUserProfile,
  listenFriends
} from '../../firebase/firestore.js';


import {
  collection, query, where, onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

import { showToast } from '../../components/Toast.js';
import { setCatSkin } from '../../components/Cat/Cat.js';
import { celebrate } from '../../components/Particles.js';



const BADGES = [
  { id: 'first_task', icon: '🌟', name: 'Primera tarea', desc: 'Completa tu primera tarea' },
  { id: 'streak_3', icon: '🔥', name: 'En racha', desc: '3 días seguidos' },
  { id: 'streak_7', icon: '💫', name: 'Semana perfecta', desc: '7 días seguidos' },
  { id: 'hard_5', icon: '💪', name: 'Guerrero', desc: 'Completa 5 tareas difíciles' },
  { id: 'level_5', icon: '🏅', name: 'Nivel 5', desc: 'Alcanza el nivel 5' },
  { id: 'level_10', icon: '👑', name: 'Maestro', desc: 'Alcanza el nivel 10' },
  { id: 'notes_10', icon: '📝', name: 'Escritor', desc: 'Crea 10 notas' },
  { id: 'projects_3', icon: '📁', name: 'Organizador', desc: 'Crea 3 proyectos' },
];

const CAT_ACCESSORIES = [
  { id: 'none', icon: '🐱', name: 'Sin accesorio', cost: 0, free: true },
  { id: 'bow', icon: '🎀', name: 'Moño rosa', cost: 50 },
  { id: 'hat', icon: '🎩', name: 'Sombrero mágico', cost: 100 },
  { id: 'glasses', icon: '🕶️', name: 'Lentes cool', cost: 75 },
  { id: 'crown', icon: '👑', name: 'Corona real', cost: 200 },
];

const CAT_SKINS_CATALOG = [
  { id: 'default', name: 'Gatito morado', emoji: '💜', unlock: 'Siempre disponible', free: true },
  { id: 'orange', name: 'Gato naranja', emoji: '🧡', unlock: 'Nivel 3' },
  { id: 'black', name: 'Gato negro', emoji: '🖤', unlock: '10 tareas difíciles' },
  { id: 'galaxy', name: 'Gato galaxia', emoji: '🌌', unlock: 'Nivel 7' },
  { id: 'ghost', name: 'Gato fantasma', emoji: '👻', unlock: 'Racha de 7 días' },
  { id: 'robot', name: 'Gato robot', emoji: '🤖', unlock: 'Nivel 10' },
];


let profileTab = 'stats';

export function renderProfile(container) {
  const root = container || document.getElementById('page-content');
  if (!root) return;

  const profile = state.profile || {};
  const user = state.user || {};
  const level = computeLevel(profile.xp || 0);
  const xpPct = getXpProgress(profile.xp || 0);
  const initial = (profile.displayName || user.email || 'U').charAt(0).toUpperCase();

  root.innerHTML = `
    <style>
      .profile-header-card {
        background:linear-gradient(135deg, var(--accent), var(--accent-dark));
        border-radius:var(--radius-xl);
        padding:var(--space-8) var(--space-6);
        color:white;
        display:flex;
        align-items:center;
        gap:var(--space-6);
        margin-bottom:var(--space-6);
        box-shadow:0 8px 32px var(--accent-glow);
        flex-wrap:wrap;
      }
      .profile-avatar-lg {
        width:72px; height:72px;
        border-radius:50%;
        background:rgba(255,255,255,0.2);
        color:white;
        font-size:var(--text-3xl);
        font-weight:800;
        display:flex;
        align-items:center;
        justify-content:center;
        border:3px solid rgba(255,255,255,0.4);
        flex-shrink:0;
      }
      .profile-info { flex:1; }
      .profile-name { font-size:var(--text-2xl); font-weight:800; margin-bottom:4px; }
      .profile-email { font-size:var(--text-sm); opacity:0.8; margin-bottom:var(--space-3); }
      .xp-bar { height:8px; background:rgba(255,255,255,0.2); border-radius:var(--radius-full); overflow:hidden; }
      .xp-fill { height:100%; background:rgba(255,255,255,0.8); border-radius:var(--radius-full); transition:width 1s ease; }
      .xp-row { display:flex; justify-content:space-between; font-size:var(--text-xs); opacity:0.8; margin-bottom:4px; }

      .profile-stats-row {
        display:grid;
        grid-template-columns:repeat(4,1fr);
        gap:var(--space-4);
        margin-bottom:var(--space-6);
      }
      @media (max-width:640px) { .profile-stats-row { grid-template-columns:repeat(2,1fr); } }

      .profile-stat-card {
        background:var(--bg-card);
        border:1px solid var(--border-color);
        border-radius:var(--radius-lg);
        padding:var(--space-4);
        text-align:center;
        box-shadow:var(--shadow-card);
      }
      .profile-stat-card .icon { font-size:24px; margin-bottom:4px; }
      .profile-stat-card .val { font-size:var(--text-xl); font-weight:800; color:var(--accent); font-family:var(--font-display); }
      .profile-stat-card .lbl { font-size:var(--text-xs); color:var(--text-muted); }

      .badges-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(130px,1fr)); gap:var(--space-3); }
      .badge-card {
        background:var(--bg-card);
        border:1px solid var(--border-color);
        border-radius:var(--radius-lg);
        padding:var(--space-4);
        text-align:center;
        box-shadow:var(--shadow-card);
        transition:all var(--transition-base);
      }
      .badge-card.earned { border-color:var(--accent); background:var(--accent-glow); }
      .badge-card:hover { transform:translateY(-2px); }
      .badge-icon { font-size:32px; margin-bottom:var(--space-2); }
      .badge-name { font-size:var(--text-xs); font-weight:700; }
      .badge-desc { font-size:10px; color:var(--text-muted); }
      .badge-card:not(.earned) { opacity:0.4; filter:grayscale(1); }

      .store-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(140px,1fr)); gap:var(--space-3); }
      .store-item {
        background:var(--bg-card);
        border:2px solid var(--border-color);
        border-radius:var(--radius-lg);
        padding:var(--space-4);
        text-align:center;
        cursor:pointer;
        transition:all var(--transition-base);
        box-shadow:var(--shadow-card);
      }
      .store-item:hover { border-color:var(--accent); transform:translateY(-2px); }
      .store-item.owned { border-color:var(--success); background:rgba(74,222,128,0.07); }
      .store-item.equipped { border-color:var(--accent); background:var(--accent-glow); }
      .store-icon { font-size:36px; margin-bottom:var(--space-2); }
      .store-name { font-size:var(--text-sm); font-weight:700; margin-bottom:4px; }
      .store-cost { font-size:var(--text-xs); color:var(--text-muted); }

      .friends-list { display:flex; flex-direction:column; gap:var(--space-3); }
      .friend-card {
        background:var(--bg-card);
        border:1px solid var(--border-color);
        border-radius:var(--radius-lg);
        padding:var(--space-4) var(--space-5);
        display:flex;
        align-items:center;
        gap:var(--space-3);
        box-shadow:var(--shadow-card);
      }
      .friend-req-card {
        background:rgba(124,111,247,0.06);
        border:1.5px solid var(--accent);
      }
    </style>

    <!-- Profile Header -->
    <div class="profile-header-card">
      <div class="profile-avatar-lg">${initial}</div>
      <div class="profile-info">
        <div class="profile-name">${profile.displayName || 'Usuario'}</div>
        <div class="profile-email">${user.email || ''}</div>
        <div class="xp-row">
          <span>Nivel ${level}</span>
          <span>${profile.xp || 0} XP</span>
        </div>
        <div class="xp-bar"><div class="xp-fill" style="width:${xpPct}%"></div></div>
      </div>
      <div style="text-align:right; flex-shrink:0;">
        <div style="font-size:32px; font-weight:800;">🏅 Lv ${level}</div>
        <div style="font-size:var(--text-sm); opacity:0.8;">🔥 ${profile.streak || 0} días</div>
      </div>
    </div>

    <!-- Profile Stats Row -->
    <div class="profile-stats-row" id="profile-stats-row">
      <div class="profile-stat-card"><div class="icon">⭐</div><div class="val" id="stat-points">${profile.points || 0}</div><div class="lbl">Puntos totales</div></div>
      <div class="profile-stat-card"><div class="icon">🔥</div><div class="val" id="stat-streak">${profile.streak || 0}</div><div class="lbl">Racha actual</div></div>
      <div class="profile-stat-card"><div class="icon">🏆</div><div class="val" id="stat-badges">${(profile.badges || []).length}</div><div class="lbl">Logros</div></div>
      <div class="profile-stat-card"><div class="icon">👥</div><div class="val" id="stat-friends">${(profile.friends || []).length}</div><div class="lbl">Amigos</div></div>
    </div>


    <!-- Tabs -->
    <div class="tabs" style="margin-bottom:var(--space-5)">
      <button class="tab active" data-ptab="stats" onclick="switchProfileTab('stats')">📊 Estadísticas</button>
      <button class="tab" data-ptab="badges" onclick="switchProfileTab('badges')">🏆 Logros</button>
      <button class="tab" data-ptab="store" onclick="switchProfileTab('store')">🛒 Tienda</button>
      <button class="tab" data-ptab="friends" onclick="switchProfileTab('friends')">👥 Amigos</button>
    </div>

    <!-- Tab Content -->
    <div id="profile-tab-content">
      ${renderStatsTab(profile)}
    </div>
  `;

  window.switchProfileTab = async (tab) => {
    const tabs = document.querySelectorAll('.profile-container .tab');
    const content = document.getElementById('profile-tab-content');
    if (!content) return;

    tabs.forEach(t => t.classList.toggle('active', t.dataset.ptab === tab));

    if (tab === 'stats') content.innerHTML = renderStatsTab(state.profile || {});
    else if (tab === 'badges') content.innerHTML = renderBadgesTab(state.profile || {});
    else if (tab === 'store') { content.innerHTML = renderStoreTab(state.profile || {}); initStoreHandlers(); initSkinHandlers(); }
    else if (tab === 'friends') {
      content.innerHTML = renderFriendsTab(state.profile || {});
      initFriendsHandlers();
    }

  };
}

function renderStatsTab(profile) {
  const hasData = profile.points > 0;
  return `
    <div class="card">
      <h3 style="margin-bottom:var(--space-4)">📊 Tu productividad</h3>
      ${!hasData ? `<div class="empty-state"><div style="font-size:48px">📊</div><h3>¡Aún no hay datos!</h3><p>Completa tareas para ver tus estadísticas.</p></div>` : `
        <div class="grid-2" style="gap:var(--space-5)">
          <div>
            <div class="text-muted" style="margin-bottom:var(--space-2)">Distribución de dificultad</div>
            <div style="display:flex; flex-direction:column; gap:var(--space-2)">
              <div>
                <div style="display:flex;justify-content:space-between;font-size:var(--text-sm);margin-bottom:4px"><span>🟢 Fácil</span><span>+10pts</span></div>
                <div class="progress-bar"><div class="progress-fill" style="width:60%;background:linear-gradient(90deg,var(--easy),#22c55e)"></div></div>
              </div>
              <div>
                <div style="display:flex;justify-content:space-between;font-size:var(--text-sm);margin-bottom:4px"><span>🟡 Normal</span><span>+25pts</span></div>
                <div class="progress-bar"><div class="progress-fill" style="width:30%;background:linear-gradient(90deg,var(--warning),#d97706)"></div></div>
              </div>
              <div>
                <div style="display:flex;justify-content:space-between;font-size:var(--text-sm);margin-bottom:4px"><span>🔴 Difícil</span><span>+50pts</span></div>
                <div class="progress-bar"><div class="progress-fill" style="width:10%;background:linear-gradient(90deg,var(--danger),#dc2626)"></div></div>
              </div>
            </div>
          </div>
          <div>
            <div class="text-muted" style="margin-bottom:var(--space-2)">Nivel de progreso</div>
            <div style="font-size:var(--text-4xl); font-weight:800; color:var(--accent); font-family:var(--font-display)">
              Lv ${computeLevel(profile.xp || 0)}
            </div>
            <div style="font-size:var(--text-sm); color:var(--text-muted); margin-top:var(--space-2)">${profile.xp || 0} XP acumulados</div>
            <div class="progress-bar" style="margin-top:var(--space-3)">
              <div class="progress-fill" style="width:${getXpProgress(profile.xp || 0)}%"></div>
            </div>
          </div>
        </div>
      `}
    </div>
  `;
}

function renderBadgesTab(profile) {
  const earned = profile.badges || [];
  return `
    <div>
      <p class="text-muted" style="margin-bottom:var(--space-5)">Logros obtenidos: <strong>${earned.length}/${BADGES.length}</strong></p>
      <div class="badges-grid">
        ${BADGES.map(b => `
          <div class="badge-card ${earned.includes(b.id) ? 'earned' : ''}">
            <div class="badge-icon">${b.icon}</div>
            <div class="badge-name">${b.name}</div>
            <div class="badge-desc">${b.desc}</div>
            ${earned.includes(b.id) ? '<div style="font-size:10px;color:var(--accent);margin-top:4px;font-weight:700">✅ Obtenido</div>' : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderStoreTab(profile) {
  const owned = profile.catAccessories || [];
  const equipped = owned[0] || 'none';
  const points = profile.points || 0;
  const unlockedSkins = profile.unlockedSkins || ['default'];
  const equippedSkin = profile.equippedSkin || 'default';

  return `
    <div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-4);flex-wrap:wrap;gap:var(--space-3)">
        <p class="text-muted">Compra accesorios para tu gatito con tus puntos</p>
        <div style="font-weight:700;color:var(--accent)">⭐ ${points} pts disponibles</div>
      </div>
      <div class="store-grid" style="margin-bottom:var(--space-6)">
        ${CAT_ACCESSORIES.map(a => `
          <div class="store-item ${owned.includes(a.id) || a.free ? 'owned' : ''} ${equipped === a.id ? 'equipped' : ''}"
               onclick="buyAccessory('${a.id}', ${a.cost}, ${a.free || false})">
            <div class="store-icon">${a.icon}</div>
            <div class="store-name">${a.name}</div>
            <div class="store-cost">${a.free ? '¡Gratis!' : owned.includes(a.id) ? (equipped === a.id ? '✅ Equipado' : '👆 Equipar') : `⭐ ${a.cost} pts`}</div>
          </div>
        `).join('')}
      </div>

      <div style="font-size:var(--text-lg);font-weight:700;margin-bottom:var(--space-3)">🐱 Skins de Gato</div>
      <p class="text-muted" style="margin-bottom:var(--space-4)">Desbloquea nuevas apariencias completando logros y subiendo de nivel</p>
      <div class="store-grid">
        ${CAT_SKINS_CATALOG.map(s => {
    const isUnlocked = unlockedSkins.includes(s.id) || s.free;
    const isEquipped = equippedSkin === s.id;
    return `
          <div class="store-item ${isUnlocked ? 'owned' : ''} ${isEquipped ? 'equipped' : ''}"
               onclick="${isUnlocked ? `equipSkin('${s.id}')` : ''}"
               style="${!isUnlocked ? 'cursor:not-allowed;opacity:0.5;' : ''}">
            <div class="store-icon">${s.emoji}</div>
            <div class="store-name">${s.name}</div>
            <div class="store-cost">${!isUnlocked ? '🔒 ' + s.unlock : isEquipped ? '✅ Equipado' : '👆 Equipar'}</div>
          </div>`;
  }).join('')}
      </div>
    </div>
  `;
}



function renderFriendsTab(profile) {
  const friends = profile.friends || [];
  return `
    <div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-5);flex-wrap:wrap;gap:var(--space-3)">
        <p class="text-muted">Conecta con amigos y crea proyectos compartidos</p>
        <button class="btn btn-primary btn-sm" onclick="openFriendModal()">\u2795 A\u00f1adir amigo</button>
      </div>

      <!-- Received requests -->
      <div id="friend-requests-container"></div>

      <!-- Sent requests status -->
      <div id="sent-requests-container"></div>

      <!-- Friends List -->
      ${friends.length === 0 ? `
        <div class="empty-state">
          <div style="font-size:48px">\ud83d\udc65</div>
          <h3>Sin amigos a\u00fan</h3>
          <p>A\u00f1ade amigos por correo electr\u00f3nico para colaborar en proyectos</p>
        </div>
      ` : `
        <div style="font-weight:700;margin-bottom:var(--space-3)">\ud83d\udc65 Amigos (${friends.length})</div>
        <div class="friends-list" id="friends-list-container">
          ${friends.map(uid => `
            <div class="friend-card">
              <div class="avatar" style="background:linear-gradient(135deg,var(--accent),var(--accent-dark));color:white;font-weight:700">${uid.charAt(0).toUpperCase()}</div>
              <div style="flex:1">
                <div style="font-weight:600" id="friend-name-${uid}">Cargando...</div>
                <div class="text-muted" style="font-size:var(--text-xs)">\ud83d\udfe2 Amigo</div>
              </div>
            </div>
          `).join('')}
        </div>
      `}

      <!-- Add Friend Modal -->
      <div class="modal-overlay" id="friend-modal" style="display:none">
        <div class="modal-box">
          <div class="modal-header">
            <h2>\ud83d\udc65 A\u00f1adir amigo</h2>
            <button class="btn-icon" onclick="closeFriendModal()">\u2715</button>
          </div>
          <p class="text-muted" style="margin-bottom:var(--space-4)">Ingresa el correo del usuario que quieres a\u00f1adir. Deben tener una cuenta en KittyTasks.</p>
          <div class="form-group">
            <label class="form-label">Correo electr\u00f3nico</label>
            <input class="form-input" type="email" id="friend-email-input" placeholder="amigo@correo.com" />
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" onclick="closeFriendModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="sendFriendReq()">Enviar solicitud</button>
          </div>
        </div>
      </div>
    </div>
  `;
}


function initStoreHandlers() {
  window.buyAccessory = async (id, cost, free) => {
    const uid = state.user?.uid;
    if (!uid) return;
    const profile = state.profile || {};
    const owned = profile.catAccessories || [];
    const points = profile.points || 0;

    // Already owned or free → just equip
    if (owned.includes(id) || free) {
      await updateUserProfile(uid, { catAccessories: [id, ...owned.filter(a => a !== id)] });
      // Immediately update cat visual
      setCatSkin(profile.equippedSkin || 'default', id);
      celebrate(window.innerWidth - 80, window.innerHeight - 120, 'hearts');
      showToast('🐱 ¡Accesorio equipado!', 'success');
      window.switchProfileTab('store');
      return;
    }
    // Purchase
    if (points < cost) {
      showToast(`⚠️ Necesitas ${cost - points} pts más (tienes ${points})`, 'warning');
      return;
    }
    await updateUserProfile(uid, { catAccessories: [id, ...owned], points: points - cost });
    // Equip immediately
    setCatSkin(profile.equippedSkin || 'default', id);
    celebrate(window.innerWidth - 80, window.innerHeight - 120, 'confetti');
    showToast(`🛒 ¡Comprado y equipado! -${cost} pts`, 'success');
    window.switchProfileTab('store');
  };
}

function initSkinHandlers() {
  window.equipSkin = async (skinId) => {
    const uid = state.user?.uid;
    if (!uid) return;
    const unlocked = (state.profile?.unlockedSkins) || ['default'];
    if (!unlocked.includes(skinId) && skinId !== 'default') {
      showToast('🔒 Skin no desbloqueado aún', 'warning');
      return;
    }
    // Save to Firestore
    await updateUserProfile(uid, { equippedSkin: skinId });
    // Immediately update cat (get current accessory)
    const currentAccessory = state.profile?.catAccessories?.[0] || 'none';
    setCatSkin(skinId, currentAccessory);
    celebrate(window.innerWidth - 80, window.innerHeight - 120, 'hearts');
    showToast('🐱 ¡Skin equipado! Tu gatito tiene nuevo estilo ✨', 'success');
    window.switchProfileTab('store');
  };
}




function initFriendsHandlers() {
  window.openFriendModal = () => document.getElementById('friend-modal').style.display = 'flex';
  window.closeFriendModal = () => document.getElementById('friend-modal').style.display = 'none';
  window.sendFriendReq = async () => {
    const emailInput = document.getElementById('friend-email-input');
    const sendBtn = document.querySelector('#friend-modal .btn-primary');
    const email = emailInput?.value.trim();
    if (!email) { showToast('Escribe el correo de tu amigo', 'warning'); return; }
    if (!email.includes('@')) { showToast('Correo no válido', 'warning'); return; }

    // Loading state
    if (sendBtn) { sendBtn.disabled = true; sendBtn.textContent = 'Enviando...'; }
    try {
      await sendFriendRequest(state.user.uid, email);
      showToast('📨 ¡Solicitud enviada correctamente!', 'success');

      // Try to send email via EmailJS (optional — won't break if not configured)
      try {
        if (typeof emailjs !== 'undefined' && emailjs.send) {
          const senderName = state.profile?.displayName || state.user.email;
          await emailjs.send(
            'YOUR_EMAILJS_SERVICE_ID',   // Replace with EmailJS Service ID
            'YOUR_EMAILJS_TEMPLATE_ID',  // Replace with EmailJS Template ID
            {
              to_email: email,
              from_name: senderName,
              message: `${senderName} te ha enviado una solicitud de amistad en KittyTasks 🐱`,
            }
          );
          showToast('📧 Correo de invitación enviado', 'info');
        }
      } catch (emailErr) {
        // EmailJS not configured — silently ignore
        console.info('[KittyTasks] EmailJS not configured:', emailErr?.message);
      }

      if (emailInput) emailInput.value = '';
      window.closeFriendModal();
    } catch (err) {
      console.error('[KittyTasks] sendFriendRequest error:', err?.code, err?.message, err);
      const msg =
        err.message === 'Usuario no encontrado' ? '❌ No existe ningún usuario con ese correo' :
          err.message === 'Ya enviaste una solicitud a este usuario' ? '⚠️ Ya tienes una solicitud pendiente con este usuario' :
            err.message === 'Ya son amigos' ? '🤝 ¡Ya son amigos!' :
              err.message === 'No puedes enviarte una solicitud a ti mismo' ? '😅 No puedes enviarte una solicitud a ti mismo' :
                err?.code === 'permission-denied' ? '🔒 Sin permisos. Revisa las reglas de Firestore.' :
                  err?.code === 'unavailable' ? '📡 Sin conexión. Intenta de nuevo.' :
                    `Error: ${err?.message || 'desconocido'}`;
      showToast(msg, 'error');
    } finally {
      if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = 'Enviar solicitud'; }
    }
  };

  if (state.user) {
    // ── Incoming requests listener ──────────────────────────────────
    const unsubIn = listenFriendRequests(state.user.uid, state.user.email, (reqs) => {
      const container = document.getElementById('friend-requests-container');
      if (!container) return;
      if (!reqs.length) { container.innerHTML = ''; return; }
      container.innerHTML = `
        <div style="font-weight:700;margin-bottom:var(--space-3);color:var(--accent)">
          📬 ${reqs.length} solicitud${reqs.length !== 1 ? 'es' : ''} pendiente${reqs.length !== 1 ? 's' : ''}
        </div>
        ${reqs.map(r => {
        const name = r.fromDisplayName || r.fromEmail || 'Alguien';
        const initial = name.charAt(0).toUpperCase();
        return `
          <div class="friend-card friend-req-card" style="margin-bottom:var(--space-3)">
            <div class="avatar" style="background:linear-gradient(135deg,var(--accent),var(--accent-dark));color:white;font-weight:700">${initial}</div>
            <div style="flex:1">
              <div style="font-weight:700">${name}</div>
              <div class="text-muted" style="font-size:var(--text-xs)">${r.fromEmail || ''}</div>
            </div>
            <button class="btn btn-primary btn-sm" onclick="handleFriendReq('${r.id}','${r.fromUid}',true)">✅ Aceptar</button>
            <button class="btn btn-ghost btn-sm" onclick="handleFriendReq('${r.id}','${r.fromUid}',false)">✕ Rechazar</button>
          </div>`;
      }).join('')}
      `;
    });
    if (state.listeners) state.listeners.push(unsubIn);

    // ── Sent requests status listener ───────────────────────────────
    const sentQ = query(collection(db, 'friendRequests'), where('fromUid', '==', state.user.uid));
    const unsubSent = onSnapshot(sentQ, (snap) => {
      const container = document.getElementById('sent-requests-container');
      if (!container) return;
      const sent = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const STATUS = {
        pending: { label: '⏳ Pendiente', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
        accepted: { label: '✅ Aceptada', color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
        rejected: { label: '❌ Rechazada', color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
      };
      if (!sent.length) { container.innerHTML = ''; return; }
      container.innerHTML = `
        <div style="font-weight:700;margin-bottom:var(--space-3);margin-top:var(--space-4)">📤 Solicitudes enviadas</div>
        ${sent.map(r => {
        const s = STATUS[r.status] || STATUS.pending;
        return `
          <div class="friend-card" style="margin-bottom:var(--space-2)">
            <div class="avatar" style="background:${s.bg};color:${s.color};font-size:18px">${r.status === 'pending' ? '⏳' : r.status === 'accepted' ? '✅' : '❌'}</div>
            <div style="flex:1">
              <div style="font-weight:700">${r.toEmail || 'Desconocido'}</div>
              <div style="font-size:var(--text-xs);font-weight:700;padding:2px 8px;display:inline-block;border-radius:var(--radius-full);background:${s.bg};color:${s.color};margin-top:2px">${s.label}</div>
            </div >
          </div > `;
      }).join('')}
      `;
    }, err => console.error('[KittyTasks] sentRequests error:', err));
    if (state.listeners) state.listeners.push(unsubSent);

    // ── Load friend display names ───────────────────────────────────
    const friends = state.profile?.friends || [];
    friends.forEach(async (uid) => {
      try {
        const { getUserProfile } = await import('../../firebase/firestore.js');
        const profile = await getUserProfile(uid);
        const el = document.getElementById(`friend-name-${uid}`);
        if (el && profile) el.textContent = profile.displayName || profile.email || uid.substring(0, 12);
      } catch (_) { }
    });
  }

  window.handleFriendReq = async (reqId, fromUid, accept) => {
    try {
      await respondFriendRequest(reqId, fromUid, state.user.uid, accept);
      showToast(accept ? '🎉 ¡Amigo añadido!' : 'Solicitud rechazada', accept ? 'success' : 'info');
      if (accept) {
        // Re-render friends tab to show updated list
        window.switchProfileTab('friends');
      }
    } catch (err) {
      showToast('Error al responder solicitud', 'error');
    }
  };

  // ── Live stat card updates (friends count, points, etc.) ────────
  if (state.user) {
    // Friends listener
    const unsubFriends = listenFriends(state.user.uid, (f) => {
      if (state.profile) state.profile.friends = f;
      const el = document.getElementById('stat-friends');
      if (el) el.textContent = f.length;
      if (profileTab === 'friends') {
        const content = document.getElementById('profile-tab-content');
        if (content) content.innerHTML = renderFriendsTab(state.profile || {});
      }
    });
    if (state.listeners) state.listeners.push(unsubFriends);

    const unsubProfile = listenUserProfile(state.user.uid, async (updatedProfile) => {
      // Merge with existing friends if any
      state.profile = { ...(state.profile || {}), ...updatedProfile };
      const el = (id) => document.getElementById(id);
      if (el('stat-points')) el('stat-points').textContent = state.profile.points || 0;
      if (el('stat-streak')) el('stat-streak').textContent = state.profile.streak || 0;
      if (el('stat-badges')) el('stat-badges').textContent = (state.profile.badges || []).length;
    });

    if (state.listeners) state.listeners.push(unsubProfile);
  }
}
