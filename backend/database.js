/**
 * ULTRAWISE v2.0 - PRODUCTION DATABASE INITIALIZATION
 * Lead Developer: Complete redesign with security & integrity
 * 
 * ✅ Правильная структура таблиц
 * ✅ UNIQUE constraints на критические поля
 * ✅ Индексы для производительности
 * ✅ CHECK constraints для валидации
 * ✅ Аудит и логирование
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'database.db');
console.log('📂 Путь к БД:', DB_PATH);

// Создание подключения к БД
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('❌ Ошибка подключения к БД:', err.message);
    } else {
        console.log('✅ Подключено к базе данных SQLite');
        initializeTables();
    }
});

// Инициализация таблиц
function initializeTables() {
    db.serialize(() => {
        // ==================== 1. USERS TABLE ====================
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                -- Primary Key
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                
                -- Основная информация (обязательна валидация)
                firstName TEXT NOT NULL CHECK(length(firstName) > 0),
                lastName TEXT NOT NULL CHECK(length(lastName) > 0),
                email TEXT NOT NULL UNIQUE CHECK(email LIKE '%@%.%'),
                nickname TEXT NOT NULL UNIQUE CHECK(length(nickname) >= 3 AND length(nickname) <= 50),
                password TEXT NOT NULL,
                
                -- Профиль пользователя
                userType TEXT NOT NULL DEFAULT 'schoolkid' 
                    CHECK(userType IN ('schoolkid', 'university_student', 'college_student', 'employee', 'admin')),
                age INTEGER CHECK(age IS NULL OR (age >= 13 AND age <= 100)),
                grade TEXT,
                avatar TEXT,
                bio TEXT,
                
                -- Статус и прерогативы
                coins INTEGER NOT NULL DEFAULT 0 CHECK(coins >= 0),
                isAdmin INTEGER NOT NULL DEFAULT 0 CHECK(isAdmin IN (0, 1)),
                isVerified INTEGER NOT NULL DEFAULT 0 CHECK(isVerified IN (0, 1)),
                isBlocked INTEGER NOT NULL DEFAULT 0 CHECK(isBlocked IN (0, 1)),
                
                -- Безопасность: попытки входа и блокировки
                passwordChangedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                lastLoginAt DATETIME,
                failedLoginAttempts INTEGER NOT NULL DEFAULT 0 CHECK(failedLoginAttempts >= 0),
                lockedUntil DATETIME,
                
                -- Метаданные
                createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                deletedAt DATETIME
            );
        `, (err) => {
            if (err) {
                console.error('❌ Ошибка создания таблицы users:', err.message);
            } else {
                console.log('✅ Таблица users создана');
            }
        });

        // Индексы для оптимизации запросов
        setTimeout(() => {
            db.run('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
            db.run('CREATE INDEX IF NOT EXISTS idx_users_nickname ON users(nickname)');
            db.run('CREATE INDEX IF NOT EXISTS idx_users_isAdmin ON users(isAdmin)');
            db.run('CREATE INDEX IF NOT EXISTS idx_users_createdAt ON users(createdAt)');
            db.run('CREATE INDEX IF NOT EXISTS idx_users_lockedUntil ON users(lockedUntil)');
        }, 100);

        // ==================== 2. SESSIONS TABLE ====================
        db.run(`
            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId INTEGER NOT NULL UNIQUE,
                token TEXT NOT NULL UNIQUE,
                refreshToken TEXT UNIQUE,
                expiresAt DATETIME NOT NULL,
                createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                revokedAt DATETIME,
                FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
            );
        `, (err) => {
            if (err) {
                console.error('❌ Ошибка создания таблицы sessions:', err.message);
            } else {
                console.log('✅ Таблица sessions создана');
            }
        });

        setTimeout(() => {
            db.run('CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)');
            db.run('CREATE INDEX IF NOT EXISTS idx_sessions_userId ON sessions(userId)');
            db.run('CREATE INDEX IF NOT EXISTS idx_sessions_expiresAt ON sessions(expiresAt)');
        }, 100);

        // ==================== 3. AUDIT LOG TABLE ====================
        db.run(`
            CREATE TABLE IF NOT EXISTS auditLog (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId INTEGER,
                action TEXT NOT NULL CHECK(action IN ('login', 'logout', 'register', 'password_change', 'profile_update', 'failed_login', 'account_block')),
                ipAddress TEXT,
                userAgent TEXT,
                status TEXT NOT NULL CHECK(status IN ('success', 'failed')),
                reason TEXT,
                metadata TEXT,
                createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
            );
        `, (err) => {
            if (err) {
                console.error('❌ Ошибка создания таблицы auditLog:', err.message);
            } else {
                console.log('✅ Таблица auditLog создана');
            }
        });

        setTimeout(() => {
            db.run('CREATE INDEX IF NOT EXISTS idx_auditLog_userId ON auditLog(userId)');
            db.run('CREATE INDEX IF NOT EXISTS idx_auditLog_action ON auditLog(action)');
            db.run('CREATE INDEX IF NOT EXISTS idx_auditLog_createdAt ON auditLog(createdAt)');
        }, 100);

        // ==================== 4. PASSWORD RESET TABLE ====================
        db.run(`
            CREATE TABLE IF NOT EXISTS passwordResets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId INTEGER NOT NULL UNIQUE,
                token TEXT NOT NULL UNIQUE,
                expiresAt DATETIME NOT NULL,
                usedAt DATETIME,
                createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
            );
        `, (err) => {
            if (err) {
                console.error('❌ Ошибка создания таблицы passwordResets:', err.message);
            } else {
                console.log('✅ Таблица passwordResets создана');
            }
        });

        setTimeout(() => {
            db.run('CREATE INDEX IF NOT EXISTS idx_passwordResets_token ON passwordResets(token)');
            db.run('CREATE INDEX IF NOT EXISTS idx_passwordResets_expiresAt ON passwordResets(expiresAt)');
        }, 100);

        // ==================== 5. LECTURES TABLE ====================
        db.run(`
            CREATE TABLE IF NOT EXISTS lectures (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                content TEXT,
                category TEXT NOT NULL,
                level TEXT CHECK(level IN ('beginner', 'intermediate', 'advanced')),
                author TEXT,
                duration INTEGER CHECK(duration > 0),
                published INTEGER DEFAULT 0 CHECK(published IN (0, 1)),
                featured INTEGER DEFAULT 0 CHECK(featured IN (0, 1)),
                views INTEGER DEFAULT 0 CHECK(views >= 0),
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `, (err) => {
            if (err) {
                console.error('❌ Ошибка создания таблицы lectures:', err.message);
            } else {
                console.log('✅ Таблица lectures готова');
            }
        });

        // ==================== 6. COLLEGES TABLE ====================
        db.run(`
            CREATE TABLE IF NOT EXISTS colleges (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                city TEXT NOT NULL,
                address TEXT,
                website TEXT,
                phone TEXT,
                email TEXT,
                description TEXT NOT NULL,
                fullDescription TEXT,
                advantages TEXT,
                specialties TEXT NOT NULL,
                departments TEXT,
                minScore INTEGER,
                tuitionFee INTEGER,
                admissionRequirements TEXT,
                studyDuration INTEGER,
                studyForm TEXT,
                logo TEXT,
                images TEXT,
                videoUrl TEXT,
                brochure TEXT,
                rating REAL CHECK(rating >= 0 AND rating <= 5),
                studentsCount INTEGER,
                foundedYear INTEGER,
                accreditation TEXT,
                vk TEXT,
                telegram TEXT,
                instagram TEXT,
                categories TEXT,
                tags TEXT,
                published INTEGER DEFAULT 1,
                featured INTEGER DEFAULT 0,
                hasDormitory INTEGER DEFAULT 1,
                hasBudget INTEGER DEFAULT 1,
                views INTEGER DEFAULT 0,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `, (err) => {
            if (err) {
                console.error('❌ Ошибка создания таблицы colleges:', err.message);
            } else {
                console.log('✅ Таблица colleges готова');
            }
        });

        // ==================== 7. CREATE DEFAULT ADMIN ====================
        setTimeout(() => {
            createDefaultAdmin();
        }, 1000);
    });
}

/**
 * Создание администратора по умолчанию
 */
