/**
 * ULTRAWISE V2.0 - ANIMATIONS.JS
 * Анимации, переходы и визуальные эффекты
 */

// === КЛАСС ДЛЯ УПРАВЛЕНИЯ АНИМАЦИЯМИ === //
class AnimationManager {
    constructor() {
        this.observers = new Map();
        this.init();
    }

    init() {
        this.setupScrollAnimations();
        this.setupHoverEffects();
        this.setupParallax();
    }

    // Анимации при скролле
    setupScrollAnimations() {
        const elements = document.querySelectorAll('[data-animate]');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const animationType = entry.target.dataset.animate;
                    entry.target.classList.add(`animate-${animationType}`);
                    
                    if (!entry.target.dataset.animateRepeat) {
                        observer.unobserve(entry.target);
                    }
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        elements.forEach(el => observer.observe(el));
        this.observers.set('scroll', observer);
    }

    // Эффекты при наведении
    setupHoverEffects() {
        const cards = document.querySelectorAll('.card, .lecture-card, .college-card');
        
        cards.forEach(card => {
            card.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-8px) scale(1.02)';
            });
            
            card.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0) scale(1)';
            });
        });
    }

    // Параллакс эффект
    setupParallax() {
        const parallaxElements = document.querySelectorAll('[data-parallax]');
        
        window.addEventListener('scroll', throttle(() => {
            const scrolled = window.pageYOffset;
            
            parallaxElements.forEach(el => {
                const speed = parseFloat(el.dataset.parallax) || 0.5;
                const yPos = -(scrolled * speed);
                el.style.transform = `translateY(${yPos}px)`;
            });
        }, 10));
    }
}

// === АНИМАЦИЯ ПОЯВЛЕНИЯ ТЕКСТА === //
function typeWriter(element, text, speed = 50) {
    let i = 0;
    element.textContent = '';
    
    return new Promise((resolve) => {
        const interval = setInterval(() => {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
            } else {
                clearInterval(interval);
                resolve();
            }
        }, speed);
    });
}

// === АНИМАЦИЯ СЧЁТЧИКА === //
function animateCounter(element, target, duration = 2000) {
    const start = 0;
    const increment = target / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = Math.floor(target);
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current);
        }
    }, 16);
}

// === АНИМАЦИЯ ПРОГРЕСС БАРА === //
function animateProgressBar(element, targetWidth, duration = 1000) {
    element.style.width = '0%';
    
    setTimeout(() => {
        element.style.transition = `width ${duration}ms ease`;
        element.style.width = targetWidth + '%';
    }, 50);
}

// === RIPPLE ЭФФЕКТ === //
function createRipple(event) {
    const button = event.currentTarget;
    
    const ripple = document.createElement('span');
    ripple.classList.add('ripple');
    
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    
    button.appendChild(ripple);
    
    setTimeout(() => ripple.remove(), 600);
}

// === SHAKE АНИМАЦИЯ === //
function shake(element) {
    element.classList.add('shake');
    setTimeout(() => element.classList.remove('shake'), 500);
}

// === PULSE АНИМАЦИЯ === //
function pulse(element) {
    element.classList.add('pulse');
    setTimeout(() => element.classList.remove('pulse'), 1000);
}

// === FADE IN/OUT === //
function fadeIn(element, duration = 300) {
    element.style.opacity = 0;
    element.style.display = 'block';
    
    let opacity = 0;
    const timer = setInterval(() => {
        if (opacity >= 1) {
            clearInterval(timer);
        }
        element.style.opacity = opacity;
        opacity += 0.1;
    }, duration / 10);
}

function fadeOut(element, duration = 300) {
    let opacity = 1;
    const timer = setInterval(() => {
        if (opacity <= 0) {
            clearInterval(timer);
            element.style.display = 'none';
        }
        element.style.opacity = opacity;
        opacity -= 0.1;
    }, duration / 10);
}

