/**
 * Hibiscus 🌺 - Editor Module
 * Handles image editing (img2img, in-painting)
 */

// ===== Resolution Multiplier for Edit =====
let editResolutionMultiplier = 1;

// ===== Editor Setup =====

/**
 * Setup image editing controls
 */
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
        // Use blob if available, fallback to URL
        if (state.currentEditBlob) {
            addEditImage(state.currentEditBlob);
        } else if (state.currentEditUrl) {
            addEditImage(state.currentEditUrl);
        }
    });

    // Initialize edit images array
    if (!state.editImages) {
        state.editImages = [];
    }

    // Paste handler
    document.addEventListener('paste', (e) => {
        const activeTab = document.querySelector('.tab-content.active');
        if (!activeTab || activeTab.id !== 'image-edit') return;

        if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        const files = [];

        for (const item of items) {
            if (item.type.indexOf('image') !== -1) {
                const file = item.getAsFile();
                if (file) files.push(file);
            }
        }

        if (files.length > 0) {
            e.preventDefault();
            handleMultipleEditImageUpload(files);
            showToast(i18n.t('toast.imagePasted'), 'success');
        }
    });
}

/**
 * Handle multiple image upload for editing
 */
function handleMultipleEditImageUpload(files) {
    Array.from(files).forEach(file => {
        addEditImage(file);
    });
}

/**
 * Add an image to the edit queue
 */
function addEditImage(input) {
    if (!state.editImages) state.editImages = [];

    let item;
    if (input instanceof File || input instanceof Blob) {
        item = {
            source: input,
            preview: URL.createObjectURL(input),
            isFile: true
        };
    } else {
        item = {
            source: input,
            preview: input,
            isFile: false
        };
    }

    state.editImages.push(item);
    updateEditImagesPreview();
    Logger.debug('Edit image added', { totalImages: state.editImages.length, isFile: item.isFile });
}

/**
 * Remove an image from the edit queue
 */
function removeEditImage(index) {
    const item = state.editImages[index];
    if (item && item.isFile) {
        URL.revokeObjectURL(item.preview);
    }
    state.editImages.splice(index, 1);
    updateEditImagesPreview();
}

/**
 * Clear all edit images
 */
function clearEditImages() {
    if (state.editImages) {
        state.editImages.forEach(item => {
            if (item.isFile) URL.revokeObjectURL(item.preview);
        });
    }
    state.editImages = [];
    document.getElementById('editImageUrl').value = '';
    updateEditImagesPreview();
}

/**
 * Update the edit images preview display
 */
function updateEditImagesPreview() {
    const container = document.getElementById('editUploadedPreview');
    const urlInput = document.getElementById('editImageUrl');

    if (!state.editImages || state.editImages.length === 0) {
        container.classList.add('hidden');
        container.innerHTML = '';
        if (urlInput) urlInput.value = '';
        return;
    }

    container.classList.remove('hidden');
    container.innerHTML = `
        <div class="multi-image-preview">
            ${state.editImages.map((item, index) => `
                <div class="preview-thumb" data-index="${index}">
                    <img src="${item.preview}" alt="Image ${index + 1}">
                    <button class="btn-remove-thumb" onclick="removeEditImage(${index})">✕</button>
                    <span class="thumb-index">${index + 1}</span>
                </div>
            `).join('')}
            <div class="add-more-btn" onclick="document.getElementById('editImageFile').click()">
                <span>+</span>
                <small data-i18n="btn.add">${i18n.t('btn.add', 'Adicionar')}</small>
            </div>
        </div>
        <p class="multi-image-info">${state.editImages.length} image${state.editImages.length > 1 ? 'ns' : 'm'} selecionada${state.editImages.length > 1 ? 's' : ''}</p>
    `;

    // Calculate URLs for input only if they are not files (files can't be in input value easily)
    if (urlInput) {
        const urls = state.editImages.filter(i => !i.isFile).map(i => i.source);
        urlInput.value = urls.join(',');
    }
}

/**
 * Helper to convert edit images to deployable format (Base64/URL)
 */
async function prepareEditImagesForUpload() {
    return Promise.all(state.editImages.map(async (item) => {
        if (!item.isFile) return item.source;

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(item.source);
        });
    }));
}

/**
 * Apply image edit (img2img)
 */
async function applyImageEdit() {
    const prompt = document.getElementById('editPrompt').value.trim();
    if (!prompt) {
        showToast(i18n.t('toast.enterEditPrompt'), 'warning');
        return;
    }

    if (!state.editImages || state.editImages.length === 0) {
        showToast(i18n.t('toast.selectImage'), 'warning');
        return;
    }

    Logger.info('Starting image edit', { prompt: prompt.slice(0, 100), imageCount: state.editImages.length });

    // Upload images to temp host
    let processedImages;
    try {
        showLoading('editLoading', true);

        // Convert files to base64 if needed
        const imagesToUpload = await prepareEditImagesForUpload();

        processedImages = await uploadImagesToTempHost(imagesToUpload);
        Logger.info('Images processed for edit', { count: processedImages.length });
    } catch (error) {
        Logger.error('Failed to process images for edit', { error: error.message });
        showToast(i18n.t('toast.imageProcessError', { error: error.message }), 'error');
        showLoading('editLoading', false);
        return;
    }

    const params = {
        model: document.getElementById('editModel').value,
        width: document.getElementById('editWidth').value,
        height: document.getElementById('editHeight').value,
        seed: document.getElementById('editSeed').value,
        quality: document.getElementById('editQuality').value, // Added quality parameter
        guidance_scale: document.getElementById('editGuidance').value,
        enhance: document.getElementById('editEnhance').checked,
        transparent: document.getElementById('editTransparent').checked,
        nologo: document.getElementById('editNoLogo').checked,
        safe: document.getElementById('editSafe').checked,
        private: true,
        nofeed: true,
        image: processedImages.join(',')
    };

    // Reset safety retry state
    safetyRetryStates.editLoading = { active: false, cancelled: false, failures: 0, currentAttempt: 0 };

    try {
        const url = buildImageUrl(prompt, params);
        Logger.debug('Edit URL built', { url: url.slice(0, 300) });

        const result = await fetchWithSafetyRetry(url, 'editLoading');

        if (!result) {
            Logger.info('Edit cancelled by user');
            showToast(i18n.t('toast.safetyCancel'), 'info');
            return;
        }

        const blob = result.blob;
        const editUrl = URL.createObjectURL(blob);

        state.currentEditUrl = editUrl;
        state.currentEditBlob = blob;
        state.currentEditPrompt = prompt;

        // Show preview
        const preview = document.getElementById('editPreview');
        const placeholder = document.querySelector('#image-edit .preview-placeholder');
        const actions = document.getElementById('editActions');

        preview.src = editUrl;
        preview.classList.remove('hidden');
        placeholder.classList.add('hidden');
        actions.classList.remove('hidden');

        // Add to gallery
        addToGallery({
            type: 'image',
            prompt: prompt,
            url: editUrl,
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
            // Already logged
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

/**
 * Download edited image
 */
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

// ===== Expose Globally =====
window.editResolutionMultiplier = editResolutionMultiplier;
window.setupImageEditing = setupImageEditing;
window.handleMultipleEditImageUpload = handleMultipleEditImageUpload;
window.addEditImage = addEditImage;
window.removeEditImage = removeEditImage;
window.clearEditImages = clearEditImages;
window.updateEditImagesPreview = updateEditImagesPreview;
window.applyImageEdit = applyImageEdit;
window.downloadEditedImage = downloadEditedImage;
window.prepareEditImagesForUpload = prepareEditImagesForUpload;
