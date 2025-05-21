# Wiki.js MCP Configuration Guide

## Обзор

Этот документ описывает настройку интеграции Wiki.js и Cursor через MCP (Model Context Protocol).

## Конфигурация MCP

### Расположение конфигурационных файлов

MCP использует следующие конфигурационные файлы:

1. **Глобальная конфигурация**: `~/.cursor/mcp.json`
2. **Локальная конфигурация**: `<проект>/.cursor/mcp.json`

Примечание: Локальная конфигурация имеет приоритет над глобальной.

### Структура конфигурационного файла

```json
{
  "mcpServers": {
    "wikijs": {
      "command": "node",
      "args": ["mcp_wikijs_stdin.js"],
      "cwd": "/путь/к/проекту/wikijs-mcp",
      "env": {
        "WIKIJS_BASE_URL": "http://localhost:8080",
        "WIKIJS_TOKEN": "ваш-токен-доступа"
      }
    }
  }
}
```

### Важные параметры

- **command**: Команда для запуска сервера MCP
- **args**: Аргументы командной строки
- **cwd**: Рабочая директория (обязательно указывать абсолютный путь)
- **env**: Переменные окружения
  - **WIKIJS_BASE_URL**: URL вашего Wiki.js сервера
  - **WIKIJS_TOKEN**: Токен доступа к API Wiki.js

## Режимы транспорта

MCP поддерживает два режима транспорта:

1. **stdio** (`mcp_wikijs_stdin.js`): Обмен данными через стандартные потоки ввода/вывода
2. **HTTP** (`mcp_http_client.js`): Обмен данными через HTTP API

## Устранение неполадок

### Ошибка "No server info found"

Если вы видите эту ошибку:

1. Проверьте, что имя сервера в конфигурации совпадает с именем в коде MCP-клиента
2. Убедитесь, что файл конфигурации содержит правильные пути и команды
3. Перезапустите Cursor и MCP-сервер

### Ошибка "Error getting personal environment json"

Эта ошибка может возникать из-за:

1. Несоответствия версий протокола MCP
2. Некорректного формата ответа сервера
3. Конфликта конфигураций (глобальная vs локальная)

## Примеры вызовов

```javascript
// Пример запроса к MCP API
const response = await fetch("http://localhost:8000/query", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    type: "query",
    query: "tools",
    id: "1",
  }),
});

const data = await response.json();
console.log(data);
```
