/**
 * ULTRAWISE V2.0 - API.JS (FIXED)
 */
class API {
    constructor() {
        // Жестко привязываем к порту 8000
        this.baseURL = 'http://localhost:8000/api';
        // Согласовываем ключ токена с AuthManager
        this.tokenKey = 'ultrawise_auth_token';
    }

    get token() {
        return localStorage.getItem(this.tokenKey);
    }

    getHeaders(customHeaders = {}) {
        const headers = { 'Content-Type': 'application/json', ...customHeaders };
        if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
        return headers;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = { ...options, headers: this.getHeaders(options.headers) };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok || data.success === false) {
                throw new Error(data.error || data.message || 'Ошибка сервера');
            }

            // Возвращаем чистые данные
            return { success: true, data: data.data || data.user || data };
        } catch (error) {
            console.error(`❌ API Error [${endpoint}]:`, error.message);
            return { success: false, error: error.message };
        }
    }

    async get(endpoint) { return this.request(endpoint, { method: 'GET' }); }
    async post(endpoint, body) { return this.request(endpoint, { method: 'POST', body: JSON.stringify(body) }); }
    
    // Auth методы
    async register(userData) { return this.post('/auth/register', userData); }
    async login(credentials) { return this.post('/auth/login', credentials); }
    
    // Колледжи и лекции
    async getColleges() { return this.get('/colleges'); }
    async getLectures() { return this.get('/lectures'); }
    async searchLectures(query) { return this.post('/lectures/search', { query }); }
}

window.api = new API();