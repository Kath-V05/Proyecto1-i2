// =============================================
// KittyTasks — Main Entry Point
// SPA Router + App State Manager
// =============================================
import { onAuthChange } from './firebase/auth.js';
import { createUserProfile, listenUserProfile, updateStreak } from './firebase/firestore.js';
import { renderLoginPage } from './pages/Auth/LoginPage.js';
import { renderRegisterPage } from './pages/Auth/RegisterPage.js';
import { renderForgotPage } from './pages/Auth/ForgotPasswordPage.js';
import { renderDashboard } from './pages/Dashboard/DashboardPage.js';
import { renderProjects } from './pages/Projects/ProjectsPage.js';
import { renderProjectDetail } from './pages/Projects/ProjectDetailPage.js';
import { renderNotes } from './pages/Notes/NotesPage.js';
import { renderTimer } from './pages/Timer/TimerPage.js';
import { renderCalendar } from './pages/Calendar/CalendarPage.js';
import { renderProfile } from './pages/Profile/ProfilePage.js';
import { renderNavbar } from './components/Navbar/Navbar.js';
import { renderCat, setCatSkin } from './components/Cat/Cat.js';
import { initToasts } from './components/Toast.js';
import { initParticles } from './components/Particles.js';


// ─── App State ───────────────────────────────────────────────────────────────
export const state = {
    user: null,
    profile: null,
    theme: localStorage.getItem('kittytasks-theme') || 'light',
    currentRoute: '/',
    profileUnsubscribe: null,
    listeners: [],
};

// ─── Theme ───────────────────────────────────────────────────────────────────
export function applyTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('kittytasks-theme', theme);
}

export function toggleTheme() {
    applyTheme(state.theme === 'light' ? 'dark' : 'light');
}

// Apply saved theme immediately
applyTheme(state.theme);

// ─── Router ──────────────────────────────────────────────────────────────────
const routes = {
    '/': () => renderDashboard(),
    '/login': () => renderLoginPage(),
    '/register': () => renderRegisterPage(),
    '/forgot': () => renderForgotPage(),
    '/projects': () => renderProjects(),
    '/notes': () => renderNotes(),
    '/timer': () => renderTimer(),
    '/calendar': () => renderCalendar(),
    '/profile': () => renderProfile(),
};

export function navigate(path, params = {}) {
    state.currentRoute = path;
    state.routeParams = params;

    // Cleanup old listeners
    state.listeners.forEach(unsub => { try { unsub(); } catch (e) { } });
    state.listeners = [];

    window.history.pushState({}, '', path);
    renderApp();
}

// ─── Auth Pages (no navbar) ──────────────────────────────────────────────────
const authRoutes = ['/login', '/register', '/forgot'];

// Resolve ruta dinámica /projects/:id
function resolveRoute(path) {
    if (path.startsWith('/projects/')) {
        const projectId = path.split('/')[2];
        return { handler: () => renderProjectDetail(null, projectId), isAuthPage: false };
    }
    const handler = routes[path];
    return { handler: handler || routes['/'], isAuthPage: authRoutes.includes(path) };
}

window.addEventListener('popstate', () => {
    state.currentRoute = window.location.pathname;
    // Cleanup old listeners on back/forward
    state.listeners.forEach(unsub => { try { unsub(); } catch (e) { } });
    state.listeners = [];
    renderApp();
});

function renderApp() {
    const app = document.getElementById('app');
    const route = state.currentRoute;

    // Auth guard
    if (!state.user && !authRoutes.includes(route)) {
        navigate('/login');
        return;
    }
    if (state.user && authRoutes.includes(route)) {
        navigate('/');
        return;
    }

    const { handler, isAuthPage } = resolveRoute(route);

    app.innerHTML = isAuthPage
        ? `<div class="auth-wrapper"></div>`
        : `
      <div class="page-wrapper">
        <nav id="navbar"></nav>
        <div class="main-content" id="page-content"></div>
        <div id="cat-widget"></div>
      </div>
      <div class="toast-container" id="toast-container"></div>
      <div class="particles-container" id="particles-container"></div>
    `;

    if (isAuthPage) {
        const wrapper = app.querySelector('.auth-wrapper');
        handler(wrapper);
    } else {
        renderNavbar(document.getElementById('navbar'));
        renderCat(document.getElementById('cat-widget'));
        initToasts();
        initParticles();
        handler(document.getElementById('page-content'));
    }
}

// ─── Auth State Listener ─────────────────────────────────────────────────────
onAuthChange(async (user) => {
    if (user) {
        state.user = user;
        // Create/update profile in Firestore
        await createUserProfile(user.uid, {
            displayName: user.displayName || user.email.split('@')[0],
            email: user.email,
            photoURL: user.photoURL
        });
        // Update streak
        await updateStreak(user.uid);
        // Listen to profile changes
        if (state.profileUnsubscribe) state.profileUnsubscribe();
        state.profileUnsubscribe = listenUserProfile(user.uid, (profile) => {
            const prevSkin = state.profile?.equippedSkin;
            state.profile = profile;

            // Live-update level display in navbar
            const levelDisplay = document.getElementById('nav-level');
            if (levelDisplay) {
                const level = computeLevel(profile.xp || 0);
                levelDisplay.textContent = `Lv ${level}`;
            }
            const xpDisplay = document.getElementById('nav-xp');
            if (xpDisplay) xpDisplay.textContent = `${profile.points || 0} pts`;

            // Live-update cat skin if it changed
            if (profile.equippedSkin && profile.equippedSkin !== prevSkin) {
                setCatSkin(profile.equippedSkin);
            }
        });

        // Navigate to dashboard if on auth page
        if (authRoutes.includes(window.location.pathname)) navigate('/');
        else {
            state.currentRoute = window.location.pathname;
            renderApp();
        }
    } else {
        state.user = null;
        state.profile = null;
        if (state.profileUnsubscribe) {
            state.profileUnsubscribe();
            state.profileUnsubscribe = null;
        }
        navigate('/login');
    }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
export function computeLevel(xp) {
    // Level thresholds: 0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500...
    const thresholds = [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500, 7200, 9000];
    let level = 1;
    for (let i = 0; i < thresholds.length; i++) {
        if (xp >= thresholds[i]) level = i + 1;
        else break;
    }
    return level;
}

export function getXpProgress(xp) {
    const thresholds = [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500, 7200, 9000];
    let level = computeLevel(xp);
    const current = thresholds[Math.min(level - 1, thresholds.length - 1)];
    const next = thresholds[Math.min(level, thresholds.length - 1)];
    if (next === current) return 100;
    return Math.round(((xp - current) / (next - current)) * 100);
}

export function getPointsForDifficulty(difficulty) {
    return { easy: 10, normal: 25, hard: 50 }[difficulty] || 25;
}