// === SLIDE IN/OUT === //
function slideDown(element, duration = 300) {
    element.style.maxHeight = '0';
    element.style.overflow = 'hidden';
    element.style.display = 'block';
    
    const height = element.scrollHeight;
    element.style.transition = `max-height ${duration}ms ease`;
    
    setTimeout(() => {
        element.style.maxHeight = height + 'px';
    }, 10);
    
    setTimeout(() => {
        element.style.maxHeight = 'none';
        element.style.overflow = 'visible';
    }, duration);
}

function slideUp(element, duration = 300) {
    const height = element.scrollHeight;
    element.style.maxHeight = height + 'px';
    element.style.overflow = 'hidden';
    element.style.transition = `max-height ${duration}ms ease`;
    
    setTimeout(() => {
        element.style.maxHeight = '0';
    }, 10);
    
    setTimeout(() => {
        element.style.display = 'none';
    }, duration);
}

// === CONFETTI ЭФФЕКТ === //
function createConfetti() {
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f093fb', '#ffd43b', '#51cf66'];
    const confettiCount = 50;
    
    for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 3 + 's';
        confetti.style.animationDuration = (Math.random() * 3 + 2) + 's';
        
        document.body.appendChild(confetti);
        
        setTimeout(() => confetti.remove(), 5000);
    }
}

