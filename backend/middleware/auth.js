/**
 * ULTRAWISE v2.0 - MIDDLEWARE/AUTH.JS
 * JWT Authentication & Authorization Middleware
 * Production-grade security
 */

const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

const JWT_SECRET = process.env.JWT_SECRET || 'ultrawise_production_secret_2026_change_me';

/**
 * Middleware для проверки JWT токена
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'Токен не предоставлен'
        });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    error: 'Токен истёк. Пожалуйста, войдите заново'
                });
            }
            return res.status(403).json({
                success: false,
                error: 'Недействительный токен'
            });
        }

        req.user = user;
        next();
    });
}

/**
 * Middleware для проверки прав администратора
 */
function requireAdmin(req, res, next) {
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({
            success: false,
            error: 'Требуются права администратора'
        });
    }
    next();
}

/**
 * Rate limiting для API
 */
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 100, // максимум 100 запросов за 15 минут
    message: 'Слишком много запросов с этого IP, пожалуйста попробуйте позже',
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Rate limiting для авторизации (строже)
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5, // максимум 5 попыток за 15 минут
    message: 'Слишком много попыток входа, пожалуйста попробуйте позже',
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
});

// ==================== EXPORTS ====================

module.exports = {
    authenticateToken,
    requireAdmin,
    apiLimiter,
    authLimiter
};
