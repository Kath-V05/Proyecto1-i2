// =============================================
// Forgot Password Page — KittyTasks
// =============================================
import { resetPassword } from '../../firebase/auth.js';
import { navigate } from '../../main.js';

export function renderForgotPage(container) {
    const root = container || document.querySelector('.auth-wrapper');
    if (!root) return;

    root.innerHTML = `
    <div class="auth-page" id="auth-page">
      <div class="auth-illustration">
        <div class="auth-floating-shapes">
          <span class="float-shape" style="top:20%; left:15%; animation-delay:0.2s">💌</span>
          <span class="float-shape" style="top:30%; right:20%; animation-delay:0.8s">✨</span>
          <span class="float-shape" style="bottom:25%; left:20%; animation-delay:1.2s">💜</span>
        </div>
        <svg class="auth-cat-big" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M48 58 Q62 52 58 40 Q55 32 52 38" stroke="rgba(255,255,255,0.5)" stroke-width="5" stroke-linecap="round" fill="none"/>
          <ellipse cx="36" cy="48" rx="18" ry="16" fill="rgba(255,255,255,0.25)"/>
          <circle cx="36" cy="26" r="18" fill="rgba(255,255,255,0.35)"/>
          <path d="M18 16 L14 4 L26 12 Z" fill="rgba(255,255,255,0.4)"/>
          <path d="M54 16 L58 4 L46 12 Z" fill="rgba(255,255,255,0.4)"/>
          <ellipse cx="28" cy="28" rx="4" ry="3" fill="rgba(26,24,48,0.8)"/>
          <ellipse cx="44" cy="28" rx="4" ry="3" fill="rgba(26,24,48,0.8)"/>
          <circle cx="30" cy="27" r="1.5" fill="white"/>
          <circle cx="46" cy="27" r="1.5" fill="white"/>
          <path d="M34 33 L36 31 L38 33 L36 35 Z" fill="#f472b6"/>
          <path d="M33 36 Q36 34 39 36" stroke="rgba(255,255,255,0.6)" stroke-width="1.5" stroke-linecap="round" fill="none"/>
          <circle cx="22" cy="33" r="5" fill="rgba(249,168,212,0.4)"/>
          <circle cx="50" cy="33" r="5" fill="rgba(249,168,212,0.4)"/>
          <ellipse cx="26" cy="62" rx="7" ry="5" fill="rgba(255,255,255,0.25)"/>
          <ellipse cx="46" cy="62" rx="7" ry="5" fill="rgba(255,255,255,0.25)"/>
        </svg>
        <div class="auth-ill-title">¿Olvidaste algo?</div>
        <div class="auth-ill-sub">No te preocupes, tu gatito<br/>te ayuda a recuperar el acceso 💜</div>
      </div>

      <div class="auth-panel">
        <div class="auth-form-box">
          <div class="auth-logo">🐱 KittyTasks</div>
          <h1 class="auth-heading">Recuperar contraseña</h1>
          <p class="auth-sub">Te enviaremos un enlace a tu correo.</p>

          <div class="auth-error" id="forgot-error"></div>

          <div class="auth-success" id="forgot-success" style="
            background: rgba(74,222,128,0.1);
            border: 1px solid rgba(74,222,128,0.3);
            border-radius: var(--radius-md);
            padding: var(--space-3) var(--space-4);
            color: var(--success-dark);
            font-size: var(--text-sm);
            margin-bottom: var(--space-4);
            display: none;
          ">
            ✅ ¡Correo enviado! Revisa tu bandeja de entrada.
          </div>

          <form id="forgot-form" novalidate>
            <div class="form-group">
              <label class="form-label" for="forgot-email">Correo electrónico</label>
              <input class="form-input" type="email" id="forgot-email" placeholder="tu@correo.com" required autocomplete="email" />
            </div>
            <button type="submit" class="btn btn-primary btn-full" id="forgot-btn">
              <div class="btn-spinner"></div>
              <span class="btn-text">Enviar enlace</span>
            </button>
          </form>

          <div class="auth-footer" style="margin-top: var(--space-5);">
            <a onclick="navigate('/login')">← Volver al inicio de sesión</a>
          </div>
        </div>
      </div>
    </div>
  `;

    document.getElementById('forgot-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('forgot-email').value.trim();
        const btn = document.getElementById('forgot-btn');
        const error = document.getElementById('forgot-error');
        const success = document.getElementById('forgot-success');

        error.classList.remove('show');
        success.style.display = 'none';
        btn.classList.add('btn-loading');

        try {
            await resetPassword(email);
            btn.classList.remove('btn-loading');
            success.style.display = 'block';
        } catch (err) {
            btn.classList.remove('btn-loading');
            error.textContent = err.code === 'auth/user-not-found'
                ? 'No existe una cuenta con este correo.'
                : 'Error al enviar el correo. Intenta de nuevo.';
            error.classList.add('show');
        }
    });
}