// === АНИМАЦИЯ ЗАГРУЗКИ === //
class LoadingAnimation {
    static show(text = 'Загрузка...') {
        const overlay = document.createElement('div');
        overlay.id = 'loadingAnimation';
        overlay.className = 'loading-animation';
        overlay.innerHTML = `
            <div class="loading-content">
                <div class="spinner-large"></div>
                <p>${text}</p>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    static hide() {
        const overlay = document.getElementById('loadingAnimation');
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 300);
        }
    }

    static update(text) {
        const overlay = document.getElementById('loadingAnimation');
        if (overlay) {
            const p = overlay.querySelector('p');
            if (p) p.textContent = text;
        }
    }
}

// === SKELETON LOADING === //
function createSkeleton(type = 'card') {
    const skeleton = document.createElement('div');
    skeleton.className = `skeleton skeleton-${type}`;
    
    if (type === 'card') {
        skeleton.innerHTML = `
            <div class="skeleton-image"></div>
            <div class="skeleton-title"></div>
            <div class="skeleton-text"></div>
            <div class="skeleton-text"></div>
        `;
    } else if (type === 'list') {
        skeleton.innerHTML = `
            <div class="skeleton-avatar"></div>
            <div class="skeleton-text"></div>
        `;
    }
    
    return skeleton;
}

// === ПЛАВНЫЙ СКРОЛЛ === //
function smoothScrollTo(target, duration = 1000) {
    const targetElement = typeof target === 'string' 
        ? document.querySelector(target) 
        : target;
    
    if (!targetElement) return;
    
    const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset;
    const startPosition = window.pageYOffset;
    const distance = targetPosition - startPosition;
    let startTime = null;
    
    function animation(currentTime) {
        if (startTime === null) startTime = currentTime;
        const timeElapsed = currentTime - startTime;
        const run = ease(timeElapsed, startPosition, distance, duration);
        window.scrollTo(0, run);
        if (timeElapsed < duration) requestAnimationFrame(animation);
    }
    
    function ease(t, b, c, d) {
        t /= d / 2;
        if (t < 1) return c / 2 * t * t + b;
        t--;
        return -c / 2 * (t * (t - 2) - 1) + b;
    }
    
    requestAnimationFrame(animation);
}

// === МОРФИНГ ЧИСЕЛ === //
function morphNumber(element, from, to, duration = 1000) {
    const steps = 60;
    const stepTime = duration / steps;
    const increment = (to - from) / steps;
    let current = from;
    let step = 0;
    
    const timer = setInterval(() => {
        step++;
        current += increment;
        element.textContent = Math.round(current);
        
        if (step >= steps) {
            element.textContent = to;
            clearInterval(timer);
        }
    }, stepTime);
}

// === ЭФФЕКТ ЧАСТИЦ === //
class ParticleEffect {
    constructor(container, options = {}) {
        this.container = container;
        this.particleCount = options.particleCount || 50;
        this.colors = options.colors || ['#667eea', '#764ba2', '#f093fb'];
        this.init();
    }

    init() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.pointerEvents = 'none';
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        this.particles = [];
        for (let i = 0; i < this.particleCount; i++) {
            this.particles.push(this.createParticle());
        }
        
        this.container.appendChild(this.canvas);
        this.animate();
    }

    resize() {
        this.canvas.width = this.container.offsetWidth;
        this.canvas.height = this.container.offsetHeight;
    }

    createParticle() {
        return {
            x: Math.random() * this.canvas.width,
            y: Math.random() * this.canvas.height,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            radius: Math.random() * 3 + 1,
            color: this.colors[Math.floor(Math.random() * this.colors.length)]
        };
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.particles.forEach(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            if (particle.x < 0 || particle.x > this.canvas.width) particle.vx *= -1;
            if (particle.y < 0 || particle.y > this.canvas.height) particle.vy *= -1;
            
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = particle.color;
            this.ctx.fill();
        });
        
        requestAnimationFrame(() => this.animate());
    }
}

window.AnimationManager = window.AnimationManager || AnimationManager;

// === ИНИЦИАЛИЗАЦИЯ === //
document.addEventListener('DOMContentLoaded', () => {
    window.animManager = window.animManager || new AnimationManager();
    
    // Ripple эффект на кнопках
    document.querySelectorAll('.btn-primary, .btn-secondary').forEach(button => {
        button.style.position = 'relative';
        button.style.overflow = 'hidden';
        button.addEventListener('click', createRipple);
    });
});

// === CSS ДЛЯ АНИМАЦИЙ === //
if (!window.animationStylesLoaded) {
    const animationStyles = document.createElement('style');
    animationStyles.textContent = `
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    @keyframes fadeInLeft {
        from {
            opacity: 0;
            transform: translateX(-30px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }

    @keyframes fadeInRight {
        from {
            opacity: 0;
            transform: translateX(30px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }

    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
        20%, 40%, 60%, 80% { transform: translateX(10px); }
    }

    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
    }

    @keyframes confetti {
        0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
        }
        100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
        }
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }

    .animate-fadeInUp {
        animation: fadeInUp 0.6s ease;
    }

    .animate-fadeInLeft {
        animation: fadeInLeft 0.6s ease;
    }

    .animate-fadeInRight {
        animation: fadeInRight 0.6s ease;
    }

    .shake {
        animation: shake 0.5s;
    }

    .pulse {
        animation: pulse 1s;
    }

    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.6);
        pointer-events: none;
        animation: rippleEffect 0.6s ease;
    }

    @keyframes rippleEffect {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }

    .confetti {
        position: fixed;
        width: 10px;
        height: 10px;
        top: -10px;
        z-index: 9999;
        animation: confetti linear forwards;
    }

    .loading-animation {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        transition: opacity 0.3s ease;
    }

    .loading-content {
        text-align: center;
        color: white;
    }

    .spinner-large {
        width: 60px;
        height: 60px;
        border: 4px solid rgba(255, 255, 255, 0.3);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 20px;
    }

    .skeleton {
        background: #f0f0f0;
        border-radius: 8px;
        overflow: hidden;
        position: relative;
    }

    .skeleton::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.8), transparent);
        animation: shimmer 1.5s infinite;
    }

    @keyframes shimmer {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
    }

    .skeleton-image {
        width: 100%;
        height: 200px;
        background: #e0e0e0;
        margin-bottom: 12px;
    }

    .skeleton-title {
        width: 70%;
        height: 24px;
        background: #e0e0e0;
        margin-bottom: 12px;
    }

    .skeleton-text {
        width: 100%;
        height: 16px;
        background: #e0e0e0;
        margin-bottom: 8px;
    }
`;
    document.head.appendChild(animationStyles);
    window.animationStylesLoaded = true;
}

// Утилита для throttle
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