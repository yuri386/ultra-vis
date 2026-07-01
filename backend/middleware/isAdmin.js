/**
 * ULTRAWISE V2.0 - MIDDLEWARE/ISADMIN.JS
 * Middleware для проверки прав администратора
 */

// Middleware для проверки прав администратора
function isAdmin(req, res, next) {
    // Проверка наличия пользователя в запросе (должен быть добавлен middleware authenticateToken)
    if (!req.user) {
        return res.status(401).json({ 
            success: false, 
            message: 'Пользователь не авторизован' 
        });
    }

    // Проверка прав администратора
    if (!req.user.isAdmin || req.user.isAdmin === 0) {
        return res.status(403).json({ 
            success: false, 
            message: 'Доступ запрещён. Требуются права администратора' 
        });
    }

    // Пользователь является администратором, продолжаем
    next();
}

// Middleware для проверки, является ли пользователь владельцем ресурса или админом
function isOwnerOrAdmin(resourceUserId) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Пользователь не авторизован' 
            });
        }

        // Админ имеет доступ ко всем ресурсам
        if (req.user.isAdmin === 1) {
            return next();
        }

        // Обычный пользователь имеет доступ только к своим ресурсам
        if (req.user.id === resourceUserId) {
            return next();
        }

        return res.status(403).json({ 
            success: false, 
            message: 'Доступ запрещён' 
        });
    };
}

// Middleware для логирования действий администратора
function logAdminAction(req, res, next) {
    if (req.user && req.user.isAdmin) {
        const timestamp = new Date().toISOString();
        const action = `${req.method} ${req.originalUrl}`;
        const admin = `${req.user.email} (ID: ${req.user.id})`;
        
        console.log(`[ADMIN ACTION] ${timestamp} - ${admin} - ${action}`);
        
        // Можно также записывать в отдельный файл логов или БД
    }
    next();
}

module.exports = {
    isAdmin,
    isOwnerOrAdmin,
    logAdminAction
};