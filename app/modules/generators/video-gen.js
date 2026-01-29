/**
 * Hibiscus 🌺 - Video Generator Module
 * Handles video generation from prompts and images
 */

// ===== Video Generation Setup =====

/**
 * Setup video generation controls
 */
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

    // Update on language change
    window.addEventListener('languageChanged', () => {
        updateVideoDurationOptions();
    });

    // Paste handler
    document.addEventListener('paste', (e) => {
        const activeTab = document.querySelector('.tab-content.active');
        if (!activeTab || activeTab.id !== 'video-gen') return;

        if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        let file = null;

        for (const item of items) {
            if (item.type.indexOf('image') !== -1) {
                file = item.getAsFile();
                break; // Only need one
            }
        }

        if (file) {
            e.preventDefault();
            handleVideoImageUpload(file);
            showToast(i18n.t('toast.imagePasted'), 'success');
        }
    });
}

/**
 * Handle video source image upload
 */
function handleVideoImageUpload(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const dataUrl = e.target.result;
        document.getElementById('videoSourceImage').src = dataUrl;
        document.getElementById('videoUploadedPreview').classList.remove('hidden');
        state.videoSourceFile = file;
        state.videoSourceDataUrl = dataUrl;
        document.getElementById('videoImageUrl').value = '';
    };
    reader.readAsDataURL(file);
}

/**
 * Upload image for video generation
 */
async function uploadImageForVideo(file) {
    Logger.info('Uploading image for video generation...');
    showToast(i18n.t('toast.uploadingImage'), 'info');

    try {
        const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

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

/**
 * Update video duration options based on selected model
 */
function updateVideoDurationOptions() {
    const model = document.getElementById('videoModel').value;
    const durationSelect = document.getElementById('videoDuration');

    durationSelect.innerHTML = '';

    const secondsLabel = i18n.t('video.seconds');

    if (model === 'veo') {
        durationSelect.innerHTML = `
            <option value="4">4 ${secondsLabel}</option>
            <option value="6">6 ${secondsLabel}</option>
            <option value="8" selected>8 ${secondsLabel}</option>
        `;
    } else {
        durationSelect.innerHTML = `
            <option value="2">2 ${secondsLabel}</option>
            <option value="4">4 ${secondsLabel}</option>
            <option value="6">6 ${secondsLabel}</option>
            <option value="8" selected>8 ${secondsLabel}</option>
            <option value="10">10 ${secondsLabel}</option>
            <option value="12">12 ${secondsLabel}</option>
            <option value="15">15 ${secondsLabel}</option>
        `;
    }
}

/**
 * Generate video from prompt
 */
async function generateVideo() {
    let prompt = document.getElementById('videoPrompt').value.trim();
    if (!prompt) {
        showToast(i18n.t('toast.enterVideoPrompt'), 'warning');
        return;
    }

    // Clean prompt
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

    // Upload local file if needed
    if (state.videoSourceFile && !imageUrl) {
        try {
            showLoading('videoLoading', true);
            imageUrl = await uploadImageForVideo(state.videoSourceFile);
            Logger.info('Using uploaded image URL', { url: imageUrl });
        } catch (error) {
            showLoading('videoLoading', false);
            return;
        }
    }

    if (imageUrl) {
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

        // Update balance
        if (window.updateBalanceUI) window.updateBalanceUI();

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

/**
 * Download current generated video
 */
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

// ===== Expose Globally =====
window.setupVideoGeneration = setupVideoGeneration;
window.handleVideoImageUpload = handleVideoImageUpload;
window.uploadImageForVideo = uploadImageForVideo;
window.updateVideoDurationOptions = updateVideoDurationOptions;
window.generateVideo = generateVideo;
window.downloadCurrentVideo = downloadCurrentVideo;
