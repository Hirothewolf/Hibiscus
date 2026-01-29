/**
 * Hibiscus 🌺 - Parallel Generation & Recent Images Module
 * All image generation runs in parallel. Shows recent generations below preview.
 */

// ===== Recent Generations State =====
const recentGenerations = {
    txt2img: [],  // Recent images from text-to-image
    img2img: [],  // Recent images from image editing
    maxItems: 5   // Show max 5 recent items
};

// ===== Parallel Generation Queue =====
const generationQueue = {
    jobs: new Map(),
    nextId: 1,
    maxConcurrent: 6,

    get activeCount() {
        return Array.from(this.jobs.values()).filter(j => j.status === 'running' || j.status === 'retry').length;
    }
};

// ===== Create Generation Job =====

/**
 * Create and start a parallel generation job
 * @param {string} prompt - The prompt
 * @param {Object} params - Generation parameters
 * @param {string} type - 'txt2img', 'img2img', or 'video'
 * @returns {number} Job ID
 */
function createGenerationJob(prompt, params, type = 'txt2img') {
    const jobId = generationQueue.nextId++;

    const job = {
        id: jobId,
        type: type,
        prompt: prompt,
        params: { ...params },
        status: 'pending',
        result: null,
        error: null,
        safetyAttempts: 0,
        maxRetries: 30,
        cancelled: false,
        createdAt: new Date()
    };

    generationQueue.jobs.set(jobId, job);
    Logger.info('Generation job created', { jobId, type, prompt: prompt.slice(0, 50) });

    // Update UI
    renderJobQueue(type);

    // Process immediately
    executeGenerationJob(jobId);

    return jobId;
}

/**
 * Execute a generation job
 */
