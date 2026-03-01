// =============================================
// Animated Cat Component — KittyTasks
// States: idle | working | celebrating | tired | tea
// Skins: default | orange | black | galaxy | ghost | robot
// =============================================
import { state } from '../../main.js';


const CAT_MESSAGES = {
  idle: ['¡Hola! 👋', '¿Qué hacemos hoy? 🐾', 'Estoy aquí contigo 💜', '¡Lista para ayudarte! ✨'],
  working: ['¡Tú puedes! 💪', '¡Sigue así! 🌟', '¡Enfócate! 🎯', '¡Eres increíble! 💫'],
  celebrating: ['¡FELICITACIONES! 🎉', '¡Lo lograste! ⭐', '¡AMAZING! 🎊', '¡Eres el mejor! 💜', '¡WOW! 🏆'],
  tired: ['Descansa un poco 😴', '¡Cuídate! 🌸', 'No te agotes 💤'],
  tea: ['Tomando té... ☕', '¡El tiempo corre! 🕐', '¡Concentración! 🍵', '¡Sigue así! 🫖'],
};

// Cat skin color palettes: [body, head, ears, innerEar, paws, tail, blush]
const CAT_SKINS = {
  default: { body: '#ddd6fe', head: '#ede9fe', ears: '#c4b5fd', inner: '#f9a8d4', paws: '#ddd6fe', tail: '#c4b5fd', eye: '#1a1830', blush: '#f9a8d4', shine: '#60a5fa', nose: '#f472b6', whisker: '#9d94f8', cssClass: '' },
  orange: { body: '#fed7aa', head: '#ffedd5', ears: '#fb923c', inner: '#fde68a', paws: '#fed7aa', tail: '#fb923c', eye: '#1a1200', blush: '#fca5a5', shine: '#fbbf24', nose: '#ef4444', whisker: '#d97706', cssClass: 'skin-orange' },
  black: { body: '#374151', head: '#4b5563', ears: '#1f2937', inner: '#9ca3af', paws: '#374151', tail: '#1f2937', eye: '#fde047', blush: '#6b7280', shine: '#60a5fa', nose: '#f472b6', whisker: '#9ca3af', cssClass: 'skin-black' },
  galaxy: { body: '#312e81', head: '#3730a3', ears: '#4338ca', inner: '#a78bfa', paws: '#312e81', tail: '#4338ca', eye: '#e879f9', blush: '#7c3aed', shine: '#e879f9', nose: '#a855f7', whisker: '#818cf8', cssClass: 'skin-galaxy' },
  ghost: { body: '#f1f5f9', head: '#f8fafc', ears: '#e2e8f0', inner: '#cbd5e1', paws: '#f1f5f9', tail: '#e2e8f0', eye: '#7c3aed', blush: '#e0e7ff', shine: '#a78bfa', nose: '#818cf8', whisker: '#94a3b8', cssClass: 'skin-ghost' },
  robot: { body: '#64748b', head: '#94a3b8', ears: '#475569', inner: '#38bdf8', paws: '#64748b', tail: '#475569', eye: '#22d3ee', blush: '#38bdf8', shine: '#7dd3fc', nose: '#0ea5e9', whisker: '#38bdf8', cssClass: 'skin-robot' },
};

