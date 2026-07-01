#!/bin/bash

# 🧪 ТЕСТОВЫЙ СКРИПТ ДЛЯ ПРОВЕРКИ ВСЕХ ФУНКЦИЙ

API_URL="http://localhost:3000/api"

echo "========================================="
echo "🧪 ТЕСТИРОВАНИЕ ULTRAWISE V2"
echo "========================================="
echo ""

# 1. Проверка сервера
echo "1️⃣  Проверка сервера..."
curl -s http://localhost:3000/api | jq .
echo ""

# 2. Регистрация тестового пользователя
echo "2️⃣  Регистрация тестового пользователя..."
REG_RESPONSE=$(curl -s -X POST $API_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "nickname": "testuser",
    "email": "test@ultrawise.com",
    "password": "test123",
    "userType": "schoolkid"
  }')

echo "$REG_RESPONSE" | jq .

# Извлекаем токен
TOKEN=$(echo "$REG_RESPONSE" | jq -r '.token // empty')
echo "✅ Токен получен: ${TOKEN:0:20}..."
echo ""

# 3. Получение профиля
echo "3️⃣  Получение профиля пользователя..."
curl -s -H "Authorization: Bearer $TOKEN" $API_URL/user/profile | jq .
echo ""

# 4. Вход в систему
echo "4️⃣  Вход в систему..."
LOGIN_RESPONSE=$(curl -s -X POST $API_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "testuser",
    "password": "test123"
  }')

echo "$LOGIN_RESPONSE" | jq .
LOGIN_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token // empty')
echo ""

# 5. Создание администратора
echo "5️⃣  Создание администратора..."
ADMIN_REG=$(curl -s -X POST $API_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Admin",
    "lastName": "Prod",
    "nickname": "admin_prod",
    "email": "admin@prod.com",
    "password": "admin123",
    "userType": "employee"
  }')

echo "$ADMIN_REG" | jq .
echo ""

# 6. Обновляем администратора прямо в БД
echo "6️⃣  Установка прав администратора..."
sqlite3 "/Users/nikitasokovyh/Desktop/UltraWise v2/backend/database.db" \
  "UPDATE users SET isAdmin=1 WHERE nickname='admin_prod';"
echo "✅ Администратор создан"
echo ""

# 7. Логируемся как админ
echo "7️⃣  Вход как администратор..."
ADMIN_LOGIN=$(curl -s -X POST $API_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "admin_prod",
    "password": "admin123"
  }')

echo "$ADMIN_LOGIN" | jq .
ADMIN_TOKEN=$(echo "$ADMIN_LOGIN" | jq -r '.token // empty')
echo ""

# 8. Добавляем лекцию как администратор
echo "8️⃣  Добавление лекции (как администратор)..."
LECTURE=$(curl -s -X POST $API_URL/admin/lectures \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "title": "Введение в JavaScript",
    "description": "Основы JavaScript для начинающих",
    "content": "JavaScript это язык программирования...",
    "category": "Programming",
    "level": "Beginner",
    "author": "Admin Prod"
  }')

echo "$LECTURE" | jq .
echo ""

# 9. Получаем список лекций
echo "9️⃣  Получение списка лекций..."
curl -s $API_URL/lectures | jq .
echo ""

# 10. Статистика
echo "🔟 Статистика (админ)..."
curl -s -H "Authorization: Bearer $ADMIN_TOKEN" $API_URL/admin/stats | jq .
echo ""

echo "========================================="
echo "✅ ТЕСТИРОВАНИЕ ЗАВЕРШЕНО!"
echo "========================================="

# Вывод информации для входа
echo ""
echo "📱 Информация для входа:"
echo ""
echo "Обычный пользователь:"
echo "  Email/Логин: testuser"
echo "  Пароль: test123"
echo ""
echo "Администратор:"
echo "  Email/Логин: admin_prod"
echo "  Пароль: admin123"
echo ""
