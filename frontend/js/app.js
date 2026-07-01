// ==================== КОНФИГУРАЦИЯ ====================

// Make API_URL idempotent to avoid duplicate-const when script is included twice
window.API_URL = window.API_URL || 'http://localhost:3000/api';
let currentUser = null;

// ==================== УТИЛИТЫ ====================

// Получить токен из localStorage
function getToken() {
    return localStorage.getItem('token');
}

// Сохранить токен
function saveToken(token) {
    localStorage.setItem('token', token);
}

// Удалить токен
function removeToken() {
    localStorage.removeItem('token');
}

// Получить данные пользователя
function getUser() {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
}

// Сохранить данные пользователя
function saveUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
    currentUser = user;
}

// API запросы с авторизацией
async function apiRequest(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${window.API_URL}${endpoint}`, {
        ...options,
        headers
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ошибка запроса');
    }
    
    return response.json();
}

// Экспортируем функции в единый глобальный объект `app` для совместимости
window.app = window.app || {};
Object.assign(window.app, {
    apiRequest,
    checkAuth,
    getToken,
    saveToken,
    removeToken,
    getUser,
    saveUser,
    updateUserUI,
    logout
});

// ==================== УВЕДОМЛЕНИЯ ====================

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        padding: 16px 24px;
        background: ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--danger)' : 'var(--primary)'};
        color: white;
        border-radius: var(--radius);
        box-shadow: var(--shadow-lg);
        z-index: 3000;
        font-weight: 600;
        animation: slideInRight 0.4s ease-out;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideInRight 0.4s ease-out reverse';
        setTimeout(() => notification.remove(), 400);
    }, 3000);
}

// ==================== АВТОРИЗАЦИЯ ====================

// Проверка авторизации при загрузке
async function checkAuth() {
    const token = getToken();
    const user = getUser();
    
    if (token && user) {
        try {
            // Проверяем валидность токена
            const profile = await apiRequest('/user/profile');
            saveUser(profile);
            updateUserUI(profile);
            return true;
        } catch (error) {
            // Токен невалидный
            removeToken();
            localStorage.removeItem('user');
            return false;
        }
    }
    
    return false;
}

// Обновить UI пользователя
function updateUserUI(user) {
    const loginBtn = document.getElementById('loginBtn');
    const userInfo = document.getElementById('userInfo');
    const userBalance = document.getElementById('userBalance');
    const userAvatar = document.getElementById('userAvatar');
    const userInitials = document.getElementById('userInitials');
    
    if (user) {
        loginBtn.style.display = 'none';
        userInfo.style.display = 'flex';
        userBalance.textContent = user.coins || 0;
        userInitials.textContent = (user.firstName ? user.firstName[0] : 'U') + (user.lastName ? user.lastName[0] : '');
        
        // Клик по аватару
        userAvatar.onclick = () => {
            window.location.href = 'profile.html';
        };
    } else {
        if (loginBtn) loginBtn.style.display = 'block';
        if (userInfo) userInfo.style.display = 'none';
    }
}

// Выход
function logout() {
    removeToken();
    localStorage.removeItem('user');
    currentUser = null;
    updateUserUI(null);
    showNotification('Вы вышли из аккаунта', 'info');
    setTimeout(() => location.reload(), 1000);
}

// ==================== МОДАЛЬНОЕ ОКНО ====================

// Инициализируется в DOMContentLoaded

// ==================== ФОРМА ВХОДА ====================

// Инициализируется в DOMContentLoaded

// ==================== ФОРМА РЕГИСТРАЦИИ ====================

// Инициализируется в DOMContentLoaded

// ==================== АНИМАЦИИ ПРИ СКРОЛЛЕ ====================

const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
        }
    });
}, observerOptions);

// Наблюдаем за элементами с классом reveal
document.querySelectorAll('.reveal').forEach(el => {
    observer.observe(el);
});

// ==================== СЧЁТЧИК (COUNT UP) ====================

function animateCounter(element) {
    const target = parseInt(element.dataset.target);
    const duration = 2000;
    const increment = target / (duration / 16);
    let current = 0;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = target.toLocaleString();
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current).toLocaleString();
        }
    }, 16);
}

// Запуск счётчиков при скролле
const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.classList.contains('counted')) {
            entry.target.classList.add('counted');
            animateCounter(entry.target);
        }
    });
}, { threshold: 0.5 });

document.querySelectorAll('.count-up').forEach(el => {
    statsObserver.observe(el);
});

// ==================== ПАРАЛЛАКС ЭФФЕКТ ====================

let ticking = false;

window.addEventListener('scroll', () => {
    if (!ticking) {
        window.requestAnimationFrame(() => {
            const scrolled = window.pageYOffset;
            
            document.querySelectorAll('.parallax').forEach(el => {
                const speed = el.dataset.speed || 0.5;
                el.style.transform = `translateY(${scrolled * speed}px)`;
            });
            
            ticking = false;
        });
        
        ticking = true;
    }
});

// ==================== ИНИЦИАЛИЗАЦИЯ ====================

document.addEventListener('DOMContentLoaded', async () => {
    // Проверяем авторизацию
    await checkAuth();
    
    // Добавляем класс loaded для анимаций
    document.body.classList.add('loaded');
    
    // Плавный скролл для якорей
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Stagger анимация для grid элементов
    document.querySelectorAll('.actions-grid, .stats-grid').forEach(grid => {
        grid.classList.add('stagger-animation');
    });

    // ==================== МОДАЛЬНОЕ ОКНО ====================

    const loginModal = document.getElementById('loginModal');
    const loginBtn = document.getElementById('loginBtn');

    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            if (loginModal) loginModal.classList.add('active');
        });
    }

    document.querySelectorAll('.modal-close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            closeBtn.closest('.modal').classList.remove('active');
        });
    });

    // Закрытие по клику вне модального окна
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('active');
        }
    });

    // ==================== ФОРМА ВХОДА ====================

    const loginForm = document.getElementById('loginForm');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const nickname = document.getElementById('loginUsername').value.trim();
            const password = document.getElementById('loginPassword').value;
            
            if (!nickname || !password) {
                console.warn('Заполните все поля');
                return;
            }
            
            try {
                const data = await apiRequest('/auth/login', {
                    method: 'POST',
                    body: JSON.stringify({ nickname, password })
                });
                
                saveToken(data.token);
                saveUser(data.user);
                updateUserUI(data.user);
                
                const loginModal = document.getElementById('loginModal');
                if (loginModal) loginModal.classList.remove('active');
                
                showNotification(`Добро пожаловать, ${data.user.firstName}!`, 'success');
                loginForm.reset();
            } catch (error) {
                // Ошибка при входе (всплывающее окно отключено)
                console.error('Ошибка входа:', error.message);
                loginForm.classList.add('shake');
                setTimeout(() => loginForm.classList.remove('shake'), 500);
            }
        });
    }

    // ==================== ФОРМА РЕГИСТРАЦИИ ====================

    const registerForm = document.getElementById('registerForm');

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const firstName = document.getElementById('regFirstName').value.trim();
            const lastName = document.getElementById('regLastName').value.trim();
            const nickname = document.getElementById('regNickname').value.trim();
            const email = document.getElementById('regEmail').value.trim();
            const password = document.getElementById('regPassword').value;
            const passwordConfirm = document.getElementById('regPasswordConfirm').value;
            const userType = document.getElementById('regUserType').value;
            const age = document.getElementById('regAge').value || null;
            const grade = document.getElementById('regGrade').value || null;
            
            // Валидация
            if (!firstName || !lastName || !nickname || !email || !password || !userType) {
                console.warn('Заполните обязательные поля');
                return;
            }
            
            if (password !== passwordConfirm) {
                console.warn('Пароли не совпадают');
                return;
            }
            
            if (password.length < 6) {
                console.warn('Пароль должен быть не менее 6 символов');
                return;
            }
            
            try {
                const data = await apiRequest('/auth/register', {
                    method: 'POST',
                    body: JSON.stringify({
                        firstName,
                        lastName,
                        nickname,
                        email,
                        password,
                        userType,
                        age: age ? parseInt(age) : null,
                        grade
                    })
                });
                
                saveToken(data.token);
                saveUser(data.user);
                updateUserUI(data.user);
                
                const registerModal = document.getElementById('registerModal');
                if (registerModal) registerModal.classList.remove('active');
                
                showNotification(`Добро пожаловать, ${data.user.firstName}!`, 'success');
                registerForm.reset();
            } catch (error) {
                // Ошибка при регистрации (всплывающее окно отключено)
                console.error('Ошибка регистрации:', error.message);
                registerForm.classList.add('shake');
                setTimeout(() => registerForm.classList.remove('shake'), 500);
            }
        });
    }

    // Переключение между формами
    const showRegister = document.getElementById('showRegister');
    if (showRegister) {
        showRegister.addEventListener('click', (e) => {
            e.preventDefault();
            const loginModal = document.getElementById('loginModal');
            const registerModal = document.getElementById('registerModal');
            if (loginModal) loginModal.classList.remove('active');
            if (registerModal) registerModal.classList.add('active');
        });
    }
});

// ==================== ЭКСПОРТ ====================

// Ensure remaining helpers are available on `app` without overwriting
Object.assign(window.app, {
    showNotification,
    logout,
    getUser,
    getToken
});