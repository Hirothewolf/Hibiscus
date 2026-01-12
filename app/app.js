/**
 * Hibiscus 🌺
 * Interface completa para geração e edição de imagens/vídeos
 * com auto-download organizado por data
 */

// ===== Módulos =====
// i18n é carregado via script tag no index.html e exposto globalmente

// ===== Configuration =====
const API_BASE = 'https://gen.pollinations.ai';
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff
const MAX_SAFETY_RETRIES = 50; // Maximum retries for safety filter errors
const VIDEO_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes timeout for video generation

// ===== Form Options Persistence =====
function loadFormOptionsToUI() {
    const opts = state.formOptions;
    
    // Image generation
    const imageModel = document.getElementById('imageModel');
    const quality = document.getElementById('quality');
    const seed = document.getElementById('seed');
    const guidance = document.getElementById('guidance');
    const enhance = document.getElementById('enhance');
    const transparent = document.getElementById('transparent');
    const nologo = document.getElementById('nologo');
    const safe = document.getElementById('safe');
    
    if (imageModel && opts.image.model) imageModel.value = opts.image.model;
    if (quality) quality.value = opts.image.quality;
    if (seed) seed.value = opts.image.seed;
    if (guidance) guidance.value = opts.image.guidance;
    if (enhance) enhance.checked = opts.image.enhance;
    if (transparent) transparent.checked = opts.image.transparent;
    if (nologo) nologo.checked = opts.image.nologo;
    if (safe) safe.checked = opts.image.safe;
    
    // Set aspect ratio button for image generation
    const imageAspectContainer = document.getElementById('imageAspectRatios');
    if (imageAspectContainer) {
        imageAspectContainer.querySelectorAll('.aspect-btn').forEach(btn => {
            const isActive = btn.dataset.ratio === opts.image.aspectRatio;
            btn.classList.toggle('active', isActive);
            if (isActive) {
                document.getElementById('imageWidth').value = btn.dataset.w;
                document.getElementById('imageHeight').value = btn.dataset.h;
            }
        });
    }
    
    // Image editing
    const editModel = document.getElementById('editModel');
    const editSeed = document.getElementById('editSeed');
    const editGuidance = document.getElementById('editGuidance');
    const editEnhance = document.getElementById('editEnhance');
    const editTransparent = document.getElementById('editTransparent');
    const editNoLogo = document.getElementById('editNoLogo');
    const editSafe = document.getElementById('editSafe');
    
    if (editModel && opts.edit.model) editModel.value = opts.edit.model;
    if (editSeed) editSeed.value = opts.edit.seed;
    if (editGuidance) editGuidance.value = opts.edit.guidance;
    if (editEnhance) editEnhance.checked = opts.edit.enhance;
    if (editTransparent) editTransparent.checked = opts.edit.transparent;
    if (editNoLogo) editNoLogo.checked = opts.edit.nologo;
    if (editSafe) editSafe.checked = opts.edit.safe;
    
    // Set aspect ratio button for image editing
    const editAspectContainer = document.getElementById('editAspectRatios');
    if (editAspectContainer) {
        editAspectContainer.querySelectorAll('.aspect-btn').forEach(btn => {
            const isActive = btn.dataset.ratio === opts.edit.aspectRatio;
            btn.classList.toggle('active', isActive);
            if (isActive) {
                document.getElementById('editWidth').value = btn.dataset.w;
                document.getElementById('editHeight').value = btn.dataset.h;
            }
        });
    }
    
    // Video generation
    const videoModel = document.getElementById('videoModel');
    const duration = document.getElementById('duration');
    const videoAspect = document.getElementById('videoAspect');
    const audio = document.getElementById('audio');
    const videoEnhance = document.getElementById('videoEnhance');
    
    if (videoModel && opts.video.model) videoModel.value = opts.video.model;
    if (duration) duration.value = opts.video.duration;
    if (videoAspect) videoAspect.value = opts.video.aspectRatio;
    if (audio) audio.checked = opts.video.audio;
    if (videoEnhance) videoEnhance.checked = opts.video.enhance;
}

function setupFormOptionsListeners() {
    // Image generation listeners
    const imageFields = ['imageModel', 'quality', 'seed', 'guidance'];
    imageFields.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', () => {
                const key = id === 'imageModel' ? 'model' : id;
                state.formOptions.image[key] = el.value;
                saveFormOptions();
            });
        }
    });
    
    const imageCheckboxes = ['enhance', 'transparent', 'nologo', 'safe'];
    imageCheckboxes.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', () => {
                state.formOptions.image[id] = el.checked;
                saveFormOptions();
            });
        }
    });
    
    // Image editing listeners
    const editFields = ['editModel', 'editSeed', 'editGuidance'];
    editFields.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', () => {
                const key = id.replace('edit', '').toLowerCase();
                state.formOptions.edit[key] = el.value;
                saveFormOptions();
            });
        }
    });
    
    const editCheckboxes = ['editEnhance', 'editTransparent', 'editNoLogo', 'editSafe'];
    editCheckboxes.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', () => {
                const key = id.replace('edit', '').toLowerCase();
                state.formOptions.edit[key] = el.checked;
                saveFormOptions();
            });
        }
    });
    
    // Video generation listeners
    const videoFields = ['videoModel', 'duration', 'videoAspect'];
    videoFields.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', () => {
                const key = id === 'videoModel' ? 'model' : (id === 'videoAspect' ? 'aspectRatio' : id);
                state.formOptions.video[key] = el.value;
                saveFormOptions();
            });
        }
    });
    
    const videoCheckboxes = ['audio', 'videoEnhance'];
    videoCheckboxes.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', () => {
                const key = id === 'videoEnhance' ? 'enhance' : id;
                state.formOptions.video[key] = el.checked;
                saveFormOptions();
            });
        }
    });
}

// ===== Initialization =====
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

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
    
    continueInitialization();
}

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
    
    // Load models from API first
    loadModelsFromAPI();
    
    // Setup navigation
    setupNavigation();
    
    // Setup aspect ratio buttons
    setupAspectRatioButtons();
    
    // Setup forms
    setupImageGeneration();
    setupImageEditing();
    setupVideoGeneration();
    
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
    
    Logger.info('App initialized successfully', { backendAvailable: Backend.available });
}

// ===== Model Discovery =====
async function loadModelsFromAPI() {
    Logger.info('Loading models from API...');
    
    try {
        // Load image models
        const imageResponse = await fetchWithRetry(`${API_BASE}/image/models`);
        if (imageResponse.ok) {
            state.imageModels = await imageResponse.json();
            Logger.info('Image models loaded', { count: state.imageModels.length });
            populateImageModelSelects();
        }
    } catch (error) {
        Logger.error('Failed to load image models', { error: error.message });
        // Use fallback models
        useFallbackImageModels();
    }
    
    try {
        // Load text models
        const textResponse = await fetchWithRetry(`${API_BASE}/text/models`);
        if (textResponse.ok) {
            state.textModels = await textResponse.json();
            Logger.info('Text models loaded', { count: state.textModels.length });
        }
    } catch (error) {
        Logger.error('Failed to load text models', { error: error.message });
    }
    
    state.modelsLoaded = true;
}

function useFallbackImageModels() {
    Logger.warn('Using fallback image models');
    state.imageModels = [
        { name: 'flux', description: 'Flux - Default high quality model' },
        { name: 'zimage', description: 'Z-Image' },
        { name: 'turbo', description: 'Turbo - Fast generation' },
        { name: 'gptimage', description: 'GPT Image' },
        { name: 'gptimage-large', description: 'GPT Image Large' },
        { name: 'kontext', description: 'Kontext - Good for editing' },
        { name: 'seedream', description: 'Seedream' },
        { name: 'seedream-pro', description: 'Seedream Pro' },
        { name: 'nanobanana', description: 'Nanobanana' },
        { name: 'nanobanana-pro', description: 'Nanobanana Pro' },
        { name: 'veo', description: 'Veo - Video generation' },
        { name: 'seedance', description: 'Seedance - Video generation' },
        { name: 'seedance-pro', description: 'Seedance Pro - Video generation' }
    ];
    populateImageModelSelects();
}

