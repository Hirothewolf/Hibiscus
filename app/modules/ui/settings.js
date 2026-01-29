/**
 * Hibiscus 🌺 - Settings Module
 * Handles settings UI, stats, and form options persistence
 */

// ===== Settings Setup =====

/**
 * Setup settings tab controls and event listeners
 */
function setupSettings() {
    const saveApiKeyBtn = document.getElementById('saveApiKey');
    const autoDownloadCheckbox = document.getElementById('autoDownloadEnabled');
    const filenameFormatSelect = document.getElementById('filenameFormat');
    const themeSelect = document.getElementById('theme');
    const languageSelect = document.getElementById('language');

    saveApiKeyBtn.addEventListener('click', () => {
        state.apiKey = document.getElementById('apiKey').value.trim();
        localStorage.setItem('apiKey', state.apiKey);
        credentialManager.update(state.apiKey);
        showToast(i18n.t('toast.apiKeySaved'), 'success');
    });

    autoDownloadCheckbox.addEventListener('change', (e) => {
        state.autoDownload = e.target.checked;
        localStorage.setItem('autoDownload', state.autoDownload);
        updateAutoDownloadStatus();
        showToast(state.autoDownload ? i18n.t('status.autoDownloadOn') : i18n.t('status.autoDownloadOff'), 'success');
    });

    filenameFormatSelect.addEventListener('change', (e) => {
        state.filenameFormat = e.target.value;
        localStorage.setItem('filenameFormat', state.filenameFormat);
    });

    themeSelect.addEventListener('change', (e) => {
        state.theme = e.target.value;
        localStorage.setItem('theme', state.theme);
        document.body.setAttribute('data-theme', state.theme);
    });

    // Language selector
    if (languageSelect) {
        languageSelect.addEventListener('change', (e) => {
            state.language = e.target.value;
            i18n.setLanguage(state.language);
            showToast('Idioma alterado!', 'success');
        });
    }

    // Media directory settings
    setupMediaDirectorySettings();
}

/**
 * Setup custom media directory settings
 */
function setupMediaDirectorySettings() {
    const useCustomDirCheckbox = document.getElementById('useCustomMediaDir');
    const customDirGroup = document.getElementById('customDirGroup');
    const customDirInput = document.getElementById('customMediaDir');
    const selectDirBtn = document.getElementById('selectMediaDirBtn');

    if (!useCustomDirCheckbox) return;

    // Initialize state
    useCustomDirCheckbox.checked = state.useCustomMediaDir;
    customDirInput.value = state.customMediaDir;
    customDirGroup.style.display = state.useCustomMediaDir ? 'block' : 'none';

    useCustomDirCheckbox.addEventListener('change', (e) => {
        state.useCustomMediaDir = e.target.checked;
        localStorage.setItem('useCustomMediaDir', state.useCustomMediaDir);
        customDirGroup.style.display = state.useCustomMediaDir ? 'block' : 'none';

        if (!state.useCustomMediaDir) {
            showToast(i18n.t('settings.dirReset'), 'info');
        }
    });

    selectDirBtn.addEventListener('click', async () => {
        // Use File System Access API if available
        if ('showDirectoryPicker' in window) {
            try {
                const dirHandle = await window.showDirectoryPicker({
                    mode: 'readwrite'
                });
                state.customMediaDir = dirHandle.name;
                state.customMediaDirHandle = dirHandle;
                localStorage.setItem('customMediaDir', state.customMediaDir);
                customDirInput.value = state.customMediaDir;
                showToast(i18n.t('settings.dirSelected'), 'success');
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error('Directory selection failed:', err);
                }
            }
        } else {
            // Fallback: prompt for manual path entry
            const path = prompt('Digite o caminho da pasta:', state.customMediaDir || '');
            if (path) {
                state.customMediaDir = path;
                localStorage.setItem('customMediaDir', state.customMediaDir);
                customDirInput.value = state.customMediaDir;
                showToast(i18n.t('settings.dirSelected'), 'success');
            }
        }
    });
}

// ===== Auto-Download Status =====

/**
 * Update the auto-download status indicator
 */
function updateAutoDownloadStatus() {
    const dot = document.getElementById('autoDownloadDot');
    const text = document.getElementById('autoDownloadText');

    if (state.autoDownload) {
        dot.classList.add('active');
        text.textContent = 'Auto-download: ON';
    } else {
        dot.classList.remove('active');
        text.textContent = 'Auto-download: OFF';
    }
}

// ===== Stats =====

/**
 * Save stats to localStorage
 */
function saveStats() {
    localStorage.setItem('stats', JSON.stringify(state.stats));
}

/**
 * Update stats display in the UI
 */
