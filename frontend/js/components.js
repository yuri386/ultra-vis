/**
 * ULTRAWISE V2.0 - COMPONENTS.JS
 * Переиспользуемые UI компоненты и утилиты
 */

// === КОМПОНЕНТ КАРТОЧКИ ЛЕКЦИИ === //
function createLectureCard(lecture) {
    const card = document.createElement('div');
    card.className = 'lecture-card';
    card.dataset.lectureId = lecture.id;
    
    const levelBadge = {
        'beginner': 'Начальный',
        'intermediate': 'Средний',
        'advanced': 'Продвинутый',
        'expert': 'Экспертный'
    }[lecture.level] || lecture.level;

    card.innerHTML = `
        <div class="lecture-thumbnail">
            <img src="${lecture.thumbnail || '/assets/images/v1.jpeg'}" alt="${lecture.title}">
            <span class="badge badge-${lecture.level}">${levelBadge}</span>
        </div>
        <div class="lecture-content">
            <h3 class="lecture-title">${lecture.title}</h3>
            <p class="lecture-category">${lecture.category}</p>
            <p class="lecture-description">${lecture.description}</p>
            <div class="lecture-meta">
                <span class="author">👤 ${lecture.author}</span>
                <span class="duration">⏱️ ${lecture.duration} мин</span>
                <span class="date">📅 ${formatDate(lecture.date)}</span>
            </div>
        </div>
        <div class="lecture-actions">
            <button class="btn-primary" onclick="openLecture(${lecture.id})">Читать</button>
            <button class="btn-icon save-btn" onclick="toggleSave(${lecture.id}, this)" title="Сохранить">
                ${lecture.saved ? '⭐' : '☆'}
            </button>
        </div>
    `;

    return card;
}

// === КОМПОНЕНТ КАРТОЧКИ КОЛЛЕДЖА === //
function createCollegeCard(college) {
    const card = document.createElement('div');
    card.className = 'college-card';
    card.dataset.collegeId = college.id;

    card.innerHTML = `
        <div class="college-header">
            <img src="${college.logo || '/assets/images/v1.jpeg'}" alt="${college.name}" class="college-logo">
            <div class="college-info">
                <h3 class="college-name">${college.name}</h3>
                <p class="college-location">📍 ${college.city}</p>
                ${college.rating ? `<div class="college-rating">⭐ ${college.rating}/5</div>` : ''}
            </div>
        </div>
        <div class="college-body">
            <p class="college-description">${college.description}</p>
            <div class="college-features">
                ${college.hasBudget ? '<span class="badge badge-success">Бюджет</span>' : ''}
                ${college.hasDormitory ? '<span class="badge badge-info">Общежитие</span>' : ''}
                ${college.featured ? '<span class="badge badge-warning">Рекомендуем</span>' : ''}
            </div>
        </div>
        <div class="college-footer">
            <button class="btn-primary" onclick="viewCollege(${college.id})">Подробнее</button>
            <button class="btn-secondary" onclick="compareCollege(${college.id})">Сравнить</button>
        </div>
    `;

    return card;
}

// === КОМПОНЕНТ КАРТОЧКИ ЦИТАТЫ === //
function createQuoteCard(quote) {
    const card = document.createElement('div');
    card.className = 'quote-card';
    card.dataset.quoteId = quote.id;

    card.innerHTML = `
        <blockquote class="quote-text">"${quote.text}"</blockquote>
        <div class="quote-author">— ${quote.author}</div>
        ${quote.source ? `<div class="quote-source">${quote.source}</div>` : ''}
        <div class="quote-footer">
            <span class="quote-category badge badge-primary">${quote.category}</span>
            <div class="quote-actions">
                <button class="btn-icon like-btn ${quote.liked ? 'active' : ''}" 
                        onclick="toggleLikeQuote(${quote.id}, this)">
                    ❤️ <span class="like-count">${quote.likes || 0}</span>
                </button>
                <button class="btn-icon" onclick="shareQuote(${quote.id})" title="Поделиться">
                    📤
                </button>
                <button class="btn-icon" onclick="copyQuote('${quote.text}', '${quote.author}')" title="Копировать">
                    📋
                </button>
            </div>
        </div>
    `;

    return card;
}

