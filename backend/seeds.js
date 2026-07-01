/**
 * ULTRAWISE V2.0 - SEEDS.JS
 * Скрипт для добавления тестовых данных
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('❌ Ошибка подключения к БД:', err.message);
        process.exit(1);
    }
});

const seedData = () => {
    db.serialize(async () => {
        try {
            console.log('🌱 Начинаем добавление тестовых данных...\n');

            // Добавляем колледжи
            const colleges = [
                {
                    name: 'МГУ имени М.В. Ломоносова',
                    type: 'Университет',
                    city: 'Москва',
                    address: 'Ленинские горы, д. 1, строение 1',
                    website: 'https://www.msu.ru',
                    phone: '+7 495 939-1234',
                    email: 'info@msu.ru',
                    description: 'Ведущий научно-образовательный центр России',
                    fullDescription: 'Московский государственный университет имени М.В. Ломоносова - один из самых престижных университетов России и мира. Основан в 1755 году. Известен научными достижениями и высоким качеством образования.',
                    advantages: 'Престижное образование, Сильный профессорско-преподавательский состав, Мировое признание, Исследовательские возможности',
                    specialties: 'Математика, Физика, Химия, Биология, Экономика, Философия, Право, Журналистика',
                    departments: 'Факультет математики, Факультет физики, Факультет химии, Факультет биологии',
                    minScore: 90,
                    tuitionFee: 250000,
                    admissionRequirements: 'Успешное прохождение вступительного экзамена',
                    studyDuration: 4,
                    studyForm: 'Очная, Заочная',
                    logo: '/assets/images/colleges/msu-logo.svg',
                    images: JSON.stringify(['/assets/images/colleges/msu-1.jpg', '/assets/images/colleges/msu-2.jpg']),
                    videoUrl: null,
                    brochure: null,
                    rating: 4.9,
                    studentsCount: 47000,
                    foundedYear: 1755,
                    accreditation: 'Аккредитирован на 6 лет',
                    vk: 'https://vk.com/msuofficial',
                    telegram: '',
                    instagram: 'https://instagram.com/msuofficial',
                    categories: 'Классический университет, Научно-образовательный центр',
                    tags: 'престиж, история, наука, STEM, гуманитарные науки',
                    published: 1,
                    featured: 1,
                    hasDormitory: 1,
                    hasBudget: 1,
                    views: 150
                },
                {
                    name: 'СПбГУ',
                    type: 'Университет',
                    city: 'Санкт-Петербург',
                    address: 'Университетская набережная, д. 7/9',
                    website: 'https://spbu.ru',
                    phone: '+7 812 328-2242',
                    email: 'info@spbu.ru',
                    description: 'Один из старейших и престижнейших университетов России',
                    fullDescription: 'Санкт-Петербургский государственный университет - второй по значимости университет России, основан в 1724 году. Славится своей филологической и исторической школами.',
                    advantages: 'Историческое наследие, Сильные гуманитарные факультеты, Международное сотрудничество, Культурный центр',
                    specialties: 'Филология, История, Философия, Право, Математика, Физика, Экономика',
                    departments: 'Филологический факультет, Исторический факультет, Факультет права, Факультет математики',
                    minScore: 88,
                    tuitionFee: 230000,
                    admissionRequirements: 'Вступительные экзамены',
                    studyDuration: 4,
                    studyForm: 'Очная',
                    logo: '/assets/images/colleges/spbu-logo.svg',
                    images: JSON.stringify(['/assets/images/colleges/spbu-1.jpg', '/assets/images/colleges/spbu-2.jpg']),
                    videoUrl: null,
                    brochure: null,
                    rating: 4.8,
                    studentsCount: 35000,
                    foundedYear: 1724,
                    accreditation: 'Аккредитирован на 6 лет',
                    vk: 'https://vk.com/spbuofficial',
                    telegram: '',
                    instagram: 'https://instagram.com/spbuofficial',
                    categories: 'Классический университет',
                    tags: 'филология, история, гуманитарные науки, культура',
                    published: 1,
                    featured: 1,
                    hasDormitory: 1,
                    hasBudget: 1,
                    views: 120
                },
                {
                    name: 'МФТИ',
                    type: 'Технический университет',
                    city: 'Москва',
                    address: 'Институтский пер., 9, Долгопрудный',
                    website: 'https://mipt.ru',
                    phone: '+7 495 408-4833',
                    email: 'admissions@mipt.ru',
                    description: 'Ведущий технический университет с направлением на STEM',
                    fullDescription: 'Московский физико-технический институт (государственный университет) - один из лучших технических вузов мира, специализирующийся на подготовке специалистов в области физики, математики и информатики.',
                    advantages: 'Лучшее STEM образование, Сильные научные школы, Связи с ведущими компаниями IT, Инновационные программы',
                    specialties: 'Физика, Математика, Информатика, Электроника, Микроэлектроника',
                    departments: 'ФОПФ, ФАЛТ, ФОП, ФИ',
                    minScore: 95,
                    tuitionFee: 300000,
                    admissionRequirements: 'Высокие баллы на ЕГЭ',
                    studyDuration: 4,
                    studyForm: 'Очная',
                    logo: '/assets/images/colleges/mipt-logo.svg',
                    images: JSON.stringify(['/assets/images/colleges/mipt-1.jpg', '/assets/images/colleges/mipt-2.jpg']),
                    videoUrl: null,
                    brochure: null,
                    rating: 4.95,
                    studentsCount: 7000,
                    foundedYear: 1951,
                    accreditation: 'Аккредитирован на 6 лет',
                    vk: 'https://vk.com/miptru',
                    telegram: '',
                    instagram: 'https://instagram.com/miptru',
                    categories: 'Технический университет, STEM',
                    tags: 'физика, математика, IT, инновации, наука',
                    published: 1,
                    featured: 1,
                    hasDormitory: 1,
                    hasBudget: 1,
                    views: 180
                },
                {
                    name: 'НИУ ВШЭ',
                    type: 'Экономический университет',
                    city: 'Москва',
                    address: 'Ул. Мясницкая, д. 20',
                    website: 'https://www.hse.ru',
                    phone: '+7 495 772-9590',
                    email: 'admissions@hse.ru',
                    description: 'Ведущий национальный исследовательский университет',
                    fullDescription: 'Национальный исследовательский университет "Высшая школа экономики" - один из лучших экономических университетов России и мира, известный инновационными подходами к образованию и исследованиям.',
                    advantages: 'Мировое признание, Инновационные программы, Сильная экономическая школа, Международные партнерства',
                    specialties: 'Экономика, Менеджмент, Бизнес, Право, Социология, Политология',
                    departments: 'Факультет экономики, Факультет менеджмента, Факультет права, Факультет социальных наук',
                    minScore: 92,
                    tuitionFee: 280000,
                    admissionRequirements: 'Вступительные испытания',
                    studyDuration: 4,
                    studyForm: 'Очная, Очно-заочная',
                    logo: '/assets/images/colleges/hse-logo.svg',
                    images: JSON.stringify(['/assets/images/colleges/hse-1.jpg', '/assets/images/colleges/hse-2.jpg']),
                    videoUrl: null,
                    brochure: null,
                    rating: 4.7,
                    studentsCount: 40000,
                    foundedYear: 1992,
                    accreditation: 'Аккредитирован на 6 лет',
                    vk: 'https://vk.com/hseofficial',
                    telegram: '',
                    instagram: 'https://instagram.com/hseofficial',
                    categories: 'Экономический университет, Исследовательский центр',
                    tags: 'экономика, бизнес, менеджмент, исследования',
                    published: 1,
                    featured: 0,
                    hasDormitory: 1,
                    hasBudget: 1,
                    views: 140
                },
                {
                    name: 'СПБГУ ИТМО',
                    type: 'Технический университет',
                    city: 'Санкт-Петербург',
                    address: 'Кронверкский пр., 49, блок А',
                    website: 'https://itmo.ru',
                    phone: '+7 812 324-1010',
                    email: 'admissions@itmo.ru',
                    description: 'Ведущий технический университет в области IT и информационных технологий',
                    fullDescription: 'Университет ИТМО - один из ведущих мировых исследовательских центров в области информационных технологий, оптики и фотоники. Известен инновационными программами и сотрудничеством с международными компаниями.',
                    advantages: 'Мировой уровень IT образования, Инновационные программы, Контакты с ведущими компаниями, Исследовательские центры',
                    specialties: 'Информатика, Программирование, Кибербезопасность, Робототехника, Оптика, Фотоника',
                    departments: 'Факультет информационных технологий, Факультет кибербезопасности, Факультет фотоники',
                    minScore: 94,
                    tuitionFee: 290000,
                    admissionRequirements: 'Вступительные испытания',
                    studyDuration: 4,
                    studyForm: 'Очная',
                    logo: '/assets/images/colleges/itmo-logo.svg',
                    images: JSON.stringify(['/assets/images/colleges/itmo-1.jpg', '/assets/images/colleges/itmo-2.jpg']),
                    videoUrl: null,
                    brochure: null,
                    rating: 4.9,
                    studentsCount: 12000,
                    foundedYear: 1900,
                    accreditation: 'Аккредитирован на 6 лет',
                    vk: 'https://vk.com/itmo_university',
                    telegram: '',
                    instagram: 'https://instagram.com/itmo_official',
                    categories: 'Технический университет, IT центр',
                    tags: 'IT, программирование, кибербезопасность, инновации',
                    published: 1,
                    featured: 1,
                    hasDormitory: 1,
                    hasBudget: 1,
                    views: 160
                }
            ];

            for (const college of colleges) {
                await new Promise((resolve, reject) => {
                    db.run(`
                        INSERT INTO colleges (
                            name, type, city, address, website, phone, email, description,
                            fullDescription, advantages, specialties, departments, minScore,
                            tuitionFee, admissionRequirements, studyDuration, studyForm, logo, images,
                            videoUrl, brochure, rating, studentsCount, foundedYear, accreditation,
                            vk, telegram, instagram, categories, tags, published, featured, 
                            hasDormitory, hasBudget, views
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        college.name, college.type, college.city, college.address, college.website,
                        college.phone, college.email, college.description, college.fullDescription,
                        college.advantages, college.specialties, college.departments, college.minScore,
                        college.tuitionFee, college.admissionRequirements, college.studyDuration,
                        college.studyForm, college.logo, college.images, college.videoUrl, college.brochure,
                        college.rating, college.studentsCount, college.foundedYear, college.accreditation,
                        college.vk, college.telegram, college.instagram, college.categories, college.tags,
                        college.published, college.featured, college.hasDormitory, college.hasBudget, college.views
                    ], (err) => {
                        if (err) {
                            console.error(`❌ Ошибка при добавлении колледжа ${college.name}:`, err.message);
                            reject(err);
                        } else {
                            console.log(`✅ Добавлен колледж: ${college.name}`);
                            resolve();
                        }
                    });
                });
            }

            console.log('\n📚 Добавляем лекции...\n');

            // Добавляем лекции
            const lectures = [
                { title: 'Введение в линейную алгебру', description: 'Основы линейной алгебры: матрицы, векторы, системы уравнений', content: 'На этой лекции мы изучим основные концепции линейной алгебры...', category: 'Математика', level: 'Начинающий', author: 'Профессор Иванов', duration: 45, thumbnail: '/assets/images/lectures/math-linear.jpg', videoUrl: 'https://youtube.com/watch?v=dQw4w9WgXcQ', tags: 'математика, алгебра, матрицы', keywords: 'линейная алгебра, векторы, матрицы', published: 1, featured: 1, allowComments: 1, views: 250 },
                { title: 'Основы квантовой механики', description: 'Введение в квантовую механику и основные принципы', content: 'Квантовая механика - одна из главных теорий современной физики...', category: 'Физика', level: 'Продвинутый', author: 'Доцент Петров', duration: 60, thumbnail: '/assets/images/lectures/physics-quantum.jpg', videoUrl: 'https://youtube.com/watch?v=dQw4w9WgXcQ', tags: 'физика, квантовая механика, наука', keywords: 'квантовая механика, волновая функция, принцип неопределённости', published: 1, featured: 1, allowComments: 1, views: 320 },
                { title: 'Python для начинающих', description: 'Полный курс Python: основы, синтаксис, библиотеки', content: 'Python - один из самых популярных языков программирования...', category: 'Программирование', level: 'Начинающий', author: 'Инженер Сидоров', duration: 90, thumbnail: '/assets/images/lectures/programming-python.jpg', videoUrl: 'https://youtube.com/watch?v=dQw4w9WgXcQ', tags: 'программирование, Python, IT', keywords: 'Python, программирование, синтаксис, библиотеки', published: 1, featured: 1, allowComments: 1, views: 500 },
                { title: 'История России: XIX век', description: 'Основные события и личности XIX века в России', content: 'XIX век - период больших перемен в истории России...', category: 'История', level: 'Средний', author: 'Профессор Смирнов', duration: 55, thumbnail: '/assets/images/lectures/history-russia.jpg', videoUrl: 'https://youtube.com/watch?v=dQw4w9WgXcQ', tags: 'история, Россия, XIX век', keywords: 'история, XIX век, Россия, революция', published: 1, featured: 0, allowComments: 1, views: 180 },
                { title: 'Основы органической химии', description: 'Химия углеводородов и основные химические реакции', content: 'Органическая химия изучает соединения углерода...', category: 'Химия', level: 'Средний', author: 'Профессор Кузнецов', duration: 50, thumbnail: '/assets/images/lectures/chemistry-organic.jpg', videoUrl: 'https://youtube.com/watch?v=dQw4w9WgXcQ', tags: 'химия, органические соединения, реакции', keywords: 'органическая химия, углеводороды, синтез', published: 1, featured: 1, allowComments: 1, views: 210 },
                { title: 'Биология клетки', description: 'Строение клетки, органоиды и их функции', content: 'Клетка - основная единица жизни. На этой лекции...', category: 'Биология', level: 'Начинающий', author: 'Профессор Волков', duration: 40, thumbnail: '/assets/images/lectures/biology-cell.jpg', videoUrl: 'https://youtube.com/watch?v=dQw4w9WgXcQ', tags: 'биология, клетка, микроскопия', keywords: 'клетка, органоиды, митохондрия, ядро', published: 1, featured: 0, allowComments: 1, views: 290 },
                { title: 'Микроэкономика: теория спроса и предложения', description: 'Анализ рынков, спрос, предложение, равновесие', content: 'Микроэкономика изучает поведение отдельных субъектов...', category: 'Экономика', level: 'Средний', author: 'Доцент Морозов', duration: 55, thumbnail: '/assets/images/lectures/economics-micro.jpg', videoUrl: 'https://youtube.com/watch?v=dQw4w9WgXcQ', tags: 'экономика, микроэкономика, рынок', keywords: 'спрос, предложение, рыночное равновесие, цена', published: 1, featured: 1, allowComments: 1, views: 200 },
                { title: 'JavaScript: асинхронное программирование', description: 'Promises, async/await, работа с API', content: 'Асинхронное программирование - ключевой концепт...', category: 'Программирование', level: 'Продвинутый', author: 'Инженер Лебедев', duration: 70, thumbnail: '/assets/images/lectures/programming-js.jpg', videoUrl: 'https://youtube.com/watch?v=dQw4w9WgXcQ', tags: 'программирование, JavaScript, веб-разработка', keywords: 'JavaScript, async/await, Promise, асинхронность', published: 1, featured: 1, allowComments: 1, views: 400 },
                { title: 'Английский язык: деловой английский', description: 'Язык бизнеса, деловая переписка, презентации', content: 'Деловой английский необходим в современном мире...', category: 'Языки', level: 'Средний', author: 'Преподаватель Орлова', duration: 45, thumbnail: '/assets/images/lectures/languages-english.jpg', videoUrl: 'https://youtube.com/watch?v=dQw4w9WgXcQ', tags: 'английский, языки, бизнес', keywords: 'английский язык, деловой английский, коммуникация', published: 1, featured: 0, allowComments: 1, views: 150 },
                { title: 'Философия: введение в этику', description: 'Основные этические теории и моральные вопросы', content: 'Этика - раздел философии, изучающий мораль...', category: 'Философия', level: 'Средний', author: 'Профессор Виноградов', duration: 50, thumbnail: '/assets/images/lectures/philosophy-ethics.jpg', videoUrl: 'https://youtube.com/watch?v=dQw4w9WgXcQ', tags: 'философия, этика, мораль', keywords: 'этика, мораль, добро, зло, утилитаризм', published: 1, featured: 1, allowComments: 1, views: 120 }
            ];

            for (const lecture of lectures) {
                await new Promise((resolve, reject) => {
                    db.run(`
                        INSERT INTO lectures (
                            title, description, content, category, level, author,
                            duration, thumbnail, videoUrl, tags, keywords,
                            published, featured, allowComments, views
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        lecture.title, lecture.description, lecture.content, lecture.category,
                        lecture.level, lecture.author, lecture.duration, lecture.thumbnail,
                        lecture.videoUrl, lecture.tags, lecture.keywords, lecture.published,
                        lecture.featured, lecture.allowComments, lecture.views
                    ], (err) => {
                        if (err) {
                            console.error(`❌ Ошибка при добавлении лекции ${lecture.title}:`, err.message);
                            reject(err);
                        } else {
                            console.log(`✅ Добавлена лекция: ${lecture.title}`);
                            resolve();
                        }
                    });
                });
            }

            console.log('\n🎉 Все тестовые данные успешно добавлены!');
            console.log('📚 Добавлено 5 колледжей и 10 лекций');
            console.log('\n✨ Демонстрационная база данных готова к использованию!');
            
            db.close();
            process.exit(0);
        } catch (error) {
            console.error('❌ Ошибка при добавлении данных:', error);
            db.close();
            process.exit(1);
        }
    });
};

// Запуск после инициализации таблиц
setTimeout(seedData, 1000);

