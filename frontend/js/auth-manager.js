/**
 * ULTRAWISE V2.0 - auth-manager.js (ПЕРЕДЕЛАНО ОТ НУЛЯ)
 * Система авторизации и управления сессией
 * 
 * Lead-разработчик решение:
 * - Single Source of Truth (SSoT) паттерн
 * - Event-driven архитектура
 * - Правильная обработка жизненного цикла
 * - Синхронизация между вкладками/окнами браузера
 */

class AuthManager {
    constructor() {
        // STATE - Единый источник истины
        this.user = null;
        this.token = null;
        this.isAdmin = false;
        this.isLoading = false;

        // CONFIG
        this.API_URL = 'http://localhost:8000/api';
        this.STORAGE_KEYS = {
            token: 'ultrawise_auth_token',
            user: 'ultrawise_auth_user'
        };

        // DOM References
        this.modal = null;
        this.header = null;

        // Initialization
        this.init();
    }

    /**
     * Инициализация при загрузке страницы
     */
    init() {
        console.log('🔐 AuthManager: инициализация...');

        // 1. Восстанавливаем сессию из localStorage
        this.restoreSession();

        // 2. Создаем глобальную шапку
        this.createGlobalHeader();

        // 3. Создаем модальное окно (один раз)
        this.createAuthModal();

        // 4. Слушаем события localStorage (синхронизация между вкладками)
        window.addEventListener('storage', (e) => this.handleStorageChange(e));

        // 5. Обновляем UI
        this.updateUI();

        console.log('✅ AuthManager: готов');
    }

    /**
     * Восстановление сессии из localStorage
     */
    restoreSession() {
        try {
            const token = localStorage.getItem(this.STORAGE_KEYS.token);
            const userStr = localStorage.getItem(this.STORAGE_KEYS.user);

            if (token && userStr) {
                this.token = token;
                this.user = JSON.parse(userStr);
                this.isAdmin = Boolean(this.user.isAdmin);
                console.log('✅ Сессия восстановлена:', this.user.nickname);
                return true;
            }
        } catch (err) {
            console.error('❌ Ошибка восстановления сессии:', err.message);
            this.clearSession();
        }

        return false;
    }

    /**
     * Очистка сессии
     */
    clearSession() {
        this.user = null;
        this.token = null;
        this.isAdmin = false;
        localStorage.removeItem(this.STORAGE_KEYS.token);
        localStorage.removeItem(this.STORAGE_KEYS.user);
    }

    /**
     * Сохранение сессии в localStorage
     */
    saveSession(token, user) {
        this.token = token;
        this.user = user;
        this.isAdmin = Boolean(user.isAdmin);

        localStorage.setItem(this.STORAGE_KEYS.token, token);
        localStorage.setItem(this.STORAGE_KEYS.user, JSON.stringify(user));

        console.log('💾 Сессия сохранена:', user.nickname);

        // Отправляем событие для синхронизации
        window.dispatchEvent(new CustomEvent('auth:changed', { detail: { user } }));
    }

    /**
     * Обработка изменения localStorage (синхронизация между вкладками)
     */
    handleStorageChange(e) {
        if (e.key === this.STORAGE_KEYS.token || e.key === this.STORAGE_KEYS.user) {
            console.log('🔄 Синхронизация из другой вкладки...');
            this.restoreSession();
            this.updateUI();
        }
    }

    /**
     * Создание глобальной шапки
     */
    createGlobalHeader() {
        let header = document.getElementById('global-auth-header');

        if (!header) {
            header = document.createElement('header');
            header.id = 'global-auth-header';
            header.className = 'global-auth-header';
            document.body.insertBefore(header, document.body.firstChild);
        }

        this.header = header;
        this.updateHeader();
    }

    /**
     * Обновление содержимого шапки
     */
    updateHeader() {
        if (!this.header) return;

        if (this.user) {
            // Авторизованный пользователь
            this.header.innerHTML = `
                <div class="header-container">
                    <a href="/index.html" class="logo-link">
                        <h1>🎓 UltraWise</h1>
                    </a>
                    <div class="header-nav">
                        <a href="/index.html">Главная</a>
                        <a href="/lectures.html">Лекции</a>
                        <a href="/orientation.html">Колледжи</a>
                        <a href="/myday.html">Мой день</a>
                        ${this.isAdmin ? `<a href="/admin.html" style="color: #f59e0b; font-weight: bold;">👑 Админ</a>` : ''}
                    </div>
                    <div class="header-user">
                        <span class="user-info">👤 ${this.user.firstName} ${this.user.lastName}</span>
                        <span class="balance-info" data-balance>${this.user.coins || 0} 💰</span>
                        ${this.isAdmin ? '<span class="admin-badge">Администратор</span>' : ''}
                        <button class="btn-logout">Выход</button>
                    </div>
                </div>
            `;
        } else {
            // Гость
            this.header.innerHTML = `
                <div class="header-container">
                    <a href="/index.html" class="logo-link">
                        <h1>🎓 UltraWise</h1>
                    </a>
                    <div class="header-nav">
                        <a href="/index.html">Главная</a>
                        <a href="/lectures.html">Лекции</a>
                        <a href="/orientation.html">Колледжи</a>
                    </div>
                    <button class="btn-login">Вход / Регистрация</button>
                </div>
            `;
        }

        this.attachHeaderEvents();
    }

