#!/bin/bash

# 🎯 ПОЛНОЕ ВОССТАНОВЛЕНИЕ И ТЕСТИРОВАНИЕ ULTRAWISE V2

echo "========================================="
echo "🔄 ПОЛНАЯ ПЕРЕЗАГРУЗКА ULTRAWISE V2"
echo "========================================="

# 1. Убиваем старый процесс сервера
echo "⏹️  Останавливаем старый сервер..."
pkill -f "npm start" || true
sleep 1

# 2. Удаляем старую БД
echo "🗑️  Удаляю старую БД..."
rm -f "/Users/nikitasokovyh/Desktop/UltraWise v2/backend/database.db"

# 3. Переходим в папку проекта
cd "/Users/nikitasokovyh/Desktop/UltraWise v2"

# 4. Стартуем сервер
echo "🚀 Запускаю сервер..."
npm start &
SERVER_PID=$!

# 5. Ждем инициализации сервера
sleep 5

# 6. Проверяем, запущен ли сервер
echo "✅ Проверяю статус сервера..."
curl -s http://localhost:3000/api | jq . || echo "Сервер инициализируется..."

# 7. Создаём тестовый администратор аккаунт
echo ""
echo "👤 Создание тестового администратора..."
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Admin",
    "lastName": "User",
    "nickname": "admin",
    "email": "admin@ultrawise.com",
    "password": "admin123",
    "userType": "employee"
  }' | jq .

# 8. Обновляем администратора в БД
echo ""
echo "👑 Установка прав администратора..."
sqlite3 "/Users/nikitasokovyh/Desktop/UltraWise v2/backend/database.db" "UPDATE users SET isAdmin=1 WHERE nickname='admin';"

echo ""
echo "========================================="
echo "✅ ВСЁ ГОТОВО!"
echo "========================================="
echo ""
echo "📱 Открывайте браузер:"
echo "   http://localhost:3000"
echo ""
echo "👤 Вход как администратор:"
echo "   Email/Логин: admin"
echo "   Пароль: admin123"
echo ""
echo "📊 Админ-панель:"
echo "   http://localhost:3000/admin.html"
echo ""
echo "========================================="

wait $SERVER_PID
