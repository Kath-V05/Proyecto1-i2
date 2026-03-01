// =============================================
// Navbar Component — KittyTasks
// =============================================
import { state, navigate, toggleTheme, computeLevel } from '../../main.js';
import { signOut } from '../../firebase/auth.js';
import { showToast } from '../Toast.js';

const navItems = [
    { path: '/', icon: '🏠', label: 'Inicio', id: 'nav-home' },
    { path: '/projects', icon: '📁', label: 'Proyectos', id: 'nav-projects' },
    { path: '/notes', icon: '📝', label: 'Notas', id: 'nav-notes' },
    { path: '/timer', icon: '⏱', label: 'Tiempo', id: 'nav-timer' },
    { path: '/calendar', icon: '📅', label: 'Calendario', id: 'nav-calendar' },
    { path: '/profile', icon: '👤', label: 'Perfil', id: 'nav-profile' },
];

export function renderNavbar(container) {
    if (!container) return;

    const user = state.user;
    const profile = state.profile;
    const initial = (profile?.displayName || user?.email || 'U').charAt(0).toUpperCase();
    const level = computeLevel(profile?.xp || 0);
    const points = profile?.points || 0;
    const streak = profile?.streak || 0;

    container.innerHTML = `
    <style>
      .navbar {
        position: fixed;
        top: 0; left: 0; right: 0;
        height: var(--nav-height);
        background: var(--nav-bg);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border-bottom: 1px solid var(--nav-border);
        z-index: var(--z-sticky);
        display: flex;
        align-items: center;
        padding: 0 var(--space-6);
        gap: var(--space-4);
        box-shadow: var(--shadow-sm);
      }

      .navbar-brand {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        font-family: var(--font-display);
        font-size: var(--text-xl);
        font-weight: 800;
        color: var(--accent);
        text-decoration: none;
        cursor: pointer;
        white-space: nowrap;
        flex-shrink: 0;
      }
      .navbar-brand:hover { color: var(--accent-dark); }

      .navbar-nav {
        display: flex;
        align-items: center;
        gap: var(--space-1);
        flex: 1;
        list-style: none;
      }

      .navbar-nav-item {
        display: flex;
      }

      .navbar-link {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-2) var(--space-3);
        border-radius: var(--radius-md);
        color: var(--text-secondary);
        font-size: var(--text-sm);
        font-weight: 500;
        cursor: pointer;
        border: none;
        background: transparent;
        font-family: var(--font-sans);
        transition: all var(--transition-fast);
        white-space: nowrap;
        text-decoration: none;
      }
      .navbar-link:hover, .navbar-link.active {
        background: var(--bg-hover);
        color: var(--accent);
      }
      .navbar-link.active { font-weight: 700; }

      .navbar-link .link-label {
        display: none;
      }
      @media (min-width: 900px) {
        .navbar-link .link-label { display: inline; }
      }

      .navbar-right {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        margin-left: auto;
        flex-shrink: 0;
      }

      .nav-stats {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        padding: var(--space-2) var(--space-3);
        background: var(--bg-tertiary);
        border-radius: var(--radius-md);
        border: 1px solid var(--border-color);
      }
      .nav-stat {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: var(--text-xs);
        font-weight: 600;
        color: var(--text-secondary);
      }
      @media (max-width: 640px) { .nav-stats { display: none; } }

      .theme-btn {
        width: 36px;
        height: 36px;
        border-radius: var(--radius-md);
        border: 1.5px solid var(--border-color);
        background: var(--bg-secondary);
        cursor: pointer;
        font-size: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--text-secondary);
        transition: all var(--transition-fast);
        flex-shrink: 0;
      }
      .theme-btn:hover { background: var(--bg-hover); border-color: var(--accent); }

      .nav-avatar {
        width: 36px;
        height: 36px;
        border-radius: var(--radius-full);
        background: linear-gradient(135deg, var(--accent), var(--accent-dark));
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: var(--text-sm);
        cursor: pointer;
        border: 2px solid transparent;
        transition: border-color var(--transition-fast);
        flex-shrink: 0;
        position: relative;
      }
      .nav-avatar:hover { border-color: var(--accent); }

      .nav-dropdown {
        position: absolute;
        top: calc(100% + 8px);
        right: 0;
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-lg);
        padding: var(--space-2);
        min-width: 180px;
        z-index: var(--z-dropdown);
        animation: slideDown 0.2s ease;
        display: none;
      }
      .nav-avatar-wrap { position: relative; }
      .nav-avatar-wrap:hover .nav-dropdown,
      .nav-avatar-wrap.open .nav-dropdown { display: block; }

      .nav-dropdown-item {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-2) var(--space-3);
        border-radius: var(--radius-md);
        color: var(--text-secondary);
        font-size: var(--text-sm);
        cursor: pointer;
        transition: all var(--transition-fast);
        border: none;
        background: transparent;
        width: 100%;
        text-align: left;
        font-family: var(--font-sans);
      }
      .nav-dropdown-item:hover { background: var(--bg-hover); color: var(--text-primary); }
      .nav-dropdown-item.danger:hover { background: rgba(248,113,113,0.1); color: var(--danger); }
      .nav-userinfo { padding: var(--space-3); border-bottom: 1px solid var(--border-color); margin-bottom: var(--space-2); }
      .nav-userinfo .name { font-weight: 600; font-size: var(--text-sm); }
      .nav-userinfo .email { font-size: var(--text-xs); color: var(--text-muted); }

      /* Mobile bottom nav */
      @media (max-width: 768px) {
        .navbar { display: none; }
      }

      .mobile-nav {
        display: none;
        position: fixed;
        bottom: 0; left: 0; right: 0;
        height: var(--nav-height);
        background: var(--nav-bg);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border-top: 1px solid var(--nav-border);
        z-index: var(--z-sticky);
        padding: 0 var(--space-2);
        box-shadow: 0 -4px 16px rgba(124,111,247,0.1);
      }
      @media (max-width: 768px) { .mobile-nav { display: flex; align-items: center; justify-content: space-around; } }

      .mobile-nav-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        padding: var(--space-2) var(--space-3);
        border-radius: var(--radius-md);
        color: var(--text-muted);
        font-size: 10px;
        cursor: pointer;
        border: none;
        background: transparent;
        font-family: var(--font-sans);
        transition: color var(--transition-fast);
      }
      .mobile-nav-item .icon { font-size: 20px; }
      .mobile-nav-item.active { color: var(--accent); }
    </style>

    <!-- Desktop Navbar -->
    <nav class="navbar">
      <div class="navbar-brand" onclick="navigate('/')">🐱 KittyTasks</div>
      <ul class="navbar-nav">
        ${navItems.map(item => `
          <li class="navbar-nav-item">
            <button class="navbar-link ${state.currentRoute === item.path ? 'active' : ''}"
              onclick="navigate('${item.path}')" id="${item.id}">
              ${item.icon} <span class="link-label">${item.label}</span>
            </button>
          </li>
        `).join('')}
      </ul>

      <div class="navbar-right">
        <div class="nav-stats">
          <div class="nav-stat">🔥 <span>${streak}</span></div>
          <div class="nav-stat">⭐ <span id="nav-xp">${points} pts</span></div>
          <div class="nav-stat">🏅 <span id="nav-level">Lv ${level}</span></div>
        </div>

        <button class="theme-btn" onclick="handleThemeToggle()" title="Cambiar tema" id="theme-toggle-btn">
          ${state.theme === 'light' ? '🌙' : '☀️'}
        </button>

        <div class="nav-avatar-wrap" id="nav-avatar-wrap">
          <div class="nav-avatar" id="nav-avatar" onclick="toggleDropdown()">${initial}</div>
          <div class="nav-dropdown" id="nav-dropdown">
            <div class="nav-userinfo">
              <div class="name">${profile?.displayName || 'Usuario'}</div>
              <div class="email">${user?.email || ''}</div>
            </div>
            <button class="nav-dropdown-item" onclick="navigate('/profile')">👤 Mi Perfil</button>
            <button class="nav-dropdown-item" onclick="navigate('/profile')">⚙️ Configuración</button>
            <div class="divider"></div>
            <button class="nav-dropdown-item danger" onclick="handleSignOut()">🚪 Cerrar sesión</button>
          </div>
        </div>
      </div>
    </nav>

    <!-- Mobile Bottom Nav -->
    <nav class="mobile-nav" id="mobile-nav">
      ${navItems.map(item => `
        <button class="mobile-nav-item ${state.currentRoute === item.path ? 'active' : ''}"
          onclick="navigate('${item.path}')">
          <span class="icon">${item.icon}</span>
          <span>${item.label}</span>
        </button>
      `).join('')}
      <button class="mobile-nav-item" onclick="handleThemeToggle()">
        <span class="icon">${state.theme === 'light' ? '🌙' : '☀️'}</span>
        <span>Tema</span>
      </button>
    </nav>
  `;

    // Expose to window for onclick handlers
    window.navigate = navigate;
    window.handleThemeToggle = () => {
        toggleTheme();
        const btn = document.getElementById('theme-toggle-btn');
        if (btn) btn.textContent = state.theme === 'light' ? '🌙' : '☀️';
    };
    window.handleSignOut = async () => {
        await signOut();
        showToast('¡Hasta luego! 🐱', 'success');
    };
    window.toggleDropdown = () => {
        const wrap = document.getElementById('nav-avatar-wrap');
        wrap?.classList.toggle('open');
    };
    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
        const wrap = document.getElementById('nav-avatar-wrap');
        if (wrap && !wrap.contains(e.target)) wrap.classList.remove('open');
    }, { once: true });
}
