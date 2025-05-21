#!/bin/bash

# Убить существующий процесс HTTP сервера, если он запущен
pkill -f "node mcp_http_server.js" || true

# Установить переменные окружения
export PORT=3200
export WIKIJS_BASE_URL=http://localhost:8080
export WIKIJS_TOKEN="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGkiOjEsImdycCI6MSwiaWF0IjoxNzQ3ODI3ODM4LCJleHAiOjE3NzkzODU0MzgsImF1ZCI6InVybjp3aWtpLmpzIiwiaXNzIjoidXJuOndpa2kuanMifQ.a7hDtaAK8EXWvTPJYlYHb8AFfuufJy1sIrwh-AWkRPjaYH-VqtTECLOiq_855Pc8xAu3xrmhUvGw_9L_SfuEc6iVCVBBpB-uFmXzFn7BkYHYqdkCXBtpYB56J6Wn7fQo2Bby6LA6RJ699Ti1r8dedZ4urLmYsNnoh-mbmjtZ6gBosrY2P1oQYu3V1PdZ2cX8UvEuUdKA9duq99oDVFTGIdyDO2c5aZ2jQBX2dFzqIkBh2qSes_qIN0iQEBCSpNwJ5BijbpOlQwQTbcvfjWXEcP_2-qFOM40EI9LwqhfOXyhMkQhLPNlSPEAOW3DpNhHtOU6o9z8Y-fBRlqb-b1oPdA"

# Запуск HTTP сервера
echo "Запуск MCP HTTP сервера для Wiki.js на порту $PORT с базовым URL $WIKIJS_BASE_URL"
node mcp_http_server.js > server.log 2>&1 &

# Сохраняем PID
echo $! > server.pid
echo "MCP HTTP сервер запущен, PID: $(cat server.pid)"

# Проверка доступности API через 2 секунды
sleep 2
if curl -s http://localhost:$PORT/health > /dev/null; then
  echo "API доступен, сервер работает корректно"
  curl -s http://localhost:$PORT/health
else
  echo "Ошибка: API недоступен"
  cat server.log
fi 