async function executeGenerationJob(jobId) {
    const job = generationQueue.jobs.get(jobId);
    if (!job || job.status !== 'pending') return;

    job.status = 'running';
    renderJobQueue(job.type);

    // Network retry counter (local)
    const MAX_NETWORK_RETRIES = 3;
    let networkAttempts = 0;

    // Recursive execution logic
    const tryExecute = async () => {
        // Check for cancellation
        if (job.cancelled) {
            throw new Error('Cancelled by user');
        }

        try {
            const url = buildImageUrl(job.prompt, job.params);

            // Use low-level fetchWithAuth to handle 400 errors manually
            const response = await fetchWithAuth(url);

            // Handle successful response
            if (response.ok) {
                const blob = await response.blob();
                const imageUrl = URL.createObjectURL(blob);

                job.status = 'completed';
                job.result = { blob, url: imageUrl };
                renderJobQueue(job.type);

                const galleryItem = {
                    type: 'image',
                    prompt: job.prompt,
                    date: new Date().toISOString(),
                    params: job.params,
                    url: imageUrl,
                    blob: blob,
                    isEdit: job.type === 'img2img',
                    favorite: false
                };

                addToGallery(galleryItem);

                addToRecents(job.type, {
                    id: Date.now(),
                    url: imageUrl,
                    blob: blob,
                    prompt: job.prompt,
                    params: job.params
                });

                state.stats.images++;
                saveStats();
                updateStats();

                if (state.autoDownload) {
                    const filename = generateFilename(job.prompt, 'image');
                    await downloadFile(blob, filename, 'image');
                }

                updateMainPreview(job.type, imageUrl, job.prompt, blob);

                // Update balance
                if (window.updateBalanceUI) window.updateBalanceUI();

                showToast(i18n.t('toast.imageSuccess'), 'success');
                Logger.info('Generation job completed', { jobId, safetyAttempts: job.safetyAttempts });

                // Cleanup job from queue after delay
                setTimeout(() => {
                    generationQueue.jobs.delete(jobId);
                    renderJobQueue(job.type);
                }, 2000);

                renderRecentsUI(job.type);
                return;
            }

            // Handle Errors
            let errorText = '';
            try { errorText = await response.text(); } catch (e) { }

            // Check for Retryable Error (HTTP 400)
            const isParameterError = response.status === 400 && (
                errorText.toLowerCase().includes('invalid parameter') ||
                errorText.toLowerCase().includes('model not found') ||
                errorText.toLowerCase().includes('invalid model')
            );
            const isSafety = response.status === 400 && !isParameterError;

            if (isSafety) {
                // Check for cancellation
                if (job.cancelled) {
                    throw new Error('Cancelled by user');
                }

                if (job.safetyAttempts < job.maxRetries) {
                    job.safetyAttempts++;
                    job.status = 'retry';
                    job.params.seed = Math.floor(Math.random() * 2147483647);

                    Logger.warn(`Safety filter hit, retrying... (${job.safetyAttempts}/${job.maxRetries})`);

                    // Update UI
                    renderJobQueue(job.type);

                    await new Promise(r => setTimeout(r, 1000));
                    return tryExecute();
                } else {
                    throw new Error('Bloqueado pelo filtro de segurança após ' + job.maxRetries + ' tentativas');
                }
            }

            // Check for critical errors (Auth/Balance)
            if (response.status === 401) throw { isAuthError: true, message: errorText };
            if (response.status === 402 || (response.status === 403 && (errorText.includes('balance') || errorText.includes('pollen')))) {
                throw { isBalanceError: true, message: errorText };
            }

            // Check for specific non-retryable 500 errors (like Resolution Limit)
            const isLimitError = errorText.toLowerCase().includes('exceeds limit') ||
                errorText.toLowerCase().includes('value_error');

            // Check for Network/Server errors (5xx or 429) to retry
            if ((response.status >= 500 || response.status === 429) && !isLimitError) {
                if (networkAttempts < MAX_NETWORK_RETRIES) {
                    networkAttempts++;
                    Logger.warn(`Server/Network error ${response.status}, retrying...`);
                    await new Promise(r => setTimeout(r, 2000));
                    return tryExecute();
                }
            }

            throw new Error(`HTTP ${response.status}: ${errorText}`);

        } catch (error) {
            // Check network exception (TypeError: Failed to fetch)
            const isNetworkError = !error.response && !error.isAuthError && !error.isBalanceError && (
                error.message === 'Failed to fetch' ||
                error.name === 'TypeError' ||
                error.message?.includes('Network') ||
                !error.message
            );

            if (isNetworkError && networkAttempts < MAX_NETWORK_RETRIES) {
                networkAttempts++;
                console.log('Network exception, retrying...', error);
                await new Promise(r => setTimeout(r, 2000));
                return tryExecute();
            }

            job.status = 'failed';
            renderJobQueue(job.type);

            // Parse and get user-friendly error message
            const friendlyError = parseAPIError(error);
            job.error = friendlyError.display;

            Logger.error('Generation job failed', { jobId, error: friendlyError.raw });

            // Force hide loading
            const loadingId = job.type === 'txt2img' ? 'imageLoading' : 'editLoading';
            showLoading(loadingId, false);

            if (error.message === 'Cancelled by user' || friendlyError.type === 'cancelled') {
                showToast(i18n.t('toast.cancelled') || 'Cancelled', 'info');
            } else if (error.isAuthError || friendlyError.type === 'auth') {
                showToast(i18n.t('toast.authError'), 'error');
            } else if (error.isBalanceError || friendlyError.type === 'balance') {
                showToast(i18n.t('toast.balanceError'), 'error');
            } else if (friendlyError.type === 'server') {
                showToast(i18n.t('toast.serverError', { model: friendlyError.model || '' }) || friendlyError.display, 'error');
            } else if (friendlyError.type === 'safety') {
                showToast(i18n.t('toast.safetyBlocked') || friendlyError.display, 'error');
            } else {
                showToast(friendlyError.display, 'error');
            }

            // Job stays in queue with 'failed' status until user dismisses it
            renderRecentsUI(job.type);
        }
    };

    tryExecute();
}



/**
 * Remove completed jobs older than 5 minutes
 */
function cleanupOldJobs() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    generationQueue.jobs.forEach((job, id) => {
        if (job.status !== 'running' && job.status !== 'pending' && job.createdAt < fiveMinutesAgo) {
            if (job.result?.url) {
                // Don't revoke - might be in recents
            }
            generationQueue.jobs.delete(id);
        }
    });
}

// ===== Recent Generations Management =====

/**
 * Add item to recents
 */
function addToRecents(type, item) {
    if (!recentGenerations[type]) recentGenerations[type] = [];

    // Add to front
    recentGenerations[type].unshift(item);

    // Trim to max
    while (recentGenerations[type].length > recentGenerations.maxItems) {
        const removed = recentGenerations[type].pop();
        // Don't revoke URL - still in gallery
    }

    Logger.debug('Added to recents', { type, count: recentGenerations[type].length });
}

/**
 * Remove item from recents by gallery ID or URL
 * Called when item is deleted from gallery to keep recents in sync
 * @param {string} galleryId - The gallery item ID
 * @param {string} url - Optional URL to match
 */