function populateImageModelSelects() {
    const imageModelSelect = document.getElementById('imageModel');
    const editModelSelect = document.getElementById('editModel');
    const videoModelSelect = document.getElementById('videoModel');
    
    // Separate models by type
    const imageOnlyModels = state.imageModels.filter(m => 
        !['veo', 'seedance', 'seedance-pro', 'video'].includes(m.name.toLowerCase())
    );
    const videoModels = state.imageModels.filter(m => 
        ['veo', 'seedance', 'seedance-pro', 'video'].includes(m.name.toLowerCase())
    );
    
    // Populate image generation select
    if (imageModelSelect) {
        imageModelSelect.innerHTML = imageOnlyModels.map(model => {
            const displayName = model.description || model.name;
            const isDefault = model.name === 'flux';
            return `<option value="${model.name}" ${isDefault ? 'selected' : ''}>${displayName}</option>`;
        }).join('');
    }
    
    // Populate edit select (all image models that support img2img)
    if (editModelSelect) {
        editModelSelect.innerHTML = imageOnlyModels.map(model => {
            const displayName = model.description || model.name;
            const isDefault = model.name === 'kontext';
            return `<option value="${model.name}" ${isDefault ? 'selected' : ''}>${displayName}</option>`;
        }).join('');
    }
    
    // Populate video select
    if (videoModelSelect && videoModels.length > 0) {
        videoModelSelect.innerHTML = videoModels.map(model => {
            const displayName = model.description || model.name;
            const isDefault = model.name === 'veo';
            return `<option value="${model.name}" ${isDefault ? 'selected' : ''}>${displayName}</option>`;
        }).join('');
    }
    
    Logger.debug('Model selects populated', { 
        image: imageOnlyModels.length, 
        video: videoModels.length 
    });
}

// ===== Navigation =====
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

// ===== Aspect Ratio Buttons =====
function setupAspectRatioButtons() {
    // Setup for image generation
    setupAspectRatioContainer('imageAspectRatios', 'imageWidth', 'imageHeight');
    
    // Setup for image editing (img2img)
    setupAspectRatioContainer('editAspectRatios', 'editWidth', 'editHeight');
}

function setupAspectRatioContainer(containerId, widthInputId, heightInputId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const widthInput = document.getElementById(widthInputId);
    const heightInput = document.getElementById(heightInputId);
    
    // Determine which form this container belongs to
    const isEditForm = containerId.includes('edit') || containerId.includes('Edit');
    
    container.querySelectorAll('.aspect-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active from all in this container
            container.querySelectorAll('.aspect-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Set width and height
            const width = btn.dataset.w;
            const height = btn.dataset.h;
            
            widthInput.value = width;
            heightInput.value = height;
            
            // Save to form options
            if (isEditForm) {
                state.formOptions.edit.aspectRatio = btn.dataset.ratio;
            } else {
                state.formOptions.image.aspectRatio = btn.dataset.ratio;
            }
            saveFormOptions();
            
            Logger.debug('Aspect ratio changed', { container: containerId, ratio: btn.dataset.ratio, width, height });
        });
    });
    
    // Also update aspect ratio button when width/height manually changed
    const updateAspectButtonFromInputs = () => {
        const w = parseInt(widthInput.value);
        const h = parseInt(heightInput.value);
        const ratio = w / h;
        
        container.querySelectorAll('.aspect-btn').forEach(btn => {
            const btnW = parseInt(btn.dataset.w);
            const btnH = parseInt(btn.dataset.h);
            const btnRatio = btnW / btnH;
            
            if (Math.abs(ratio - btnRatio) < 0.05) {
                container.querySelectorAll('.aspect-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Save to form options
                if (isEditForm) {
                    state.formOptions.edit.aspectRatio = btn.dataset.ratio;
                } else {
                    state.formOptions.image.aspectRatio = btn.dataset.ratio;
                }
                saveFormOptions();
            }
        });
    };
    
    widthInput.addEventListener('change', updateAspectButtonFromInputs);
    heightInput.addEventListener('change', updateAspectButtonFromInputs);
}

// ===== Image Generation =====
function setupImageGeneration() {
    const generateBtn = document.getElementById('generateImageBtn');
    const downloadBtn = document.getElementById('downloadImageBtn');
    const editBtn = document.getElementById('editImageBtn');
    const regenerateBtn = document.getElementById('regenerateImageBtn');
    
    generateBtn.addEventListener('click', generateImage);
    downloadBtn.addEventListener('click', () => downloadCurrentImage());
    editBtn.addEventListener('click', sendToEdit);
    regenerateBtn.addEventListener('click', generateImage);
}

async function generateImage() {
    const prompt = document.getElementById('imagePrompt').value.trim();
    if (!prompt) {
        showToast(i18n.t('toast.enterPrompt') || 'Digite um prompt para gerar a imagem', 'warning');
        return;
    }
    
    Logger.info('Starting image generation', { prompt: prompt.slice(0, 100) });
    
    const params = {
        model: document.getElementById('imageModel').value,
        width: document.getElementById('imageWidth').value,
        height: document.getElementById('imageHeight').value,
        seed: document.getElementById('imageSeed').value,
        negative_prompt: document.getElementById('imageNegativePrompt').value,
        quality: document.getElementById('imageQuality').value,
        guidance_scale: document.getElementById('imageGuidance').value,
        enhance: document.getElementById('imageEnhance').checked,
        transparent: document.getElementById('imageTransparent').checked,
        nologo: document.getElementById('imageNoLogo').checked,
        safe: document.getElementById('imageSafe').checked,
        private: true,
        nofeed: true
    };
    
    showLoading('imageLoading', true);
    hidePreview('image');
    
    // Reset safety retry state for this context
    safetyRetryStates.imageLoading = { active: false, cancelled: false, failures: 0, currentAttempt: 0 };
    
    try {
        const url = buildImageUrl(prompt, params);
        Logger.debug('Image URL built', { url });
        
        const result = await fetchWithSafetyRetry(url, 'imageLoading');
        
        if (!result) {
            // User cancelled
            Logger.info('Generation cancelled by user');
            showToast(i18n.t('toast.safetyCancel'), 'info');
            return;
        }
        
        const blob = result.blob;
        const imageUrl = URL.createObjectURL(blob);
        
        state.currentImageUrl = imageUrl;
        state.currentImageBlob = blob;
        state.currentImagePrompt = prompt;
        
        showImagePreview(imageUrl);
        
        // Add to gallery
        addToGallery({
            type: 'image',
            prompt: prompt,
            url: imageUrl,
            blob: blob,
            params: params,
            date: new Date().toISOString()
        });
        
        // Auto-download if enabled
        if (state.autoDownload) {
            await downloadCurrentImage(true);
        }
        
        // Update stats
        state.stats.images++;
        saveStats();
        updateStats();
        
        if (result.attempts > 1) {
            Logger.info('Image generated after safety retries', { model: params.model, attempts: result.attempts });
            showToast(i18n.t('toast.safetySuccess', { attempts: result.attempts }), 'success');
        } else {
            Logger.info('Image generated successfully', { model: params.model });
            showToast(i18n.t('toast.imageSuccess'), 'success');
        }
        
    } catch (error) {
        if (safetyRetryStates.imageLoading.cancelled) {
            // Already logged in cancelSafetyRetry
        } else {
            Logger.error('Image generation failed', { 
                error: error.message, 
                errorType: error.isAuthError ? 'auth' : error.isBalanceError ? 'balance' : 'general',
                prompt: prompt.slice(0, 100) 
            });
            if (error.isAuthError) {
                showAuthErrorUI('imageLoading');
            } else if (error.isBalanceError) {
                showBalanceErrorUI('imageLoading');
            } else {
                showToast(i18n.t('toast.imageError', { error: error.message }), 'error');
            }
        }
    } finally {
        showLoading('imageLoading', false);
        hideSafetyRetryUI('imageLoading');
    }
}

function buildImageUrl(prompt, params) {
    const encodedPrompt = encodeURIComponent(prompt);
    const url = new URL(`${API_BASE}/image/${encodedPrompt}`);
    
    // Parameters that must be integers
    const integerParams = ['width', 'height', 'seed', 'duration'];
    
    // Extract image param to add last (API requirement)
    let imageParam = null;
    
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            // Save image param for last
            if (key === 'image') {
                imageParam = value;
                return;
            }
            // Handle seed specially - generate random if -1 or empty
            if (key === 'seed') {
                const seedValue = parseInt(value, 10);
                if (isNaN(seedValue) || seedValue < 0) {
                    // Generate random seed to prevent caching
                    value = Math.floor(Math.random() * 2147483647);
                } else {
                    value = seedValue;
                }
                url.searchParams.set(key, value.toString());
                return;
            }
            // Ensure integer params are sent as integers (not floats)
            if (integerParams.includes(key)) {
                value = Math.floor(parseInt(value, 10));
                if (isNaN(value)) return; // Skip if not a valid number
            }
            url.searchParams.set(key, value.toString());
        }
    });
    
    // Add image param last and properly encoded (API requirement)
    if (imageParam) {
        // Manually append to ensure it's last and properly encoded
        const separator = url.search ? '&' : '?';
        return url.toString() + separator + 'image=' + encodeURIComponent(imageParam);
    }
    
    return url.toString();
}