function updateStats() {
    document.getElementById('totalImages').textContent = state.stats.images;
    document.getElementById('totalVideos').textContent = state.stats.videos;
    document.getElementById('totalDownloads').textContent = state.stats.downloads;
}

// ===== Form Options Persistence =====

/**
 * Load saved form options into UI elements
 */
function loadFormOptionsToUI() {
    const opts = state.formOptions;

    // Image generation options
    if (opts.image) {
        const imageModel = document.getElementById('imageModel');
        if (imageModel && opts.image.model) imageModel.value = opts.image.model;

        const imageQuality = document.getElementById('imageQuality');
        if (imageQuality && opts.image.quality) imageQuality.value = opts.image.quality;

        const imageSeed = document.getElementById('imageSeed');
        if (imageSeed && opts.image.seed) imageSeed.value = opts.image.seed;

        const imageGuidance = document.getElementById('imageGuidance');
        if (imageGuidance && opts.image.guidance) imageGuidance.value = opts.image.guidance;

        const imageEnhance = document.getElementById('imageEnhance');
        if (imageEnhance) imageEnhance.checked = opts.image.enhance || false;

        const imageTransparent = document.getElementById('imageTransparent');
        if (imageTransparent) imageTransparent.checked = opts.image.transparent || false;

        const imageNoLogo = document.getElementById('imageNoLogo');
        if (imageNoLogo) imageNoLogo.checked = opts.image.nologo || false;

        const imageSafe = document.getElementById('imageSafe');
        if (imageSafe) imageSafe.checked = opts.image.safe !== false;
    }

    // Edit options
    if (opts.edit) {
        const editModel = document.getElementById('editModel');
        if (editModel && opts.edit.model) editModel.value = opts.edit.model;

        const editSeed = document.getElementById('editSeed');
        if (editSeed && opts.edit.seed) editSeed.value = opts.edit.seed;

        const editGuidance = document.getElementById('editGuidance');
        if (editGuidance && opts.edit.guidance) editGuidance.value = opts.edit.guidance;

        const editEnhance = document.getElementById('editEnhance');
        if (editEnhance) editEnhance.checked = opts.edit.enhance || false;

        const editTransparent = document.getElementById('editTransparent');
        if (editTransparent) editTransparent.checked = opts.edit.transparent || false;

        const editNoLogo = document.getElementById('editNoLogo');
        if (editNoLogo) editNoLogo.checked = opts.edit.nologo || false;

        const editSafe = document.getElementById('editSafe');
        if (editSafe) editSafe.checked = opts.edit.safe !== false;
    }

    // Video options
    if (opts.video) {
        const videoModel = document.getElementById('videoModel');
        if (videoModel && opts.video.model) videoModel.value = opts.video.model;

        const videoDuration = document.getElementById('videoDuration');
        if (videoDuration && opts.video.duration) videoDuration.value = opts.video.duration;

        const videoAspectRatio = document.getElementById('videoAspectRatio');
        if (videoAspectRatio && opts.video.aspectRatio) videoAspectRatio.value = opts.video.aspectRatio;

        const videoAudio = document.getElementById('videoAudio');
        if (videoAudio) videoAudio.checked = opts.video.audio || false;

        const videoEnhance = document.getElementById('videoEnhance');
        if (videoEnhance) videoEnhance.checked = opts.video.enhance || false;
    }
}

/**
 * Setup listeners to persist form options on change
 */
function setupFormOptionsListeners() {
    // Image generation
    const imageFields = [
        { id: 'imageModel', key: 'model', group: 'image' },
        { id: 'imageQuality', key: 'quality', group: 'image' },
        { id: 'imageSeed', key: 'seed', group: 'image' },
        { id: 'imageGuidance', key: 'guidance', group: 'image' },
        { id: 'imageEnhance', key: 'enhance', group: 'image', isCheckbox: true },
        { id: 'imageTransparent', key: 'transparent', group: 'image', isCheckbox: true },
        { id: 'imageNoLogo', key: 'nologo', group: 'image', isCheckbox: true },
        { id: 'imageSafe', key: 'safe', group: 'image', isCheckbox: true }
    ];

    // Edit
    const editFields = [
        { id: 'editModel', key: 'model', group: 'edit' },
        { id: 'editSeed', key: 'seed', group: 'edit' },
        { id: 'editGuidance', key: 'guidance', group: 'edit' },
        { id: 'editEnhance', key: 'enhance', group: 'edit', isCheckbox: true },
        { id: 'editTransparent', key: 'transparent', group: 'edit', isCheckbox: true },
        { id: 'editNoLogo', key: 'nologo', group: 'edit', isCheckbox: true },
        { id: 'editSafe', key: 'safe', group: 'edit', isCheckbox: true }
    ];

    // Video
    const videoFields = [
        { id: 'videoModel', key: 'model', group: 'video' },
        { id: 'videoDuration', key: 'duration', group: 'video' },
        { id: 'videoAspectRatio', key: 'aspectRatio', group: 'video' },
        { id: 'videoAudio', key: 'audio', group: 'video', isCheckbox: true },
        { id: 'videoEnhance', key: 'enhance', group: 'video', isCheckbox: true }
    ];

    const allFields = [...imageFields, ...editFields, ...videoFields];

    allFields.forEach(field => {
        const element = document.getElementById(field.id);
        if (element) {
            const eventType = field.isCheckbox ? 'change' : 'input';
            element.addEventListener(eventType, () => {
                const value = field.isCheckbox ? element.checked : element.value;
                state.formOptions[field.group][field.key] = value;
                saveFormOptions();
            });
        }
    });
}

