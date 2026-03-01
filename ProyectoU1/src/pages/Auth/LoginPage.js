// =============================================
// Login Page — KittyTasks
// Beautiful auth page with animated cat
// =============================================
import { loginUser, signInWithGoogle } from '../../firebase/auth.js';
import { navigate } from '../../main.js';
import { showToast } from '../../components/Toast.js';

export function renderLoginPage(container) {
    // container comes from auth-wrapper
    const root = container || document.querySelector('.auth-wrapper');
    if (!root) return;

    root.innerHTML = `
    <style>
      .auth-page {
        min-height: 100vh;
        display: grid;
        grid-template-columns: 1fr 1fr;
        overflow: hidden;
      }
      @media (max-width: 768px) {
        .auth-page { grid-template-columns: 1fr; }
        .auth-illustration { display: none; }
      }

      .auth-illustration {
        background: linear-gradient(135deg, #7c6ff7 0%, #5a52d5 50%, #312e81 100%);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: var(--space-12);
        position: relative;
        overflow: hidden;
      }
      .auth-illustration::before {
        content: '';
        position: absolute;
        width: 400px; height: 400px;
        border-radius: 50%;
        background: rgba(255,255,255,0.05);
        top: -100px; right: -100px;
      }
      .auth-illustration::after {
        content: '';
        position: absolute;
        width: 300px; height: 300px;
        border-radius: 50%;
        background: rgba(255,255,255,0.05);
        bottom: -80px; left: -80px;
      }
      .auth-cat-big {
        width: 200px;
        height: 200px;
        filter: drop-shadow(0 20px 40px rgba(0,0,0,0.3));
        animation: float 3s ease-in-out infinite;
        z-index: 1;
      }
      .auth-ill-title {
        font-family: var(--font-display);
        font-size: var(--text-3xl);
        font-weight: 800;
        color: white;
        text-align: center;
        margin-top: var(--space-6);
        z-index: 1;
      }
      .auth-ill-sub {
        color: rgba(255,255,255,0.7);
        text-align: center;
        margin-top: var(--space-3);
        font-size: var(--text-base);
        z-index: 1;
        line-height: 1.6;
      }
      .auth-floating-shapes {
        position: absolute;
        inset: 0;
        pointer-events: none;
        z-index: 0;
      }
      .float-shape {
        position: absolute;
        font-size: 24px;
        animation: float 3s ease-in-out infinite;
        opacity: 0.6;
      }

      .auth-panel {
        background: var(--bg-primary);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: var(--space-10);
        overflow-y: auto;
      }

      .auth-form-box {
        width: 100%;
        max-width: 400px;
        animation: slideUp 0.4s ease;
      }

      .auth-logo {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        font-family: var(--font-display);
        font-size: var(--text-2xl);
        font-weight: 800;
        color: var(--accent);
        margin-bottom: var(--space-2);
      }

      .auth-heading {
        font-size: var(--text-2xl);
        font-weight: 800;
        color: var(--text-primary);
        margin-bottom: var(--space-1);
      }
      .auth-sub {
        color: var(--text-muted);
        font-size: var(--text-sm);
        margin-bottom: var(--space-8);
      }

      .auth-divider {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        margin: var(--space-5) 0;
        color: var(--text-muted);
        font-size: var(--text-sm);
      }
      .auth-divider::before, .auth-divider::after {
        content: '';
        flex: 1;
        height: 1px;
        background: var(--border-color);
      }

      .btn-google {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--space-3);
        padding: var(--space-3);
        border: 1.5px solid var(--border-color);
        border-radius: var(--radius-md);
        background: var(--bg-secondary);
        color: var(--text-primary);
        font-size: var(--text-sm);
        font-weight: 600;
        cursor: pointer;
        transition: all var(--transition-fast);
        font-family: var(--font-sans);
      }
      .btn-google:hover { background: var(--bg-hover); border-color: var(--accent); }
      .google-icon { width: 18px; height: 18px; }

      .auth-footer {
        text-align: center;
        margin-top: var(--space-6);
        font-size: var(--text-sm);
        color: var(--text-muted);
      }
      .auth-footer a {
        color: var(--accent);
        font-weight: 600;
        cursor: pointer;
        border: none;
        background: none;
        font-size: var(--text-sm);
        font-family: var(--font-sans);
      }
      .auth-footer a:hover { text-decoration: underline; }

      .auth-error {
        background: rgba(248,113,113,0.1);
        border: 1px solid rgba(248,113,113,0.3);
        border-radius: var(--radius-md);
        padding: var(--space-3) var(--space-4);
        color: var(--danger);
        font-size: var(--text-sm);
        margin-bottom: var(--space-4);
        display: none;
      }
      .auth-error.show { display: block; animation: slideDown 0.2s ease; }

      .btn-spinner {
        display: none;
        width: 16px; height: 16px;
        border: 2px solid rgba(255,255,255,0.4);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
      .btn-loading .btn-text { display: none; }
      .btn-loading .btn-spinner { display: block; }
    </style>

    <div class="auth-page" id="auth-page">
      <!-- Left Illustration -->
      <div class="auth-illustration">
        <div class="auth-floating-shapes">
          <span class="float-shape" style="top:10%; left:10%; animation-delay:0s">⭐</span>
          <span class="float-shape" style="top:20%; right:15%; animation-delay:0.5s">✨</span>
          <span class="float-shape" style="bottom:25%; left:20%; animation-delay:1s">💜</span>
          <span class="float-shape" style="bottom:15%; right:10%; animation-delay:1.5s">🐾</span>
          <span class="float-shape" style="top:50%; left:5%; animation-delay:0.8s">🌸</span>
        </div>
        <svg class="auth-cat-big" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M48 58 Q62 52 58 40 Q55 32 52 38" stroke="rgba(255,255,255,0.5)" stroke-width="5" stroke-linecap="round" fill="none"/>
          <ellipse cx="36" cy="48" rx="18" ry="16" fill="rgba(255,255,255,0.25)"/>
          <circle cx="36" cy="26" r="18" fill="rgba(255,255,255,0.35)"/>
          <path d="M18 16 L14 4 L26 12 Z" fill="rgba(255,255,255,0.4)"/>
          <path d="M54 16 L58 4 L46 12 Z" fill="rgba(255,255,255,0.4)"/>
          <path d="M20 15 L17 7 L25 13 Z" fill="rgba(249,168,212,0.6)"/>
          <path d="M52 15 L55 7 L47 13 Z" fill="rgba(249,168,212,0.6)"/>
          <ellipse cx="28" cy="27" rx="5" ry="5.5" fill="rgba(26,24,48,0.8)"/>
          <ellipse cx="44" cy="27" rx="5" ry="5.5" fill="rgba(26,24,48,0.8)"/>
          <circle cx="30" cy="25" r="1.5" fill="white"/>
          <circle cx="46" cy="25" r="1.5" fill="white"/>
          <path d="M34 33 L36 31 L38 33 L36 35 Z" fill="#f472b6"/>
          <path d="M36 35 Q32 39 30 38" stroke="rgba(255,255,255,0.6)" stroke-width="1.5" stroke-linecap="round" fill="none"/>
          <path d="M36 35 Q40 39 42 38" stroke="rgba(255,255,255,0.6)" stroke-width="1.5" stroke-linecap="round" fill="none"/>
          <line x1="14" y1="32" x2="28" y2="34" stroke="rgba(255,255,255,0.5)" stroke-width="1" stroke-linecap="round"/>
          <line x1="14" y1="35" x2="28" y2="36" stroke="rgba(255,255,255,0.5)" stroke-width="1" stroke-linecap="round"/>
          <line x1="44" y1="34" x2="58" y2="32" stroke="rgba(255,255,255,0.5)" stroke-width="1" stroke-linecap="round"/>
          <line x1="44" y1="36" x2="58" y2="35" stroke="rgba(255,255,255,0.5)" stroke-width="1" stroke-linecap="round"/>
          <circle cx="22" cy="33" r="5" fill="rgba(249,168,212,0.4)"/>
          <circle cx="50" cy="33" r="5" fill="rgba(249,168,212,0.4)"/>
          <ellipse cx="26" cy="62" rx="7" ry="5" fill="rgba(255,255,255,0.25)"/>
          <ellipse cx="46" cy="62" rx="7" ry="5" fill="rgba(255,255,255,0.25)"/>
          <ellipse cx="36" cy="50" rx="10" ry="8" fill="rgba(255,255,255,0.2)"/>
        </svg>
        <div class="auth-ill-title">KittyTasks</div>
        <div class="auth-ill-sub">Tu compañero felino de productividad.<br/>¡Organiza tu vida con estilo! 🐾</div>
      </div>

      <!-- Right Form Panel -->
      <div class="auth-panel">
        <div class="auth-form-box">
          <div class="auth-logo">🐱 KittyTasks</div>
          <h1 class="auth-heading">Bienvenido de vuelta</h1>
          <p class="auth-sub">¡Tu gatito te ha estado esperando! 🐾</p>

          <div class="auth-error" id="login-error"></div>

          <form id="login-form" novalidate>
            <div class="form-group">
              <label class="form-label" for="login-email">Correo electrónico</label>
              <input class="form-input" type="email" id="login-email" placeholder="tu@correo.com" required autocomplete="email" />
            </div>
            <div class="form-group">
              <label class="form-label" for="login-password">Contraseña</label>
              <input class="form-input" type="password" id="login-password" placeholder="••••••••" required autocomplete="current-password" />
            </div>
            <div style="text-align:right; margin-bottom: var(--space-5);">
              <button type="button" class="auth-footer" style="display:inline; margin:0; padding:0; background:none; border:none;" onclick="navigate('/forgot')">
                <a>¿Olvidaste tu contraseña?</a>
              </button>
            </div>
            <button type="submit" class="btn btn-primary btn-full" id="login-btn">
              <div class="btn-spinner"></div>
              <span class="btn-text">Iniciar sesión</span>
            </button>
          </form>

          <div class="auth-divider">o continúa con</div>

          <button class="btn-google" id="google-btn" type="button">
            <svg class="google-icon" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continuar con Google
          </button>

          <div class="auth-footer">
            ¿No tienes cuenta?
            <a onclick="navigate('/register')">Crear cuenta gratis</a>
          </div>
        </div>
      </div>
    </div>
  `;

    // Form submission
    document.getElementById('login-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        const btn = document.getElementById('login-btn');
        const error = document.getElementById('login-error');

        error.classList.remove('show');
        btn.classList.add('btn-loading');

        try {
            await loginUser(email, password);
            // Auth state change will redirect automatically
        } catch (err) {
            btn.classList.remove('btn-loading');
            error.textContent = getAuthError(err.code);
            error.classList.add('show');
        }
    });

    document.getElementById('google-btn')?.addEventListener('click', async () => {
        try {
            await signInWithGoogle();
        } catch (err) {
            const error = document.getElementById('login-error');
            error.textContent = getAuthError(err.code);
            error.classList.add('show');
        }
    });
}

export function getAuthError(code) {
    const errors = {
        'auth/user-not-found': 'No existe una cuenta con este correo.',
        'auth/wrong-password': 'Contraseña incorrecta.',
        'auth/invalid-email': 'El correo electrónico no es válido.',
        'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde.',
        'auth/email-already-in-use': 'Este correo ya está registrado.',
        'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
        'auth/popup-closed-by-user': 'Inicio de sesión cancelado.',
        'auth/invalid-credential': 'Credenciales inválidas. Verifica tu email y contraseña.',
    };
    return errors[code] || 'Error al iniciar sesión. Intenta de nuevo.';
}
