/**
 * Hibiscus 🌺 - Image Generator Module
 * Handles image generation, preview, and related UI
 */

// ===== Constants =====
const API_BASE = 'https://gen.pollinations.ai';

// ===== Resolution Multiplier =====
let currentResolutionMultiplier = 1;

/**
 * Setup resolution multiplier toggles
 */
function setupResolutionMultiplier() {
    // Image generation resolution toggle
    setupResolutionToggle('resolutionToggle', 'imageAspectRatios', 'imageWidth', 'imageHeight', 'resolutionInfo', 'image');
    // Edit resolution toggle
    setupResolutionToggle('editResolutionToggle', 'editAspectRatios', 'editWidth', 'editHeight', 'editResolutionInfo', 'edit');

    // Update on language change to refresh labels (Normal/HD/Ultra)
    window.addEventListener('languageChanged', () => {
        const activeBtn = document.querySelector('#resolutionToggle .res-btn.active');
        if (activeBtn) updateResolutionInfoFor('resolutionInfo', parseInt(activeBtn.dataset.multiplier));

        const activeEditBtn = document.querySelector('#editResolutionToggle .res-btn.active');
        if (activeEditBtn) updateResolutionInfoFor('editResolutionInfo', parseInt(activeEditBtn.dataset.multiplier));
    });
}

/**
 * Setup a single resolution toggle with multiple buttons (1x, 2x, 4x)
 */
function setupResolutionToggle(toggleId, aspectId, widthId, heightId, infoId, context) {
    const toggle = document.getElementById(toggleId);
    if (!toggle) return;

    const buttons = toggle.querySelectorAll('.res-btn');

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active from all buttons in this toggle
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const multiplier = parseInt(btn.dataset.multiplier) || 1;

            if (context === 'image') {
                currentResolutionMultiplier = multiplier;
            } else if (context === 'edit') {
                editResolutionMultiplier = multiplier;
            }

            // Apply to inputs
            applyResolutionMultiplierFor(aspectId, widthId, heightId, infoId, multiplier);

            Logger.debug('Resolution multiplier changed', { context, multiplier });
        });
    });
}

/**
 * Apply resolution multiplier to image generation inputs
 */
function applyResolutionMultiplier() {
    applyResolutionMultiplierFor('imageAspectRatios', 'imageWidth', 'imageHeight', 'resolutionInfo', currentResolutionMultiplier);
}

/**
 * Apply resolution multiplier to specific inputs
 */
function applyResolutionMultiplierFor(aspectId, widthId, heightId, infoId, multiplier) {
    const container = document.getElementById(aspectId);
    const widthInput = document.getElementById(widthId);
    const heightInput = document.getElementById(heightId);

    if (!container || !widthInput || !heightInput) return;

    // Find active aspect ratio button
    const activeBtn = container.querySelector('.aspect-btn.active');
    if (activeBtn) {
        const baseWidth = parseInt(activeBtn.dataset.w);
        const baseHeight = parseInt(activeBtn.dataset.h);
        widthInput.value = baseWidth * multiplier;
        heightInput.value = baseHeight * multiplier;
    }

    updateResolutionInfoFor(infoId, multiplier);
}

/**
 * Update resolution info display
 */
function updateResolutionInfo() {
    updateResolutionInfoFor('resolutionInfo', currentResolutionMultiplier);
}

/**
 * Update specific resolution info display
 */
function updateResolutionInfoFor(infoId, multiplier) {
    const info = document.getElementById(infoId);
    if (!info) return;

    const labels = {
        1: i18n.t('image.resNormal'),
        2: i18n.t('image.resHD'),
        4: i18n.t('image.resUltra')
    };

    info.textContent = labels[multiplier] || `${multiplier}x`;

    // Handle Resolution Warning
    const parent = info.parentNode;
    let warningEl = parent.querySelector('.resolution-warning-box');

    if (multiplier > 1) {
        if (!warningEl) {
            warningEl = document.createElement('div');
            warningEl.className = 'resolution-warning-box';
            // i18n string already contains the emoji, so we don't need to add another one
            warningEl.innerHTML = i18n.t('image.resolutionWarning');
            parent.appendChild(warningEl);
        }
    } else {
        if (warningEl) {
            warningEl.remove();
        }
    }
}

// ===== Aspect Ratio Buttons =====

/**
 * Setup aspect ratio buttons containers
 */
function setupAspectRatioButtons() {
    setupAspectRatioContainer('imageAspectRatios', 'imageWidth', 'imageHeight');
    setupAspectRatioContainer('editAspectRatios', 'editWidth', 'editHeight');
}

/**
 * Setup a single aspect ratio container
 */
