# Использование Wiki.js MCP

Этот документ описывает процесс установки и использования MCP (Model Context Protocol) сервера для работы с Wiki.js.

## Установка

1. Клонируйте репозиторий:

```bash
git clone https://github.com/yourusername/wikijs-mcp.git
cd wikijs-mcp
```

2. Установите зависимости:

```bash
npm install
```

3. Создайте файл `.env` на основе `example.env`:

```bash
cp example.env .env
```

4. Отредактируйте файл `.env` и укажите правильные параметры:

```
PORT=8000
WIKIJS_BASE_URL=http://your-wikijs-url
WIKIJS_TOKEN=your-wikijs-api-token
```

5. Соберите проект:

```bash
npm run build
```

## Использование MCP с Cursor

### Настройка MCP для Cursor

У вас есть два варианта настройки MCP для Cursor:

#### 1. Локальная настройка (только для текущего проекта)

1. Создайте директорию `.cursor` в вашем проекте (если она ещё не существует):

```bash
mkdir -p .cursor
```

2. Создайте файл `.cursor/mcp.json` со следующим содержимым:

```json
{
  "mcpServers": {
    "wikijs": {
      "command": "node",
      "args": ["mcp_wikijs_stdin.js"],
      "env": {
        "WIKIJS_BASE_URL": "http://your-wikijs-url",
        "WIKIJS_TOKEN": "your-wikijs-api-token"
      }
    }
  }
}
```

#### 2. Глобальная настройка (для всех проектов)

1. Создайте файл `~/.cursor/mcp.json` (в вашей домашней директории):

```json
{
  "mcpServers": {
    "wikijs": {
      "command": "node",
      "args": ["dist/server.js"],
      "cwd": "/path/to/wikijs-mcp",
      "env": {
        "PORT": "8000",
        "WIKIJS_BASE_URL": "http://your-wikijs-url",
        "WIKIJS_TOKEN": "your-wikijs-api-token"
      }
    }
  }
}
```

> **Примечание:** Убедитесь, что параметр `cwd` указывает на правильный путь к директории с проектом wikijs-mcp на вашем компьютере.

3. Замените значения `WIKIJS_BASE_URL` и `WIKIJS_TOKEN` своими значениями.

4. Перезапустите Cursor, и MCP сервер будет автоматически доступен для использования.

### Использование MCP в Cursor

После настройки Cursor будет иметь доступ к следующим инструментам:

1. `list_pages` - получение списка страниц Wiki.js
2. `search_pages` - поиск страниц по запросу
3. `get_page` - получение информации о странице по ID
4. `get_page_content` - получение содержимого страницы по ID
5. `create_page` - создание новой страницы
6. `update_page` - обновление содержимого страницы
7. `delete_page` - удаление страницы
8. `list_users` - получение списка пользователей
9. `search_users` - поиск пользователей
10. `list_groups` - получение списка групп пользователей

Примеры использования в чате Cursor:

```
Пожалуйста, найди все страницы, связанные с "документация" в Wiki.js
```

```
Создай новую страницу в Wiki.js с заголовком "Руководство по использованию API" в разделе "docs/api"
```

### Важное замечание о конфигурации MCP

При наличии одновременно локальной (`.cursor/mcp.json` в проекте) и глобальной (`~/.cursor/mcp.json`) конфигураций с одинаковыми именами серверов, Cursor будет использовать настройки из локальной конфигурации для данного проекта.

## Самостоятельное использование MCP (без Cursor)

### Запуск MCP сервера

Для запуска MCP сервера через HTTP транспорт:

```bash
npm start
```

Для запуска MCP сервера через stdio транспорт:

```bash
npm run server:stdio
```

### Использование клиента MCP

В проекте есть демонстрационный клиент для взаимодействия с MCP сервером:

```bash
npm run client  # Для stdio транспорта
npm run http-client  # Для HTTP транспорта
```

Оба клиента предоставляют интерактивное меню для взаимодействия с Wiki.js через MCP.

## Разработка

### Структура проекта

- `src/` - исходный код на TypeScript
  - `server.ts` - HTTP сервер MCP
  - `api.ts` - GraphQL API клиент для Wiki.js
  - `tools.ts` - определения инструментов MCP
  - `types.ts` - типы TypeScript
  - `agent.ts` - класс агента для использования MCP в вашем коде
  - `demo.ts` - демонстрационный скрипт
- `mcp_wikijs_stdin.js` - MCP сервер для режима stdin
- `mcp_stdio.js` - базовый обработчик stdio для MCP
- `mcp_client.js` - клиент для демонстрации работы с MCP сервером в режиме stdio
- `mcp_http_client.js` - клиент для демонстрации работы с MCP сервером через HTTP

### Запуск в режиме разработки

```bash
npm run dev
```

### Запуск демонстрации

```bash
npm run demo
```

## Использование в программном коде

```typescript
import { WikiJsAgent } from "./dist/agent.js";

async function example() {
  // Создание агента для работы с MCP сервером
  const agent = new WikiJsAgent("http://localhost:8000");

  // Инициализация агента (загрузка доступных инструментов)
  await agent.initialize();

  // Вызов инструмента MCP
  const pages = await agent.callTool("list_pages", { limit: 10 });
  console.log("Список страниц:", pages);

  // Поиск страниц
  const searchResults = await agent.callTool("search_pages", {
    query: "документация",
  });
  console.log("Результаты поиска:", searchResults);
}

example();
```
