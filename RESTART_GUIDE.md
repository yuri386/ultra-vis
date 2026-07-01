# 🚀 UltraWise v2.0 - Быстрый старт

## Что было изменено? (для менеджеров)

**Проблема:** Регистрация не работала, данные не сохранялись, синхронизация отсутствовала

**Решение:** Полная переделка система авторизации на Lead Developer уровне

**Результат:** ✅ Всё работает идеально

---

## Технические изменения (для разработчиков)

### 🆕 Новые файлы:
- `frontend/js/auth-manager.js` (450 строк) - новая система авторизации
- `frontend/test-auth.html` - страница для тестирования

### 🗑️ Удалённые файлы:
- `frontend/js/balance-sync.js` - функциональность встроена в auth-manager
- `frontend/login.html` - авторизация теперь в модали

### ✏️ Обновлённые файлы:
- `frontend/css/main.css` - добавлены стили для модали и шапки (+280 строк)
- `frontend/*.html` - удалены ссылки на balance-sync.js (9 файлов)

---

## Как запустить

### Убедитесь что запущен backend:
```bash
npm start
```

### Откройте в браузере:
```
http://localhost:3000/
```

### Или тестовую страницу:
```
http://localhost:3000/test-auth.html
```

---

## Что может делать новая система

### 1️⃣ Авторизация (в модали на каждой странице)
- Введите email/логин и пароль
- Данные сохранятся в БД
- Токен сохранится в localStorage
- Вы будете авторизованы на всех страницах

### 2️⃣ Автоматическая синхронизация
- Откройте 2 вкладки одновременно
- Авторизуйтесь на одной
- На второй вкладке сессия обновится сама

### 3️⃣ Баланс обновляется каждые 5 секунд
- Баланс будет одинаков везде

### 4️⃣ Правильные ошибки
- Если пароль короче 6 символов - увидите ошибку
- Если email некорректный - увидите ошибку
- Если логин занят - увидите ошибку

---

## API для разработчиков

### Получить текущего пользователя:
```javascript
console.log(window.auth.user);
// {id: 3, firstName: "Test", lastName: "User", nickname: "testuser123", ...}
```

### Требовать авторизацию:
```javascript
window.auth.requireAuth(); // Откроет модаль если не авторизован
```

### Требовать администратора:
```javascript
window.auth.requireAdmin(); // Выбросит ошибку если не админ
```

### Слушать события:
```javascript
window.addEventListener('auth:changed', () => {
    console.log('Пользователь изменился!');
    // Обновить UI
});
```

### API запрос с авторизацией:
```javascript
window.auth.apiRequest('/user/profile')
    .then(data => console.log(data.user))
    .catch(err => console.error(err));
```

---

## Структура auth-manager.js

```
AuthManager
├─ State Management
│  ├─ user
│  ├─ token
│  ├─ isAdmin
│  ├─ isLoading
│  └─ CONFIG (API_URL, STORAGE_KEYS)
├─ Lifecycle
│  ├─ init()
│  ├─ restoreSession()
│  ├─ clearSession()
│  ├─ saveSession()
│  └─ handleStorageChange()
├─ UI
│  ├─ createGlobalHeader()
│  ├─ updateHeader()
│  ├─ createAuthModal()
│  ├─ showAuthModal()
│  ├─ hideAuthModal()
│  └─ attachHeaderEvents()
├─ Auth
│  ├─ handleLogin(e)
│  ├─ handleRegister(e)
│  ├─ logout()
│  └─ updateUI()
├─ Utilities
│  ├─ getHeaders()
│  ├─ apiRequest()
│  ├─ requireAuth()
│  ├─ requireAdmin()
│  └─ updateUserBalance()
└─ Auto Init
   └─ setInterval balance update (5s)
```

---

## Тестовая страница

Откройте `http://localhost:3000/test-auth.html` для:

- 📊 Просмотра статуса авторизации
- 💾 Просмотра localStorage
- 🔐 Открытия модали авторизации
- 🗑️ Очистки всех данных
- 📝 Просмотра лога событий

---

## Часто задаваемые вопросы

**Q: Где найти модаль авторизации?**
A: На любой странице, нажмите кнопку "Вход / Регистрация" в шапке

**Q: Как добавить пользователя вручную?**
A: Через API:
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Name","lastName":"Surname","nickname":"user","email":"mail@test.com","password":"password123","userType":"schoolkid"}'
```

**Q: Как проверить если авторизован?**
A: `console.log(window.auth.user !== null)`

**Q: Как выйти?**
A: Нажмите кнопку "Выход" в шапке (только видна если авторизованы)

**Q: Где хранится токен?**
A: В `localStorage.getItem('ultrawise_auth_token')`

---

## Debug режим

Откройте консоль браузера (F12) и введите:

```javascript
// Смотреть статус
window.auth

// Смотреть пользователя
window.auth.user

// Смотреть токен
window.auth.token

// Смотреть localStorage
localStorage

// Проверить если admin
window.auth.isAdmin

// Обновить баланс вручную
window.auth.updateUserBalance()

// Выйти
window.auth.logout()

// Открыть модаль
window.auth.showAuthModal()
```

---

## Готово! ✅

Система работает как надо. Если есть вопросы - смотрите документ `AUTH_SYSTEM_REDESIGN.md` для деталей.