function showImagePreview(url) {
    const preview = document.getElementById('imagePreview');
    const placeholder = document.querySelector('#image-gen .preview-placeholder');
    const actions = document.getElementById('imageActions');
    
    preview.src = url;
    preview.classList.remove('hidden');
    placeholder.classList.add('hidden');
    actions.classList.remove('hidden');
}

function hidePreview(type) {
    if (type === 'image') {
        document.getElementById('imagePreview').classList.add('hidden');
        document.querySelector('#image-gen .preview-placeholder').classList.remove('hidden');
        document.getElementById('imageActions').classList.add('hidden');
    } else if (type === 'video') {
        document.getElementById('videoPreview').classList.add('hidden');
        document.querySelector('#video-gen .preview-placeholder').classList.remove('hidden');
        document.getElementById('videoActions').classList.add('hidden');
    } else if (type === 'edit') {
        document.getElementById('editPreview').classList.add('hidden');
        document.querySelector('#image-edit .preview-placeholder').classList.remove('hidden');
        document.getElementById('editActions').classList.add('hidden');
    }
}

async function downloadCurrentImage(isAuto = false) {
    if (!state.currentImageBlob) {
        showToast(i18n.t('toast.noImage'), 'warning');
        return;
    }
    
    const filename = generateFilename(state.currentImagePrompt, 'image');
    await downloadFile(state.currentImageBlob, filename, 'image');
    
    if (!isAuto) {
        showToast(i18n.t('toast.downloadSuccess'), 'success');
    }
}

function sendToEdit() {
    if (!state.currentImageUrl) return;
    
    // Switch to edit tab
    document.querySelector('[data-tab="image-edit"]').click();
    
    // Set the image URL
    document.getElementById('editImageUrl').value = state.currentImageUrl;
    
    // Show preview
    const preview = document.getElementById('editUploadedPreview');
    const img = document.getElementById('editSourceImage');
    img.src = state.currentImageUrl;
    preview.classList.remove('hidden');
}

// ===== Image Editing =====
// State for multiple images
state.editImages = [];

function setupImageEditing() {
    const uploadBtn = document.getElementById('editUploadBtn');
    const fileInput = document.getElementById('editImageFile');
    const removeBtn = document.getElementById('removeEditImage');
    const generateBtn = document.getElementById('editImageGenerateBtn');
    const downloadBtn = document.getElementById('downloadEditBtn');
    const continueBtn = document.getElementById('continueEditBtn');
    
    // Allow multiple file selection
    fileInput.setAttribute('multiple', 'true');
    
    uploadBtn.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleMultipleEditImageUpload(e.target.files);
        }
    });
    
    // Allow adding URLs from the text input
    const urlInput = document.getElementById('editImageUrl');
    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const url = urlInput.value.trim();
            if (url && url.startsWith('http')) {
                addEditImage(url);
                urlInput.value = '';
            }
        }
    });
    
    removeBtn.addEventListener('click', clearEditImages);
    
    generateBtn.addEventListener('click', applyImageEdit);
    downloadBtn.addEventListener('click', () => downloadEditedImage());
    continueBtn.addEventListener('click', () => {
        if (state.currentEditUrl) {
            addEditImage(state.currentEditUrl);
        }
    });
}

function handleMultipleEditImageUpload(files) {
    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            addEditImage(e.target.result);
        };
        reader.readAsDataURL(file);
    });
}

function addEditImage(url) {
    state.editImages.push(url);
    updateEditImagesPreview();
    Logger.debug('Edit image added', { totalImages: state.editImages.length });
}

function removeEditImage(index) {
    state.editImages.splice(index, 1);
    updateEditImagesPreview();
}

function clearEditImages() {
    state.editImages = [];
    document.getElementById('editImageUrl').value = '';
    updateEditImagesPreview();
}

function updateEditImagesPreview() {
    const container = document.getElementById('editUploadedPreview');
    const urlInput = document.getElementById('editImageUrl');
    
    if (state.editImages.length === 0) {
        container.classList.add('hidden');
        container.innerHTML = '';
        return;
    }
    
    container.classList.remove('hidden');
    container.innerHTML = `
        <div class="multi-image-preview">
            ${state.editImages.map((url, index) => `
                <div class="preview-thumb" data-index="${index}">
                    <img src="${url}" alt="Image ${index + 1}">
                    <button class="btn-remove-thumb" onclick="removeEditImage(${index})">✕</button>
                    <span class="thumb-index">${index + 1}</span>
                </div>
            `).join('')}
            <div class="add-more-btn" onclick="document.getElementById('editImageFile').click()">
                <span>+</span>
                <small>Adicionar</small>
            </div>
        </div>
        <p class="multi-image-info">${state.editImages.length} imagen${state.editImages.length > 1 ? 's' : ''} selecionada${state.editImages.length > 1 ? 's' : ''}</p>
    `;
    
    // Update URL input with comma-separated URLs (for API)
    urlInput.value = state.editImages.join(',');
}

async function applyImageEdit() {
    const prompt = document.getElementById('editPrompt').value.trim();
    let imageUrls = document.getElementById('editImageUrl').value.trim();
    
    if (!prompt) {
        showToast(i18n.t('toast.enterEditPrompt'), 'warning');
        return;
    }
    
    // Check for images
    const hasBase64Images = state.editImages.some(url => url.startsWith('data:'));
    const hasUrlImages = state.editImages.some(url => url.startsWith('http'));
    
    if (state.editImages.length === 0 && !imageUrls) {
        showToast(i18n.t('toast.provideImage'), 'warning');
        return;
    }
    
    Logger.info('Starting image edit', { 
        prompt: prompt.slice(0, 100), 
        imageCount: state.editImages.length || 1,
        hasBase64: hasBase64Images,
        hasUrl: hasUrlImages
    });
    
    showLoading('editLoading', true);
    
    try {
        let finalImageUrls;
        
        // If we have base64 images, we need to upload them first
        if (state.editImages.length > 0 && hasBase64Images) {
            showToast(i18n.t('toast.uploadingImages'), 'info');
            const uploadedUrls = await uploadImagesToTempHost(state.editImages);
            finalImageUrls = uploadedUrls.join('|');
            Logger.info('Images uploaded', { urls: uploadedUrls });
        } else if (state.editImages.length > 0) {
            // Already URL images
            finalImageUrls = state.editImages.join('|');
        } else {
            // Single URL from input
            finalImageUrls = imageUrls;
        }
        
        const params = {
            model: document.getElementById('editModel').value,
            width: document.getElementById('editWidth').value,
            height: document.getElementById('editHeight').value,
            image: finalImageUrls,
            seed: document.getElementById('editSeed').value,
            guidance_scale: document.getElementById('editGuidance').value,
            enhance: document.getElementById('editEnhance').checked,
            transparent: document.getElementById('editTransparent').checked,
            nologo: document.getElementById('editNoLogo').checked,
            safe: document.getElementById('editSafe').checked,
            private: true,
            nofeed: true
        };
    
        const url = buildImageUrl(prompt, params);
        Logger.debug('Edit URL built', { urlLength: url.length, url: url.slice(0, 300) });
        
        // Reset safety retry state for this context
        safetyRetryStates.editLoading = { active: false, cancelled: false, failures: 0, currentAttempt: 0 };
        
        const result = await fetchWithSafetyRetry(url, 'editLoading');
        
        if (!result) {
            // User cancelled
            Logger.info('Edit cancelled by user');
            showToast(i18n.t('toast.safetyCancel'), 'info');
            return;
        }
        
        const blob = result.blob;
        const editedUrl = URL.createObjectURL(blob);
        
        state.currentEditUrl = editedUrl;
        state.currentEditBlob = blob;
        state.currentEditPrompt = prompt;
        
        // Show preview
        const preview = document.getElementById('editPreview');
        const placeholder = document.querySelector('#image-edit .preview-placeholder');
        const actions = document.getElementById('editActions');
        
        preview.src = editedUrl;
        preview.classList.remove('hidden');
        placeholder.classList.add('hidden');
        actions.classList.remove('hidden');
        
        // Add to gallery
        addToGallery({
            type: 'image',
            prompt: prompt,
            url: editedUrl,
            blob: blob,
            params: params,
            date: new Date().toISOString(),
            isEdit: true
        });
        
        // Auto-download if enabled
        if (state.autoDownload) {
            await downloadEditedImage(true);
        }
        
        state.stats.images++;
        saveStats();
        updateStats();
        
        if (result.attempts > 1) {
            Logger.info('Image edit successful after safety retries', { model: params.model, attempts: result.attempts });
            showToast(i18n.t('toast.safetySuccess', { attempts: result.attempts }), 'success');
        } else {
            Logger.info('Image edit successful', { model: params.model });
            showToast(i18n.t('toast.editSuccess'), 'success');
        }
        
    } catch (error) {
        if (safetyRetryStates.editLoading.cancelled) {
            // Already logged in cancelSafetyRetry
        } else {
            Logger.error('Image edit failed', { 
                error: error.message,
                errorType: error.isAuthError ? 'auth' : error.isBalanceError ? 'balance' : 'general',
                prompt: prompt.slice(0, 100)
            });
            if (error.isAuthError) {
                showAuthErrorUI('editLoading');
            } else if (error.isBalanceError) {
                showBalanceErrorUI('editLoading');
            } else {
                showToast(i18n.t('toast.editError', { error: error.message }), 'error');
            }
        }
    } finally {
        showLoading('editLoading', false);
        hideSafetyRetryUI('editLoading');
    }
}

