# WikiJs MCP Server

Model Context Protocol (MCP) сервер для работы с Wiki.js через GraphQL API.

## Описание

Этот проект предоставляет MCP сервер для взаимодействия с Wiki.js через GraphQL API. MCP (Model Context Protocol) - это протокол, разработанный Anthropic, который позволяет AI-моделям взаимодействия с внешними сервисами и инструментами.

Сервер предоставляет унифицированный интерфейс для работы с Wiki.js, который может использоваться различными агентами на базе LLM (больших языковых моделей).

## Возможности

- Получение страниц Wiki.js по ID
- Получение контента страниц
- Получение списка страниц
- Поиск страниц
- Создание новых страниц
- Обновление существующих страниц
- Удаление страниц
- Управление пользователями и группами

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

4. Отредактируйте файл `.env`, указав правильные параметры подключения к Wiki.js.

5. Соберите проект:

```bash
npm run build
```

## Запуск

Для запуска сервера в production режиме (HTTP транспорт):

```bash
npm start
```

Для запуска сервера в режиме stdio (для интеграции с Cursor):

```bash
npm run server:stdio
```

Для запуска в режиме разработки:

```bash
npm run dev
```

## Использование с Cursor (MCP клиент)

Для интеграции с Cursor создайте файл `.cursor/mcp.json` в вашем проекте:

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

Или настройте глобальный MCP сервер в `~/.cursor/mcp.json`:

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

Это позволит Cursor автоматически запускать MCP сервер и использовать его инструменты в чате.

Подробнее см. документацию в файле [MCP_USAGE.md](./MCP_USAGE.md).

## MCP клиенты

Проект включает несколько клиентов для демонстрации работы с MCP:

### Stdio клиент

Клиент, взаимодействующий с MCP сервером через stdio транспорт:

```bash
npm run client
```

### HTTP клиент

Клиент для работы с MCP сервером через HTTP транспорт:

```bash
npm run http-client
```

По умолчанию HTTP клиент подключается к серверу по адресу `http://localhost:8000`. Вы можете изменить адрес, установив переменную окружения `MCP_SERVER_URL`:

```bash
MCP_SERVER_URL=http://your-server-url npm run http-client
```

## API

Сервер предоставляет REST API для взаимодействия с Wiki.js:

### Список доступных инструментов

```
GET /tools
```

### Проверка здоровья сервера

```
GET /health
```

### Примеры использования API

#### Получение списка страниц:

```
GET /list_pages?limit=10&orderBy=TITLE
```

#### Поиск страниц:

```
GET /search_pages?query=документация
```

#### Создание новой страницы:

```
POST /create_page
Content-Type: application/json

{
  "title": "Новая страница",
  "content": "Содержимое страницы в формате Markdown",
  "path": "folder/new-page",
  "description": "Описание страницы"
}
```

## Интеграция с LLM

Проект включает в себя класс `WikiJsAgent`, который демонстрирует, как использовать MCP сервер с языковыми моделями. Смотрите примеры в файле `src/agent.ts`.

Для интеграции MCP сервера с LLM (например, GPT-4 или Claude):

1. Инициализируйте агента и получите список инструментов с сервера
2. Создайте запрос к модели, включая инструменты в запрос
3. Обработайте ответ модели, выполнив запрошенные вызовы инструментов
4. Предоставьте результаты обратно модели для формирования финального ответа

Пример:

```typescript
const agent = new WikiJsAgent("http://localhost:8000");
await agent.initialize();

const llmRequest = agent.createLLMRequest([
  { role: "user", content: "Найди страницы о документации" },
]);

// Отправьте llmRequest в LLM API
// Обработайте ответ с помощью agent.processLLMResponse()
```

## Конфигурация

Сервер настраивается через переменные окружения в файле `.env`:

- `PORT` - порт для запуска HTTP сервера (по умолчанию 8000)
- `WIKIJS_BASE_URL` - базовый URL Wiki.js (без `/graphql`)
- `WIKIJS_TOKEN` - API-токен для доступа к Wiki.js

## Wiki.js API-токен

Для использования MCP сервера необходим API-токен Wiki.js. Создайте его в административной панели Wiki.js:

1. Войдите в административную панель Wiki.js
2. Перейдите в раздел "Управление API" (API Access)
3. Создайте новый токен со всеми необходимыми разрешениями
4. Скопируйте токен в файл `.env`

## Разработка

Проект включает следующие компоненты:

- `src/server.ts` - HTTP сервер MCP
- `src/api.ts` - Клиент для GraphQL API Wiki.js
- `src/tools.ts` - Определения инструментов MCP
- `src/agent.ts` - Класс агента для использования MCP
- `mcp_wikijs_stdin.js` - MCP сервер для stdio транспорта
- `mcp_client.js` - Stdio клиент для MCP
- `mcp_http_client.js` - HTTP клиент для MCP

## О протоколе MCP

MCP (Model Context Protocol) - это открытый протокол, который стандартизирует способ предоставления контекста и инструментов для LLM-моделей. MCP можно рассматривать как "USB-C порт для AI-приложений" - стандартизованный способ подключения к различным источникам данных и инструментам.

MCP поддерживает два типа транспорта:

1. **stdio** - локальный транспорт для запуска на машине пользователя
2. **HTTP/SSE** - сетевой транспорт для удалённого взаимодействия

Подробнее о протоколе MCP можно узнать на [официальном сайте](https://modelcontextprotocol.ai/).

## Лицензия

MIT
