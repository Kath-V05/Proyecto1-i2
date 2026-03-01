// =============================================
// Celebration Particles — KittyTasks
// Types: confetti | stars | fireworks | medal | hearts
// =============================================
let particlesContainer = null;

export function initParticles() {
    particlesContainer = document.getElementById('particles-container');
}

// type: 'confetti' | 'stars' | 'fireworks' | 'medal' | 'hearts'
export function celebrate(x, y, type = 'confetti') {
    if (!particlesContainer) return;
    const cx = x || window.innerWidth / 2;
    const cy = y || window.innerHeight / 2;

    switch (type) {
        case 'stars': return _burst(cx, cy, ['⭐', '🌟', '✨', '💫', '🌠'], 14, 100);
        case 'fireworks': return _fireworks(cx, cy);
        case 'medal': return _burst(cx, cy, ['🏅', '🥇', '🏆', '✨', '🎖️'], 16, 120);
        case 'hearts': return _burst(cx, cy, ['💜', '💖', '💗', '💝', '🌸'], 14, 90);
        default: return _burst(cx, cy, ['🎊', '🎉', '💜', '🐾', '🌸', '🎈'], 12, 80);
    }
}

function _burst(cx, cy, emojis, count, spread) {
    for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        const angle = (i / count) * 360 + Math.random() * 30;
        const dist = spread * (0.5 + Math.random() * 0.8);
        const px = cx + Math.cos(angle * Math.PI / 180) * dist;
        const py = cy + Math.sin(angle * Math.PI / 180) * dist;
        const delay = Math.random() * 0.3;
        const dur = 0.8 + Math.random() * 0.7;
        p.style.cssText = `left:${px}px;top:${py}px;animation-delay:${delay}s;animation-duration:${dur}s;`;
        particlesContainer.appendChild(p);
        setTimeout(() => p.remove(), (delay + dur + 0.2) * 1000);
    }
}

function _fireworks(cx, cy) {
    // Multiple bursts at different positions for firework effect
    const colors = ['🎆', '🎇', '✨', '🌟', '💥', '⭐'];
    const offsets = [
        [0, 0], [-80, -60], [80, -60], [-40, -120], [40, -120],
        [-100, 20], [100, 20], [0, -150]
    ];
    offsets.forEach(([dx, dy], idx) => {
        setTimeout(() => {
            const bx = Math.min(Math.max(cx + dx, 60), window.innerWidth - 60);
            const by = Math.min(Math.max(cy + dy, 60), window.innerHeight - 200);
            _burst(bx, by, colors, 8, 60);
        }, idx * 120);
    });
}
