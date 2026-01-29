/**
 * Hibiscus 🌺 - API Module
 * Handles all API communication with retry logic and error handling
 */

// ===== Constants =====
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff
const MAX_SAFETY_RETRIES = 50; // Maximum retries for safety filter errors
const VIDEO_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes timeout for video generation

// ===== Core Fetch Functions =====

/**
 * Fetch with authentication header
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>}
 */
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

/**
 * Fetch with retry logic for transient failures
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Promise<Response>}
 */
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
            } else if (response.status === 402) {
                // Payment required - balance exhausted
                const errorText = await response.text().catch(() => 'Unknown error');
                const balanceError = new Error(`PAYMENT_REQUIRED: ${errorText}`);
                balanceError.isBalanceError = true;
                lastError = balanceError;
                Logger.error('Payment required - balance exhausted', { url, error: errorText });
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
 * Fetch video with extended timeout (videos can take several minutes)
 * @param {string} url - URL to fetch
 * @returns {Promise<Response>}
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
            } else if (response.status === 402) {
                const errorText = await response.text().catch(() => 'Unknown error');
                const balanceError = new Error(`PAYMENT_REQUIRED: ${errorText}`);
                balanceError.isBalanceError = true;
                throw balanceError;
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
 * Fetch with persistent retry for safety filter errors
 * @param {string} url - URL to fetch
 * @param {string} loadingElementId - 'imageLoading' or 'editLoading'
 * @returns {Promise<{blob: Blob, attempts: number}|null>}
 */
async function fetchWithSafetyRetry(url, loadingElementId) {
    const retryState = safetyRetryStates[loadingElementId];
    retryState.active = true;
    retryState.cancelled = false;
    retryState.failures = 0;
    retryState.currentAttempt = 1;

    Logger.info('Starting safety retry loop', { context: loadingElementId, maxRetries: MAX_SAFETY_RETRIES });

    for (let attempt = 1; attempt <= MAX_SAFETY_RETRIES; attempt++) {
        if (retryState.cancelled) {
            Logger.info('Safety retry cancelled by user', { context: loadingElementId, attempt });
            return null;
        }

        retryState.currentAttempt = attempt;

        try {
            const options = {};
            const response = await fetchWithAuth(url, options);

            if (response.ok) {
                const blob = await response.blob();
                retryState.active = false;
                Logger.info('Image fetch successful', { context: loadingElementId, attempt });
                return { blob, attempts: attempt };
            }

            // Read error text
            let errorText = '';
            try {
                errorText = await response.text();
            } catch (e) {
                errorText = `[Could not read error: ${e.message}]`;
            }

            Logger.warn('Image fetch failed', {
                context: loadingElementId,
                attempt,
                status: response.status,
                errorPreview: errorText.substring(0, 200)
            });

            if (response.status === 401) {
                const authError = new Error(`AUTH_ERROR: ${errorText}`);
                authError.isAuthError = true;
                throw authError;
            }

            // Check for 402 Payment Required
            if (response.status === 402) {
                const balanceError = new Error(`PAYMENT_REQUIRED: ${errorText}`);
                balanceError.isBalanceError = true;
                throw balanceError;
            }

            // Check for balance/forbidden errors
            if (response.status === 403 && (errorText.includes('FORBIDDEN') || errorText.includes('balance') || errorText.includes('Insufficient') || errorText.includes('pollen'))) {
                if (credentialManager.hasMultiple()) {
                    credentialManager.markFailed(options._usedKey);
                    Logger.warn('Credential issue, rotating');
                    continue;
                }
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
                Logger.warn(`Safety filter triggered (attempt ${attempt}/${MAX_SAFETY_RETRIES})`, {
                    failures: retryState.failures,
                    context: loadingElementId
                });

                // Show UI with cancel button
                showSafetyRetryUI(retryState.failures, attempt, loadingElementId);

                // Add random variation to seed
                const retryUrl = new URL(url);
                retryUrl.searchParams.set('_retry', Date.now().toString());

                await sleep(500);
                continue;
            }

            // Retryable server errors
            if (response.status === 500 || response.status === 502 || response.status === 503 || response.status === 429) {
                const delay = RETRY_DELAYS[Math.min(attempt - 1, RETRY_DELAYS.length - 1)];
                Logger.warn(`Server error, retrying in ${delay}ms`, { status: response.status, attempt });
                showToast(i18n.t('toast.networkError', { attempt, max: MAX_SAFETY_RETRIES }), 'warning');
                await sleep(delay);
                continue;
            }

            // Other errors - continue trying
            Logger.error(`Unexpected HTTP error, continuing retry`, { status: response.status, error: errorText.substring(0, 200) });
            await sleep(1000);
            continue;

        } catch (error) {
            if (retryState.cancelled) {
                Logger.info('Retry cancelled during error handling', { context: loadingElementId });
                return null;
            }

            // Auth or balance error - stop retrying
            if (error.isAuthError || error.isBalanceError) {
                Logger.error('Critical error, stopping retries', { error: error.message });
                throw error;
            }

            // Network error - retry
            Logger.warn(`Error on attempt ${attempt}, continuing`, {
                error: error.message,
                name: error.name,
                context: loadingElementId
            });
            await sleep(1000);
            continue;
        }
    }

    retryState.active = false;
    Logger.error('All safety retries exhausted', { context: loadingElementId, maxRetries: MAX_SAFETY_RETRIES });
    throw new Error(i18n.t('toast.safetyRetriesExhausted', { max: MAX_SAFETY_RETRIES }));
}

// ===== Safety Retry UI =====

function showSafetyRetryUI(failures, currentAttempt, context, maxRetries = MAX_SAFETY_RETRIES) {
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
        <p class="retry-count">Tentativa ${currentAttempt} / ${maxRetries}</p>
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
        // Fallback: remove all
        document.querySelectorAll('.safety-retry-info').forEach(el => el.remove());
    }
}

