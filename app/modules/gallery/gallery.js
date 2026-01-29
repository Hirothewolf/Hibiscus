/**
 * Hibiscus 🌺 - Gallery Module
 * Handles gallery rendering, item management, and memory cleanup
 * 
 * CRITICAL: This module implements proper memory management to prevent
 * ObjectURL leaks that can cause excessive RAM usage.
 */

// ===== ObjectURL Registry =====
// Central registry to track all created ObjectURLs for proper cleanup

const urlRegistry = {
    _urls: new Map(),
    _maxItems: 50, // Maximum items to keep in memory

    /**
     * Register a new ObjectURL
     * @param {string|number} id - Unique identifier
     * @param {string} url - ObjectURL
     */
    register(id, url) {
        // Revoke old URL if exists
        if (this._urls.has(id)) {
            const oldUrl = this._urls.get(id);
            if (oldUrl && oldUrl.startsWith('blob:')) {
                URL.revokeObjectURL(oldUrl);
            }
        }
        this._urls.set(id, url);

        // Cleanup if too many items
        if (this._urls.size > this._maxItems) {
            this.cleanupOldest(this._urls.size - this._maxItems);
        }
    },

    /**
     * Get a registered URL
     * @param {string|number} id - Unique identifier
     * @returns {string|null}
     */
    get(id) {
        return this._urls.get(id) || null;
    },

    /**
     * Revoke and remove a single URL
     * @param {string|number} id - Unique identifier
     */
    revoke(id) {
        const url = this._urls.get(id);
        if (url && url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
        }
        this._urls.delete(id);
    },

    /**
     * Cleanup oldest entries
     * @param {number} count - Number of entries to remove
     */
    cleanupOldest(count) {
        const keys = Array.from(this._urls.keys()).slice(0, count);
        keys.forEach(key => {
            this.revoke(key);
        });
        Logger.debug(`Cleaned up ${count} old ObjectURLs from registry`);
    },

    /**
     * Clear all registered URLs
     */
    clear() {
        this._urls.forEach((url, id) => {
            if (url && url.startsWith('blob:')) {
                URL.revokeObjectURL(url);
            }
        });
        this._urls.clear();
        Logger.info('URL registry cleared');
    },

    /**
     * Get current registry size
     */
    get size() {
        return this._urls.size;
    }
};

// ===== Pagination State =====
const galleryPagination = {
    currentPage: 1,
    itemsPerPage: 30,
    currentFilter: 'all',

    get totalItems() {
        let items = state.gallery;
        if (this.currentFilter !== 'all') {
            items = items.filter(item => item.type === this.currentFilter);
        }
        return items.length;
    },

    get totalPages() {
        return Math.max(1, Math.ceil(this.totalItems / this.itemsPerPage));
    },

    reset() {
        this.currentPage = 1;
    },

    setFilter(filter) {
        if (this.currentFilter !== filter) {
            this.currentFilter = filter;
            this.currentPage = 1;
        }
    }
};

// ===== Memory Cleanup =====

/**
 * Cleanup all memory (ObjectURLs and blobs)
 * Call this periodically or when clearing gallery
 */
function cleanupMemory() {
    Logger.info('Starting memory cleanup...');

    // Clear URL registry
    urlRegistry.clear();

    // Clear global blobs storage
    if (window.galleryBlobs) {
        Object.keys(window.galleryBlobs).forEach(id => {
            const blobData = window.galleryBlobs[id];
            if (blobData?.url && blobData.url.startsWith('blob:')) {
                URL.revokeObjectURL(blobData.url);
            }
        });
        window.galleryBlobs = {};
    }

    // Clear current state blobs
    if (state.currentImageUrl && state.currentImageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(state.currentImageUrl);
        state.currentImageUrl = null;
    }
    if (state.currentVideoUrl && state.currentVideoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(state.currentVideoUrl);
        state.currentVideoUrl = null;
    }
    if (state.currentEditUrl && state.currentEditUrl.startsWith('blob:')) {
        URL.revokeObjectURL(state.currentEditUrl);
        state.currentEditUrl = null;
    }

    state.currentImageBlob = null;
    state.currentVideoBlob = null;
    state.currentEditBlob = null;

    Logger.info('Memory cleanup completed');
}