async function downloadEditedImage(isAuto = false) {
    if (!state.currentEditBlob) {
        showToast(i18n.t('toast.noImage'), 'warning');
        return;
    }
    
    const filename = generateFilename(state.currentEditPrompt, 'image', 'edit');
    await downloadFile(state.currentEditBlob, filename, 'image');
    
    if (!isAuto) {
        showToast(i18n.t('toast.downloadSuccess'), 'success');
    }
}

// ===== Video Generation =====
function setupVideoGeneration() {
    const uploadBtn = document.getElementById('videoUploadBtn');
    const fileInput = document.getElementById('videoImageFile');
    const removeBtn = document.getElementById('removeVideoImage');
    const generateBtn = document.getElementById('generateVideoBtn');
    const downloadBtn = document.getElementById('downloadVideoBtn');
    const regenerateBtn = document.getElementById('regenerateVideoBtn');
    
    uploadBtn.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files[0]) {
            handleVideoImageUpload(e.target.files[0]);
        }
    });
    
    removeBtn.addEventListener('click', () => {
        document.getElementById('videoUploadedPreview').classList.add('hidden');
        document.getElementById('videoImageUrl').value = '';
        state.videoSourceFile = null;
        state.videoSourceDataUrl = null;
    });
    
    generateBtn.addEventListener('click', generateVideo);
    downloadBtn.addEventListener('click', () => downloadCurrentVideo());
    regenerateBtn.addEventListener('click', generateVideo);
    
    // Update duration options based on model
    document.getElementById('videoModel').addEventListener('change', updateVideoDurationOptions);
}

function handleVideoImageUpload(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const dataUrl = e.target.result;
        document.getElementById('videoSourceImage').src = dataUrl;
        document.getElementById('videoUploadedPreview').classList.remove('hidden');
        // Store the file for later upload, not the data URL
        state.videoSourceFile = file;
        state.videoSourceDataUrl = dataUrl;
        // Clear the URL input - we'll upload when generating
        document.getElementById('videoImageUrl').value = '';
    };
    reader.readAsDataURL(file);
}

/**
 * Upload image for video generation using the same method as img2img
 * Converts file to base64 and uses uploadImagesToTempHost
 */
async function uploadImageForVideo(file) {
    Logger.info('Uploading image for video generation...');
    showToast(i18n.t('toast.uploadingImage'), 'info');
    
    try {
        // Convert file to base64 data URL
        const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
        
        // Use the same upload method as img2img
        const uploadedUrls = await uploadImagesToTempHost([base64]);
        
        if (uploadedUrls.length > 0 && uploadedUrls[0].startsWith('http')) {
            Logger.info('Image uploaded successfully for video', { url: uploadedUrls[0] });
            return uploadedUrls[0];
        } else {
            throw new Error('Upload failed - no valid URL returned');
        }
    } catch (error) {
        Logger.error('Image upload failed', { error: error.message });
        showToast(i18n.t('toast.imageUploadFailed'), 'error');
        throw error;
    }
}

function updateVideoDurationOptions() {
    const model = document.getElementById('videoModel').value;
    const durationSelect = document.getElementById('videoDuration');
    
    // Clear options
    durationSelect.innerHTML = '';
    
    if (model === 'veo') {
        durationSelect.innerHTML = `
            <option value="4">4 segundos</option>
            <option value="6">6 segundos</option>
            <option value="8" selected>8 segundos</option>
        `;
    } else {
        durationSelect.innerHTML = `
            <option value="2">2 segundos</option>
            <option value="4">4 segundos</option>
            <option value="6">6 segundos</option>
            <option value="8" selected>8 segundos</option>
            <option value="10">10 segundos</option>
        `;
    }
}

async function generateVideo() {
    let prompt = document.getElementById('videoPrompt').value.trim();
    if (!prompt) {
        showToast(i18n.t('toast.enterVideoPrompt'), 'warning');
        return;
    }
    
    // Clean prompt: replace newlines with spaces to avoid URL issues
    prompt = prompt.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
    
    Logger.info('Starting video generation', { prompt: prompt.slice(0, 100) });
    
    const model = document.getElementById('videoModel').value;
    let imageUrl = document.getElementById('videoImageUrl').value.trim();
    
    const params = {
        model: model,
        duration: document.getElementById('videoDuration').value,
        aspectRatio: document.getElementById('videoAspectRatio').value,
        seed: document.getElementById('videoSeed').value,
        audio: document.getElementById('videoAudio').checked,
        enhance: document.getElementById('videoEnhance').checked,
        private: true,
        nofeed: true
    };
    
    // If user uploaded a local file, upload it to imgbb first
    if (state.videoSourceFile && !imageUrl) {
        try {
            showLoading('videoLoading', true);
            imageUrl = await uploadImageForVideo(state.videoSourceFile);
            Logger.info('Using uploaded image URL', { url: imageUrl });
        } catch (error) {
            showLoading('videoLoading', false);
            return; // Error already shown by uploadImageForVideo
        }
    }
    
    if (imageUrl) {
        // Check if it's still a data URL (shouldn't happen now, but just in case)
        if (imageUrl.startsWith('data:')) {
            Logger.error('Data URL detected - this should have been uploaded first');
            showToast(i18n.t('toast.imageTooLarge'), 'error');
            return;
        }
        params.image = imageUrl;
    }
    
    Logger.info('Video params', { 
        model, 
        hasImage: !!imageUrl, 
        imageUrl: imageUrl ? imageUrl.slice(0, 100) : 'none',
        duration: params.duration 
    });
    showLoading('videoLoading', true);
    hidePreview('video');
    
    try {
        const url = buildImageUrl(prompt, params);
        Logger.debug('Video URL built', { url: url.slice(0, 200) });
        
        // Use longer timeout for video generation
        const response = await fetchVideoWithTimeout(url);
        
        const blob = await response.blob();
        const videoUrl = URL.createObjectURL(blob);
        
        state.currentVideoUrl = videoUrl;
        state.currentVideoBlob = blob;
        state.currentVideoPrompt = prompt;
        
        // Show preview
        const preview = document.getElementById('videoPreview');
        const placeholder = document.querySelector('#video-gen .preview-placeholder');
        const actions = document.getElementById('videoActions');
        
        preview.src = videoUrl;
        preview.classList.remove('hidden');
        placeholder.classList.add('hidden');
        actions.classList.remove('hidden');
        
        // Add to gallery
        addToGallery({
            type: 'video',
            prompt: prompt,
            url: videoUrl,
            blob: blob,
            params: params,
            date: new Date().toISOString()
        });
        
        // Auto-download if enabled
        if (state.autoDownload) {
            await downloadCurrentVideo(true);
        }
        
        state.stats.videos++;
        saveStats();
        updateStats();
        
        Logger.info('Video generated successfully', { model: params.model, duration: params.duration });
        showToast(i18n.t('toast.videoSuccess'), 'success');
        
    } catch (error) {
        Logger.error('Video generation failed', { 
            error: error.message,
            errorType: error.isAuthError ? 'auth' : error.isBalanceError ? 'balance' : 'general',
            model: params.model,
            hasImage: !!params.image
        });
        if (error.isAuthError) {
            showAuthErrorUI('videoLoading');
        } else if (error.isBalanceError) {
            showBalanceErrorUI('videoLoading');
        } else {
            showToast(i18n.t('toast.videoError', { error: error.message }), 'error');
        }
    } finally {
        showLoading('videoLoading', false);
    }
}