function setupAspectRatioContainer(containerId, widthInputId, heightInputId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const widthInput = document.getElementById(widthInputId);
    const heightInput = document.getElementById(heightInputId);

    const isEditForm = containerId.includes('edit') || containerId.includes('Edit');

    container.querySelectorAll('.aspect-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('.aspect-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const width = btn.dataset.w;
            const height = btn.dataset.h;

            widthInput.value = width;
            heightInput.value = height;

            if (isEditForm) {
                state.formOptions.edit.aspectRatio = btn.dataset.ratio;
                applyResolutionMultiplierFor('editAspectRatios', 'editWidth', 'editHeight', 'editResolutionInfo', editResolutionMultiplier);
            } else {
                state.formOptions.image.aspectRatio = btn.dataset.ratio;
                if (typeof applyResolutionMultiplier === 'function') {
                    applyResolutionMultiplier();
                }
            }
            saveFormOptions();

            Logger.debug('Aspect ratio changed', { container: containerId, ratio: btn.dataset.ratio, width, height });
        });
    });

    // Update on manual input change
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

// ===== Image Generation Setup =====

/**
 * Setup image generation controls
 */
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

/**
 * Generate an image from prompt
 */
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

    // Reset safety retry state
    safetyRetryStates.imageLoading = { active: false, cancelled: false, failures: 0, currentAttempt: 0 };

    try {
        const url = buildImageUrl(prompt, params);
        Logger.debug('Image URL built', { url });

        const result = await fetchWithSafetyRetry(url, 'imageLoading');

        if (!result) {
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
            // Already logged
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

/**
 * Build Pollinations API URL for image generation
 */
function buildImageUrl(prompt, params) {
    const encodedPrompt = encodeURIComponent(prompt);
    const url = new URL(`${API_BASE}/image/${encodedPrompt}`);

    const integerParams = ['width', 'height', 'seed', 'duration'];
    let imageParam = null;

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            if (key === 'image') {
                imageParam = value;
                return;
            }
            if (key === 'seed') {
                const seedValue = parseInt(value, 10);
                if (isNaN(seedValue) || seedValue < 0) {
                    value = Math.floor(Math.random() * 2147483647);
                } else {
                    value = seedValue;
                }
                url.searchParams.set(key, value.toString());
                return;
            }
            if (integerParams.includes(key)) {
                value = Math.floor(parseInt(value, 10));
                if (isNaN(value)) return;
            }
            url.searchParams.set(key, value.toString());
        }
    });

    // Add image param last (API requirement)
    if (imageParam) {
        const separator = url.search ? '&' : '?';
        return url.toString() + separator + 'image=' + encodeURIComponent(imageParam);
    }

    return url.toString();
}

/**
 * Show image preview
 */
function showImagePreview(url) {
    const preview = document.getElementById('imagePreview');
    const placeholder = document.querySelector('#image-gen .preview-placeholder');
    const actions = document.getElementById('imageActions');

    preview.src = url;
    preview.classList.remove('hidden');
    placeholder.classList.add('hidden');
    actions.classList.remove('hidden');
}

/**
 * Hide preview (image or video)
 */
function hidePreview(type) {
    if (type === 'image') {
        const preview = document.getElementById('imagePreview');
        const placeholder = document.querySelector('#image-gen .preview-placeholder');
        const actions = document.getElementById('imageActions');

        preview.classList.add('hidden');
        placeholder.classList.remove('hidden');
        actions.classList.add('hidden');
    } else if (type === 'video') {
        const preview = document.getElementById('videoPreview');
        const placeholder = document.querySelector('#video-gen .preview-placeholder');
        const actions = document.getElementById('videoActions');

        preview.classList.add('hidden');
        placeholder.classList.remove('hidden');
        actions.classList.add('hidden');
    }
}

/**
 * Download current generated image
 */
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

/**
 * Send current image to edit tab
 */
function sendToEdit() {
    if (!state.currentImageUrl) {
        showToast(i18n.t('toast.noImage'), 'warning');
        return;
    }

    // Switch to edit tab
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector('[data-tab="image-edit"]').classList.add('active');
    document.getElementById('image-edit').classList.add('active');

    // Add image to edit state - use blob if available
    if (state.currentImageBlob) {
        addEditImage(state.currentImageBlob);
    } else {
        addEditImage(state.currentImageUrl);
    }

    showToast(i18n.t('toast.sentToEdit'), 'success');
}

// ===== Model Discovery =====

/**
 * Load available models from API
 */