// ===== Gallery Setup =====

/**
 * Setup gallery controls and event listeners
 */
function setupGallery() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const downloadAllBtn = document.getElementById('downloadAllBtn');
    const clearBtn = document.getElementById('clearGalleryBtn');
    const prevBtn = document.getElementById('paginationPrev');
    const nextBtn = document.getElementById('paginationNext');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            galleryPagination.setFilter(btn.dataset.filter);
            renderGallery(btn.dataset.filter);
        });
    });

    // Pagination controls
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (galleryPagination.currentPage > 1) {
                galleryPagination.currentPage--;
                renderGallery(galleryPagination.currentFilter);
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (galleryPagination.currentPage < galleryPagination.totalPages) {
                galleryPagination.currentPage++;
                renderGallery(galleryPagination.currentFilter);
            }
        });
    }

    downloadAllBtn.addEventListener('click', downloadAllItems);
    clearBtn.addEventListener('click', clearGallery);

    // Gallery Modal Navigation
    document.addEventListener('keydown', (e) => {
        const modal = document.getElementById('galleryModal');
        if (modal && !modal.classList.contains('hidden')) {
            if (e.key === 'ArrowLeft') navigateGallery(-1);
            else if (e.key === 'ArrowRight') navigateGallery(1);
            else if (e.key === 'Escape') closeModal(); // Ensure escape closes modal
        }
    });

    // Navigation buttons
    const modalPrevBtn = document.getElementById('modalPrev');
    const modalNextBtn = document.getElementById('modalNext');

    if (modalPrevBtn) {
        modalPrevBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            navigateGallery(-1);
        });
    }

    if (modalNextBtn) {
        modalNextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            navigateGallery(1);
        });
    }

    // Search input
    const searchInput = document.getElementById('gallerySearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase().trim();
            renderGallery(galleryPagination.currentFilter, searchTerm);
        });
    }
}

// ===== Gallery Management =====

/**
 * Add an item to the gallery
 * @param {Object} item - Gallery item with type, prompt, url, blob, params, date
 */
function addToGallery(item) {
    // Convert blob to base64 for storage
    const reader = new FileReader();
    reader.onload = async function () {
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

                // Store blob in memory with proper registry
                if (!window.galleryBlobs) window.galleryBlobs = {};
                window.galleryBlobs[galleryItem.id] = {
                    url: item.url,
                    blob: item.blob
                };
                urlRegistry.register(galleryItem.id, item.url);

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
            isEdit: item.isEdit || false,
            favorite: false
        };

        // Store blob with proper registry
        if (!window.galleryBlobs) window.galleryBlobs = {};
        window.galleryBlobs[galleryItem.id] = {
            url: item.url,
            blob: item.blob
        };
        urlRegistry.register(galleryItem.id, item.url);

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
            isEdit: item.isEdit || false,
            favorite: false
        };
        state.gallery.unshift(galleryItem);
        saveGallery();
        renderGallery();
    }
}

/**
 * Save gallery metadata to localStorage
 */
function saveGallery() {
    // Only save metadata, not blobs
    const toSave = state.gallery.map(item => ({
        id: item.id,
        type: item.type,
        prompt: item.prompt,
        date: item.date,
        params: item.params,
        isEdit: item.isEdit,
        favorite: item.favorite || false
    }));
    localStorage.setItem('gallery', JSON.stringify(toSave));
}

/**
 * Render the gallery with optional filtering
 * Uses DOM virtualization to limit rendered items
 * @param {string} filter - 'all', 'image', or 'video'
 * @param {string} searchTerm - Optional search term
 */
