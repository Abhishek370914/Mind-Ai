/**
 * solution.js — Solution page logic
 * Handles rendering, refinement, feedback, and saving
 */

// ─── State ───────────────────────────────────────────────────
let state = {
    sessionId: null,
    problemId: null,
    solutionId: null,
    problemText: '',
    category: 'general',
    refinementCount: 0,
    lastRefinementType: null,
    saved: false,
    vote: null
};

// ─── Init ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const raw = sessionStorage.getItem('currentSolution');

    if (!raw) {
        // Nothing in session — redirect back
        showToast('No solution found. Please describe your problem first.', 'error');
        setTimeout(() => { window.location.href = '/'; }, 2000);
        return;
    }

    try {
        const data = JSON.parse(raw);
        renderSolution(data);
    } catch (e) {
        console.error(e);
        showToast('Error loading solution. Redirecting...', 'error');
        setTimeout(() => { window.location.href = '/'; }, 2000);
    }
});

// ─── Render Solution ─────────────────────────────────────────
function renderSolution(data, animate = false) {
    // Update state
    state.sessionId = data.sessionId;
    state.problemId = data.problemId;
    state.solutionId = data.solutionId;
    state.problemText = data.problemText;
    state.category = data.category || 'general';
    state.refinementCount = data.refinementCount || 0;
    state.lastRefinementType = data.refinementType || 'initial';

    // Category info
    const catInfo = getCategoryInfo(state.category);

    // Problem banner
    document.getElementById('problemDisplay').textContent = state.problemText;
    const tagEl = document.getElementById('problemTag');
    tagEl.textContent = `${catInfo.icon} ${catInfo.label}`;
    tagEl.style.color = catInfo.color;
    tagEl.style.background = `${catInfo.color}15`;
    tagEl.style.borderColor = `${catInfo.color}30`;

    // Session chip
    document.getElementById('sessionChip').textContent = `🔐 ${state.sessionId.slice(0, 8)}...`;

    // Refinement badge
    const badgeWrapper = document.getElementById('refinementBadgeWrapper');
    if (state.refinementCount > 0) {
        badgeWrapper.innerHTML = `<span class="refinement-badge">🔄 Refined ${state.refinementCount}x · ${getRefinementLabel(state.lastRefinementType)}</span>`;
    } else {
        badgeWrapper.innerHTML = '';
    }

    // Set solution text with optional animation
    const sections = [
        ['textInterpretation', data.interpretation],
        ['textRootCause', data.rootCause],
        ['textAction', data.immediateAction],
        ['textPlan', data.sevenDayPlan],
        ['textApps', data.suggestedApps],
        ['textInsight', data.aiInsight]
    ];

    if (animate) {
        const container = document.getElementById('solutionSections');
        container.classList.add('refreshing');
        setTimeout(() => container.classList.remove('refreshing'), 350);
    }

    sections.forEach(([id, text]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text || '—';
    });

    // Stats
    updateStats();

    // Reset feedback buttons if new solution
    if (!animate) {
        resetFeedbackButtons();
    }

    // Reset active refinement button highlight
    document.querySelectorAll('.refine-btn').forEach(b => b.classList.remove('active'));
}

// ─── Toggle Accordion Card ───────────────────────────────────
function toggleCard(card) {
    card.classList.toggle('open');
}

// ─── Refinement ──────────────────────────────────────────────
async function refineAnswer(type) {
    if (!state.problemId || !state.sessionId) {
        showToast('Session expired. Please describe your problem again.', 'error');
        return;
    }

    // Highlight active button
    document.querySelectorAll('.refine-btn').forEach(b => b.classList.remove('active'));
    const activeBtn = document.getElementById(`btn-${type}`);
    if (activeBtn) activeBtn.classList.add('active');

    // Show loading (sub-200ms feel)
    showLoading(getLoadingMsg(type));

    try {
        const data = await apiPost('/api/refine', {
            sessionId: state.sessionId,
            problemId: state.problemId,
            refinementType: type
        });

        hideLoading();
        renderSolution(data, true);

        // Store updated solution
        sessionStorage.setItem('currentSolution', JSON.stringify(data));

        showToast(`✨ Solution updated: ${getRefinementLabel(type)}`, 'success');

    } catch (err) {
        hideLoading();
        console.error(err);
        showToast('Failed to refine: ' + err.message, 'error');
        // Remove active state on error
        document.querySelectorAll('.refine-btn').forEach(b => b.classList.remove('active'));
    }
}

// ─── Feedback (Thumbs) ────────────────────────────────────────
async function submitFeedback(vote) {
    if (state.vote === vote) {
        // Toggle off
        state.vote = null;
        resetFeedbackButtons();
        return;
    }

    try {
        await apiPost('/api/feedback', {
            solutionId: state.solutionId,
            vote
        });

        state.vote = vote;

        const upBtn = document.getElementById('thumbUp');
        const downBtn = document.getElementById('thumbDown');

        upBtn.classList.remove('active-up', 'active-down');
        downBtn.classList.remove('active-up', 'active-down');

        if (vote === 'up') {
            upBtn.classList.add('active-up');
            showToast('Thanks for the positive feedback! 🎉', 'success');
        } else {
            downBtn.classList.add('active-down');
            showToast('Got it — try one of the refinement options below.', 'info');
        }

    } catch (err) {
        showToast('Could not save feedback: ' + err.message, 'error');
    }
}

function resetFeedbackButtons() {
    document.getElementById('thumbUp')?.classList.remove('active-up', 'active-down');
    document.getElementById('thumbDown')?.classList.remove('active-up', 'active-down');
}

// ─── Save Progress ────────────────────────────────────────────
async function saveProgress() {
    if (state.saved) {
        showToast('Already saved! ✔️', 'info');
        return;
    }

    const btn = document.getElementById('saveBtn');
    btn.disabled = true;
    btn.textContent = '⏳ Saving...';

    try {
        await apiPost('/api/save', { solutionId: state.solutionId });

        state.saved = true;
        btn.classList.add('saved');
        btn.textContent = '✅ Solution Saved';
        showToast('Your solution and plan have been saved!', 'success');

    } catch (err) {
        btn.disabled = false;
        btn.textContent = '💾 Save This Solution';
        showToast('Could not save: ' + err.message, 'error');
    }
}

// ─── Update Stats Sidebar ────────────────────────────────────
function updateStats() {
    document.getElementById('statRefinements').textContent = state.refinementCount;
    const catInfo = getCategoryInfo(state.category);
    document.getElementById('statCategory').textContent = `${catInfo.icon} ${catInfo.label}`;
    document.getElementById('statLastRefined').textContent =
        state.refinementCount > 0 ? getRefinementLabel(state.lastRefinementType) : 'None';
}

// ─── Helpers ─────────────────────────────────────────────────
function getRefinementLabel(type) {
    const labels = {
        initial: 'Initial',
        refine: 'Refined',
        alternative: 'Alternative',
        simpler: 'Simplified',
        practical: 'Practical',
        deeper: 'Deeper Analysis'
    };
    return labels[type] || type;
}

function getLoadingMsg(type) {
    const msgs = {
        refine: 'Refining your solution with more detail...',
        alternative: 'Generating a completely different perspective...',
        simpler: 'Simplifying into plain language...',
        practical: 'Building a hands-on, practical plan...',
        deeper: 'Going deeper with advanced analysis...'
    };
    return msgs[type] || 'Regenerating solution...';
}