const ACCESSORIES = {
  none: '',
  // Collar with elegant bow at neck (y≄39-44 = where head meets body)
  bow: `
    <g class="cat-collar">
      <!-- Collar band across neck -->
      <path d="M20 41 Q36 45 52 41 Q36 37 20 41" fill="#f472b6" stroke="#db2777" stroke-width="0.8"/>
      <!-- Bell -->
      <circle cx="36" cy="44" r="3" fill="#fbbf24" stroke="#d97706" stroke-width="0.8"/>
      <circle cx="36" cy="45" r="1" fill="#92400e"/>
      <!-- Left bow loop -->
      <ellipse cx="27" cy="39" rx="6" ry="3.5" fill="#fda4c4" stroke="#db2777" stroke-width="0.8" transform="rotate(-15 27 39)"/>
      <!-- Right bow loop -->
      <ellipse cx="45" cy="39" rx="6" ry="3.5" fill="#fda4c4" stroke="#db2777" stroke-width="0.8" transform="rotate(15 45 39)"/>
      <!-- Knot center -->
      <ellipse cx="36" cy="40" rx="3" ry="2.5" fill="#db2777"/>
      <!-- Ribbon tails -->
      <path d="M34 42 Q30 46 27 48" stroke="#fda4c4" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <path d="M38 42 Q42 46 45 48" stroke="#fda4c4" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    </g>`,
  hat: `<path d="M22 20 L50 20 L45 6 L27 6 Z" fill="#7c6ff7" stroke="#5a52d5" stroke-width="1.5"/>
        <rect x="18" y="19" width="36" height="4" rx="2" fill="#9d94f8"/>`,
  glasses: `<circle cx="28" cy="30" r="7" fill="none" stroke="#4a4669" stroke-width="2"/>
             <circle cx="44" cy="30" r="7" fill="none" stroke="#4a4669" stroke-width="2"/>
             <line x1="35" y1="30" x2="37" y2="30" stroke="#4a4669" stroke-width="2"/>
             <rect x="10" y="29" width="11" height="2" rx="1" fill="#4a4669"/>
             <rect x="51" y="29" width="11" height="2" rx="1" fill="#4a4669"/>`,
  crown: `<path d="M20 18 L36 8 L52 18 L58 8 L58 22 L14 22 L14 8 Z" fill="#fbbf24" stroke="#f59e0b" stroke-width="1.5"/>
           <circle cx="36" cy="8" r="3" fill="#f87171"/>
           <circle cx="20" cy="18" r="2" fill="#4ade80"/>
           <circle cx="52" cy="18" r="2" fill="#60a5fa"/>`,
};



export let catState = 'idle';
export let catAccessory = 'none';
let catElement = null;
let currentSkin = 'default';

export function renderCat(container) {
  if (!container) return;

  if (!document.getElementById('cat-css')) {
    const link = document.createElement('link');
    link.id = 'cat-css';
    link.rel = 'stylesheet';
    link.href = '/src/components/Cat/cat.css';
    document.head.appendChild(link);
  }

  const accessoryKey = state.profile?.catAccessories?.[0] || 'none';
  catAccessory = ACCESSORIES[accessoryKey] || '';
  currentSkin = state.profile?.equippedSkin || 'default';

  container.innerHTML = `
    <div class="cat-widget" id="cat-widget-inner">
      <div class="cat-bubble" id="cat-bubble" style="display:none"></div>
      <div class="cat-svg-wrapper idle ${getSkinClass(currentSkin)}" id="cat-svg-wrapper" title="¡Haz clic en mí!">
        ${getCatSVG(accessoryKey, currentSkin)}
      </div>
    </div>
  `;

  catElement = document.getElementById('cat-svg-wrapper');

  catElement.addEventListener('click', () => {
    showCatBubble(getRandomMessage(catState));
  });

  setInterval(() => {
    if (Math.random() < 0.4) showCatBubble(getRandomMessage(catState));
  }, 30000);
}

export function setCatState(newState) {
  catState = newState;
  if (!catElement) return;
  if (catElement._stateTimer) clearTimeout(catElement._stateTimer);
  catElement.className = `cat-svg-wrapper ${newState} ${getSkinClass(currentSkin)}`;
  if (newState === 'celebrating') {
    showCatBubble(getRandomMessage('celebrating'));
    catElement._stateTimer = setTimeout(() => setCatState('idle'), 6000);
  } else if (newState === 'tea') {
    showCatBubble(getRandomMessage('tea'));
  }
}


export function setCatSkin(skinId, accessoryId) {
  currentSkin = skinId;
  const wrapper = document.getElementById('cat-svg-wrapper');
  if (!wrapper) return;
  // Use passed accessoryId first, fall back to profile
  const accessoryKey = accessoryId !== undefined
    ? accessoryId
    : (state.profile?.catAccessories?.[0] || 'none');
  wrapper.className = `cat-svg-wrapper ${catState} ${getSkinClass(skinId)}`;
  wrapper.innerHTML = getCatSVG(accessoryKey, skinId);
}


export function showCatBubble(message) {
  const bubble = document.getElementById('cat-bubble');
  if (!bubble) return;
  bubble.textContent = message;
  bubble.style.display = 'block';
  bubble.style.animation = 'slideIn 0.3s ease';
  clearTimeout(bubble._timer);
  bubble._timer = setTimeout(() => {
    bubble.style.animation = 'fadeOut 0.3s ease forwards';
    setTimeout(() => { bubble.style.display = 'none'; }, 300);
  }, 3000);
}

function getSkinClass(skinId) {
  return CAT_SKINS[skinId]?.cssClass || '';
}

function getRandomMessage(s) {
  const msgs = CAT_MESSAGES[s] || CAT_MESSAGES.idle;
  return msgs[Math.floor(Math.random() * msgs.length)];
}

