#!/bin/bash

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Настройка проекта Wiki.js MCP Сервер ===${NC}\n"

# Проверка наличия Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ОШИБКА] Node.js не установлен. Пожалуйста, установите Node.js перед продолжением.${NC}"
    exit 1
fi

# Проверка версии Node.js
NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo -e "${YELLOW}[ПРЕДУПРЕЖДЕНИЕ] Рекомендуется использовать Node.js версии 16 или выше. Текущая версия: $(node -v)${NC}"
fi

echo -e "${GREEN}[ШАГ 1] Установка зависимостей проекта...${NC}"
npm install

# Проверка наличия файла .env
if [ ! -f .env ]; then
    echo -e "${GREEN}[ШАГ 2] Создание файла конфигурации .env...${NC}"
    cp example.env .env
    echo -e "${YELLOW}[ЗАМЕТКА] Создан файл .env. Пожалуйста, отредактируйте его, указав правильные настройки подключения к Wiki.js.${NC}"
else
    echo -e "${GREEN}[ШАГ 2] Файл .env уже существует. Пропускаем...${NC}"
fi

echo -e "${GREEN}[ШАГ 3] Сборка проекта...${NC}"
npm run build

echo -e "\n${GREEN}=== Настройка проекта завершена! ===${NC}"
echo -e "${YELLOW}Чтобы запустить сервер, выполните:${NC} npm start"
echo -e "${YELLOW}Для запуска в режиме разработки:${NC} npm run dev"
echo -e "${YELLOW}Для запуска демонстрационного агента:${NC} npm run demo"
echo -e "\n${YELLOW}Убедитесь, что вы правильно настроили файл .env с параметрами подключения к Wiki.js.${NC}" 