async function downloadCurrentVideo(isAuto = false) {
    if (!state.currentVideoBlob) {
        showToast(i18n.t('toast.noVideo'), 'warning');
        return;
    }
    
    const filename = generateFilename(state.currentVideoPrompt, 'video');
    await downloadFile(state.currentVideoBlob, filename, 'video');
    
    if (!isAuto) {
        showToast(i18n.t('toast.downloadSuccess'), 'success');
    }
}

// ===== Gallery =====
function setupGallery() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const downloadAllBtn = document.getElementById('downloadAllBtn');
    const clearBtn = document.getElementById('clearGalleryBtn');
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderGallery(btn.dataset.filter);
        });
    });
    
    downloadAllBtn.addEventListener('click', downloadAllItems);
    clearBtn.addEventListener('click', clearGallery);
}

function addToGallery(item) {
    // Convert blob to base64 for storage
    const reader = new FileReader();
    reader.onload = async function() {
        const base64Data = reader.result;
        
        // Try to save to backend first
        if (Backend.available) {
            const result = await Backend.saveItem(
                item.type,
                item.prompt,
                item.params,
                base64Data
            );
            
            if (result && result.item) {
                // Use backend item with path
                const galleryItem = {
                    ...result.item,
                    localUrl: item.url
                };
                
                // Store blob in memory for current session
                if (!window.galleryBlobs) window.galleryBlobs = {};
                window.galleryBlobs[galleryItem.id] = {
                    url: item.url,
                    blob: item.blob
                };
                
                state.gallery.unshift(galleryItem);
                renderGallery();
                Logger.info('Item saved to backend gallery', { id: galleryItem.id });
                return;
            }
        }
        
        // Fallback to localStorage
        const galleryItem = {
            id: Date.now(),
            type: item.type,
            prompt: item.prompt,
            date: item.date,
            params: item.params,
            isEdit: item.isEdit || false
        };
        
        // Store blob separately in memory for current session
        if (!window.galleryBlobs) window.galleryBlobs = {};
        window.galleryBlobs[galleryItem.id] = {
            url: item.url,
            blob: item.blob
        };
        
        state.gallery.unshift(galleryItem);
        saveGallery();
        renderGallery();
    };
    
    if (item.blob) {
        reader.readAsDataURL(item.blob);
    } else {
        // No blob, just add metadata
        const galleryItem = {
            id: Date.now(),
            type: item.type,
            prompt: item.prompt,
            date: item.date,
            params: item.params,
            isEdit: item.isEdit || false
        };
        state.gallery.unshift(galleryItem);
        saveGallery();
        renderGallery();
    }
}

function saveGallery() {
    // Only save metadata, not blobs
    const toSave = state.gallery.map(item => ({
        id: item.id,
        type: item.type,
        prompt: item.prompt,
        date: item.date,
        params: item.params,
        isEdit: item.isEdit
    }));
    localStorage.setItem('gallery', JSON.stringify(toSave));
}

