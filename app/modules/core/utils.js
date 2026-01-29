/**
 * Hibiscus 🌺 - Utils Module
 * Utility functions for downloads, file handling, and data conversion
 */

// ===== File Naming =====

/**
 * Generate a proper filename based on prompt, type and format settings
 * @param {string} prompt - The prompt used for generation
 * @param {string} type - 'image' or 'video'
 * @param {string} prefix - Optional prefix
 * @returns {string} Full filepath
 */
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

/**
 * Remove invalid characters from filename
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized filename
 */
function sanitizeFilename(str) {
    return str
        .replace(/[<>:"/\\|?*]/g, '')
        .replace(/\s+/g, '_')
        .replace(/_+/g, '_')
        .trim();
}

// ===== Download =====

/**
 * Download a blob as a file
 * @param {Blob} blob - The blob to download
 * @param {string} filepath - Full filepath including filename
 * @param {string} type - 'image' or 'video' (for stats)
 */
async function downloadFile(blob, filepath, type) {
    // Extract just the filename for browser download
    const filename = filepath.split('/').pop();

    // For images, convert to proper PNG for compatibility with drawing software
    let downloadBlob = blob;
    if (type === 'image' && blob.type !== 'image/png') {
        try {
            downloadBlob = await convertBlobToPng(blob);
            Logger.debug('Converted image to PNG for compatibility');
        } catch (e) {
            Logger.warn('Could not convert to PNG, using original format', e);
        }
    }

    const url = URL.createObjectURL(downloadBlob);
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

// ===== Sleep/Timing =====

/**
 * Promise-based sleep
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== Image Conversion =====

/**
 * Convert base64 data URL to Blob
 * @param {string} base64Data - Base64 data URL
 * @returns {Blob}
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

/**
 * Convert any image blob to PNG format for maximum compatibility
 * (Fixes issues with WebP/JPEG not working in some edit tools like Photoshop)
 * @param {Blob} blob - Image blob in any format
 * @returns {Promise<Blob>} PNG blob
 */
async function convertBlobToPng(blob) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(blob);
        const img = new Image();

        img.onload = () => {
            // Create canvas with image dimensions
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            // Convert to PNG blob
            canvas.toBlob((pngBlob) => {
                URL.revokeObjectURL(url);
                if (pngBlob) {
                    resolve(pngBlob);
                } else {
                    reject(new Error('Failed to convert to PNG'));
                }
            }, 'image/png');
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image'));
        };

        img.src = url;
    });
}

// ===== Image Upload Helpers =====

/**
 * Process images for the API
 * - URLs are used directly
 * - Base64 images are uploaded to a temp host
 * @param {string[]} images - Array of image URLs or base64 data
 * @returns {Promise<string[]>} Array of public URLs
 */
async function uploadImagesToTempHost(images) {
    if (!images || images.length === 0) {
        throw new Error(i18n.t('toast.noImageToUpload'));
    }

    const processedUrls = [];
    let uploadErrors = [];

    for (let i = 0; i < images.length; i++) {
        const imageData = images[i];

        // If already a URL, keep it
        if (imageData.startsWith('http')) {
            processedUrls.push(imageData);
            Logger.debug(`Image ${i + 1} is already a URL`);
            continue;
        }

        try {
            Logger.info(`Processing image ${i + 1}/${images.length}`, { isBase64: imageData.startsWith('data:') });
            showToast(i18n.t('toast.processingImage', { current: i + 1, total: images.length }), 'info');

            // Try multiple upload methods in order (Litterbox first for temp usage)
            let url = null;
            let lastError = null;

            // Method 1: Try litterbox (temporary, designed for this use case)
            try {
                Logger.debug(`Tentando litterbox para imagem ${i + 1}`);
                url = await uploadToLitterbox(imageData);
                if (url) {
                    Logger.info(`Image ${i + 1} uploaded to litterbox`);
                }
            } catch (e) {
                lastError = e;
                Logger.warn(`litterbox failed for image ${i + 1}`, { error: e.message });
            }

            // Method 2: Try tmpfiles.org
            if (!url) {
                try {
                    Logger.debug(`Tentando tmpfiles.org para imagem ${i + 1}`);
                    url = await uploadToTmpfiles(imageData);
                    if (url) {
                        Logger.info(`Image ${i + 1} uploaded to tmpfiles.org`);
                    }
                } catch (e) {
                    lastError = e;
                    Logger.warn(`tmpfiles.org failed for image ${i + 1}`, { error: e.message });
                }
            }

            // Method 3: Try 0x0.st
            if (!url) {
                try {
                    Logger.debug(`Tentando 0x0.st para imagem ${i + 1}`);
                    url = await uploadTo0x0(imageData);
                    if (url) {
                        Logger.info(`Image ${i + 1} uploaded to 0x0.st`);
                    }
                } catch (e) {
                    lastError = e;
                    Logger.warn(`0x0.st failed for image ${i + 1}`, { error: e.message });
                }
            }

            // Method 4: Try file.io
            if (!url) {
                try {
                    Logger.debug(`Tentando file.io para imagem ${i + 1}`);
                    url = await uploadToFileio(imageData);
                    if (url) {
                        Logger.info(`Image ${i + 1} uploaded to file.io`);
                    }
                } catch (e) {
                    lastError = e;
                    Logger.warn(`file.io failed for image ${i + 1}`, { error: e.message });
                }
            }

            // All services failed
            if (!url) {
                const errorMsg = lastError ? lastError.message : i18n.t('toast.uploadServicesFailed');
                Logger.error(`All upload services failed for image ${i + 1}`, { lastError: errorMsg });
                uploadErrors.push(`Image ${i + 1}: ${errorMsg}`);
                continue;
            }

            processedUrls.push(url);
            Logger.debug(`Image ${i + 1} processed`, { urlLength: url.length });

        } catch (error) {
            Logger.error(`Failed to process image ${i + 1}`, { error: error.message });
            uploadErrors.push(`Image ${i + 1}: ${error.message}`);
        }
    }

    if (uploadErrors.length > 0) {
        Logger.warn('Some images had upload issues', { errors: uploadErrors });
    }

    if (processedUrls.length === 0) {
        throw new Error('Nenhum serviço de upload está disponível. Tente novamente mais tarde ou use uma URL de imagem diretamente.');
    }

    const hasBase64 = processedUrls.some(url => url.startsWith('data:'));
    if (hasBase64) {
        throw new Error('Não foi possível fazer upload de algumas imagens. Tente usar URLs de imagem diretamente.');
    }

    return processedUrls;
}

