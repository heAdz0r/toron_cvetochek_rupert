#!/bin/bash

# Скрипт для настройки проектного MCP-сервера Wiki.js в Cursor
# Создает проектную конфигурацию для текущего проекта

# Определение цветов для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Получаем абсолютный путь к директории скрипта
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Создаем директорию .cursor в текущем проекте
PROJECT_CURSOR_DIR="$SCRIPT_DIR/.cursor"
if [ ! -d "$PROJECT_CURSOR_DIR" ]; then
    echo -e "${YELLOW}Создание директории $PROJECT_CURSOR_DIR${NC}"
    mkdir -p "$PROJECT_CURSOR_DIR"
fi

# Создаем конфигурацию MCP
MCP_CONFIG_FILE="$PROJECT_CURSOR_DIR/mcp.json"

# Проверяем, существует ли уже файл конфигурации
if [ -f "$MCP_CONFIG_FILE" ]; then
    echo -e "${YELLOW}Найден существующий файл конфигурации MCP.${NC}"
    echo -e "${YELLOW}Создаем резервную копию.${NC}"
    cp "$MCP_CONFIG_FILE" "$MCP_CONFIG_FILE.backup"
    echo -e "${GREEN}Резервная копия создана: $MCP_CONFIG_FILE.backup${NC}"
fi

# Создаем новую конфигурацию
echo -e "${GREEN}Создание проектной конфигурации MCP для Wiki.js...${NC}"

cat > "$MCP_CONFIG_FILE" << EOF
{
  "mcpServers": {
    "wikijs": {
      "transport": "http",
      "url": "http://localhost:3200/mcp",
      "events": "http://localhost:3200/mcp/events",
      "cwd": "$SCRIPT_DIR",
      "env": {
        "WIKIJS_BASE_URL": "http://localhost:8080",
        "WIKIJS_TOKEN": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGkiOjEsImdycCI6MSwiaWF0IjoxNzQ3ODI3ODM4LCJleHAiOjE3NzkzODU0MzgsImF1ZCI6InVybjp3aWtpLmpzIiwiaXNzIjoidXJuOndpa2kuanMifQ.a7hDtaAK8EXWvTPJYlYHb8AFfuufJy1sIrwh-AWkRPjaYH-VqtTECLOiq_855Pc8xAu3xrmhUvGw_9L_SfuEc6iVCVBBpB-uFmXzFn7BkYHYqdkCXBtpYB56J6Wn7fQo2Bby6LA6RJ699Ti1r8dedZ4urLmYsNnoh-mbmjtZ6gBosrY2P1oQYu3V1PdZ2cX8UvEuUdKA9duq99oDVFTGIdyDO2c5aZ2jQBX2dFzqIkBh2qSes_qIN0iQEBCSpNwJ5BijbpOlQwQTbcvfjWXEcP_2-qFOM40EI9LwqhfOXyhMkQhLPNlSPEAOW3DpNhHtOU6o9z8Y-fBRlqb-b1oPdA"
      }
    }
  }
}
EOF

echo -e "${GREEN}Проектная конфигурация MCP успешно создана: $MCP_CONFIG_FILE${NC}"
echo -e "${YELLOW}ПРИМЕЧАНИЕ: Если вы используете Wiki.js не на localhost:8080, отредактируйте файл $MCP_CONFIG_FILE${NC}"
echo -e "${YELLOW}            и обновите параметры WIKIJS_BASE_URL и WIKIJS_TOKEN.${NC}"
echo -e "${GREEN}Перезапустите Cursor, чтобы изменения вступили в силу.${NC}" 