// === МОДАЛЬНОЕ ОКНО === //
class Modal {
    constructor(options = {}) {
        this.title = options.title || '';
        this.content = options.content || '';
        this.size = options.size || 'medium'; // small, medium, large
        this.onConfirm = options.onConfirm || null;
        this.onCancel = options.onCancel || null;
        this.confirmText = options.confirmText || 'OK';
        this.cancelText = options.cancelText || 'Отмена';
        this.showCancel = options.showCancel !== false;
        
        this.create();
    }

    create() {
        this.modal = document.createElement('div');
        this.modal.className = 'modal';
        
        const sizeClass = this.size === 'large' ? 'modal-large' : 
                         this.size === 'small' ? 'modal-small' : '';
        
        this.modal.innerHTML = `
            <div class="modal-content ${sizeClass}">
                <div class="modal-header">
                    <h3>${this.title}</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    ${this.content}
                </div>
                <div class="modal-actions">
                    ${this.showCancel ? `<button class="btn-secondary cancel-btn">${this.cancelText}</button>` : ''}
                    <button class="btn-primary confirm-btn">${this.confirmText}</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.modal);

        // Обработчики
        const confirmBtn = this.modal.querySelector('.confirm-btn');
        const cancelBtn = this.modal.querySelector('.cancel-btn');

        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                if (this.onConfirm) this.onConfirm();
                this.close();
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                if (this.onCancel) this.onCancel();
                this.close();
            });
        }

        // Закрытие по клику вне модального окна
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.close();
        });
    }

    open() {
        this.modal.classList.add('active');
    }

    close() {
        this.modal.classList.remove('active');
        setTimeout(() => this.modal.remove(), 300);
    }
}

// === УВЕДОМЛЕНИЯ === //
class Toast {
    static show(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        toast.innerHTML = `
            <span class="toast-icon">${icons[type]}</span>
            <span class="toast-message">${message}</span>
        `;

        document.body.appendChild(toast);

        // Показ
        setTimeout(() => toast.classList.add('show'), 10);

        // Скрытие и удаление
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    static success(message) {
        this.show(message, 'success');
    }

    static error(message) {
        this.show(message, 'error');
    }

    static warning(message) {
        this.show(message, 'warning');
    }

    static info(message) {
        this.show(message, 'info');
    }
}

// === ПАГИНАЦИЯ === //
class Pagination {
    constructor(options = {}) {
        this.currentPage = options.currentPage || 1;
        this.totalPages = options.totalPages || 1;
        this.onPageChange = options.onPageChange || (() => {});
        this.container = options.container || null;
    }

    render() {
        if (!this.container) return;

        const pagination = document.createElement('div');
        pagination.className = 'pagination';

        // Кнопка "Предыдущая"
        const prevBtn = document.createElement('button');
        prevBtn.className = 'pagination-btn';
        prevBtn.textContent = '‹';
        prevBtn.disabled = this.currentPage === 1;
        prevBtn.addEventListener('click', () => this.goToPage(this.currentPage - 1));
        pagination.appendChild(prevBtn);

        // Номера страниц
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(this.totalPages, this.currentPage + 2);

        if (startPage > 1) {
            this.addPageButton(pagination, 1);
            if (startPage > 2) {
                const dots = document.createElement('span');
                dots.textContent = '...';
                pagination.appendChild(dots);
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            this.addPageButton(pagination, i);
        }

        if (endPage < this.totalPages) {
            if (endPage < this.totalPages - 1) {
                const dots = document.createElement('span');
                dots.textContent = '...';
                pagination.appendChild(dots);
            }
            this.addPageButton(pagination, this.totalPages);
        }

        // Кнопка "Следующая"
        const nextBtn = document.createElement('button');
        nextBtn.className = 'pagination-btn';
        nextBtn.textContent = '›';
        nextBtn.disabled = this.currentPage === this.totalPages;
        nextBtn.addEventListener('click', () => this.goToPage(this.currentPage + 1));
        pagination.appendChild(nextBtn);

        this.container.innerHTML = '';
        this.container.appendChild(pagination);
    }

    addPageButton(container, pageNum) {
        const btn = document.createElement('button');
        btn.className = `pagination-btn ${pageNum === this.currentPage ? 'active' : ''}`;
        btn.textContent = pageNum;
        btn.addEventListener('click', () => this.goToPage(pageNum));
        container.appendChild(btn);
    }

    goToPage(page) {
        if (page < 1 || page > this.totalPages || page === this.currentPage) return;
        this.currentPage = page;
        this.onPageChange(page);
        this.render();
    }
}

window.Pagination = window.Pagination || Pagination;

// === ФИЛЬТРЫ === //
class Filter {
    constructor(options = {}) {
        this.filters = options.filters || {};
        this.onFilterChange = options.onFilterChange || (() => {});
    }

    addFilter(key, value) {
        this.filters[key] = value;
        this.onFilterChange(this.filters);
    }

    removeFilter(key) {
        delete this.filters[key];
        this.onFilterChange(this.filters);
    }

    clearFilters() {
        this.filters = {};
        this.onFilterChange(this.filters);
    }

    getFilters() {
        return { ...this.filters };
    }
}

window.Filter = window.Filter || Filter;

// === ПОИСК === //
class SearchBox {
    constructor(options = {}) {
        this.container = options.container;
        this.placeholder = options.placeholder || 'Поиск...';
        this.onSearch = options.onSearch || (() => {});
        this.debounceTime = options.debounceTime || 300;
        this.debounceTimer = null;
        
        this.create();
    }

    create() {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'search-input';
        input.placeholder = this.placeholder;

        input.addEventListener('input', (e) => {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => {
                this.onSearch(e.target.value);
            }, this.debounceTime);
        });

        if (this.container) {
            this.container.appendChild(input);
        }

        this.input = input;
    }

    getValue() {
        return this.input.value;
    }

    clear() {
        this.input.value = '';
    }
}

// === УТИЛИТЫ === //

// Форматирование даты
function formatDate(date) {
    const d = new Date(date);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return d.toLocaleDateString('ru-RU', options);
}

// Форматирование времени
function formatTime(date) {
    const d = new Date(date);
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

// Сокращение текста
function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Debounce функция
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle функция
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Копирование в буфер обмена
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        Toast.success('Скопировано в буфер обмена');
        return true;
    } catch (error) {
        Toast.error('Не удалось скопировать');
        return false;
    }
}

// Валидация email
function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

// Генерация случайного ID
function generateId() {
    return '_' + Math.random().toString(36).substr(2, 9);
}

// Скролл к элементу
function scrollToElement(element, offset = 0) {
    const top = element.getBoundingClientRect().top + window.pageYOffset - offset;
    window.scrollTo({ top, behavior: 'smooth' });
}

// === ЗАГРУЗКА ИЗОБРАЖЕНИЙ === //
function preloadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

// === LAZY LOADING === //
function setupLazyLoading() {
    const images = document.querySelectorAll('img[data-src]');
    
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                observer.unobserve(img);
            }
        });
    });

    images.forEach(img => imageObserver.observe(img));
}

// === ПЕРЕКЛЮЧАТЕЛЬ ВКЛАДОК === //
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.tab;
            
            // Деактивация всех
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            // Активация выбранной
            btn.classList.add('active');
            document.getElementById(target + 'Tab')?.classList.add('active');
        });
    });
}

// === ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ === //
document.addEventListener('DOMContentLoaded', () => {
    setupLazyLoading();
    initTabs();
});

// Добавление CSS для Toast
const toastStyle = document.createElement('style');
toastStyle.textContent = `
    .toast {
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        padding: 16px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: center;
        gap: 12px;
        transform: translateX(400px);
        transition: transform 0.3s ease;
        z-index: 10000;
        min-width: 300px;
    }

    .toast.show {
        transform: translateX(0);
    }

    .toast-success { border-left: 4px solid #51cf66; }
    .toast-error { border-left: 4px solid #ff6b6b; }
    .toast-warning { border-left: 4px solid #ffd43b; }
    .toast-info { border-left: 4px solid #4dabf7; }

    .toast-icon {
        font-size: 24px;
    }

    .toast-message {
        flex: 1;
    }
`;
document.head.appendChild(toastStyle);