/**
 * Upload to tmpfiles.org (temporary file hosting)
 */
async function uploadToTmpfiles(base64Data) {
    try {
        const blob = base64ToBlob(base64Data);
        const formData = new FormData();
        formData.append('file', blob, 'image.png');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch('https://tmpfiles.org/api/v1/upload', {
            method: 'POST',
            body: formData,
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();
            // tmpfiles.org returns { status: 'success', data: { url: 'https://tmpfiles.org/123/image.png' } }
            if (data.status === 'success' && data.data && data.data.url) {
                // Convert to direct download URL (add /dl/ after domain)
                const downloadUrl = data.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
                Logger.info('tmpfiles.org upload successful', { url: downloadUrl });
                return downloadUrl;
            }
            throw new Error(`Invalid response from tmpfiles.org: ${JSON.stringify(data).substring(0, 100)}`);
        }

        const errorText = await response.text().catch(() => 'unknown error');
        Logger.warn('tmpfiles.org upload failed', { status: response.status, error: errorText.substring(0, 100) });
        throw new Error(`HTTP ${response.status}`);
    } catch (error) {
        if (error.name === 'AbortError') {
            Logger.warn('tmpfiles.org upload timeout');
            throw new Error('Upload timeout (tmpfiles.org)');
        }
        Logger.warn('tmpfiles.org upload error', { error: error.message });
        throw error;
    }
}

/**
 * Upload to 0x0.st
 */
async function uploadTo0x0(base64Data) {
    try {
        const blob = base64ToBlob(base64Data);
        const formData = new FormData();
        formData.append('file', blob, 'image.png');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch('https://0x0.st', {
            method: 'POST',
            body: formData,
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
            const url = await response.text();
            if (url && url.trim().startsWith('http')) {
                Logger.info('0x0.st upload successful', { url: url.substring(0, 100) });
                return url.trim();
            }
            throw new Error(`Invalid response from 0x0.st: ${url.substring(0, 100)}`);
        }

        const errorText = await response.text().catch(() => 'unknown error');
        Logger.warn('0x0.st upload failed', { status: response.status, error: errorText.substring(0, 100) });
        throw new Error(`HTTP ${response.status}`);
    } catch (error) {
        if (error.name === 'AbortError') {
            Logger.warn('0x0.st upload timeout');
            throw new Error('Upload timeout (0x0.st)');
        }
        Logger.warn('0x0.st upload error', { error: error.message });
        throw error;
    }
}

/**
 * Upload to litterbox (temporary, 1 hour expiry)
 */
async function uploadToLitterbox(base64Data) {
    try {
        const blob = base64ToBlob(base64Data);
        const formData = new FormData();
        formData.append('reqtype', 'fileupload');
        formData.append('time', '1h');
        formData.append('fileToUpload', blob, 'image.png');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch('https://litterbox.catbox.moe/resources/internals/api.php', {
            method: 'POST',
            body: formData,
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
            const url = await response.text();
            if (url && url.trim().startsWith('http')) {
                Logger.info('Litterbox upload successful', { url: url.substring(0, 100) });
                return url.trim();
            }
            throw new Error(`Invalid response from litterbox: ${url.substring(0, 100)}`);
        }

        const errorText = await response.text().catch(() => 'unknown error');
        Logger.warn('Litterbox upload failed', { status: response.status, error: errorText.substring(0, 100) });
        throw new Error(`HTTP ${response.status}`);
    } catch (error) {
        if (error.name === 'AbortError') {
            Logger.warn('Litterbox upload timeout');
            throw new Error('Upload timeout (litterbox)');
        }
        Logger.warn('Litterbox upload error', { error: error.message });
        throw error;
    }
}

/**
 * Upload to File.io (temporary)
 */
async function uploadToFileio(base64Data) {
    try {
        const blob = base64ToBlob(base64Data);
        const formData = new FormData();
        formData.append('file', blob, 'image.png');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch('https://file.io', {
            method: 'POST',
            body: formData,
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();
            if (data.success && data.link) {
                Logger.info('File.io upload successful', { url: data.link });
                return data.link;
            }
            throw new Error(`Invalid response from file.io: ${JSON.stringify(data).substring(0, 100)}`);
        }

        const errorText = await response.text().catch(() => 'unknown error');
        Logger.warn('File.io upload failed', { status: response.status, error: errorText.substring(0, 100) });
        throw new Error(`HTTP ${response.status}`);
    } catch (error) {
        if (error.name === 'AbortError') {
            Logger.warn('File.io upload timeout');
            throw new Error('Upload timeout (file.io)');
        }
        Logger.warn('File.io upload error', { error: error.message });
        throw error;
    }
}

// ===== Expose Globally =====
// ===== Error Parsing =====

/**
 * Parse API error and return user-friendly message
 * @param {Error|Object} error - The error to parse
 * @returns {Object} { type: string, display: string, raw: string, model?: string }
 */
function parseAPIError(error) {
    const rawMessage = error.message || error.toString() || 'Unknown error';
    let extracted = rawMessage;

    // Try to extract message from nested JSON (API returns deeply nested errors)
    try {
        let obj = rawMessage.startsWith('{') ? JSON.parse(rawMessage) : null;
        let depth = 0;
        while (obj && depth < 5) {
            if (obj.message) {
                // Check if message is another JSON string
                if (typeof obj.message === 'string' && obj.message.startsWith('{')) {
                    obj = JSON.parse(obj.message);
                } else {
                    extracted = obj.message;
                    break;
                }
            } else if (obj.error && typeof obj.error === 'string') {
                extracted = obj.error;
                break;
            } else if (obj.error && typeof obj.error === 'object') {
                obj = obj.error;
            } else {
                break;
            }
            depth++;
        }
    } catch (e) { }

    // Map common patterns to friendly messages
    const lower = extracted.toLowerCase();
    let result = { type: 'generic', display: extracted, raw: rawMessage };

    // Resolution/Dimension limit
    if (lower.includes('exceeds limit') || lower.includes('resolution too high') || (lower.includes('value_error') && lower.includes('pixels'))) {
        result = {
            type: 'limit',
            display: i18n.t('error.resolutionTooHigh') || 'Resolution too high for this model. Try reducing the size.',
            raw: rawMessage
        };
    }
    // Server unavailable
    else if (lower.includes('no active') && lower.includes('servers available')) {
        const modelMatch = extracted.match(/no active (\w+) servers/i);
        const model = modelMatch ? modelMatch[1] : '';
        result = {
            type: 'server',
            display: i18n.t('error.serverUnavailable', { model }) || `Model ${model} unavailable. Try another model.`,
            raw: rawMessage,
            model: model
        };
    }
    // Safety/Content filter
    else if (lower.includes('prohibited_content') || lower.includes('safety') ||
        lower.includes('content rejected') || lower.includes('sexual content') ||
        lower.includes('nsfw') || lower.includes('filtered')) {
        result = {
            type: 'safety',
            display: i18n.t('error.safetyBlocked') || 'Content blocked by safety filter.',
            raw: rawMessage
        };
    }
    // Auth/API Key
    else if (lower.includes('unauthorized') || lower.includes('401') || lower.includes('invalid api key')) {
        result = {
            type: 'auth',
            display: i18n.t('error.authRequired') || 'Invalid or missing API key.',
            raw: rawMessage
        };
    }
    // Balance
    else if (lower.includes('balance') || lower.includes('pollen') || lower.includes('402') || lower.includes('insufficient')) {
        result = {
            type: 'balance',
            display: i18n.t('error.insufficientBalance') || 'Insufficient balance. Please add credits.',
            raw: rawMessage
        };
    }
    // Rate limit
    else if (lower.includes('rate limit') || lower.includes('too many requests') || lower.includes('429')) {
        result = {
            type: 'rateLimit',
            display: i18n.t('error.rateLimit') || 'Too many requests. Please wait a moment.',
            raw: rawMessage
        };
    }

    return result;
}

// ===== Expose Globally =====
window.generateFilename = generateFilename;
window.sanitizeFilename = sanitizeFilename;
window.downloadFile = downloadFile;
window.sleep = sleep;
window.base64ToBlob = base64ToBlob;
window.uploadImagesToTempHost = uploadImagesToTempHost;
window.uploadTo0x0 = uploadTo0x0;
window.uploadToLitterbox = uploadToLitterbox;
window.uploadToFileio = uploadToFileio;
window.parseAPIError = parseAPIError;
