/**
 * Hibiscus 🌺 - UI Manager Module
 * Handles navigation, modals, toasts, loading states, and error displays
 */

// ===== Navigation =====

/**
 * Setup tab navigation
 */
function setupNavigation() {
    const tabs = document.querySelectorAll('.nav-tab');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetId = tab.dataset.tab;

            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            document.getElementById(targetId).classList.add('active');
        });
    });
}

// ===== Loading States =====

/**
 * Show or hide a loading overlay
 * @param {string} elementId - Loading element ID
 * @param {boolean} show - Whether to show or hide
 */
function showLoading(elementId, show) {
    const element = document.getElementById(elementId);
    if (show) {
        element.classList.remove('hidden');
    } else {
        element.classList.add('hidden');
    }
}

// ===== Toast Notifications =====

/**
 * Show a toast notification
 * @param {string} message - Message to display
 * @param {string} type - 'success', 'error', 'warning', 'info'
 */
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');

    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ===== Modal =====

/**
 * Setup gallery modal
 */
function setupModal() {
    const modal = document.getElementById('galleryModal');
    const closeBtn = document.getElementById('closeModal');
    const overlay = modal.querySelector('.modal-overlay');
    const editBtn = document.getElementById('modalEdit');
    const downloadBtn = document.getElementById('modalDownload');
    const deleteBtn = document.getElementById('modalDelete');

    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);
    editBtn.addEventListener('click', editModalItem);
    downloadBtn.addEventListener('click', downloadModalItem);
    deleteBtn.addEventListener('click', deleteModalItem);
}

/**
 * Close the gallery modal
 */
function closeModal() {
    const modal = document.getElementById('galleryModal');
    modal.classList.add('hidden');

    const video = document.getElementById('modalVideo');
    video.pause();
}

// ===== Friendly Error UI =====

let friendlyErrorState = {
    interval: null,
    keyHandler: null
};

/**
 * Show a friendly error overlay with auto-dismiss
 * @param {string} titleKey - i18n key for title
 * @param {string} hintKey - i18n key for hint
 * @param {string} icon - Emoji icon
 * @param {string} context - Loading element context
 */
function showFriendlyErrorUI(titleKey, hintKey, icon, context) {
    // Clear any existing timeout/interval
    if (friendlyErrorState.interval) {
        clearInterval(friendlyErrorState.interval);
    }
    if (friendlyErrorState.keyHandler) {
        document.removeEventListener('keydown', friendlyErrorState.keyHandler);
    }

    const loadingElement = document.getElementById(context);
    if (!loadingElement) return;

    // Make sure loading overlay is visible
    loadingElement.classList.remove('hidden');

    let countdown = 15;

    // Create overlay
    let overlay = loadingElement.querySelector('.friendly-error-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'friendly-error-overlay visible';
        loadingElement.appendChild(overlay);
    } else {
        overlay.classList.add('visible');
        overlay.classList.remove('hidden');
    }

    function updateCountdown() {
        overlay.innerHTML = `
            <div class="friendly-error-content">
                <span class="friendly-error-icon">${icon}</span>
                <h3>${i18n.t(titleKey)}</h3>
                <p class="friendly-error-hint">${i18n.t(hintKey)}</p>
                <p class="friendly-error-countdown">${i18n.t('toast.closingIn', { seconds: countdown })}</p>
                <button class="btn-close-error" onclick="hideFriendlyErrorUI()">
                    ${i18n.t('btn.close') || 'Fechar'}
                </button>
            </div>
        `;
    }

    updateCountdown();

    friendlyErrorState.interval = setInterval(() => {
        countdown--;
        updateCountdown();
        if (countdown <= 0) {
            hideFriendlyErrorUI();
        }
    }, 1000);

    // Press any key to close
    friendlyErrorState.keyHandler = function () {
        hideFriendlyErrorUI();
    };
    document.addEventListener('keydown', friendlyErrorState.keyHandler, { once: true });
}

/**
 * Hide the friendly error UI
 */
function hideFriendlyErrorUI() {
    if (friendlyErrorState.interval) {
        clearInterval(friendlyErrorState.interval);
        friendlyErrorState.interval = null;
    }
    if (friendlyErrorState.keyHandler) {
        document.removeEventListener('keydown', friendlyErrorState.keyHandler);
        friendlyErrorState.keyHandler = null;
    }

    const overlay = document.querySelector('.friendly-error-overlay');
    if (overlay) {
        overlay.classList.remove('visible');
        overlay.classList.add('hidden');
        setTimeout(() => overlay.remove(), 300);
    }
}

