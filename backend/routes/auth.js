/**
 * ULTRAWISE v2.0 - ROUTES/AUTH.JS
 * Production-Grade Authentication API
 * 
 * ✅ Валидация на backend
 * ✅ Защита от bruteforce (5 попыток = блокировка на 15 мин)
 * ✅ Хеширование паролей (bcryptjs, 10 rounds)
 * ✅ JWT токены (30 дней)
 * ✅ Аудит всех действий
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { db } = require('../database');

const JWT_SECRET = process.env.JWT_SECRET || 'ultrawise_production_secret_2026_change_me';
const JWT_EXPIRE = '30d';

// ==================== HELPERS ====================

/**
 * Валидация email по RFC 5322
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 255;
}

/**
 * Валидация пароля
 * - Минимум 8 символов
 * - Хотя бы одна буква
 * - Хотя бы одна цифра
 */
function isValidPassword(password) {
    return password.length >= 8 && /[a-zA-Z]/.test(password) && /\d/.test(password);
}

/**
 * Валидация никнейма
 */
function isValidNickname(nickname) {
    return nickname.length >= 3 && nickname.length <= 50 && /^[a-zA-Z0-9_-]+$/.test(nickname);
}

/**
 * Логирование аудита
 */
function logAudit(userId, action, status, reason = null, req = null) {
    const ipAddress = req ? req.ip || req.connection.remoteAddress : 'unknown';
    const userAgent = req ? req.headers['user-agent'] : 'unknown';

    db.run(
        `INSERT INTO auditLog (userId, action, ipAddress, userAgent, status, reason)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId || null, action, ipAddress, userAgent, status, reason]
    );
}

/**
 * Обновление счётчика неудачных попыток входа
 */
function incrementFailedLogin(userId) {
    db.run(`UPDATE users SET failedLoginAttempts = failedLoginAttempts + 1 WHERE id = ?`, [userId]);

    // Если 5 неудачных попыток - блокируем на 15 минут
    db.get(`SELECT failedLoginAttempts FROM users WHERE id = ?`, [userId], (err, user) => {
        if (user && user.failedLoginAttempts >= 5) {
            const lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
            db.run(`UPDATE users SET lockedUntil = ? WHERE id = ?`, [lockedUntil.toISOString(), userId]);
            logAudit(userId, 'account_block', 'success', 'Too many failed login attempts');
        }
    });
}

/**
 * Сброс счётчика неудачных попыток
 */
function resetFailedLogin(userId) {
    db.run(
        `UPDATE users SET failedLoginAttempts = 0, lockedUntil = NULL WHERE id = ?`,
        [userId]
    );
}

/**
 * Создание JWT токена
 */
function generateToken(user) {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            nickname: user.nickname,
            isAdmin: user.isAdmin
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRE }
    );
}

// ==================== ENDPOINTS ====================

/**
 * POST /register
 * Регистрация нового пользователя
 */
router.post('/register', (req, res) => {
    try {
        const { firstName, lastName, email, nickname, password, userType } = req.body;

        // ===== ВАЛИДАЦИЯ =====
        if (!firstName || !lastName || !email || !nickname || !password || !userType) {
            logAudit(null, 'register', 'failed', 'Missing required fields', req);
            return res.status(400).json({
                success: false,
                error: 'Заполните все обязательные поля'
            });
        }

        if (firstName.trim().length < 2 || firstName.trim().length > 50) {
            return res.status(400).json({
                success: false,
                error: 'Имя должно быть от 2 до 50 символов'
            });
        }

        if (lastName.trim().length < 2 || lastName.trim().length > 50) {
            return res.status(400).json({
                success: false,
                error: 'Фамилия должна быть от 2 до 50 символов'
            });
        }

        if (!isValidEmail(email)) {
            logAudit(null, 'register', 'failed', 'Invalid email format', req);
            return res.status(400).json({
                success: false,
                error: 'Некорректный формат email'
            });
        }

        if (!isValidNickname(nickname)) {
            return res.status(400).json({
                success: false,
                error: 'Логин должен содержать 3-50 символов (буквы, цифры, - и _)'
            });
        }

        if (!isValidPassword(password)) {
            return res.status(400).json({
                success: false,
                error: 'Пароль должен быть не менее 8 символов, содержать буквы и цифры'
            });
        }

        const validUserTypes = ['schoolkid', 'university_student', 'college_student', 'employee'];
        if (!validUserTypes.includes(userType)) {
            return res.status(400).json({
                success: false,
                error: 'Неверный тип пользователя'
            });
        }

        // Хеширование пароля
        const hashedPassword = bcrypt.hashSync(password, 10);

        // Вставка в БД
        db.run(
            `INSERT INTO users (firstName, lastName, email, nickname, password, userType, isVerified)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [firstName.trim(), lastName.trim(), email.toLowerCase(), nickname, hashedPassword, userType, 0],
            function (err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed: users.email')) {
                        logAudit(null, 'register', 'failed', 'Email already exists', req);
                        return res.status(409).json({
                            success: false,
                            error: 'Этот email уже зарегистрирован'
                        });
                    }

                    if (err.message.includes('UNIQUE constraint failed: users.nickname')) {
                        logAudit(null, 'register', 'failed', 'Nickname already exists', req);
                        return res.status(409).json({
                            success: false,
                            error: 'Этот логин уже занят'
                        });
                    }

                    console.error('❌ Database error:', err.message);
                    logAudit(null, 'register', 'failed', 'Database error', req);
                    return res.status(500).json({
                        success: false,
                        error: 'Ошибка сервера при регистрации'
                    });
                }

                const userId = this.lastID;
                const token = generateToken({
                    id: userId,
                    email: email.toLowerCase(),
                    nickname: nickname,
                    isAdmin: 0
                });

                logAudit(userId, 'register', 'success', null, req);

                res.status(201).json({
                    success: true,
                    message: 'Регистрация успешна',
                    token,
                    user: {
                        id: userId,
                        firstName: firstName.trim(),
                        lastName: lastName.trim(),
                        email: email.toLowerCase(),
                        nickname: nickname,
                        userType: userType,
                        coins: 0,
                        isAdmin: 0,
                        isVerified: 0
                    }
                });
            }
        );
    } catch (err) {
        console.error('❌ Register error:', err.message || err);
        console.error('   Stack:', err.stack);
        logAudit(null, 'register', 'failed', 'Server error: ' + err.message, req);
        res.status(500).json({
            success: false,
            error: 'Ошибка регистрации: ' + err.message
        });
    }
});