    /**
     * Прикрепление событий к элементам шапки
     */
    attachHeaderEvents() {
        const loginBtn = this.header?.querySelector('.btn-login');
        const logoutBtn = this.header?.querySelector('.btn-logout');

        if (loginBtn) {
            loginBtn.onclick = () => this.showAuthModal();
        }

        if (logoutBtn) {
            logoutBtn.onclick = () => this.logout();
        }
    }

    /**
     * Создание модального окна (один раз)
     */
    createAuthModal() {
        // Если модаль уже существует - удаляем её
        const existing = document.getElementById('auth-modal');
        if (existing) existing.remove();

        this.modal = document.createElement('div');
        this.modal.id = 'auth-modal';
        this.modal.className = 'auth-modal-overlay';
        this.modal.innerHTML = `
            <div class="auth-modal-content">
                <button class="auth-modal-close">✕</button>

                <div class="auth-modal-tabs">
                    <button class="auth-tab-btn active" data-tab="login">Вход</button>
                    <button class="auth-tab-btn" data-tab="register">Регистрация</button>
                </div>

                <!-- Форма входа -->
                <form id="auth-login-form" class="auth-tab-pane active" data-tab="login">
                    <h2>Вход в аккаунт</h2>
                    <div class="auth-form-group">
                        <input type="text" id="login-identifier" placeholder="Email или логин" required>
                    </div>
                    <div class="auth-form-group">
                        <input type="password" id="login-password" placeholder="Пароль" required>
                    </div>
                    <button type="submit" class="btn-primary auth-btn-submit">Войти</button>
                    <div class="auth-error-msg"></div>
                </form>

                <!-- Форма регистрации -->
                <form id="auth-register-form" class="auth-tab-pane" data-tab="register">
                    <h2>Регистрация</h2>
                    <div class="auth-form-group">
                        <input type="text" id="reg-firstName" placeholder="Имя" required>
                    </div>
                    <div class="auth-form-group">
                        <input type="text" id="reg-lastName" placeholder="Фамилия" required>
                    </div>
                    <div class="auth-form-group">
                        <input type="text" id="reg-nickname" placeholder="Логин" required>
                    </div>
                    <div class="auth-form-group">
                        <input type="email" id="reg-email" placeholder="Email" required>
                    </div>
                    <div class="auth-form-group">
                        <input type="password" id="reg-password" placeholder="Пароль (мин. 6 символов)" required>
                    </div>
                    <div class="auth-form-group">
                        <select id="reg-userType" required>
                            <option value="">Выберите тип пользователя</option>
                            <option value="schoolkid">Школьник</option>
                            <option value="university_student">Студент ВУЗа</option>
                            <option value="college_student">Студент колледжа</option>
                            <option value="employee">Работник</option>
                        </select>
                    </div>
                    <button type="submit" class="btn-primary auth-btn-submit">Зарегистрироваться</button>
                    <div class="auth-error-msg"></div>
                </form>
            </div>
        `;

        document.body.appendChild(this.modal);

        // Обработчики закрытия
        this.modal.querySelector('.auth-modal-close').addEventListener('click', () => this.hideAuthModal());
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.hideAuthModal();
        });

        // Переключение табов
        this.modal.querySelectorAll('.auth-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                this.modal.querySelectorAll('.auth-tab-btn').forEach(b => b.classList.remove('active'));
                this.modal.querySelectorAll('.auth-tab-pane').forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                this.modal.querySelector(`[data-tab="${tab}"]`).classList.add('active');
            });
        });

        // Обработчики форм
        this.modal.querySelector('#auth-login-form').addEventListener('submit', (e) => this.handleLogin(e));
        this.modal.querySelector('#auth-register-form').addEventListener('submit', (e) => this.handleRegister(e));
    }

    /**
     * Показать модальное окно
     */
    showAuthModal() {
        this.modal?.classList.add('active');
    }

    /**
     * Скрыть модальное окно
     */
    hideAuthModal() {
        this.modal?.classList.remove('active');
        // Очищаем ошибки
        this.modal?.querySelectorAll('.auth-error-msg').forEach(el => el.textContent = '');
    }

    /**
     * Обработка входа
     */
    async handleLogin(e) {
        e.preventDefault();
        if (this.isLoading) return;
        this.isLoading = true;

        try {
            const identifier = document.getElementById('login-identifier').value.trim();
            const password = document.getElementById('login-password').value.trim();

            if (!identifier || !password) {
                throw new Error('Заполните все поля');
            }

            console.log('🔐 Вход:', identifier);

            const response = await fetch(`${this.API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    [identifier.includes('@') ? 'email' : 'nickname']: identifier,
                    password
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Ошибка входа');
            }

            // Сохраняем сессию
            this.saveSession(data.token, data.user);

            // Обновляем UI
            this.updateUI();

            // Закрываем модаль
            this.hideAuthModal();

            console.log('✅ Вход успешен');
        } catch (err) {
            console.error('❌ Ошибка входа:', err.message);
            const errorEl = this.modal.querySelector('#auth-login-form .auth-error-msg');
            if (errorEl) errorEl.textContent = err.message;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Обработка регистрации
     */
    async handleRegister(e) {
        e.preventDefault();
        if (this.isLoading) return;
        this.isLoading = true;

        try {
            const firstName = document.getElementById('reg-firstName').value.trim();
            const lastName = document.getElementById('reg-lastName').value.trim();
            const nickname = document.getElementById('reg-nickname').value.trim();
            const email = document.getElementById('reg-email').value.trim();
            const password = document.getElementById('reg-password').value.trim();
            const userType = document.getElementById('reg-userType').value.trim();

            // Валидация
            if (!firstName || !lastName || !nickname || !email || !password || !userType) {
                throw new Error('Заполните все поля');
            }

            if (password.length < 6) {
                throw new Error('Пароль должен быть минимум 6 символов');
            }

            if (!email.includes('@')) {
                throw new Error('Укажите корректный email');
            }

            console.log('📝 Регистрация:', nickname);

            const response = await fetch(`${this.API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    firstName,
                    lastName,
                    nickname,
                    email,
                    password,
                    userType
                })
            });

            const data = await response.json();
            console.log('📦 Response:', data);

            if (!data.success) {
                throw new Error(data.error || data.message || 'Ошибка регистрации');
            }

            // Сохраняем сессию
            this.saveSession(data.token, data.user);

            // Обновляем UI
            this.updateUI();

            // Закрываем модаль
            this.hideAuthModal();

            console.log('✅ Регистрация успешна');
        } catch (err) {
            console.error('❌ Ошибка регистрации:', err.message);
            const errorEl = this.modal.querySelector('#auth-register-form .auth-error-msg');
            if (errorEl) errorEl.textContent = err.message;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Выход из системы
     */
    logout() {
        console.log('👋 Выход');
        this.clearSession();
        this.updateUI();
        window.location.href = '/index.html';
    }

    /**
     * Обновление всего UI
     */
    updateUI() {
        this.updateHeader();
        this.updateBalanceDisplay();
        window.dispatchEvent(new CustomEvent('auth:updated', { detail: { user: this.user } }));
    }

    /**
     * Обновление отображения баланса
     */
    updateBalanceDisplay() {
        if (this.user) {
            document.querySelectorAll('[data-balance]').forEach(el => {
                el.textContent = `${this.user.coins || 0} 💰`;
            });
        }
    }

    /**
     * Получить заголовки для API
     */
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        return headers;
    }

    /**
     * API запрос с авторизацией
     */
    async apiRequest(endpoint, options = {}) {
        const url = `${this.API_URL}${endpoint}`;

        const response = await fetch(url, {
            ...options,
            headers: this.getHeaders()
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || data.message || 'Ошибка запроса');
        }

        return data;
    }

    /**
     * Требуется авторизация
     */
    requireAuth() {
        if (!this.user) {
            console.warn('⚠️ Требуется авторизация');
            this.showAuthModal();
            throw new Error('Требуется авторизация');
        }
    }

    /**
     * Требуется администратор
     */
    requireAdmin() {
        if (!this.isAdmin) {
            console.error('❌ Требуются права администратора');
            throw new Error('Требуются права администратора');
        }
    }

    /**
     * Обновить баланс пользователя
     */
    async updateUserBalance() {
        try {
            if (!this.user) return;

            const data = await this.apiRequest('/user/profile');

            if (data.user) {
                this.user.coins = data.user.coins || 0;
                // Обновляем localStorage
                localStorage.setItem(this.STORAGE_KEYS.user, JSON.stringify(this.user));
                this.updateBalanceDisplay();
                console.log('💰 Баланс обновлен:', this.user.coins);
            }
        } catch (err) {
            console.error('❌ Ошибка обновления баланса:', err.message);
        }
    }
}

// ==================== ИНИЦИАЛИЗАЦИЯ ====================

// Инициализируем при загрузке DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.auth = new AuthManager();
    });
} else {
    window.auth = new AuthManager();
}

// Обновляем баланс каждые 5 секунд (если авторизован)
setInterval(() => {
    if (window.auth && window.auth.user) {
        window.auth.updateUserBalance();
    }
}, 5000);