function createDefaultAdmin() {
    const adminEmail = 'admin@ultrawise.local';
    const adminPassword = 'Admin@2026!Secure';
    const hashedPassword = bcrypt.hashSync(adminPassword, 10);

    db.get('SELECT id FROM users WHERE email = ?', [adminEmail], (err, row) => {
        if (row) {
            console.log('ℹ️ Администратор уже существует');
            return;
        }

        db.run(
            `INSERT INTO users (firstName, lastName, email, nickname, password, userType, isAdmin, isVerified) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            ['Admin', 'UltraWise', adminEmail, 'admin', hashedPassword, 'admin', 1, 1],
            (err) => {
                if (err) {
                    console.error('❌ Ошибка создания админа:', err.message);
                } else {
                    console.log('✅ Администратор создан');
                    console.log('   📧 Email:', adminEmail);
                    console.log('   🔑 Пароль:', adminPassword);
                    console.log('   ⚠️  ИЗМЕНИ ПАРОЛЬ ПОСЛЕ ПЕРВОГО ВХОДА!');
                }
            }
        );

        // Инициализация тестовых данных по колледжам
        setTimeout(() => initializeColleges(), 500);
    });
}

/**
 * Инициализация тестовых данных по колледжам
 */
function initializeColleges() {
    // Проверяем, есть ли уже данные
    db.get('SELECT COUNT(*) as count FROM colleges', (err, result) => {
        if (err || result.count > 0) return;

        const colleges = [
            {
                name: 'Карагандинский высший политехнический колледж',
                type: 'Технический колледж',
                city: 'Карагандa',
                address: 'Ул. Букетова, д. 38',
                website: 'https://kgpt.kz',
                phone: '+7 701 111-2233',
                email: 'info@kgpt.kz',
                description: 'Крупный и старейший технический колледж в Караганде',
                fullDescription: 'Крупный и старейший технический колледж в Караганде с большим количеством направлений. Обучают по инженерно-техническим специальностям.',
                advantages: 'Инженерно-техническое образование, Многоуровневая подготовка',
                specialties: 'Обслуживание транспорта, Строительство, Электротехника',
                departments: 'Отделение строительства, Отделение механики',
                minScore: 70,
                tuitionFee: 50000,
                admissionRequirements: 'Собеседование',
                studyDuration: 2,
                studyForm: 'Очная',
                logo: '/assets/images/colleges/kgpt-logo.svg',
                images: '["/assets/images/colleges/kgpt-1.jpg","/assets/images/colleges/kgpt-2.jpg"]',
                rating: 4.8,
                studentsCount: 2500,
                foundedYear: 1960,
                accreditation: 'Аккредитирован',
                vk: 'https://vk.com/kgpt',
                instagram: 'https://instagram.com/kgpt',
                categories: 'Технический колледж',
                tags: 'техника, транспорт',
                published: 1,
                featured: 1,
                hasDormitory: 1,
                hasBudget: 1,
                views: 120
            },
            {
                name: 'Карагандинский технико-строительный колледж',
                type: 'Технический колледж',
                city: 'Карагандa',
                address: 'Ул. Ленина, д. 52',
                website: 'https://ktsk.kz',
                phone: '+7 701 222-3344',
                email: 'admin@ktsk.kz',
                description: 'Технический колледж с дуальным образованием',
                fullDescription: 'Технический колледж, ориентированный на подготовку специалистов. Известен дуальным образованием.',
                advantages: 'Дуальное образование, Практика на предприятиях',
                specialties: 'Строительство, Дизайн, IT',
                departments: 'Строительное отделение, IT отделение',
                minScore: 68,
                tuitionFee: 45000,
                admissionRequirements: 'Вступительный тест',
                studyDuration: 2,
                studyForm: 'Очная',
                logo: '/assets/images/colleges/ktsk-logo.svg',
                images: '["/assets/images/colleges/ktsk-1.jpg","/assets/images/colleges/ktsk-2.jpg"]',
                rating: 4.7,
                studentsCount: 1800,
                foundedYear: 1975,
                accreditation: 'Аккредитирован',
                vk: 'https://vk.com/ktsk',
                instagram: 'https://instagram.com/ktsk',
                categories: 'Технический колледж',
                tags: 'строительство, IT',
                published: 1,
                featured: 1,
                hasDormitory: 1,
                hasBudget: 1,
                views: 100
            },
            {
                name: 'Карагандинский медицинский колледж',
                type: 'Медицинский колледж',
                city: 'Карагандa',
                address: 'Ул. Гоголя, д. 15',
                website: 'https://kmedical.kz',
                phone: '+7 701 333-4455',
                email: 'admissions@kmedical.kz',
                description: 'Подготовка специалистов здравоохранения',
                fullDescription: 'Образовательное учреждение, готовящее специалистов для сферы здравоохранения.',
                advantages: 'Практика в больницах, Современные методики',
                specialties: 'Сестринское дело, Акушерство, Фармацевтика',
                departments: 'Медицинское отделение, Фармацевтическое отделение',
                minScore: 72,
                tuitionFee: 40000,
                admissionRequirements: 'Медицинский осмотр',
                studyDuration: 2,
                studyForm: 'Очная',
                logo: '/assets/images/colleges/kmedical-logo.svg',
                images: '["/assets/images/colleges/kmedical-1.jpg","/assets/images/colleges/kmedical-2.jpg"]',
                rating: 4.6,
                studentsCount: 900,
                foundedYear: 1985,
                accreditation: 'Аккредитирован',
                vk: 'https://vk.com/kmedical',
                instagram: 'https://instagram.com/kmedical',
                categories: 'Медицинский колледж',
                tags: 'медицина, здравоохранение',
                published: 1,
                featured: 0,
                hasDormitory: 1,
                hasBudget: 1,
                views: 85
            },
            {
                name: 'Карагандинский гуманитарный колледж',
                type: 'Гуманитарный колледж',
                city: 'Карагандa',
                address: 'Ул. Абая, д. 25',
                website: 'https://khumanitarian.kz',
                phone: '+7 701 444-5566',
                email: 'info@khumanitarian.kz',
                description: 'Гуманитарный колледж с большим опытом',
                fullDescription: 'Колледж с гуманитарным уклоном, готовит специалистов в области педагогики и искусства.',
                advantages: 'Творческое развитие, Социальная ответственность',
                specialties: 'Педагогика, Искусство, История',
                departments: 'Педагогическое отделение, Отделение искусств',
                minScore: 65,
                tuitionFee: 35000,
                admissionRequirements: 'Творческое испытание',
                studyDuration: 2,
                studyForm: 'Очная',
                logo: '/assets/images/colleges/khumanitarian-logo.svg',
                images: '["/assets/images/colleges/khumanitarian-1.jpg","/assets/images/colleges/khumanitarian-2.jpg"]',
                rating: 4.5,
                studentsCount: 1200,
                foundedYear: 1980,
                accreditation: 'Аккредитирован',
                vk: 'https://vk.com/khumanitarian',
                instagram: 'https://instagram.com/khumanitarian',
                categories: 'Гуманитарный колледж',
                tags: 'педагогика, искусство',
                published: 1,
                featured: 0,
                hasDormitory: 1,
                hasBudget: 1,
                views: 90
            },
            {
                name: 'Карагандинский горно-индустриальный колледж',
                type: 'Промышленный колледж',
                city: 'Карагандa',
                address: 'Ул. Щербакова, д. 41',
                website: 'https://kmineral.kz',
                phone: '+7 701 555-6677',
                email: 'admissions@kmineral.kz',
                description: 'Учебное заведение с долгой историей',
                fullDescription: 'Учебное заведение с долгой историей (основан в 1941 г.), готовящее специалистов для горной промышленности.',
                advantages: 'Промышленное наследие, Связи с горнодобывающей отраслью',
                specialties: 'Горное дело, Строительство, Механика',
                departments: 'Горное отделение, Строительное отделение',
                minScore: 75,
                tuitionFee: 55000,
                admissionRequirements: 'Физический осмотр',
                studyDuration: 2,
                studyForm: 'Очная',
                logo: '/assets/images/colleges/kmineral-logo.svg',
                images: '["/assets/images/colleges/kmineral-1.jpg","/assets/images/colleges/kmineral-2.jpg"]',
                rating: 4.7,
                studentsCount: 1600,
                foundedYear: 1941,
                accreditation: 'Аккредитирован',
                vk: 'https://vk.com/kmineral',
                instagram: 'https://instagram.com/kmineral',
                categories: 'Промышленный колледж',
                tags: 'горная отрасль, промышленность',
                published: 1,
                featured: 1,
                hasDormitory: 1,
                hasBudget: 1,
                views: 110
            }
        ];

        colleges.forEach(c => {
            db.run(`
                INSERT INTO colleges (
                    name, type, city, address, website, phone, email, description,
                    fullDescription, advantages, specialties, departments, minScore,
                    tuitionFee, admissionRequirements, studyDuration, studyForm, logo, images,
                    rating, studentsCount, foundedYear, accreditation,
                    vk, instagram, categories, tags, published, featured, 
                    hasDormitory, hasBudget, views
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [c.name, c.type, c.city, c.address, c.website, c.phone, c.email, c.description, c.fullDescription, c.advantages, c.specialties, c.departments, c.minScore, c.tuitionFee, c.admissionRequirements, c.studyDuration, c.studyForm, c.logo, c.images, c.rating, c.studentsCount, c.foundedYear, c.accreditation, c.vk, c.instagram, c.categories, c.tags, c.published, c.featured, c.hasDormitory, c.hasBudget, c.views]);
        });

        console.log('✅ Карагандинские колледжи добавлены (5 колледжей)');
    });
}

// ==================== ЭКСПОРТ ====================
module.exports = {
    db,
    close: () => {
        return new Promise((resolve) => {
            db.close(() => {
                console.log('Database closed');
                resolve();
            });
        });
    }
};