function getCatSVG(accessoryKey = 'none', skinId = 'default') {
  const acc = ACCESSORIES[accessoryKey] || '';
  const s = CAT_SKINS[skinId] || CAT_SKINS.default;
  return `
  <svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg" class="cat-body">
    <!-- Tail -->
    <path d="M48 58 Q62 52 58 40 Q55 32 52 38" stroke="${s.tail}" stroke-width="5" stroke-linecap="round" fill="none" class="cat-tail"/>

    <!-- Body -->
    <ellipse cx="36" cy="48" rx="18" ry="16" fill="${s.body}"/>

    <!-- Head -->
    <circle cx="36" cy="26" r="18" fill="${s.head}"/>

    <!-- Ears -->
    <path d="M18 16 L14 4 L26 12 Z" fill="${s.ears}" class="cat-ear-l"/>
    <path d="M54 16 L58 4 L46 12 Z" fill="${s.ears}"/>
    <!-- Inner ears -->
    <path d="M20 15 L17 7 L25 13 Z" fill="${s.inner}" opacity="0.7"/>
    <path d="M52 15 L55 7 L47 13 Z" fill="${s.inner}" opacity="0.7"/>

    <!-- Eyes -->

    <g class="cat-eye-l">
      <ellipse cx="28" cy="27" rx="5" ry="5.5" fill="${s.eye}"/>
      <circle cx="30" cy="25" r="1.5" fill="white"/>
      <circle cx="28" cy="27" r="1" fill="${s.shine}" opacity="0.5"/>
    </g>
    <g class="cat-eye-r">
      <ellipse cx="44" cy="27" rx="5" ry="5.5" fill="${s.eye}"/>
      <circle cx="46" cy="25" r="1.5" fill="white"/>
      <circle cx="44" cy="27" r="1" fill="${s.shine}" opacity="0.5"/>
    </g>

    <!-- Nose -->
    <path d="M34 33 L36 31 L38 33 L36 35 Z" fill="${s.nose}"/>

    <!-- Mouth -->
    <path d="M36 35 Q32 39 30 38" stroke="${s.whisker}" stroke-width="1.5" stroke-linecap="round" fill="none"/>
    <path d="M36 35 Q40 39 42 38" stroke="${s.whisker}" stroke-width="1.5" stroke-linecap="round" fill="none"/>

    <!-- Whiskers -->
    <line x1="14" y1="32" x2="28" y2="34" stroke="${s.whisker}" stroke-width="1" stroke-linecap="round" opacity="0.6"/>
    <line x1="14" y1="35" x2="28" y2="36" stroke="${s.whisker}" stroke-width="1" stroke-linecap="round" opacity="0.6"/>
    <line x1="44" y1="34" x2="58" y2="32" stroke="${s.whisker}" stroke-width="1" stroke-linecap="round" opacity="0.6"/>
    <line x1="44" y1="36" x2="58" y2="35" stroke="${s.whisker}" stroke-width="1" stroke-linecap="round" opacity="0.6"/>

    <!-- Blush -->
    <circle cx="22" cy="33" r="5" fill="${s.blush}" opacity="0.35"/>
    <circle cx="50" cy="33" r="5" fill="${s.blush}" opacity="0.35"/>

    <!-- Paws -->
    <ellipse cx="26" cy="62" rx="7" ry="5" fill="${s.paws}" class="cat-paw-l"/>
    <ellipse cx="46" cy="62" rx="7" ry="5" fill="${s.paws}" class="cat-paw-r"/>
    <!-- Paw toes -->
    <circle cx="22" cy="63" r="2" fill="${s.ears}"/>
    <circle cx="26" cy="65" r="2" fill="${s.ears}"/>
    <circle cx="30" cy="63" r="2" fill="${s.ears}"/>
    <circle cx="42" cy="63" r="2" fill="${s.ears}"/>
    <circle cx="46" cy="65" r="2" fill="${s.ears}"/>
    <circle cx="50" cy="63" r="2" fill="${s.ears}"/>

    <!-- Belly spot -->
    <ellipse cx="36" cy="50" rx="10" ry="8" fill="white" opacity="0.4"/>

    <!-- Cheek spots -->
    <circle cx="26" cy="48" r="3" fill="${s.ears}" opacity="0.5"/>
    <circle cx="46" cy="48" r="3" fill="${s.ears}" opacity="0.5"/>

    <!-- Accessory (on top of everything) -->
    <g class="cat-accessory">${acc}</g>

  </svg>`;

}
