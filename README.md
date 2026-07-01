# 🎓 UltraWise v2.0

Образовательная платформа с профориентацией

## 📋 Описание

UltraWise v2.0 — это современная веб-платформа, объединяющая:
- 📚 **Лекции** — база знаний по различным предметам
- 🎓 **Колледжи** — информация о учебных заведениях
- 🔍 **Профориентация** — помощь в выборе колледжа
- 👤 **Личный кабинет** — управление профилем и достижениями
- 🎨 **Темы оформления** — 11 уникальных тем

## ✨ Что нового в v2.0

### 🔐 Полностью переделана система авторизации
- ✅ Регистрация работает везде одинаково
- ✅ Данные сохраняются в БД
- ✅ Синхронизация между вкладками браузера
- ✅ Баланс обновляется в реальном времени
- ✅ Правильные ошибки показываются пользователю
- ✅ Валидация формы ДО отправки на сервер
- ✅ Модаль авторизации встроена во все страницы

**Для деталей смотрите:** 
- [AUTH_SYSTEM_REDESIGN.md](AUTH_SYSTEM_REDESIGN.md) — полная документация
- [RESTART_GUIDE.md](RESTART_GUIDE.md) — быстрый старт

## 🛠️ Технологии

**Backend:**
- Node.js + Express v5.2.1
- SQLite с подготовленными statements
- JWT аутентификация (30 дней)
- bcrypt для паролей (10 salt rounds)

**Frontend:**
- Vanilla HTML/CSS/JavaScript (без фреймворков)
- Новый AuthManager class (450 строк)
- Event-driven архитектура
- Single Source of Truth паттерн
- Адаптивный дизайн
- Система тем
- Анимации и эффекты

## 📦 Установка

### 1. Клонирование репозитория
```bash
git clone https://github.com/yourusername/ultrawise-v2.git
cd ultrawise-v2
```

### 2. Установка зависимостей
```bash
npm install
```

### 3. Настройка переменных окружения
```bash
cp .env.example .env
# Отредактируйте .env файл
```

### 4. Инициализация базы данных
```bash
npm run init-db
```
База данных будет создана автоматически при первом запуске.

### 5. Запуск сервера

**Режим разработки (с автоперезагрузкой):**
```bash
npm run dev
```

**Продакшн режим:**
```bash
npm start
```

Сервер запустится на `http://localhost:3000`

## 🔐 Вход в систему

**Администратор по умолчанию:**
- Email: `admin@ultrawise.com`
- Пароль: `admin123`

⚠️ **ВАЖНО:** Измените пароль после первого входа!

## 📁 Структура проекта

```
ultrawise-v2/
├── backend/
│   ├── server.js              # Главный сервер
│   ├── database.js            # Настройка БД
│   ├── database.db            # SQLite база (создаётся автоматически)
│   ├── routes/
│   │   ├── auth.js           # Авторизация
│   │   ├── lectures.js       # API лекций
│   │   ├── colleges.js       # API колледжей
│   │   └── admin.js          # Админ API
│   └── middleware/
│       ├── auth.js           # Проверка токенов
│       └── isAdmin.js        # Проверка прав админа
│
├── frontend/
│   ├── index.html            # Главная
│   ├── login.html            # Вход/регистрация
│   ├── lectures.html         # Лекции
│   ├── orientation.html      # Колледжи
│   ├── college-detail.html   # Детали колледжа
│   ├── admin/
│   │   ├── dashboard.html    # Админ-панель
│   │   ├── add-lecture.html  # Добавить лекцию
│   │   └── add-college.html  # Добавить колледж
│   ├── css/
│   │   ├── main.css          # Основные стили
│   │   ├── animations.css    # Анимации
│   │   ├── components.css    # UI компоненты
│   │   └── themes.css        # Система тем
│   ├── js/
│   │   ├── app.js           # Главный скрипт
│   │   ├── auth.js          # Авторизация (клиент)
│   │   ├── api.js           # API клиент
│   │   ├── components.js    # UI компоненты
│   │   └── animations.js    # Анимации
│   └── assets/
│       ├── images/
│       ├── icons/
│       └── videos/
│
├── package.json
├── .env.example
└── README.md
```

## 🎨 Темы оформления

UltraWise включает 11 тем:

**Фиксированные:**
- Светлая
- Тёмная
- Супер-тёмная (OLED)

**Универсальные (с переключателем ☀️/🌙):**
- Business (премиум дизайн)
- Cyberpunk (неоновый стиль)

**Дополнительные:**
- Серая
- Цветная
- Классическая
- Apple-style
- Книжная

## 🔗 API Endpoints

### Авторизация
- `POST /api/auth/register` — Регистрация
- `POST /api/auth/login` — Вход
- `GET /api/auth/verify` — Проверка токена
- `GET /api/auth/profile` — Профиль
- `PUT /api/auth/profile` — Обновить профиль
- `PUT /api/auth/password` — Изменить пароль

### Лекции
- `GET /api/lectures` — Все лекции
- `GET /api/lectures/:id` — Лекция по ID
- `GET /api/lectures/category/:category` — По категории
- `POST /api/lectures/search` — Поиск
- `POST /api/lectures/save` — Сохранить
- `DELETE /api/lectures/save/:id` — Удалить из сохранённых

### Колледжи
- `GET /api/colleges` — Все колледжи
- `GET /api/colleges/:id` — Колледж по ID
- `POST /api/colleges/search` — Поиск
- `POST /api/colleges/filter` — Фильтрация
- `POST /api/colleges/compare` — Сравнение
- `POST /api/colleges/favorite` — В избранное
- `POST /api/colleges/:id/reviews` — Добавить отзыв

### Админ (требуется авторизация админа)
- `GET /api/admin/stats` — Статистика
- `POST /api/admin/lectures` — Создать лекцию
- `PUT /api/admin/lectures/:id` — Обновить лекцию
- `DELETE /api/admin/lectures/:id` — Удалить лекцию
- `POST /api/admin/colleges` — Создать колледж
- `PUT /api/admin/colleges/:id` — Обновить колледж
- `DELETE /api/admin/colleges/:id` — Удалить колледж

## 🗄️ База данных

**Таблицы:**
- `users` — Пользователи
- `lectures` — Лекции
- `colleges` — Колледжи
- `saved_lectures` — Сохранённые лекции
- `favorite_colleges` — Избранные колледжи
- `college_reviews` — Отзывы о колледжах
- `quotes` — Цитаты
- `quote_likes` — Лайки цитат
- `user_achievements` — Достижения

## 🚀 Деплой

### Heroku
```bash
heroku create ultrawise-v2
git push heroku main
```

### Vercel / Netlify
Загрузите проект и настройте билд команды:
```
npm install && npm start
```

## 📝 Лицензия

MIT License

## 👥 Команда

UltraWise Team

## 📧 Контакты

support@ultrawise.com

---

**Сделано с ❤️ для образования**