function removeFromRecentsById(galleryId, url = null) {
    ['txt2img', 'img2img'].forEach(type => {
        if (recentGenerations[type]) {
            const beforeCount = recentGenerations[type].length;
            recentGenerations[type] = recentGenerations[type].filter(item => {
                // Match by galleryId if available
                if (item.galleryId && String(item.galleryId) === String(galleryId)) return false;
                // Match by URL if provided
                if (url && item.url === url) return false;
                return true;
            });
            if (beforeCount !== recentGenerations[type].length) {
                renderRecentsUI(type);
                Logger.debug('Removed from recents', { type, galleryId });
            }
        }
    });
}

/**
 * Update the main preview area
 */
function updateMainPreview(type, imageUrl, prompt, blob) {
    let previewImg, actionsDiv, placeholderDiv;

    if (type === 'txt2img') {
        previewImg = document.getElementById('imagePreview');
        actionsDiv = document.getElementById('imageActions');
        placeholderDiv = document.querySelector('#image-gen .preview-placeholder');

        state.currentImageUrl = imageUrl;
        state.currentImageBlob = blob;
        state.currentImagePrompt = prompt;
    } else {
        previewImg = document.getElementById('editPreview');
        actionsDiv = document.getElementById('editActions');
        placeholderDiv = document.querySelector('#image-edit .preview-placeholder');

        state.currentEditUrl = imageUrl;
        state.currentEditBlob = blob;
        state.currentEditPrompt = prompt;
    }

    if (previewImg) {
        previewImg.src = imageUrl;
        previewImg.classList.remove('hidden');
    }
    if (placeholderDiv) {
        placeholderDiv.classList.add('hidden');
    }
    if (actionsDiv) {
        actionsDiv.classList.remove('hidden');
    }

    // Hide loading
    const loadingId = type === 'txt2img' ? 'imageLoading' : 'editLoading';
    showLoading(loadingId, false);
}

/**
 * Render recents UI
 */