/**
 * Show balance error UI
 */
function showBalanceErrorUI(context) {
    showFriendlyErrorUI('toast.balanceError', 'toast.balanceErrorHint', '🌺', context);
}

/**
 * Show auth error UI
 */
function showAuthErrorUI(context) {
    showFriendlyErrorUI('toast.authError', 'toast.authErrorHint', '🔑', context);
}

// ===== Logs Viewer =====

/**
 * Setup logs viewer controls
 */
function setupLogsViewer() {
    const logsContainer = document.getElementById('logsContainer');
    const exportBtn = document.getElementById('exportLogsBtn');
    const clearLogsBtn = document.getElementById('clearLogsBtn');
    const refreshLogsBtn = document.getElementById('refreshLogsBtn');
    const logsFilter = document.getElementById('logsFilter');

    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            Logger.export();
            showToast(i18n.t('toast.logsExported'), 'success');
        });
    }

    if (clearLogsBtn) {
        clearLogsBtn.addEventListener('click', () => {
            if (confirm(i18n.t('settings.logsConfirmClear') || 'Limpar todos os logs?')) {
                Logger.clear();
                renderLogs();
                showToast(i18n.t('toast.logsCleared'), 'success');
            }
        });
    }

    if (refreshLogsBtn) {
        refreshLogsBtn.addEventListener('click', () => renderLogs());
    }

    if (logsFilter) {
        logsFilter.addEventListener('change', () => renderLogs());
    }

    // Re-render when language changes
    window.addEventListener('languageChanged', () => renderLogs());

    // Initial render
    renderLogs();
}

/**
 * Render logs in the logs container
 */
function renderLogs() {
    const container = document.getElementById('logsContainer');
    const filter = document.getElementById('logsFilter')?.value;
    if (!container) return;

    const logs = Logger.getLogs(filter, 100);

    if (logs.length === 0) {
        container.innerHTML = `<p class="logs-empty">${i18n.t('settings.logsEmpty')}</p>`;
        return;
    }

    const levelColors = {
        error: '#ef4444',
        warn: '#f59e0b',
        info: '#22c55e',
        debug: '#8b5cf6'
    };

    container.innerHTML = logs.map(log => {
        const time = new Date(log.timestamp).toLocaleTimeString('pt-BR');
        const color = levelColors[log.level] || '#a0a0a0';
        return `
            <div class="log-entry log-${log.level}">
                <span class="log-time">${time}</span>
                <span class="log-level" style="color: ${color}">[${log.level.toUpperCase()}]</span>
                <span class="log-message">${log.message}</span>
                ${log.data ? `<pre class="log-data">${log.data}</pre>` : ''}
            </div>
        `;
    }).join('');
}

// ===== Setup Modal (First-Run) =====

/**
 * Show the first-run setup modal
 */
function showSetupModal() {
    const modal = document.getElementById('setupModal');
    const confirmBtn = document.getElementById('setupConfirmBtn');
    const languageSelect = document.getElementById('setupLanguage');
    const apiKeyInput = document.getElementById('setupApiKey');

    languageSelect.value = state.language;

    languageSelect.addEventListener('change', (e) => {
        i18n.setLanguage(e.target.value);
    });

    confirmBtn.addEventListener('click', () => {
        state.apiKey = apiKeyInput.value.trim();
        state.language = languageSelect.value;
        state.firstRun = false;

        localStorage.setItem('apiKey', state.apiKey);
        localStorage.setItem('language', state.language);
        localStorage.setItem('firstRun', 'false');

        credentialManager.update(state.apiKey);

        modal.classList.add('hidden');
        continueInitialization();
    });

    modal.classList.remove('hidden');
    i18n.updateUI();
}

// ===== Expose Globally =====
window.setupNavigation = setupNavigation;
window.showLoading = showLoading;
window.showToast = showToast;
window.setupModal = setupModal;
window.closeModal = closeModal;
window.showFriendlyErrorUI = showFriendlyErrorUI;
window.hideFriendlyErrorUI = hideFriendlyErrorUI;
window.hideBalanceErrorUI = hideFriendlyErrorUI; // Alias for compatibility
window.showBalanceErrorUI = showBalanceErrorUI;
window.showAuthErrorUI = showAuthErrorUI;
window.setupLogsViewer = setupLogsViewer;
window.renderLogs = renderLogs;
window.showSetupModal = showSetupModal;