// ===== Export/Import Settings =====

/**
 * Export all settings to a JSON file
 */
function exportSettings() {
    const settings = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        apiKey: state.apiKey,
        autoDownload: state.autoDownload,
        filenameFormat: state.filenameFormat,
        theme: state.theme,
        language: state.language,
        useCustomMediaDir: state.useCustomMediaDir,
        customMediaDir: state.customMediaDir,
        formOptions: state.formOptions
    };

    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hibiscus-settings-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(i18n.t('toast.settingsExported') || 'Configurações exportadas!', 'success');
    Logger.info('Settings exported');
}

/**
 * Import settings from a JSON file
 * @param {File} file - The JSON file to import
 */
async function importSettings(file) {
    if (!file) return;

    try {
        const text = await file.text();
        const settings = JSON.parse(text);

        // Validate structure
        if (!settings.version) {
            throw new Error('Invalid settings file format');
        }

        // Apply settings
        if (settings.apiKey !== undefined) {
            state.apiKey = settings.apiKey;
            localStorage.setItem('apiKey', state.apiKey);
            document.getElementById('apiKey').value = state.apiKey;
            credentialManager.update(state.apiKey);
        }

        if (settings.autoDownload !== undefined) {
            state.autoDownload = settings.autoDownload;
            localStorage.setItem('autoDownload', state.autoDownload);
            document.getElementById('autoDownloadEnabled').checked = state.autoDownload;
            updateAutoDownloadStatus();
        }

        if (settings.filenameFormat !== undefined) {
            state.filenameFormat = settings.filenameFormat;
            localStorage.setItem('filenameFormat', state.filenameFormat);
            document.getElementById('filenameFormat').value = state.filenameFormat;
        }

        if (settings.theme !== undefined) {
            state.theme = settings.theme;
            localStorage.setItem('theme', state.theme);
            document.getElementById('theme').value = state.theme;
            document.body.setAttribute('data-theme', state.theme);
        }

        if (settings.language !== undefined) {
            state.language = settings.language;
            localStorage.setItem('language', state.language);
            document.getElementById('language').value = state.language;
            i18n.setLanguage(state.language);
        }

        if (settings.useCustomMediaDir !== undefined) {
            state.useCustomMediaDir = settings.useCustomMediaDir;
            localStorage.setItem('useCustomMediaDir', state.useCustomMediaDir);
            const checkbox = document.getElementById('useCustomMediaDir');
            if (checkbox) checkbox.checked = state.useCustomMediaDir;
        }

        if (settings.customMediaDir !== undefined) {
            state.customMediaDir = settings.customMediaDir;
            localStorage.setItem('customMediaDir', state.customMediaDir);
            const input = document.getElementById('customMediaDir');
            if (input) input.value = state.customMediaDir;
        }

        if (settings.formOptions) {
            state.formOptions = { ...state.formOptions, ...settings.formOptions };
            saveFormOptions();
            loadFormOptionsToUI();
        }

        showToast(i18n.t('toast.settingsImported') || 'Configurações importadas!', 'success');
        Logger.info('Settings imported', { version: settings.version, date: settings.exportDate });
    } catch (error) {
        Logger.error('Failed to import settings', { error: error.message });
        showToast(i18n.t('toast.importError') || 'Erro ao importar configurações', 'error');
    }
}

/**
 * Handle file input change for import
 */
function handleSettingsImport(event) {
    const file = event.target.files[0];
    if (file) {
        importSettings(file);
        // Reset input so same file can be imported again
        event.target.value = '';
    }
}

// ===== Expose Globally =====
window.setupSettings = setupSettings;
window.updateAutoDownloadStatus = updateAutoDownloadStatus;
window.saveStats = saveStats;
window.updateStats = updateStats;
window.loadFormOptionsToUI = loadFormOptionsToUI;
window.setupFormOptionsListeners = setupFormOptionsListeners;
window.exportSettings = exportSettings;
window.importSettings = importSettings;
window.handleSettingsImport = handleSettingsImport;