function renderGallery(filter = 'all') {
    const container = document.getElementById('galleryContainer');
    let items = state.gallery;
    
    if (filter !== 'all') {
        items = items.filter(item => item.type === filter);
    }
    
    if (items.length === 0) {
        container.innerHTML = `
            <div class="gallery-empty">
                <span class="empty-icon">📁</span>
                <p>Nenhuma criação ${filter !== 'all' ? `(${filter === 'image' ? 'imagens' : 'vídeos'})` : ''}</p>
                <small>Gere imagens ou vídeos para vê-los aqui</small>
            </div>
        `;
        return;
    }
    
    // Group by date
    const grouped = {};
    items.forEach(item => {
        const date = new Date(item.date).toLocaleDateString('pt-BR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        if (!grouped[date]) grouped[date] = [];
        grouped[date].push(item);
    });
    
    let html = '';
    Object.entries(grouped).forEach(([date, dateItems]) => {
        html += `<div class="gallery-date-group">${date}</div>`;
        
        dateItems.forEach(item => {
            const blobData = window.galleryBlobs?.[item.id];
            // Use backend path if available, otherwise blob URL, otherwise no preview
            let mediaSrc = blobData?.url || (item.path ? `${BACKEND_URL}/${item.path}` : null);
            
            const mediaHtml = mediaSrc 
                ? (item.type === 'image' 
                    ? `<img src="${mediaSrc}" alt="${item.prompt}">`
                    : `<video src="${mediaSrc}"></video>`)
                : `<div class="no-preview">Preview não disponível</div>`;
            
            html += `
                <div class="gallery-item" data-id="${item.id}">
                    <div class="gallery-item-media">
                        ${mediaHtml}
                        <span class="gallery-item-type">${item.type === 'image' ? '🖼️' : '🎬'}</span>
                    </div>
                    <div class="gallery-item-info">
                        <p class="gallery-item-prompt">${item.prompt}</p>
                        <p class="gallery-item-meta">
                            <span class="gallery-item-date">${new Date(item.date).toLocaleTimeString('pt-BR')}</span>
                            ${item.params?.model ? `<span class="gallery-item-model">${item.params.model}</span>` : ''}
                        </p>
                    </div>
                </div>
            `;
        });
    });
    
    container.innerHTML = html;
    
    // Add click handlers
    container.querySelectorAll('.gallery-item').forEach(el => {
        el.addEventListener('click', () => openGalleryModal(el.dataset.id));
    });
}

async function downloadAllItems() {
    const items = state.gallery;
    if (items.length === 0) {
        showToast(i18n.t('toast.nothingToDownload'), 'warning');
        return;
    }
    
    showToast(i18n.t('toast.generating'), 'success');
    
    for (const item of items) {
        const blobData = window.galleryBlobs?.[item.id];
        if (blobData?.blob) {
            const filename = generateFilename(item.prompt, item.type);
            await downloadFile(blobData.blob, filename, item.type);
            await new Promise(r => setTimeout(r, 500)); // Small delay between downloads
        }
    }
    
    showToast(i18n.t('toast.allDownloaded'), 'success');
}

async function clearGallery() {
    if (!confirm(i18n.t('gallery.confirmClear') || 'Tem certeza que deseja limpar toda a galeria?')) return;
    
    // Clear backend if available
    if (Backend.available) {
        await Backend.clearGallery();
    }
    
    state.gallery = [];
    window.galleryBlobs = {};
    saveGallery();
    renderGallery();
    showToast(i18n.t('toast.galleryCleared'), 'success');
}

// ===== Modal =====
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

function openGalleryModal(itemId) {
    const item = state.gallery.find(i => String(i.id) === String(itemId));
    if (!item) {
        Logger.error('Gallery item not found', { itemId });
        return;
    }
    
    const modal = document.getElementById('galleryModal');
    const modalImage = document.getElementById('modalImage');
    const modalVideo = document.getElementById('modalVideo');
    const modalPrompt = document.getElementById('modalPrompt');
    const modalDate = document.getElementById('modalDate');
    const editBtn = document.getElementById('modalEdit');
    
    const blobData = window.galleryBlobs?.[item.id];
    // Get media source - prefer blob, then backend path
    const mediaSrc = blobData?.url || (item.path ? `${BACKEND_URL}/${item.path}` : null);
    
    if (item.type === 'image') {
        modalImage.src = mediaSrc || '';
        modalImage.classList.remove('hidden');
        modalVideo.classList.add('hidden');
        editBtn.classList.remove('hidden');
    } else {
        modalVideo.src = mediaSrc || '';
        modalVideo.classList.remove('hidden');
        modalImage.classList.add('hidden');
        editBtn.classList.add('hidden'); // Can't edit videos
    }
    
    modalPrompt.textContent = item.prompt;
    modalDate.textContent = new Date(item.date).toLocaleString('pt-BR');
    
    modal.dataset.itemId = itemId;
    modal.classList.remove('hidden');
}

function closeModal() {
    const modal = document.getElementById('galleryModal');
    modal.classList.add('hidden');
    
    const video = document.getElementById('modalVideo');
    video.pause();
}

async function editModalItem() {
    const modal = document.getElementById('galleryModal');
    const itemId = modal.dataset.itemId;
    const item = state.gallery.find(i => String(i.id) === String(itemId));
    
    if (!item || item.type !== 'image') {
        showToast(i18n.t('toast.onlyImagesEdit'), 'warning');
        return;
    }
    
    const blobData = window.galleryBlobs?.[item.id];
    const mediaSrc = blobData?.url || (item.path ? `${BACKEND_URL}/${item.path}` : null);
    
    if (!mediaSrc) {
        showToast(i18n.t('toast.fileNotAvailable'), 'error');
        return;
    }
    
    // Switch to edit tab
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector('[data-tab="image-edit"]').classList.add('active');
    document.getElementById('image-edit').classList.add('active');
    
    // Load image into edit state
    try {
        let blob;
        if (blobData?.blob) {
            blob = blobData.blob;
        } else {
            // Fetch from backend
            const response = await fetch(mediaSrc);
            blob = await response.blob();
        }
        
        const imageUrl = blobData?.url || URL.createObjectURL(blob);
        
        // Add to edit images state - store URL directly as expected
        if (!state.editImages) state.editImages = [];
        state.editImages = [imageUrl]; // Store URL string, not object
        
        // Update preview
        updateEditImagesPreview();
        
        // Set prompt from gallery item
        const editPromptInput = document.getElementById('editPrompt');
        if (editPromptInput && item.prompt) {
            editPromptInput.value = `Edit: ${item.prompt}`;
        }
        
        closeModal();
        showToast(i18n.t('toast.editSuccess'), 'success');
        Logger.info('Gallery image loaded for editing', { itemId: item.id });
    } catch (error) {
        Logger.error('Failed to load image for editing', { error: error.message });
        showToast(i18n.t('toast.loadImageError'), 'error');
    }
}

async function downloadModalItem() {
    const modal = document.getElementById('galleryModal');
    const itemId = modal.dataset.itemId;
    const item = state.gallery.find(i => String(i.id) === String(itemId));
    const blobData = window.galleryBlobs?.[itemId];
    
    if (item) {
        let blob = blobData?.blob;
        
        // If no blob in memory, try to fetch from backend
        if (!blob && item.path) {
            try {
                const response = await fetch(`${BACKEND_URL}/${item.path}`);
                blob = await response.blob();
            } catch (error) {
                Logger.error('Failed to fetch for download', { error: error.message });
            }
        }
        
        if (blob) {
            const filename = generateFilename(item.prompt, item.type);
            await downloadFile(blob, filename, item.type);
            showToast(i18n.t('toast.downloadSuccess'), 'success');
        } else {
            showToast(i18n.t('toast.fileNotAvailable'), 'error');
        }
    }
}

async function deleteModalItem() {
    const modal = document.getElementById('galleryModal');
    const itemId = modal.dataset.itemId;
    
    if (!confirm(i18n.t('gallery.confirmDelete') || 'Tem certeza que deseja excluir este item?')) return;
    
    const item = state.gallery.find(i => String(i.id) === String(itemId));
    
    // Delete from backend if available
    if (Backend.available && item) {
        await Backend.deleteItem(item.id);
    }
    
    state.gallery = state.gallery.filter(i => String(i.id) !== String(itemId));
    if (window.galleryBlobs) {
        delete window.galleryBlobs[itemId];
    }
    saveGallery();
    renderGallery();
    closeModal();
    showToast(i18n.t('btn.delete'), 'success');
}

// ===== Settings =====
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
    const useCustomDirCheckbox = document.getElementById('useCustomMediaDir');
    const customDirGroup = document.getElementById('customDirGroup');
    const customDirInput = document.getElementById('customMediaDir');
    const selectDirBtn = document.getElementById('selectMediaDirBtn');
    
    if (useCustomDirCheckbox) {
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
            // Use File System Access API if available (modern browsers)
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
                // Fallback: show input for manual path entry
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
}

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

function saveStats() {
    localStorage.setItem('stats', JSON.stringify(state.stats));
}

function updateStats() {
    document.getElementById('totalImages').textContent = state.stats.images;
    document.getElementById('totalVideos').textContent = state.stats.videos;
    document.getElementById('totalDownloads').textContent = state.stats.downloads;
}

// ===== Download System =====
function generateFilename(prompt, type, prefix = '') {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
    
    let name = '';
    
    switch (state.filenameFormat) {
        case 'prompt':
            name = sanitizeFilename(prompt.slice(0, 50));
            break;
        case 'timestamp':
            name = `${dateStr}_${timeStr}`;
            break;
        case 'both':
        default:
            name = `${sanitizeFilename(prompt.slice(0, 30))}_${timeStr}`;
    }
    
    if (prefix) {
        name = `${prefix}_${name}`;
    }
    
    const ext = type === 'video' ? 'mp4' : 'png';
    return `${state.downloadPath}/${dateStr}/${name}.${ext}`;
}

function sanitizeFilename(str) {
    return str
        .replace(/[<>:"/\\|?*]/g, '')
        .replace(/\s+/g, '_')
        .replace(/_+/g, '_')
        .trim();
}

async function downloadFile(blob, filepath, type) {
    // Extract just the filename for browser download
    const filename = filepath.split('/').pop();
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    state.stats.downloads++;
    saveStats();
    updateStats();
    
    // Log the intended path for reference
    console.log(`Downloaded: ${filepath}`);
}

// ===== Image Upload Helpers =====
/**
 * Process images for the API
 * - URLs are used directly
 * - Base64 images are uploaded to a temp host or used directly if short enough
 */
async function uploadImagesToTempHost(images) {
    const processedUrls = [];
    
    for (let i = 0; i < images.length; i++) {
        const imageData = images[i];
        
        // If already a URL, keep it
        if (imageData.startsWith('http')) {
            processedUrls.push(imageData);
            continue;
        }
        
        try {
            Logger.debug(`Processing image ${i + 1}/${images.length}`);
            showToast(`Processando imagem ${i + 1}/${images.length}...`, 'info');
            
            // Try multiple upload methods in order
            let url = null;
            
            // Method 1: Try 0x0.st (simple pastebin for images, no CORS issues)
            url = await uploadTo0x0(imageData);
            
            // Method 2: Try catbox.moe
            if (!url) {
                url = await uploadToCatbox(imageData);
            }
            
            // Method 3: Try litterbox (temp files)
            if (!url) {
                url = await uploadToLitterbox(imageData);
            }
            
            // Method 4: Use base64 directly (some models accept it)
            if (!url) {
                Logger.warn('All upload services failed, using base64 directly');
                // The API might accept data URLs directly for some models
                url = imageData;
            }
            
            processedUrls.push(url);
            Logger.info(`Image ${i + 1} processed`, { isBase64: url.startsWith('data:') });
            
        } catch (error) {
            Logger.error(`Failed to process image ${i + 1}`, { error: error.message });
            // Use base64 as fallback
            processedUrls.push(imageData);
        }
    }
    
    return processedUrls;
}

/**
 * Upload to 0x0.st (no API key needed, CORS friendly)
 */
async function uploadTo0x0(base64Data) {
    try {
        const blob = base64ToBlob(base64Data);
        const formData = new FormData();
        formData.append('file', blob, 'image.png');
        
        const response = await fetch('https://0x0.st', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const url = await response.text();
            if (url && url.startsWith('http')) {
                Logger.info('0x0.st upload successful');
                return url.trim();
            }
        }
        
        Logger.warn('0x0.st upload failed', { status: response.status });
        return null;
    } catch (error) {
        Logger.warn('0x0.st upload error', { error: error.message });
        return null;
    }
}

/**
 * Upload to catbox.moe
 */
async function uploadToCatbox(base64Data) {
    try {
        const blob = base64ToBlob(base64Data);
        const formData = new FormData();
        formData.append('reqtype', 'fileupload');
        formData.append('fileToUpload', blob, 'image.png');
        
        const response = await fetch('https://catbox.moe/user/api.php', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const url = await response.text();
            if (url && url.startsWith('http')) {
                Logger.info('Catbox upload successful');
                return url.trim();
            }
        }
        
        Logger.warn('Catbox upload failed', { status: response.status });
        return null;
    } catch (error) {
        Logger.warn('Catbox upload error', { error: error.message });
        return null;
    }
}

/**
 * Upload to litterbox (temporary file hosting, 1 hour expiry)
 */
async function uploadToLitterbox(base64Data) {
    try {
        const blob = base64ToBlob(base64Data);
        const formData = new FormData();
        formData.append('reqtype', 'fileupload');
        formData.append('time', '1h');
        formData.append('fileToUpload', blob, 'image.png');
        
        const response = await fetch('https://litterbox.catbox.moe/resources/internals/api.php', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const url = await response.text();
            if (url && url.startsWith('http')) {
                Logger.info('Litterbox upload successful');
                return url.trim();
            }
        }
        
        Logger.warn('Litterbox upload failed', { status: response.status });
        return null;
    } catch (error) {
        Logger.warn('Litterbox upload error', { error: error.message });
        return null;
    }
}

/**
 * Convert base64 to blob
 */
function base64ToBlob(base64Data) {
    // Extract content type and base64 data
    const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/);
    const contentType = matches ? matches[1] : 'image/png';
    const base64 = matches ? matches[2] : base64Data.replace(/^data:image\/\w+;base64,/, '');
    
    const byteCharacters = atob(base64);
    const byteArrays = [];
    
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }
        
        byteArrays.push(new Uint8Array(byteNumbers));
    }
    
    return new Blob(byteArrays, { type: contentType });
}

