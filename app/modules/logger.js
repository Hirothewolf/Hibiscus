/**
 * Hibiscus 🌺 - Logger Module
 * Sistema de logging com persistência em localStorage e Servidor
 */

const Logger = {
    logs: JSON.parse(localStorage.getItem('appLogs') || '[]'),
    maxLogs: 500,
    apiEndpoint: '/api/logs',

    /**
     * Registra uma entrada de log
     * @param {string} level - Nível do log (info, warn, error, debug)
     * @param {string} message - Mensagem do log
     * @param {any} data - Dados adicionais (opcional)
     * @returns {Object} Entrada de log criada
     */
    log(level, message, data = null) {
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            data: data ? JSON.stringify(data).slice(0, 1000) : null
        };

        // 1. Add to local array
        this.logs.unshift(entry);
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(0, this.maxLogs);
        }

        // 2. Persist to localStorage
        try {
            localStorage.setItem('appLogs', JSON.stringify(this.logs));
        } catch (e) {
            this.logs = this.logs.slice(0, Math.floor(this.maxLogs / 2));
            localStorage.setItem('appLogs', JSON.stringify(this.logs));
        }

        // 3. Log to Console
        const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
        console[consoleMethod](`[${level.toUpperCase()}] ${message}`, data || '');

        // 4. Send to Server (Immediate for Error/Warn, Debounced/Optional for Info/Debug could be added later)
        // For now, we send all logs to ensure we capture everything during this refinement phase.
        this.sendToServer(entry);

        return entry;
    },

    /**
     * Envia log para o servidor
     */
    async sendToServer(entry) {
        try {
            await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(entry)
            });
        } catch (err) {
            console.error('Failed to send log to server:', err);
        }
    },

    /**
     * Log de informação
     */
    info(message, data) { return this.log('info', message, data); },

    /**
     * Log de aviso
     */
    warn(message, data) { return this.log('warn', message, data); },

    /**
     * Log de erro
     */
    error(message, data) { return this.log('error', message, data); },

    /**
     * Log de debug
     */
    debug(message, data) { return this.log('debug', message, data); },

    /**
     * Log de ação do usuário
     */
    userAction(action, details = {}) {
        return this.log('info', `User action: ${action}`, details);
    },

    /**
     * Log de requisição à API
     */
    apiRequest(endpoint, params = {}) {
        return this.log('debug', `API request: ${endpoint}`, params);
    },

    /**
     * Log de resposta da API
     */
    apiResponse(endpoint, status, details = {}) {
        const level = status >= 400 ? 'error' : status >= 300 ? 'warn' : 'info';
        return this.log(level, `API response: ${endpoint} [${status}]`, details);
    },

    /**
     * Obtém logs filtrados
     * @param {string} level - Filtrar por nível (opcional)
     * @param {number} limit - Limite de resultados
     * @returns {Array} Lista de logs
     */
    getLogs(level = null, limit = 100) {
        let filtered = this.logs;
        if (level && level !== 'all') {
            filtered = filtered.filter(l => l.level === level);
        }
        return filtered.slice(0, limit);
    },

    /**
     * Obtém apenas erros e avisos
     * @param {number} limit - Limite de resultados
     * @returns {Array} Lista de erros/avisos
     */
    getErrors(limit = 50) {
        return this.logs.filter(l => l.level === 'error' || l.level === 'warn').slice(0, limit);
    },

    /**
     * Limpa todos os logs
     */
    clear() {
        this.logs = [];
        localStorage.setItem('appLogs', '[]');
    },

    /**
     * Exporta logs para arquivo JSON
     */
    export() {
        const blob = new Blob([JSON.stringify(this.logs, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hibiscus-logs-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    },

    /**
     * Configura captura global de erros
     */
    setupGlobalHandlers() {
        window.onerror = (message, source, lineno, colno, error) => {
            this.error('Global Error', { message, source, lineno, colno, stack: error?.stack });
        };

        window.onunhandledrejection = (event) => {
            this.error('Unhandled Rejection', { reason: event.reason });
        };

        this.info('Global error handlers initialized');
    }
};

// Start Global Handlers immediately
Logger.setupGlobalHandlers();

// Expõe globalmente
window.Logger = Logger;
