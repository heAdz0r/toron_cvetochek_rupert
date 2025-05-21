#!/bin/bash

# Скрипт запуска WikiJS MCP сервера
# Автоматически устанавливает зависимости и запускает HTTP-сервер

# Проверяем наличие node и npm
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не установлен. Пожалуйста, установите Node.js."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm не установлен. Пожалуйста, установите npm."
    exit 1
fi

# Проверяем наличие переменных окружения
if [ -z "$WIKIJS_TOKEN" ]; then
    # Проверяем файл .env
    if [ -f .env ]; then
        echo "Загружаем переменные окружения из файла .env"
        export $(grep -v '^#' .env | xargs)
    else
        echo "⚠️ Переменная WIKIJS_TOKEN не установлена. Используем настройки по умолчанию."
    fi
fi

# Устанавливаем зависимости, если они еще не установлены
echo "Устанавливаем зависимости..."
npm install express cors node-fetch

# Останавливаем существующий процесс, если он запущен
if [ -f "server.pid" ]; then
    echo "Останавливаем существующий процесс..."
    kill $(cat server.pid) 2>/dev/null || echo "Процесс не найден"
    rm server.pid
fi

# Запускаем HTTP сервер
echo "Запускаем WikiJS MCP HTTP сервер..."
PORT=3200 node mcp_http_server.js > server.log 2>&1 &
echo $! > server.pid

echo "✅ WikiJS MCP сервер запущен на порту 3200"
echo "Логи сохраняются в файл server.log"
echo "PID процесса: $(cat server.pid)"

# Выводим доступные команды
echo ""
echo "Доступные команды:"
echo "  cat server.log           - просмотр логов сервера"
echo "  kill \$(cat server.pid)    - остановка сервера"
echo ""

# Проверяем доступность сервера
sleep 2
if curl -s http://localhost:3200/health > /dev/null; then
    echo "✅ Сервер успешно запущен и отвечает на запросы"
else
    echo "⚠️ Сервер запущен, но не отвечает на запросы. Проверьте логи: cat server.log"
fi 