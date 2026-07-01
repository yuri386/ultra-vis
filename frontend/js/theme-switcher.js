/**
 * THEME SWITCHER - Переключатель тем
 */

class ThemeSwitcher {
    constructor() {
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.init();
    }

    init() {
        // Применяем сохранённую тему
        this.applyTheme(this.currentTheme);
        
        // Создаём кнопку переключателя
        this.createSwitcher();
    }

    createSwitcher() {
        // Проверяем, есть ли уже переключатель
        if (document.getElementById('themeSwitcher')) return;

        const switcher = document.createElement('div');
        switcher.id = 'themeSwitcher';
        switcher.className = 'theme-switcher';
        switcher.innerHTML = `
            <button class="theme-btn" id="themeToggle" title="Сменить тему">
                <span class="theme-icon">🌙</span>
            </button>
            <div class="theme-menu" id="themeMenu">
                <h4>Выберите тему</h4>
                <div class="theme-options">
                    <button class="theme-option" data-theme="light">☀️ Светлая</button>
                    <button class="theme-option" data-theme="dark">🌙 Тёмная</button>
                    <button class="theme-option" data-theme="oled">⚫ OLED</button>
                    <button class="theme-option" data-theme="business-light">💼 Business (светлая)</button>
                    <button class="theme-option" data-theme="business-dark">💼 Business (тёмная)</button>
                    <button class="theme-option" data-theme="cyberpunk-light">🌆 Cyberpunk (светлая)</button>
                    <button class="theme-option" data-theme="cyberpunk-dark">🌃 Cyberpunk (тёмная)</button>
                    <button class="theme-option" data-theme="gray">⚪ Серая</button>
                    <button class="theme-option" data-theme="colorful">🎨 Цветная</button>
                    <button class="theme-option" data-theme="classic">📚 Классическая</button>
                    <button class="theme-option" data-theme="apple">🍎 Apple-style</button>
                    <button class="theme-option" data-theme="book">📖 Книжная</button>
                </div>
            </div>
        `;

        document.body.appendChild(switcher);

        // Обработчики
        this.attachEventListeners();
    }

    attachEventListeners() {
        const toggleBtn = document.getElementById('themeToggle');
        const themeMenu = document.getElementById('themeMenu');
        const themeOptions = document.querySelectorAll('.theme-option');

        // Открытие/закрытие меню
        toggleBtn.addEventListener('click', () => {
            themeMenu.classList.toggle('active');
        });

        // Закрытие при клике вне меню
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#themeSwitcher')) {
                themeMenu.classList.remove('active');
            }
        });

        // Выбор темы
        themeOptions.forEach(option => {
            option.addEventListener('click', () => {
                const theme = option.dataset.theme;
                this.applyTheme(theme);
                themeMenu.classList.remove('active');
            });
        });
    }

    applyTheme(theme) {
        this.currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);

        // Обновляем иконку
        const icon = document.querySelector('.theme-icon');
        if (icon) {
            if (theme.includes('dark') || theme === 'oled') {
                icon.textContent = '☀️';
            } else {
                icon.textContent = '🌙';
            }
        }

        console.log('✅ Тема изменена на:', theme);
    }

    getTheme() {
        return this.currentTheme;
    }
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    window.themeSwitcher = new ThemeSwitcher();
});

// CSS для переключателя
const style = document.createElement('style');
style.textContent = `
    .theme-switcher {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 9999;
    }

    .theme-btn {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        border: none;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        font-size: 24px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .theme-btn:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
    }

    .theme-menu {
        position: absolute;
        bottom: 70px;
        right: 0;
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        padding: 20px;
        min-width: 250px;
        opacity: 0;
        visibility: hidden;
        transform: translateY(10px);
        transition: all 0.3s ease;
    }

    .theme-menu.active {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
    }

    .theme-menu h4 {
        margin: 0 0 12px 0;
        font-size: 16px;
        color: #333;
    }

    .theme-options {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .theme-option {
        padding: 10px 16px;
        border: 2px solid #e9ecef;
        border-radius: 8px;
        background: white;
        cursor: pointer;
        transition: all 0.2s ease;
        text-align: left;
        font-size: 14px;
    }

    .theme-option:hover {
        border-color: #667eea;
        background: #f8f9ff;
        transform: translateX(4px);
    }

    /* Тёмная тема для меню */
    [data-theme="dark"] .theme-menu,
    [data-theme="oled"] .theme-menu,
    [data-theme="business-dark"] .theme-menu,
    [data-theme="cyberpunk-dark"] .theme-menu {
        background: #2d3748;
    }

    [data-theme="dark"] .theme-menu h4,
    [data-theme="oled"] .theme-menu h4,
    [data-theme="business-dark"] .theme-menu h4,
    [data-theme="cyberpunk-dark"] .theme-menu h4 {
        color: white;
    }

    [data-theme="dark"] .theme-option,
    [data-theme="oled"] .theme-option,
    [data-theme="business-dark"] .theme-option,
    [data-theme="cyberpunk-dark"] .theme-option {
        background: #1a202c;
        color: white;
        border-color: #4a5568;
    }

    [data-theme="dark"] .theme-option:hover,
    [data-theme="oled"] .theme-option:hover,
    [data-theme="business-dark"] .theme-option:hover,
    [data-theme="cyberpunk-dark"] .theme-option:hover {
        background: #2d3748;
        border-color: #667eea;
    }
`;
document.head.appendChild(style);