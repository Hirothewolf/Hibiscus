/**
 * Hibiscus 🌺 - Main Orchestrator
 * 
 * This file serves as the main entry point and orchestrator.
 * All functionality is delegated to specialized modules:
 * 
 * - modules/core/utils.js - Download, filename, upload helpers
 * - modules/core/api.js - API fetch, retry logic, safety filters
 * - modules/ui/ui-manager.js - Navigation, toasts, modals, loading
 * - modules/ui/settings.js - Settings UI and form persistence
 * - modules/gallery/gallery.js - Gallery with memory management
 * - modules/generators/image-gen.js - Image generation and models
 * - modules/generators/video-gen.js - Video generation
 * - modules/generators/editor.js - Image editing (img2img)
 */

// ===== Hibiscus Global Environment =====
window.Hibiscus = window.Hibiscus || {};

// Map Core State
// Note: 'state' is initialized in state.js
Object.defineProperty(window.Hibiscus, 'state', {
    get: () => window.state,
    enumerable: true
});

// Map Modules
window.Hibiscus.API = {
    fetchWithAuth: window.fetchWithAuth,
    fetchWithRetry: window.fetchWithRetry,
    fetchVideoWithTimeout: window.fetchVideoWithTimeout,
    parseError: window.parseAPIError
};

window.Hibiscus.UI = {
    showToast: window.showToast,
    showLoading: window.showLoading,
    updateBalance: window.updateBalanceUI,
    modals: {
        show: window.showModal,
        close: window.closeModal
    }
};

window.Hibiscus.Utils = {
    generateFilename: window.generateFilename,
    downloadFile: window.downloadFile,
    sleep: window.sleep
};

// ===== Initialization =====

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

/**
 * Main initialization function
 */
async function initializeApp() {
    Logger.info('Hibiscus 🌺 initializing...');

    // Initialize credential manager
    credentialManager.init();

    // Set language
    i18n.current = state.language;

    // Show first-run setup modal if needed
    if (state.firstRun) {
        showSetupModal();
        return; // Will continue after setup
    }

    await continueInitialization();
}

/**
 * Continue initialization after setup modal (if applicable)
 */
async function continueInitialization() {
    // Apply theme
    document.body.setAttribute('data-theme', state.theme);

    // Apply language
    i18n.setLanguage(state.language);

    // Check backend connection and load gallery
    await Backend.checkConnection();
    if (Backend.available) {
        const backendData = await Backend.loadGallery();
        if (backendData) {
            state.gallery = backendData.items || [];
            state.stats = backendData.stats || state.stats;
            Logger.info('Gallery loaded from backend', { items: state.gallery.length });
        }
    }

    // Load models from API
    loadModelsFromAPI();

    // Setup UI components
    setupNavigation();
    setupAspectRatioButtons();
    setupResolutionMultiplier();

    // Setup generators
    setupImageGeneration();
    setupImageEditing();
    setupVideoGeneration();
    setupParallelGeneration();

    // Setup gallery
    setupGallery();

    // Setup settings
    setupSettings();

    // Setup modal
    setupModal();

    // Setup logs viewer
    setupLogsViewer();

    // Update UI with saved state
    updateAutoDownloadStatus();
    updateStats();
    renderGallery();

    // Load saved settings into form
    document.getElementById('apiKey').value = state.apiKey;
    document.getElementById('language').value = state.language;
    document.getElementById('autoDownloadEnabled').checked = state.autoDownload;
    document.getElementById('filenameFormat').value = state.filenameFormat;
    document.getElementById('theme').value = state.theme;

    // Load saved form options and setup listeners
    loadFormOptionsToUI();
    setupFormOptionsListeners();

    // Fetch and display balance
    updateBalanceUI();

    Logger.info('App initialized successfully', { backendAvailable: Backend.available });
}

/**
 * Fetch and update balance UI
 */
async function updateBalanceUI() {
    if (!state.apiKey) return;

    const balance = await fetchAccountBalance();
    if (balance !== null) {
        const balanceEl = document.getElementById('apiBalance');
        if (balanceEl) {
            balanceEl.textContent = `$${balance.toFixed(2)}`;
            balanceEl.classList.add('visible');
            if (balance < 1) balanceEl.style.color = 'var(--error)';
            else balanceEl.style.color = 'var(--success)';
        }
    }
}

// ===== Make key functions available globally =====
window.initializeApp = initializeApp;
window.continueInitialization = continueInitialization;
window.updateBalanceUI = updateBalanceUI;
