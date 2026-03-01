// =============================================
// Register Page — KittyTasks
// =============================================
import { registerUser, signInWithGoogle } from '../../firebase/auth.js';
import { navigate } from '../../main.js';
import { getAuthError } from './LoginPage.js';

export function renderRegisterPage(container) {
    const root = container || document.querySelector('.auth-wrapper');
    if (!root) return;

    root.innerHTML = `
    <div class="auth-page" id="auth-page">
      <div class="auth-illustration">
        <div class="auth-floating-shapes">
          <span class="float-shape" style="top:15%; left:10%; animation-delay:0s">🎉</span>
          <span class="float-shape" style="top:25%; right:20%; animation-delay:0.6s">⭐</span>
          <span class="float-shape" style="bottom:30%; left:15%; animation-delay:1.1s">💜</span>
          <span class="float-shape" style="bottom:10%; right:15%; animation-delay:0.3s">🐾</span>
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
          <circle cx="22" cy="33" r="5" fill="rgba(249,168,212,0.4)"/>
          <circle cx="50" cy="33" r="5" fill="rgba(249,168,212,0.4)"/>
          <!-- Party hat -->
          <path d="M23 20 L36 2 L49 20 Z" fill="#fbbf24" stroke="#f59e0b" stroke-width="1.5"/>
          <circle cx="36" cy="2" r="3" fill="#f87171"/>
          <circle cx="36" cy="10" r="2" fill="white" opacity="0.7"/>
          <line x1="23" y1="20" x2="49" y2="20" stroke="#f59e0b" stroke-width="2"/>
          <ellipse cx="26" cy="62" rx="7" ry="5" fill="rgba(255,255,255,0.25)"/>
          <ellipse cx="46" cy="62" rx="7" ry="5" fill="rgba(255,255,255,0.25)"/>
        </svg>
        <div class="auth-ill-title">¡Únete a KittyTasks!</div>
        <div class="auth-ill-sub">Crea tu cuenta y comienza<br/>tu aventura de productividad 🚀</div>
      </div>

      <div class="auth-panel">
        <div class="auth-form-box">
          <div class="auth-logo">🐱 KittyTasks</div>
          <h1 class="auth-heading">Crear cuenta</h1>
          <p class="auth-sub">¡Tu gatito está listo para conocerte! 🐾</p>

          <div class="auth-error" id="reg-error"></div>

          <form id="register-form" novalidate>
            <div class="form-group">
              <label class="form-label" for="reg-name">Nombre de usuario</label>
              <input class="form-input" type="text" id="reg-name" placeholder="Tu nombre" required autocomplete="name" />
            </div>
            <div class="form-group">
              <label class="form-label" for="reg-email">Correo electrónico</label>
              <input class="form-input" type="email" id="reg-email" placeholder="tu@correo.com" required autocomplete="email" />
            </div>
            <div class="form-group">
              <label class="form-label" for="reg-password">Contraseña</label>
              <input class="form-input" type="password" id="reg-password" placeholder="Mínimo 6 caracteres" required autocomplete="new-password" />
            </div>
            <div class="form-group">
              <label class="form-label" for="reg-password2">Confirmar contraseña</label>
              <input class="form-input" type="password" id="reg-password2" placeholder="Repite tu contraseña" required autocomplete="new-password" />
            </div>
            <button type="submit" class="btn btn-primary btn-full" id="reg-btn">
              <div class="btn-spinner"></div>
              <span class="btn-text">Crear cuenta</span>
            </button>
          </form>

          <div class="auth-divider">o</div>

          <button class="btn-google" id="google-btn-reg" type="button">
            <svg class="google-icon" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continuar con Google
          </button>

          <div class="auth-footer">
            ¿Ya tienes cuenta?
            <a onclick="navigate('/login')">Iniciar sesión</a>
          </div>
        </div>
      </div>
    </div>
  `;

    // Link login page styles
    if (!document.querySelector('[href*="LoginPage"]')) {
        // Styles shared via login page CSS already in index.html chain
    }

    document.getElementById('register-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('reg-name').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const password = document.getElementById('reg-password').value;
        const password2 = document.getElementById('reg-password2').value;
        const btn = document.getElementById('reg-btn');
        const error = document.getElementById('reg-error');

        error.classList.remove('show');

        if (password !== password2) {
            error.textContent = 'Las contraseñas no coinciden.';
            error.classList.add('show');
            return;
        }
        if (!name) {
            error.textContent = 'El nombre es requerido.';
            error.classList.add('show');
            return;
        }

        btn.classList.add('btn-loading');

        try {
            await registerUser(email, password, name);
            // Auth listener handles redirect
        } catch (err) {
            btn.classList.remove('btn-loading');
            error.textContent = getAuthError(err.code);
            error.classList.add('show');
        }
    });

    document.getElementById('google-btn-reg')?.addEventListener('click', async () => {
        try {
            await signInWithGoogle();
        } catch (err) {
            const error = document.getElementById('reg-error');
            error.textContent = getAuthError(err.code);
            error.classList.add('show');
        }
    });
}