async function loadModelsFromAPI() {
    Logger.info('Loading models from API...');

    try {
        const imageResponse = await fetchWithRetry(`${API_BASE}/image/models`);
        if (imageResponse.ok) {
            state.imageModels = await imageResponse.json();
            Logger.info('Image models loaded', { count: state.imageModels.length });
            populateImageModelSelects();
        }
    } catch (error) {
        Logger.error('Failed to load image models', { error: error.message });
        useFallbackImageModels();
    }

    try {
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

/**
 * Use fallback models if API fails
 */
function useFallbackImageModels() {
    Logger.warn('Using fallback image models');
    state.imageModels = [
        { name: 'zimage', description: 'Z-Image (Default)' },
        { name: 'flux', description: 'Flux - High quality model' },
        { name: 'turbo', description: 'Turbo - Fast generation' },
        { name: 'gptimage', description: 'GPT Image' },
        { name: 'gptimage-large', description: 'GPT Image Large' },
        { name: 'kontext', description: 'Kontext - Good for editing' },
        { name: 'seedream', description: 'Seedream' },
        { name: 'seedream-pro', description: 'Seedream Pro' },
        { name: 'nanobanana', description: 'Nanobanana' },
        { name: 'nanobanana-pro', description: 'Nanobanana Pro' },
        { name: 'klein', description: 'Klein' },
        { name: 'klein-large', description: 'Klein Large' }
    ];
    populateImageModelSelects();
}

/**
 * Populate model select elements
 */
function populateImageModelSelects() {
    const imageModelSelect = document.getElementById('imageModel');
    const editModelSelect = document.getElementById('editModel');
    const videoModelSelect = document.getElementById('videoModel');

    // Separate models by type
    const imageOnlyModels = state.imageModels.filter(m =>
        !['veo', 'seedance', 'seedance-pro', 'video', 'wan'].some(v => m.name.toLowerCase().includes(v))
    );
    const videoModels = state.imageModels.filter(m =>
        ['veo', 'seedance', 'seedance-pro', 'video', 'wan'].some(v => m.name.toLowerCase().includes(v))
    );

    if (imageModelSelect) {
        imageModelSelect.innerHTML = imageOnlyModels.map(model => {
            const displayName = model.description || model.name;
            const isDefault = model.name === 'flux';
            return `<option value="${model.name}" ${isDefault ? 'selected' : ''}>${displayName}</option>`;
        }).join('');
    }

    if (editModelSelect) {
        editModelSelect.innerHTML = imageOnlyModels.map(model => {
            const displayName = model.description || model.name;
            const isDefault = model.name === 'kontext';
            return `<option value="${model.name}" ${isDefault ? 'selected' : ''}>${displayName}</option>`;
        }).join('');
    }

    if (videoModelSelect && videoModels.length > 0) {
        videoModelSelect.innerHTML = videoModels.map(model => {
            const displayName = model.description || model.name;
            const isDefault = model.name === 'veo';
            return `<option value="${model.name}" ${isDefault ? 'selected' : ''}>${displayName}</option>`;
        }).join('');
    }

    // Update visibility logic
    updateQualityVisibility();

    // Add change listeners
    if (imageModelSelect) {
        imageModelSelect.addEventListener('change', updateQualityVisibility);
    }
    if (editModelSelect) {
        editModelSelect.addEventListener('change', updateQualityVisibility);
    }

    Logger.debug('Model selects populated', {
        image: imageOnlyModels.length,
        video: videoModels.length
    });
}

/**
 * Toggle Quality parameter visibility based on model (GPT-only)
 */
function updateQualityVisibility() {
    const imageModel = document.getElementById('imageModel');
    const imageQuality = document.getElementById('imageQuality');
    const editModel = document.getElementById('editModel');
    const editQuality = document.getElementById('editQuality');

    if (imageModel && imageQuality) {
        const isGPT = imageModel.value.toLowerCase().includes('gpt');
        const container = imageQuality.closest('.form-group');
        if (container) {
            if (isGPT) {
                container.classList.remove('hidden');
            } else {
                container.classList.add('hidden');
            }
        }
    }

    if (editModel && editQuality) {
        const isGPT = editModel.value.toLowerCase().includes('gpt');
        const container = editQuality.closest('.form-group');
        if (container) {
            if (isGPT) {
                container.classList.remove('hidden');
            } else {
                container.classList.add('hidden');
            }
        }
    }
}

// ===== Expose Globally =====
window.API_BASE = API_BASE;
window.currentResolutionMultiplier = currentResolutionMultiplier;
window.setupResolutionMultiplier = setupResolutionMultiplier;
window.setupResolutionToggle = setupResolutionToggle;
window.applyResolutionMultiplier = applyResolutionMultiplier;
window.applyResolutionMultiplierFor = applyResolutionMultiplierFor;
window.updateResolutionInfo = updateResolutionInfo;
window.updateResolutionInfoFor = updateResolutionInfoFor;
window.setupAspectRatioButtons = setupAspectRatioButtons;
window.setupAspectRatioContainer = setupAspectRatioContainer;
window.setupImageGeneration = setupImageGeneration;
window.generateImage = generateImage;
window.buildImageUrl = buildImageUrl;
window.showImagePreview = showImagePreview;
window.hidePreview = hidePreview;
window.downloadCurrentImage = downloadCurrentImage;
window.sendToEdit = sendToEdit;
window.loadModelsFromAPI = loadModelsFromAPI;
window.useFallbackImageModels = useFallbackImageModels;
window.populateImageModelSelects = populateImageModelSelects;
window.updateQualityVisibility = updateQualityVisibility;