function renderRecentsUI(type = 'txt2img') {
    const containerId = type === 'txt2img' ? 'recentsContainer' : 'editRecentsContainer';
    const container = document.getElementById(containerId);

    if (!container) return;

    const items = recentGenerations[type] || [];

    if (items.length === 0) {
        container.innerHTML = `
            <div class="recents-empty">
                <small data-i18n="recents.empty">${i18n.t('recents.empty')}</small>
            </div>
        `;
        return;
    }

    let html = '<div class="recents-grid">';

    items.forEach((item, index) => {
        html += `
            <div class="recent-item" data-index="${index}" data-type="${type}">
                <img src="${item.url}" alt="Recent ${index + 1}" onclick="showRecentImage('${type}', ${index})">
                <div class="recent-actions">
                    <button class="btn-icon" onclick="event.stopPropagation(); showRecentImage('${type}', ${index})" title="Ver">👁️</button>
                    <button class="btn-icon" onclick="event.stopPropagation(); editRecentImage('${type}', ${index})" title="Editar">✏️</button>
                    <button class="btn-icon" onclick="event.stopPropagation(); deleteRecentImage('${type}', ${index})" title="Apagar">🗑️</button>
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

/**
 * Show a recent image in main preview
 */
function showRecentImage(type, index) {
    const items = recentGenerations[type] || [];
    const item = items[index];

    if (!item) return;

    updateMainPreview(type, item.url, item.prompt, item.blob);

    showToast(`Mostrando imagem ${index + 1}`, 'info');
}

/**
 * Send recent image to editor
 */
function editRecentImage(type, index) {
    const items = recentGenerations[type] || [];
    const item = items[index];

    if (!item) return;

    // Switch to edit tab
    document.querySelector('[data-tab="image-edit"]')?.click();

    // Add to edit images - use blob (not URL) so it can be converted to Base64
    if (item.blob) {
        addEditImage(item.blob);
    } else {
        // Fallback to URL if blob not available
        addEditImage(item.url);
    }

    showToast(i18n.t('toast.sentToEdit'), 'success');
}

/**
 * Delete a recent image
 */
async function deleteRecentImage(type, index) {
    const items = recentGenerations[type] || [];
    const item = items[index];

    if (item) {
        if (!confirm(i18n.t('gallery.confirmDelete') || 'Delete this item?')) return;

        // Try to verify if it exists in gallery to delete it permanently
        if (item.url && typeof state !== 'undefined' && state.gallery) {
            const galleryItem = state.gallery.find(i => i.url === item.url || i.localUrl === item.url);

            if (galleryItem) {
                if (window.Backend && Backend.available) {
                    await Backend.deleteItem(galleryItem.id);
                }

                // Cleanup memory
                if (window.urlRegistry) urlRegistry.revoke(galleryItem.id);
                if (window.galleryBlobs) delete window.galleryBlobs[galleryItem.id];

                state.gallery = state.gallery.filter(i => i.id !== galleryItem.id);
                if (window.saveGallery) saveGallery();
                if (window.renderGallery) renderGallery();
            }
        }

        items.splice(index, 1);
        renderRecentsUI(type);
        showToast(i18n.t('btn.delete') || 'Image deleted', 'success');
    }
}

// ===== Modified Generate Functions =====

/**
 * Generate image - uses parallel queue
 */
function generateImageParallel() {
    const prompt = document.getElementById('imagePrompt').value.trim();
    if (!prompt) {
        showToast(i18n.t('toast.enterPrompt'), 'warning');
        return;
    }

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

    // Show loading state
    showLoading('imageLoading', true);

    // Create parallel job
    createGenerationJob(prompt, params, 'txt2img');

    showToast(i18n.t('toast.jobAdded'), 'info');
}

/**
 * Apply image edit - uses parallel queue
 */
async function applyImageEditParallel() {
    const prompt = document.getElementById('editPrompt').value.trim();
    if (!prompt) {
        showToast(i18n.t('toast.enterEditPrompt'), 'warning');
        return;
    }

    if (!state.editImages || state.editImages.length === 0) {
        showToast(i18n.t('toast.selectImage'), 'warning');
        return;
    }

    // Upload images to temp host if needed
    let processedImages;
    try {
        showLoading('editLoading', true);
        showToast(i18n.t('toast.uploadingImages'), 'info');

        // Convert files to base64 if needed (lazy load)
        const imagesToUpload = await window.prepareEditImagesForUpload();

        processedImages = await uploadImagesToTempHost(imagesToUpload);
    } catch (error) {
        Logger.error('Failed to process images', { error: error.message });
        showToast(i18n.t('toast.imageUploadFailed'), 'error');
        showLoading('editLoading', false);
        return;
    }

    const params = {
        model: document.getElementById('editModel').value,
        width: document.getElementById('editWidth').value,
        height: document.getElementById('editHeight').value,
        seed: document.getElementById('editSeed').value,
        guidance_scale: document.getElementById('editGuidance').value,
        enhance: document.getElementById('editEnhance').checked,
        transparent: document.getElementById('editTransparent').checked,
        nologo: document.getElementById('editNoLogo').checked,
        safe: document.getElementById('editSafe').checked,
        private: true,
        nofeed: true,
        image: processedImages.join(',')
    };

    // Create parallel job
    createGenerationJob(prompt, params, 'img2img');

    showToast(i18n.t('toast.jobAdded'), 'info');
}

// ===== Setup =====

/**
 * Setup parallel generation and recents
 */
function setupParallelGeneration() {
    // Override the generate button to use parallel
    const generateBtn = document.getElementById('generateImageBtn');
    if (generateBtn) {
        // Remove old listener by cloning
        const newBtn = generateBtn.cloneNode(true);
        generateBtn.parentNode.replaceChild(newBtn, generateBtn);
        newBtn.addEventListener('click', generateImageParallel);
    }

    // Override edit button
    const editGenBtn = document.getElementById('editImageGenerateBtn');
    if (editGenBtn) {
        const newEditBtn = editGenBtn.cloneNode(true);
        editGenBtn.parentNode.replaceChild(newEditBtn, editGenBtn);
        newEditBtn.addEventListener('click', applyImageEditParallel);
    }

    // Initialize recents UI
    renderRecentsUI('txt2img');
    renderRecentsUI('img2img');

    Logger.info('Parallel generation system initialized');
}

// ===== Job Queue UI Rendering =====

/**
 * Render the job queue panel for a specific type
 * @param {string} type - 'txt2img', 'img2img', or 'video'
 */
/**
 * Render the job queue panel for all types
 * Ignores the 'type' param and updates all queues to show unified status
 */
function renderJobQueue(ignoredType) {
    const panels = [
        { type: 'txt2img', panelId: 'jobQueueTxt2Img', listId: 'jobListTxt2Img', countId: 'jobCountTxt2Img' },
        { type: 'img2img', panelId: 'jobQueueImg2Img', listId: 'jobListImg2Img', countId: 'jobCountImg2Img' },
        { type: 'video', panelId: 'jobQueueVideo', listId: 'jobListVideo', countId: 'jobCountVideo' }
    ];

    // Get ALL active jobs regardless of type
    const jobs = Array.from(generationQueue.jobs.values())
        .filter(j => j.status === 'pending' || j.status === 'running' || j.status === 'retry' || j.status === 'failed')
        .sort((a, b) => a.id - b.id);

    panels.forEach(cfg => {
        const panel = document.getElementById(cfg.panelId);
        const list = document.getElementById(cfg.listId);
        const countEl = document.getElementById(cfg.countId);

        if (!panel || !list) return;

        if (jobs.length === 0) {
            panel.classList.add('hidden');
            return;
        }

        panel.classList.remove('hidden');
        const activeCount = jobs.filter(j => j.status !== 'failed').length;
        if (countEl) countEl.textContent = activeCount > 0 ? activeCount : jobs.length;

        let html = '';
        jobs.forEach(job => {
            const statusClass = job.status === 'retry' ? 'retry' : job.status;
            const progress = job.status === 'retry' ? Math.round((job.safetyAttempts / job.maxRetries) * 100) : 0;

            let statusText = '';
            if (job.status === 'pending') {
                statusText = `⏳ ${i18n.t('jobs.pending')}`;
            } else if (job.status === 'running') {
                statusText = `🔄 ${i18n.t('jobs.running')}`;
            } else if (job.status === 'retry') {
                statusText = `⚠️ ${i18n.t('jobs.retry', { current: job.safetyAttempts, max: job.maxRetries })}`;
            } else if (job.status === 'failed') {
                const isSafety = job.error && (job.error.includes('filtro') || job.error.includes('safety') || job.error.includes('bloqueado') || job.error.includes('filter'));
                statusText = isSafety ? `❌ ${i18n.t('jobs.blockedByFilter')}` : `❌ ${i18n.t('jobs.failed')}`;
            }

            const typeBadge = job.type === 'txt2img' ? 'txt2img' : job.type === 'img2img' ? 'img2img' : 'video';
            const buttonAction = job.status === 'failed' ? `dismissJob(${job.id})` : `cancelJob(${job.id})`;
            const buttonLabel = job.status === 'failed' ? '✓' : '✕';

            const modelName = job.params?.model || '';

            html += `
                <div class="job-card ${statusClass}">
                    <div class="job-info">
                        <div class="job-id">#${job.id} <span class="job-type-badge ${typeBadge}">${job.type}</span>${modelName ? ` <span class="job-model-badge">${modelName}</span>` : ''}</div>
                        <div class="job-prompt">${escapeHtml(job.prompt.slice(0, 60))}${job.prompt.length > 60 ? '...' : ''}</div>
                    </div>
                    <div class="job-status ${statusClass}">
                        ${statusText}
                        ${job.status === 'retry' ? `<div class="job-progress"><div class="job-progress-bar retry" style="width: ${progress}%"></div></div>` : ''}
                    </div>
                    <button class="job-cancel ${job.status === 'failed' ? 'dismiss' : ''}" onclick="${buttonAction}">${buttonLabel}</button>
                </div>
            `;
        });

        list.innerHTML = html;
    });
}

/**
 * Render all job queues
 */
function renderAllJobQueues() {
    renderJobQueue('txt2img');
    renderJobQueue('img2img');
    renderJobQueue('video');
}

/**
 * Cancel a specific job
 * @param {number} jobId - The job ID to cancel
 */
function cancelJob(jobId) {
    const job = generationQueue.jobs.get(jobId);
    if (!job) return;

    job.cancelled = true;
    job.status = 'cancelled';

    Logger.info('Job cancelled by user', { jobId });
    showToast(i18n.t('toast.cancelled'), 'info');

    // Remove from queue after short delay
    setTimeout(() => {
        generationQueue.jobs.delete(jobId);
        renderJobQueue(job.type);
    }, 500);
}

/**
 * Dismiss a failed job from the queue
 * @param {number} jobId - The job ID to dismiss
 */
function dismissJob(jobId) {
    const job = generationQueue.jobs.get(jobId);
    if (!job) return;

    generationQueue.jobs.delete(jobId);
    renderJobQueue(job.type);
    Logger.debug('Job dismissed', { jobId });
}



/**
 * Helper: Escape HTML
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== Expose Globally =====
window.recentGenerations = recentGenerations;
window.generationQueue = generationQueue;
window.createGenerationJob = createGenerationJob;
window.generateImageParallel = generateImageParallel;
window.applyImageEditParallel = applyImageEditParallel;
window.showRecentImage = showRecentImage;
window.editRecentImage = editRecentImage;
window.deleteRecentImage = deleteRecentImage;
window.renderRecentsUI = renderRecentsUI;
window.removeFromRecentsById = removeFromRecentsById;
window.renderJobQueue = renderJobQueue;
window.renderAllJobQueues = renderAllJobQueues;
window.cancelJob = cancelJob;
window.dismissJob = dismissJob;
window.setupParallelGeneration = setupParallelGeneration;