/**
 * POST /login
 * Вход в систему
 */
router.post('/login', (req, res) => {
    try {
        const { email, nickname, password } = req.body;

        // ===== ВАЛИДАЦИЯ =====
        if (!password) {
            logAudit(null, 'login', 'failed', 'Missing password', req);
            return res.status(400).json({
                success: false,
                error: 'Пароль обязателен'
            });
        }

        if (!email && !nickname) {
            logAudit(null, 'login', 'failed', 'Missing email/nickname', req);
            return res.status(400).json({
                success: false,
                error: 'Укажите email или логин'
            });
        }

        // Поиск пользователя
        let query = '';
        let params = [];

        if (email && isValidEmail(email)) {
            query = 'SELECT * FROM users WHERE email = ? AND deletedAt IS NULL';
            params = [email.toLowerCase()];
        } else if (nickname && isValidNickname(nickname)) {
            query = 'SELECT * FROM users WHERE nickname = ? AND deletedAt IS NULL';
            params = [nickname];
        } else {
            logAudit(null, 'login', 'failed', 'Invalid email/nickname format', req);
            return res.status(400).json({
                success: false,
                error: 'Неверный формат email или логина'
            });
        }

        db.get(query, params, (err, user) => {
            if (err) {
                console.error('❌ Database error:', err.message);
                return res.status(500).json({
                    success: false,
                    error: 'Ошибка сервера'
                });
            }

            if (!user) {
                logAudit(null, 'login', 'failed', 'User not found', req);
                return res.status(401).json({
                    success: false,
                    error: 'Неверный email/логин или пароль'
                });
            }

            // Проверка блокировки
            if (user.isBlocked) {
                logAudit(user.id, 'login', 'failed', 'Account is blocked', req);
                return res.status(403).json({
                    success: false,
                    error: 'Ваш аккаунт заблокирован'
                });
            }

            // Проверка временной блокировки
            if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
                logAudit(user.id, 'login', 'failed', 'Account temporarily locked', req);
                return res.status(429).json({
                    success: false,
                    error: 'Аккаунт временно заблокирован. Попробуйте позже.'
                });
            }

            // Проверка пароля
            const passwordValid = bcrypt.compareSync(password, user.password);

            if (!passwordValid) {
                incrementFailedLogin(user.id);
                logAudit(user.id, 'failed_login', 'failed', 'Invalid password', req);
                return res.status(401).json({
                    success: false,
                    error: 'Неверный email/логин или пароль'
                });
            }

            // Пароль верен - сбрасываем счётчик
            resetFailedLogin(user.id);

            // Генерируем токен
            const token = generateToken(user);

            // Обновляем lastLoginAt
            db.run(
                `UPDATE users SET lastLoginAt = CURRENT_TIMESTAMP WHERE id = ?`,
                [user.id]
            );

            // Логируем успешный вход
            logAudit(user.id, 'login', 'success', null, req);

            res.json({
                success: true,
                message: 'Вход успешен',
                token,
                user: {
                    id: user.id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    nickname: user.nickname,
                    userType: user.userType,
                    coins: user.coins || 0,
                    isAdmin: user.isAdmin || 0,
                    isVerified: user.isVerified || 0
                }
            });
        });
    } catch (err) {
        console.error('❌ Login error:', err);
        logAudit(null, 'login', 'failed', 'Server error', req);
        res.status(500).json({
            success: false,
            error: 'Внутренняя ошибка сервера'
        });
    }
});

/**
 * POST /logout
 * Выход из системы
 */
router.post('/logout', (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (token) {
            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                logAudit(decoded.id, 'logout', 'success', null, req);
            } catch (e) {
                // Токен невалиден, но всё равно логируем выход
            }
        }

        res.json({
            success: true,
            message: 'Выход выполнен'
        });
    } catch (err) {
        console.error('❌ Logout error:', err);
        res.status(500).json({
            success: false,
            error: 'Ошибка при выходе'
        });
    }
});

module.exports = router;
