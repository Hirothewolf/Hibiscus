/**
 * Hibiscus 🌺 - State Module
 * Gerenciamento de estado global da aplicação
 */

// ===== State Management =====
const state = {
    apiKey: localStorage.getItem('apiKey') || '',
    autoDownload: localStorage.getItem('autoDownload') === 'true',
    downloadPath: localStorage.getItem('downloadPath') || 'Hibiscus',
    filenameFormat: localStorage.getItem('filenameFormat') || 'both',
    useCustomMediaDir: localStorage.getItem('useCustomMediaDir') === 'true',
    customMediaDir: localStorage.getItem('customMediaDir') || '',
    theme: localStorage.getItem('theme') || 'dark',
    language: localStorage.getItem('language') || 'pt',
    firstRun: localStorage.getItem('firstRun') !== 'false',
    gallery: JSON.parse(localStorage.getItem('gallery') || '[]'),
    stats: JSON.parse(localStorage.getItem('stats') || '{"images": 0, "videos": 0, "downloads": 0}'),
    currentImageUrl: null,
    currentVideoUrl: null,
    currentEditUrl: null,
    // Dynamic models from API
    imageModels: [],
    textModels: [],
    modelsLoaded: false,
    // Form options (persistent)
    formOptions: JSON.parse(localStorage.getItem('formOptions') || JSON.stringify({
        // Image generation options
        image: {
            model: 'flux',
            quality: 'medium',
            aspectRatio: '1:1',
            seed: '-1',
            guidance: '7.5',
            enhance: false,
            transparent: false,
            nologo: false,
            safe: true
        },
        // Image editing options
        edit: {
            model: 'flux',
            aspectRatio: '1:1',
            seed: '-1',
            guidance: '7.5',
            enhance: false,
            transparent: false,
            nologo: false,
            safe: true
        },
        // Video generation options
        video: {
            model: 'veo',
            duration: '5',
            aspectRatio: 'landscape',
            audio: false,
            enhance: false
        }
    }))
};

// ===== Credential Manager =====
const credentialManager = {
    _keys: [],
    _currentIndex: 0,
    _failedKeys: new Set(),
    
    /**
     * Inicializa o gerenciador com as chaves do state
     */
    init() {
        this._parseKeys(state.apiKey);
    },
    
    /**
     * Parseia string de chaves separadas por vírgula
     */
    _parseKeys(keyString) {
        if (!keyString) {
            this._keys = [];
            return;
        }
        this._keys = keyString.split(',').map(k => k.trim()).filter(k => k.length > 0);
        this._currentIndex = 0;
        this._failedKeys.clear();
    },
    
    /**
     * Atualiza as chaves
     */
    update(keyString) {
        this._parseKeys(keyString);
    },
    
    /**
     * Obtém a chave atual válida
     * @returns {string|null} Chave atual ou null
     */
    getCurrent() {
        if (this._keys.length === 0) return null;
        if (this._failedKeys.size >= this._keys.length) {
            // All keys failed, reset and try again
            this._failedKeys.clear();
            this._currentIndex = 0;
        }
        // Find next valid key
        let attempts = 0;
        while (attempts < this._keys.length) {
            const key = this._keys[this._currentIndex];
            if (!this._failedKeys.has(key)) {
                return key;
            }
            this._currentIndex = (this._currentIndex + 1) % this._keys.length;
            attempts++;
        }
        return this._keys[0]; // Fallback
    },
    
    /**
     * Marca uma chave como falhou (para rotação)
     */
    markFailed(key) {
        if (key && this._keys.length > 1) {
            this._failedKeys.add(key);
            this._currentIndex = (this._currentIndex + 1) % this._keys.length;
            if (typeof Logger !== 'undefined') {
                Logger.debug('Credential rotated');
            }
        }
    },
    
    /**
     * Verifica se há múltiplas chaves
     */
    hasMultiple() {
        return this._keys.length > 1;
    }
};

// ===== Safety Filter Retry State =====
const safetyRetryStates = {
    imageLoading: { active: false, cancelled: false, failures: 0, currentAttempt: 0 },
    editLoading: { active: false, cancelled: false, failures: 0, currentAttempt: 0 }
};

/**
 * Salva as opções de formulário no localStorage
 */
function saveFormOptions() {
    localStorage.setItem('formOptions', JSON.stringify(state.formOptions));
}

// Expõe globalmente
window.state = state;
window.credentialManager = credentialManager;
window.safetyRetryStates = safetyRetryStates;
window.saveFormOptions = saveFormOptions;
