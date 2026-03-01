// =============================================
// Toast Notification System
// =============================================
let toastContainer = null;

export function initToasts() {
    toastContainer = document.getElementById('toast-container');
}

export function showToast(message, type = 'info', duration = 3000) {
    if (!toastContainer) toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;

    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${icons[type] || '💬'}</span><span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}
