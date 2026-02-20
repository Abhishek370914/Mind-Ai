/**
 * app.js — Shared utilities across all pages
 */

// ─── Session Management ───────────────────────────────────────
function getOrCreateSession() {
    let sid = localStorage.getItem('mindai_session');
    if (!sid) {
        sid = generateId();
        localStorage.setItem('mindai_session', sid);
    }
    return sid;
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ─── Toast Notifications ──────────────────────────────────────
function showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toast-out 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ─── Category label mapping ───────────────────────────────────
const CATEGORY_LABELS = {
    career: { label: 'Career & Work', icon: '💼', color: '#4f9cf9' },
    mental: { label: 'Mental Health', icon: '🧠', color: '#a78bfa' },
    finance: { label: 'Finance', icon: '💰', color: '#34d399' },
    relationship: { label: 'Relationships', icon: '❤️', color: '#f472b6' },
    health: { label: 'Health & Body', icon: '🏃‍♂️', color: '#fb923c' },
    productivity: { label: 'Productivity', icon: '⚡', color: '#fbbf24' },
    general: { label: 'General', icon: '🌐', color: '#8899b4' }
};

function getCategoryInfo(cat) {
    return CATEGORY_LABELS[cat] || CATEGORY_LABELS.general;
}

// ─── Format timestamp ─────────────────────────────────────────
function formatTime(iso) {
    try {
        return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
}

// ─── Loading overlay helpers ──────────────────────────────────
function showLoading(msg = 'Generating your solution...') {
    let overlay = document.getElementById('loadingOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
      <div class="loading-box">
        <div class="big-spinner"></div>
        <p class="loading-title">MindAI is thinking...</p>
        <p id="loadingMsg">${msg}</p>
      </div>`;
        document.body.appendChild(overlay);
    } else {
        document.getElementById('loadingMsg').textContent = msg;
    }
    // Use rAF to ensure transition plays
    requestAnimationFrame(() => overlay.classList.add('visible'));
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.remove('visible');
    }
}

// ─── API Helpers ──────────────────────────────────────────────
async function apiPost(endpoint, body) {
    const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error || 'Request failed');
    }
    return res.json();
}
