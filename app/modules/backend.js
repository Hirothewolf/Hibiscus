/**
 * Hibiscus 🌺 - Backend Module
 * Comunicação com o servidor local para persistência
 */

const BACKEND_URL = 'http://localhost:3333';

const Backend = {
    available: false,

    /**
     * Verifica conexão com o backend
     * @returns {Promise<boolean>} true se conectado
     */
    async checkConnection() {
        try {
            const response = await fetch(`${BACKEND_URL}/api/stats`, {
                method: 'GET',
                signal: AbortSignal.timeout(2000)
            });
            this.available = response.ok;
            Logger.info(`Backend ${this.available ? 'connected' : 'unavailable'}`);
            return this.available;
        } catch (error) {
            this.available = false;
            Logger.warn('Backend not available, using localStorage only');
            return false;
        }
    },

    /**
     * Carrega galeria do backend
     * @returns {Promise<Array|null>} Lista de itens ou null
     */
    async loadGallery() {
        if (!this.available) return null;
        try {
            const response = await fetch(`${BACKEND_URL}/api/gallery`);
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            Logger.error('Failed to load gallery from backend', { error: error.message });
        }
        return null;
    },

    /**
     * Salva item na galeria
     * @param {string} type - Tipo (image/video)
     * @param {string} prompt - Prompt usado
     * @param {Object} params - Parâmetros da geração
     * @param {string} blob - Base64 do arquivo
     * @returns {Promise<Object|null>} Item salvo ou null
     */
    async saveItem(type, prompt, params, blob) {
        if (!this.available) return null;
        try {
            const body = { type, prompt, params, blob };

            // Add custom directory if configured
            if (typeof state !== 'undefined' && state.useCustomMediaDir && state.customMediaDir) {
                body.customDir = state.customMediaDir;
            }

            const response = await fetch(`${BACKEND_URL}/api/gallery`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            Logger.error('Failed to save to backend', { error: error.message });
        }
        return null;
    },

    /**
     * Remove item da galeria
     * @param {string} id - ID do item
     * @returns {Promise<boolean>} true se removido
     */
    async deleteItem(id) {
        if (!this.available) return false;
        try {
            const response = await fetch(`${BACKEND_URL}/api/gallery/${id}`, {
                method: 'DELETE'
            });
            return response.ok;
        } catch (error) {
            Logger.error('Failed to delete from backend', { error: error.message });
        }
        return false;
    },

    /**
     * Atualiza campos de um item da galeria
     * @param {string} id - ID do item
     * @param {Object} updates - Campos a atualizar (ex: { favorite: true })
     * @returns {Promise<boolean>} true se atualizado
     */
    async updateItem(id, updates) {
        if (!this.available) return false;
        try {
            const response = await fetch(`${BACKEND_URL}/api/gallery/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            return response.ok;
        } catch (error) {
            Logger.error('Failed to update item in backend', { error: error.message });
        }
        return false;
    },

    /**
     * Atualiza estatísticas
     * @param {Object} stats - Objeto de estatísticas
     * @returns {Promise<boolean>} true se atualizado
     */
    async updateStats(stats) {
        if (!this.available) return false;
        try {
            await fetch(`${BACKEND_URL}/api/stats`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(stats)
            });
            return true;
        } catch (error) {
            Logger.error('Failed to update stats', { error: error.message });
        }
        return false;
    },

    /**
     * Limpa toda a galeria
     * @returns {Promise<boolean>} true se limpa
     */
    async clearGallery() {
        if (!this.available) return false;
        try {
            const response = await fetch(`${BACKEND_URL}/api/gallery`, {
                method: 'DELETE'
            });
            return response.ok;
        } catch (error) {
            Logger.error('Failed to clear gallery', { error: error.message });
        }
        return false;
    }
};

// Expõe globalmente
window.Backend = Backend;
window.BACKEND_URL = BACKEND_URL;