function renderGallery(filter = 'all', searchTerm = '') {
    const container = document.getElementById('galleryContainer');
    const paginationContainer = document.getElementById('galleryPagination');
    const searchInput = document.getElementById('gallerySearch');

    // Use passed searchTerm or get from input if not provided (for pagination/filter clicks)
    if (!searchTerm && searchInput) {
        searchTerm = searchInput.value.toLowerCase().trim();
    }

    let items = state.gallery;

    // Update filter in pagination state
    galleryPagination.setFilter(filter);

    // Apply Type/Favorite Filter
    if (filter === 'favorites') {
        items = items.filter(item => item.favorite === true);
    } else if (filter !== 'all') {
        items = items.filter(item => item.type === filter);
    }

    // Apply Search Filter
    if (searchTerm) {
        items = items.filter(item =>
            (item.prompt && item.prompt.toLowerCase().includes(searchTerm)) ||
            (item.id && String(item.id).includes(searchTerm))
        );
    }

    // Hide pagination and show empty state if no items
    if (items.length === 0) {
        let emptyMessage, emptyHint, emptyIcon;

        if (filter === 'favorites') {
            emptyIcon = '⭐';
            emptyMessage = i18n.t('gallery.noFavorites') || 'Nenhum favorito ainda';
            emptyHint = i18n.t('gallery.noFavoritesHint') || 'Clique no ⭐ em uma imagem para adicionar aos favoritos';
        } else if (filter === 'image') {
            emptyIcon = '🖼️';
            emptyMessage = i18n.t('gallery.noImages') || 'Nenhuma imagem ainda';
            emptyHint = i18n.t('gallery.emptyHint') || 'Gere imagens para vê-las aqui';
        } else if (filter === 'video') {
            emptyIcon = '🎬';
            emptyMessage = i18n.t('gallery.noVideos') || 'Nenhum vídeo ainda';
            emptyHint = i18n.t('gallery.emptyHint') || 'Gere vídeos para vê-los aqui';
        } else {
            emptyIcon = '📁';
            emptyMessage = i18n.t('gallery.empty') || 'Nenhuma criação ainda';
            emptyHint = i18n.t('gallery.emptyHint') || 'Gere imagens ou vídeos para vê-los aqui';
        }

        container.innerHTML = `
            <div class="gallery-empty">
                <span class="empty-icon">${emptyIcon}</span>
                <p>${emptyMessage}</p>
                <small>${emptyHint}</small>
            </div>
        `;
        if (paginationContainer) {
            paginationContainer.classList.add('hidden');
        }
        return;
    }

    // Calculate pagination
    const totalPages = galleryPagination.totalPages;
    const currentPage = Math.min(galleryPagination.currentPage, totalPages);
    galleryPagination.currentPage = currentPage;

    const startIndex = (currentPage - 1) * galleryPagination.itemsPerPage;
    const endIndex = startIndex + galleryPagination.itemsPerPage;
    const visibleItems = items.slice(startIndex, endIndex);

    // Group by date
    const grouped = {};
    visibleItems.forEach(item => {
        const dateLocale = state.language === 'pt' ? 'pt-BR' : (state.language === 'es' ? 'es-ES' : 'en-US');
        const date = new Date(item.date).toLocaleDateString(dateLocale, {
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
            // Use URL registry, fallback to blob data, then backend path
            let mediaSrc = urlRegistry.get(item.id) ||
                blobData?.url ||
                (item.path ? `${BACKEND_URL}/${item.path}` : null);

            const mediaHtml = mediaSrc
                ? (item.type === 'image'
                    ? `<img src="${mediaSrc}" alt="${item.prompt}" loading="lazy">`
                    : `<video src="${mediaSrc}" preload="metadata"></video>`)
                : `<div class="no-preview">Preview não disponível</div>`;

            html += `
                <div class="gallery-item${item.favorite ? ' is-favorite' : ''}" data-id="${item.id}">
                    <div class="gallery-item-media">
                        ${mediaHtml}
                        <span class="gallery-item-type">${item.type === 'image' ? '🖼️' : '🎬'}</span>
                        ${item.favorite ? '<span class="gallery-item-favorite">★</span>' : ''}
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

    // Update pagination controls
    if (paginationContainer) {
        if (totalPages > 1) {
            paginationContainer.classList.remove('hidden');

            let paginationHtml = `
                <button class="btn-pagination" id="paginationPrev" ${currentPage <= 1 ? 'disabled' : ''}>
                    <span data-i18n="gallery.prev">◀</span>
                </button>
                <div class="pagination-numbers">
            `;

            const maxVisiblePages = 5;
            let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
            let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

            if (endPage - startPage + 1 < maxVisiblePages) {
                startPage = Math.max(1, endPage - maxVisiblePages + 1);
            }

            if (startPage > 1) {
                paginationHtml += `<button class="page-number" data-page="1">1</button>`;
                if (startPage > 2) paginationHtml += `<span class="page-dots">...</span>`;
            }

            for (let i = startPage; i <= endPage; i++) {
                paginationHtml += `
                    <button class="page-number ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>
                `;
            }

            if (endPage < totalPages) {
                if (endPage < totalPages - 1) paginationHtml += `<span class="page-dots">...</span>`;
                paginationHtml += `<button class="page-number" data-page="${totalPages}">${totalPages}</button>`;
            }

            paginationHtml += `
                </div>
                <button class="btn-pagination" id="paginationNext" ${currentPage >= totalPages ? 'disabled' : ''}>
                    <span data-i18n="gallery.next">▶</span>
                </button>
            `;

            paginationContainer.innerHTML = paginationHtml;

            // Re-attach listeners
            document.getElementById('paginationPrev').addEventListener('click', () => {
                if (galleryPagination.currentPage > 1) {
                    galleryPagination.currentPage--;
                    renderGallery(galleryPagination.currentFilter);
                }
            });

            document.getElementById('paginationNext').addEventListener('click', () => {
                if (galleryPagination.currentPage < galleryPagination.totalPages) {
                    galleryPagination.currentPage++;
                    renderGallery(galleryPagination.currentFilter);
                }
            });

            document.querySelectorAll('.page-number').forEach(btn => {
                btn.addEventListener('click', () => {
                    galleryPagination.currentPage = parseInt(btn.dataset.page);
                    renderGallery(galleryPagination.currentFilter);
                });
            });

            // Re-translate new elements
            if (window.i18n) window.i18n.updateUI();

        } else {
            paginationContainer.classList.add('hidden');
        }
    }

    // Add click handlers
    container.querySelectorAll('.gallery-item').forEach(el => {
        el.addEventListener('click', () => openGalleryModal(el.dataset.id));
    });


}

/**
 * Navigate gallery modal
 * @param {number} direction - -1 (prev) or 1 (next)
 */
function navigateGallery(direction) {
    const modal = document.getElementById('galleryModal');
    if (!modal || modal.classList.contains('hidden')) return;

    const currentId = modal.dataset.itemId;
    if (!currentId) return;

    // Get current filtered list
    let items = state.gallery;
    const filter = galleryPagination.currentFilter;

    if (filter === 'favorites') {
        items = items.filter(item => item.favorite === true);
    } else if (filter !== 'all') {
        items = items.filter(item => item.type === filter);
    }

    const currentIndex = items.findIndex(i => String(i.id) === String(currentId));
    if (currentIndex === -1) return;

    const newIndex = currentIndex + direction;

    if (newIndex >= 0 && newIndex < items.length) {
        openGalleryModal(items[newIndex].id);
    }
}

/**
 * Open the gallery modal for a specific item
 * @param {string|number} itemId - Gallery item ID
 */
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
    const mediaSrc = urlRegistry.get(item.id) ||
        blobData?.url ||
        (item.path ? `${BACKEND_URL}/${item.path}` : null);

    if (item.type === 'image') {
        modalImage.src = mediaSrc || '';
        modalImage.classList.remove('hidden');
        modalImage.onclick = () => window.open(mediaSrc, '_blank'); // Click to view full image
        modalVideo.classList.add('hidden');
        editBtn.classList.remove('hidden');
    } else {
        modalVideo.src = mediaSrc || '';
        modalVideo.classList.remove('hidden');
        modalImage.classList.add('hidden');
        editBtn.classList.add('hidden'); // Can't edit videos
    }

    modalPrompt.textContent = item.prompt;

    // Build metadata string with Date, Model, and Resolution
    let metaInfo = new Date(item.date).toLocaleString('pt-BR');
    if (item.params) {
        if (item.params.model) metaInfo += ` • ${String(item.params.model).toUpperCase()}`;
        if (item.params.width && item.params.height) metaInfo += ` • ${item.params.width}x${item.params.height}`;
    }
    modalDate.textContent = metaInfo;

    // Update favorite button state
    const favoriteBtn = document.getElementById('modalFavorite');
    if (favoriteBtn) {
        const isFav = !!item.favorite;
        // Use data-i18n for text content to ensure translation updates work
        if (isFav) {
            favoriteBtn.innerHTML = '<span>🌟</span> <span data-i18n="gallery.unfavorite">Remover Favorito</span>';
            favoriteBtn.classList.add('is-favorite');
        } else {
            favoriteBtn.innerHTML = '<span>⭐</span> <span data-i18n="gallery.favorite">Favoritar</span>';
            favoriteBtn.classList.remove('is-favorite');
        }

        // Update translations immediately for this button
        if (window.i18n) window.i18n.updateUI();
    }

    // updating navigation buttons visibility
    const prevBtn = document.getElementById('modalPrev');
    const nextBtn = document.getElementById('modalNext');

    if (prevBtn && nextBtn) {
        let items = state.gallery;
        const filter = galleryPagination.currentFilter;

        if (filter === 'favorites') {
            items = items.filter(item => item.favorite === true);
        } else if (filter !== 'all') {
            items = items.filter(item => item.type === filter);
        }

        const currentIndex = items.findIndex(i => String(i.id) === String(itemId));

        if (currentIndex > 0) prevBtn.classList.remove('hidden');
        else prevBtn.classList.add('hidden');

        if (currentIndex < items.length - 1) nextBtn.classList.remove('hidden');
        else nextBtn.classList.add('hidden');
    }

    modal.dataset.itemId = itemId;
    modal.classList.remove('hidden');
}

/**
 * Edit item from modal - passes blob/url directly to editor without blocking upload
 */
async function editModalItem() {
    const modal = document.getElementById('galleryModal');
    const itemId = modal.dataset.itemId;
    const item = state.gallery.find(i => String(i.id) === String(itemId));

    if (!item || item.type !== 'image') {
        showToast(i18n.t('toast.onlyImagesEdit'), 'warning');
        return;
    }

    const blobData = window.galleryBlobs?.[item.id];
    const mediaSrc = urlRegistry.get(item.id) ||
        blobData?.url ||
        (item.path ? `${BACKEND_URL}/${item.path}` : null);

    if (!mediaSrc) {
        showToast(i18n.t('toast.fileNotAvailable'), 'error');
        return;
    }

    // Prepare image source (Blob or URL)
    let imageSource = mediaSrc;

    // If we have direct blob access, use it (instant)
    if (blobData?.blob) {
        imageSource = blobData.blob;
    } else if (mediaSrc.startsWith('http') && !mediaSrc.includes('localhost') && !mediaSrc.includes('blob:')) {
        // Remote URL is fine, pass as string
        imageSource = mediaSrc;
    } else {
        // Probably a local blob URL or file path, try to fetch as blob to avoid cors/upload issues later
        try {
            // Show ephemeral loading toast if fetching is needed
            showToast(i18n.t('toast.loadingImage') || 'Carregando...', 'info');
            const response = await fetch(mediaSrc);
            imageSource = await response.blob();
        } catch (e) {
            Logger.error('Failed to fetch image blob for edit', e);
            // Fallback to URL if fetch fails
            imageSource = mediaSrc;
        }
    }

    // Switch to edit tab immediately
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector('[data-tab="image-edit"]').classList.add('active');
    document.getElementById('image-edit').classList.add('active');

    // Use exposed functions from editor.js
    if (window.clearEditImages) window.clearEditImages();

    if (window.addEditImage) {
        window.addEditImage(imageSource);
    } else {
        Logger.error('addEditImage not available');
    }

    // Set prompt from gallery item (WITHOUT "Edit:" prefix)
    const editPromptInput = document.getElementById('editPrompt');
    if (editPromptInput && item.prompt) {
        // Remove any existing "Edit:" prefix and clean the prompt
        let cleanPrompt = item.prompt.replace(/^Edit:\s*/i, '').trim();
        editPromptInput.value = cleanPrompt;
    }

    closeModal();
    showToast(i18n.t('toast.editReady') || 'Imagem pronta para edição!', 'success');
    Logger.info('Gallery image loaded for editing', { itemId: item.id, isBlob: imageSource instanceof Blob });
}

/**
 * Download item from modal
 */
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

/**
 * Delete item from modal
 */
async function deleteModalItem() {
    const modal = document.getElementById('galleryModal');
    const itemId = modal.dataset.itemId;

    if (!confirm(i18n.t('gallery.confirmDelete') || 'Tem certeza que deseja excluir este item?')) return;

    const item = state.gallery.find(i => String(i.id) === String(itemId));

    // Delete from backend if available
    if (Backend.available && item) {
        await Backend.deleteItem(item.id);
    }

    // Cleanup memory for this item
    urlRegistry.revoke(itemId);
    if (window.galleryBlobs) {
        const blobData = window.galleryBlobs[itemId];
        // Also remove from recents by URL
        if (blobData && blobData.url && typeof removeFromRecentsById === 'function') {
            removeFromRecentsById(itemId, blobData.url);
        }
        delete window.galleryBlobs[itemId];
    }

    state.gallery = state.gallery.filter(i => String(i.id) !== String(itemId));
    saveGallery();
    renderGallery();
    closeModal();
    showToast(i18n.t('btn.delete'), 'success');
}

/**
 * Download all gallery items
 */
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
            await sleep(500); // Small delay between downloads
        }
    }

    showToast(i18n.t('toast.allDownloaded'), 'success');
}

/**
 * Clear entire gallery with memory cleanup
 */
async function clearGallery() {
    if (!confirm(i18n.t('gallery.confirmClear') || 'Tem certeza que deseja limpar toda a galeria?')) return;

    // Clear backend if available
    if (Backend.available) {
        await Backend.clearGallery();
    }

    // Full memory cleanup
    cleanupMemory();

    state.gallery = [];
    saveGallery();
    renderGallery();
    showToast(i18n.t('toast.galleryCleared'), 'success');
}

// ===== Favorites =====

/**
 * Toggle favorite status for a gallery item
 * @param {string|number} itemId - Gallery item ID (optional, uses modal item if not provided)
 */
function toggleFavorite(itemId = null) {
    // Get item ID from modal if not provided
    if (!itemId) {
        const modal = document.getElementById('galleryModal');
        itemId = modal?.dataset.itemId;
    }

    if (!itemId) return;

    const item = state.gallery.find(i => String(i.id) === String(itemId));
    if (!item) {
        Logger.error('Item not found for favorite toggle', { itemId });
        return;
    }

    // Toggle favorite status
    item.favorite = !item.favorite;
    saveGallery();

    // Persist to backend if available
    if (Backend.available) {
        Backend.updateItem(itemId, { favorite: item.favorite });
    }

    // Update modal button if visible
    const favoriteBtn = document.getElementById('modalFavorite');
    if (favoriteBtn) {
        favoriteBtn.innerHTML = item.favorite
            ? '<span>★</span> <span data-i18n="gallery.unfavorite">Remover Favorito</span>'
            : '<span>☆</span> <span data-i18n="gallery.favorite">Favoritar</span>';
        favoriteBtn.classList.toggle('is-favorite', item.favorite);
    }

    // Re-render gallery to update star icon
    renderGallery(galleryPagination.currentFilter);

    showToast(
        item.favorite
            ? (i18n.t('toast.addedToFavorites') || 'Adicionado aos favoritos!')
            : (i18n.t('toast.removedFromFavorites') || 'Removido dos favoritos'),
        'success'
    );

    Logger.info('Favorite toggled', { itemId, favorite: item.favorite });
}

// ===== Expose Globally =====
window.urlRegistry = urlRegistry;
window.galleryPagination = galleryPagination;
window.cleanupMemory = cleanupMemory;
window.setupGallery = setupGallery;
window.addToGallery = addToGallery;
window.saveGallery = saveGallery;
window.renderGallery = renderGallery;
window.openGalleryModal = openGalleryModal;
window.editModalItem = editModalItem;
window.downloadModalItem = downloadModalItem;
window.deleteModalItem = deleteModalItem;
window.downloadAllItems = downloadAllItems;
window.clearGallery = clearGallery;
window.toggleFavorite = toggleFavorite;