function cancelSafetyRetry(context) {
    if (safetyRetryStates[context]) {
        safetyRetryStates[context].cancelled = true;
        safetyRetryStates[context].active = false;
        Logger.info('Safety retry cancelled by user', { context });
        showToast(i18n.t('toast.cancelled'), 'info');
    }
    hideSafetyRetryUI(context);
}

/**
 * Fetch account balance
 * @returns {Promise<number|null>} Balance in USD or null if error
 */
async function fetchAccountBalance() {
    try {
        const currentKey = credentialManager.getCurrent();
        if (!currentKey) return null;

        Logger.debug('Fetching account balance...');
        const response = await fetchWithAuth(`${API_BASE.replace('https://image.pollinations.ai', 'https://gen.pollinations.ai')}/account/balance`);

        if (response.ok) {
            const data = await response.json();
            Logger.info('Balance fetched', { balance: data.balance });
            return data.balance;
        }
        return null;
    } catch (error) {
        Logger.warn('Failed to fetch balance', { error: error.message });
        return null;
    }
}

function isSafetyRetryCancelled(context) {
    return safetyRetryStates[context] && safetyRetryStates[context].cancelled;
}

function initSafetyRetryState(context) {
    if (!safetyRetryStates[context]) {
        safetyRetryStates[context] = { active: false, failures: 0 };
    }
    safetyRetryStates[context].active = true;
    safetyRetryStates[context].cancelled = false;
    safetyRetryStates[context].failures = 0;
}

// ===== Expose Globally =====
window.MAX_RETRIES = MAX_RETRIES;
window.RETRY_DELAYS = RETRY_DELAYS;
window.MAX_SAFETY_RETRIES = MAX_SAFETY_RETRIES;
window.VIDEO_TIMEOUT_MS = VIDEO_TIMEOUT_MS;
window.fetchWithAuth = fetchWithAuth;
window.fetchWithRetry = fetchWithRetry;
window.fetchVideoWithTimeout = fetchVideoWithTimeout;
window.fetchWithSafetyRetry = fetchWithSafetyRetry;
window.showSafetyRetryUI = showSafetyRetryUI;
window.hideSafetyRetryUI = hideSafetyRetryUI;
window.cancelSafetyRetry = cancelSafetyRetry;
window.fetchAccountBalance = fetchAccountBalance;
window.isSafetyRetryCancelled = isSafetyRetryCancelled;
window.initSafetyRetryState = initSafetyRetryState;