// ===== API Helpers =====
async function fetchWithAuth(url, options = {}) {
    const currentKey = credentialManager.getCurrent();
    if (currentKey) {
        options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${currentKey}`
        };
    }
    options._usedKey = currentKey; // Track which key was used
    
    return fetch(url, options);
}

async function fetchWithRetry(url, options = {}, maxRetries = MAX_RETRIES) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            Logger.debug(`API Request attempt ${attempt}/${maxRetries}`, { url });
            
            const response = await fetchWithAuth(url, options);
            
            if (response.ok) {
                Logger.info('API Request successful', { url, status: response.status, attempt });
                return response;
            }
            
            // Handle specific error codes
            if (response.status === 401) {
                const errorText = await response.text().catch(() => 'Unknown error');
                const authError = new Error(`AUTH_ERROR: ${errorText}`);
                authError.isAuthError = true;
                lastError = authError;
                Logger.error('Authentication error - API key required or invalid', { url, error: errorText });
                break;
            } else if (response.status === 403) {
                const errorText = await response.text().catch(() => 'Unknown error');
                // Check for balance/forbidden errors that require key rotation
                if (errorText.includes('FORBIDDEN') || errorText.includes('balance') || errorText.includes('Insufficient') || errorText.includes('pollen')) {
                    if (credentialManager.hasMultiple()) {
                        credentialManager.markFailed(options._usedKey);
                        Logger.warn('Credential issue, rotating');
                        continue; // Try again with next key
                    }
                    // All keys exhausted or single key - show friendly balance error
                    const balanceError = new Error(`BALANCE_ERROR: ${errorText}`);
                    balanceError.isBalanceError = true;
                    lastError = balanceError;
                    Logger.error('Balance/pollen error - all credentials exhausted', { url, error: errorText });
                    break;
                }
                lastError = new Error(`HTTP 403: ${errorText}`);
                Logger.error('API Request forbidden', { url, error: errorText });
                break;
            } else if (response.status === 500) {
                const errorText = await response.text().catch(() => 'Unknown error');
                lastError = new Error(`Server Error 500: ${errorText}`);
                Logger.warn(`Attempt ${attempt} failed with 500`, { url, error: errorText });
                
                if (attempt < maxRetries) {
                    const delay = RETRY_DELAYS[attempt - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
                    Logger.info(`Retrying in ${delay}ms...`);
                    showToast(i18n.t('toast.networkError', { attempt, max: maxRetries }), 'warning');
                    await sleep(delay);
                    continue;
                }
            } else if (response.status === 429) {
                // Rate limited
                lastError = new Error('Rate limited - too many requests');
                Logger.warn('Rate limited', { url });
                
                if (attempt < maxRetries) {
                    const delay = RETRY_DELAYS[attempt - 1] * 2; // Double delay for rate limits
                    showToast(i18n.t('toast.networkError', { attempt, max: maxRetries }), 'warning');
                    await sleep(delay);
                    continue;
                }
            } else if (response.status >= 400) {
                const errorText = await response.text().catch(() => 'Unknown error');
                lastError = new Error(`HTTP ${response.status}: ${errorText}`);
                Logger.error('API Request failed', { url, status: response.status, error: errorText });
                // Don't retry client errors (4xx except 429)
                break;
            }
            
        } catch (error) {
            lastError = error;
            Logger.error(`Attempt ${attempt} network error`, { url, error: error.message });
            
            if (attempt < maxRetries) {
                const delay = RETRY_DELAYS[attempt - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
                showToast(i18n.t('toast.networkError', { attempt, max: maxRetries }), 'warning');
                await sleep(delay);
                continue;
            }
        }
    }
    
    Logger.error('All retry attempts failed', { url, error: lastError?.message });
    throw lastError || new Error('Request failed after all retries');
}

/**
 * Fetch video with extended timeout (videos can take several minutes to generate)
 * Uses AbortController for proper timeout handling
 * @param {string} url - URL to fetch
 */
async function fetchVideoWithTimeout(url) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        controller.abort();
        Logger.warn('Video request timed out after 5 minutes');
    }, VIDEO_TIMEOUT_MS);
    
    try {
        const currentKey = credentialManager.getCurrent();
        const options = {
            signal: controller.signal,
            headers: {}
        };
        
        if (currentKey) {
            options.headers['Authorization'] = `Bearer ${currentKey}`;
        }
        
        Logger.info('Starting video fetch (this may take several minutes)...', { url: url.slice(0, 200) });
        
        const response = await fetch(url, options);
        
        if (!response.ok) {
            // Handle specific error codes
            if (response.status === 401) {
                const errorText = await response.text().catch(() => 'Unknown error');
                const authError = new Error(`AUTH_ERROR: ${errorText}`);
                authError.isAuthError = true;
                throw authError;
            } else if (response.status === 403) {
                const errorText = await response.text().catch(() => 'Unknown error');
                if (errorText.includes('FORBIDDEN') || errorText.includes('balance') || errorText.includes('Insufficient') || errorText.includes('pollen')) {
                    const balanceError = new Error(`BALANCE_ERROR: ${errorText}`);
                    balanceError.isBalanceError = true;
                    throw balanceError;
                }
                throw new Error(`HTTP 403: ${errorText}`);
            }
            
            const errorText = await response.text().catch(() => 'Unknown error');
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        Logger.info('Video fetch successful', { status: response.status });
        return response;
        
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error('Video generation timed out. Try a shorter duration or simpler prompt.');
        }
        // Log more details about network errors
        Logger.error('Video fetch error details', { 
            name: error.name, 
            message: error.message,
            stack: error.stack?.slice(0, 300)
        });
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

/**
 * Fetch with persistent retry for safety filter errors (IMAGE_PROHIBITED_CONTENT)
 * These errors are not charged by the API, so we can retry many times
 * @param {string} url - URL to fetch
 * @param {string} loadingElementId - 'imageLoading' or 'editLoading' to track state separately
 */
async function fetchWithSafetyRetry(url, loadingElementId) {
    const retryState = safetyRetryStates[loadingElementId];
    retryState.active = true;
    retryState.cancelled = false;
    retryState.failures = 0;
    retryState.currentAttempt = 1;
    
    for (let attempt = 1; attempt <= MAX_SAFETY_RETRIES; attempt++) {
        if (retryState.cancelled) {
            Logger.info('Safety retry cancelled by user', { context: loadingElementId });
            return null;
        }
        
        retryState.currentAttempt = attempt;
        
        try {
            const options = {};
            const response = await fetchWithAuth(url, options);
            
            if (response.ok) {
                const blob = await response.blob();
                retryState.active = false;
                return { blob, attempts: attempt };
            }
            
            // Check for auth errors first
            const errorText = await response.text().catch(() => '');
            
            if (response.status === 401) {
                const authError = new Error(`AUTH_ERROR: ${errorText}`);
                authError.isAuthError = true;
                throw authError;
            }
            
            // Check for balance/forbidden errors
            if (response.status === 403 && (errorText.includes('FORBIDDEN') || errorText.includes('balance') || errorText.includes('Insufficient') || errorText.includes('pollen'))) {
                if (credentialManager.hasMultiple()) {
                    credentialManager.markFailed(options._usedKey);
                    Logger.warn('Credential issue, rotating');
                    continue; // Try again with next key
                }
                // All keys exhausted or single key - show friendly balance error
                const balanceError = new Error(`BALANCE_ERROR: ${errorText}`);
                balanceError.isBalanceError = true;
                throw balanceError;
            }
            
            // Check for safety filter error
            const isSafetyError = errorText.includes('IMAGE_PROHIBITED_CONTENT') || 
                                  errorText.includes('PROHIBITED_CONTENT') ||
                                  errorText.includes('safety') ||
                                  (response.status === 400 && errorText.includes('Bad Request'));
            
            if (isSafetyError) {
                retryState.failures++;
                Logger.warn(`Safety filter triggered (attempt ${attempt})`, { 
                    failures: retryState.failures,
                    context: loadingElementId
                });
                
                // Show UI with cancel button for this specific context
                showSafetyRetryUI(retryState.failures, attempt, loadingElementId);
                
                // Add random variation to seed by appending to URL
                const retryUrl = new URL(url);
                retryUrl.searchParams.set('_retry', Date.now().toString());
                
                // Short delay between retries
                await sleep(500);
                continue;
            }
            
            // Not a safety error, use normal retry logic
            if (response.status === 500 || response.status === 429) {
                const delay = RETRY_DELAYS[Math.min(attempt - 1, RETRY_DELAYS.length - 1)];
                showToast(i18n.t('toast.networkError', { attempt, max: MAX_SAFETY_RETRIES }), 'warning');
                await sleep(delay);
                continue;
            }
            
            // Other error, throw
            throw new Error(`HTTP ${response.status}: ${errorText}`);
            
        } catch (error) {
            if (retryState.cancelled) {
                return null;
            }
            
            // Network error, retry
            if (error.name === 'TypeError' || error.message.includes('fetch')) {
                Logger.warn(`Network error on attempt ${attempt}`, { error: error.message });
                await sleep(1000);
                continue;
            }
            
            throw error;
        }
    }
    
    retryState.active = false;
    throw new Error(`Falha após ${MAX_SAFETY_RETRIES} tentativas do filtro de segurança`);
}

function showSafetyRetryUI(failures, currentAttempt, context) {
    // Update only the specific loading overlay for this context
    const loadingElement = document.getElementById(context);
    if (!loadingElement) return;
    
    let retryInfo = loadingElement.querySelector('.safety-retry-info');
    
    if (!retryInfo) {
        retryInfo = document.createElement('div');
        retryInfo.className = 'safety-retry-info';
        loadingElement.appendChild(retryInfo);
    }
    
    retryInfo.innerHTML = `
        <p class="safety-warning">⚠️ ${i18n.t('toast.safetyRetry', { failures, current: currentAttempt })}</p>
        <p class="retry-count">Tentativa ${currentAttempt} / ${MAX_SAFETY_RETRIES}</p>
        <button class="btn-cancel-retry" onclick="cancelSafetyRetry('${context}')">
            ❌ ${i18n.t('btn.cancel')}
        </button>
    `;
}

function hideSafetyRetryUI(context) {
    if (context) {
        const loadingElement = document.getElementById(context);
        if (loadingElement) {
            const retryInfo = loadingElement.querySelector('.safety-retry-info');
            if (retryInfo) retryInfo.remove();
        }
        if (safetyRetryStates[context]) {
            safetyRetryStates[context].active = false;
        }
    } else {
        // Fallback: remove all (for backwards compatibility)
        document.querySelectorAll('.safety-retry-info').forEach(el => el.remove());
    }
}

function cancelSafetyRetry(context) {
    if (context && safetyRetryStates[context]) {
        const state = safetyRetryStates[context];
        Logger.warn('Generation cancelled by user', { 
            context,
            attempt: state.currentAttempt,
            failures: state.failures
        });
        state.cancelled = true;
        state.active = false;
        hideSafetyRetryUI(context);
        showLoading(context, false);
        showToast(i18n.t('toast.safetyCancel'), 'info');
    }
}

// Make cancelSafetyRetry available globally
window.cancelSafetyRetry = cancelSafetyRetry;

// Generic Friendly Error UI - shows overlay with auto-dismiss
let friendlyErrorState = {
    interval: null,
    keyHandler: null
};

function showFriendlyErrorUI(titleKey, hintKey, icon, context) {
    // Clear any existing error
    hideFriendlyErrorUI();
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'friendlyErrorOverlay';
    overlay.className = 'balance-error-overlay visible';
    document.body.appendChild(overlay);
    
    let secondsLeft = 15;
    
    // Create card structure once
    overlay.innerHTML = `
        <div class="balance-error-card" onclick="event.stopPropagation()">
            <div class="balance-error-icon">${icon}</div>
            <h3 class="balance-error-title">${i18n.t(titleKey)}</h3>
            <p class="balance-error-desc">${i18n.t(hintKey)}</p>
            <p class="balance-error-dismiss" id="friendlyErrorCountdown"></p>
            <button class="btn-dismiss-balance" onclick="hideFriendlyErrorUI()">
                ✓ OK
            </button>
        </div>
    `;
    
    // Update only the countdown text
    const countdownEl = document.getElementById('friendlyErrorCountdown');
    const updateCountdown = () => {
        if (countdownEl) {
            countdownEl.textContent = i18n.t('toast.dismissIn', { seconds: secondsLeft });
        }
    };
    updateCountdown();
    
    // Click on overlay to close
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) hideFriendlyErrorUI();
    });
    
    // Press any key to close
    friendlyErrorState.keyHandler = () => hideFriendlyErrorUI();
    document.addEventListener('keydown', friendlyErrorState.keyHandler, { once: true });
    
    // Auto-dismiss countdown
    friendlyErrorState.interval = setInterval(() => {
        secondsLeft--;
        if (secondsLeft <= 0) {
            hideFriendlyErrorUI();
        } else {
            updateCountdown();
        }
    }, 1000);
    
    // Hide loading for the context
    if (context) {
        showLoading(context, false);
    }
}

function hideFriendlyErrorUI() {
    // Clear interval
    if (friendlyErrorState.interval) {
        clearInterval(friendlyErrorState.interval);
        friendlyErrorState.interval = null;
    }
    
    // Remove key handler
    if (friendlyErrorState.keyHandler) {
        document.removeEventListener('keydown', friendlyErrorState.keyHandler);
        friendlyErrorState.keyHandler = null;
    }
    
    const overlay = document.getElementById('friendlyErrorOverlay');
    if (overlay) {
        overlay.classList.remove('visible');
        overlay.classList.add('hidden');
        setTimeout(() => overlay.remove(), 300);
    }
}

// Convenience functions for specific error types
function showBalanceErrorUI(context) {
    showFriendlyErrorUI('toast.balanceError', 'toast.balanceErrorHint', '🌺', context);
}

function showAuthErrorUI(context) {
    showFriendlyErrorUI('toast.authError', 'toast.authErrorHint', '🔑', context);
}

// Make functions available globally
window.hideFriendlyErrorUI = hideFriendlyErrorUI;
window.hideBalanceErrorUI = hideFriendlyErrorUI; // Alias for compatibility

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== UI Helpers =====
function showLoading(elementId, show) {
    const element = document.getElementById(elementId);
    if (show) {
        element.classList.remove('hidden');
    } else {
        element.classList.add('hidden');
    }
}

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

// ===== Logs Viewer =====
function setupLogsViewer() {
    const logsContainer = document.getElementById('logsContainer');
    const exportBtn = document.getElementById('exportLogsBtn');
    const clearLogsBtn = document.getElementById('clearLogsBtn');
    const refreshLogsBtn = document.getElementById('refreshLogsBtn');
    
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
        refreshLogsBtn.addEventListener('click', renderLogs);
    }
    
    // Initial render
    renderLogs();
}

function renderLogs() {
    const container = document.getElementById('logsContainer');
    if (!container) return;
    
    const logs = Logger.getLogs(null, 100);
    
    if (logs.length === 0) {
        container.innerHTML = '<p class="logs-empty">Nenhum log registrado</p>';
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

// Make removeEditImage available globally for onclick
window.removeEditImage = removeEditImage;

// Expose Logger to console for debugging
window.Logger = Logger;
