/**
 * ULTRAWISE V2.0 - SERVER.JS (FIXED)
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const fs = require('fs'); // Добавили для проверки файлов

const app = express();
const PORT = process.env.PORT || 8000;
const JWT_SECRET = process.env.JWT_SECRET || 'ultrawise_production_secret_2026_change_me';

// Подгружаем middleware (проверь, что файлы на месте в backend/middleware/)
const { authLimiter } = require('./middleware/auth');

// CORS - Полный доступ для локальной разработки
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// РАЗДАЧА СТАТИКИ (Фронтенд)
app.use(express.static(path.join(__dirname, '../frontend')));

// ГЛОБАЛЬНАЯ ПРОВЕРКА ТОКЕНА
app.use((req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
        try {
            req.user = jwt.verify(token, JWT_SECRET);
        } catch (err) { req.user = null; }
    }
    next();
});

// Инициализация БД
const { db } = require('./database');

// ПОДКЛЮЧЕНИЕ РОУТОВ (С проверкой на существование)
const registerRoute = (endpoint, filePath) => {
    const fullPath = path.join(__dirname, filePath + '.js');
    if (fs.existsSync(fullPath)) {
        app.use(endpoint, require(filePath));
        console.log(`✅ Роут активен: ${endpoint}`);
    } else {
        console.warn(`⚠️ Файл не найден: ${filePath}. Создаю временную заглушку.`);
        app.use(endpoint, (req, res) => res.status(404).json({ success: false, error: "Модуль в разработке" }));
    }
};

registerRoute('/api/auth', './routes/auth');
registerRoute('/api/colleges', './routes/colleges');
registerRoute('/api/lectures', './routes/lectures'); // Вот тут была главная дыра!
registerRoute('/api/admin', './routes/admin');

// Базовый API endpoint
app.get('/api', (req, res) => {
    res.json({ success: true, message: 'UltraWise API v2.0 Ready' });
});

// SPA FALLBACK: Если запрос не к API — отдаем index.html
app.get('/*splat', (req, res) => {
    if (req.path.startsWith('/api')) return res.status(404).json({success: false});
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
    console.log(`
🚀 СЕРВЕР ЗАПУЩЕН
📡 Ссылка: http://localhost:${PORT}
🌐 API: http://localhost:${PORT}/api
    `);
});