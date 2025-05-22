# Исправление прямых вызовов инструментов через JSON-RPC в MCP-сервере Wiki.js

## Проблема

MCP-функции работали через обычные HTTP-запросы к эндпоинтам (например, `/search_pages?query=test`),
но не работали через JSON-RPC запросы к `/mcp` с теми же методами. Клиент получал ошибку:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": { "code": -32601, "message": "Method not found" }
}
```

Также возникали проблемы с интеграцией через Cursor MCP - инструменты возвращали ошибки валидации:

```
Error calling tool 'list_pages': Invalid input
...
Error calling tool 'get_page': Required (content)
```

## Причины проблем

1. **Отсутствие обработки прямых вызовов инструментов через JSON-RPC**:
   В оригинальном файле `mcp_http_server.js` отсутствовала обработка прямых вызовов инструментов через JSON-RPC.
2. **Некорректный формат ответов для MCP**:
   Cursor MCP ожидает специфический формат ответов, отличающийся от стандартного формата JSON-RPC.

3. **Проблемы с валидацией параметров для инструментов без параметров**:
   Инструменты `list_users` и `list_groups` не имели определенных схем параметров в `schemas.js`.

4. **Ошибки в GraphQL запросах**:
   В запросе для `listUsers` использовалось поле `updatedAt`, которое не существует в типе `UserMinimal` в Wiki.js API.

5. **Проблема с параметрами для инструмента `search_users`**:
   Несоответствие между определением инструмента, где ожидается параметр `query`, и интерфейсом Cursor MCP, который использует параметр `q`.

6. **Коллизия имен с инструментами GitHub в Cursor MCP**:
   При вызове инструмента `search_users` через Cursor MCP без явного указания сервера `wikijs`, Cursor использует
   стандартный инструмент GitHub API с тем же именем, что приводит к получению неверных результатов.
   Для корректной работы необходимо явно указывать сервер WikiJS при вызове инструментов через Cursor MCP:
   `mcp_wikijs_search_users({ q: "Administrator" })`.

7. **Ограничение по пути страниц**:
   В примерах использовался путь `mcp/test`, однако система работает с любыми директориями, включая `characters/`,
   `places/`, и т.д. Инструменты для работы со страницами (`create_page`, `update_page`, `search_pages` и др.)
   позволяют работать со страницами в любых директориях Wiki.js.

## Решения

### 1. Добавление обработки прямых вызовов инструментов через JSON-RPC

```javascript
// НОВАЯ ФУНКЦИОНАЛЬНОСТЬ: Прямой вызов инструмента по имени метода
else if (toolNames.includes(request.method)) {
  const toolName = request.method;
  const params = request.params || {};

  log(`🔧 Прямой вызов инструмента: ${toolName} с параметрами: ${JSON.stringify(params)}`);

  try {
    // Валидация параметров
    const validationResult = safeValidateToolParams(toolName, params);
    if (!validationResult.success) {
      // Обработка ошибок валидации...
    }

    // Вызываем инструмент
    const implementation = toolsMap[toolName];
    if (!implementation) {
      throw new Error(`Реализация инструмента ${toolName} не найдена`);
    }

    const result = await implementation(validationResult.data);

    // Возвращаем результат в стандартном формате JSON-RPC
    sendJSONResponse(res, {
      jsonrpc: "2.0",
      id: request.id,
      result: result
    });

    log(`✅ Инструмент ${toolName} успешно выполнен`);
  } catch (error) {
    // Обработка ошибок...
  }
}
```

### 2. Форматирование результатов под требования MCP

Добавлена функция `formatMCPResult` для адаптации результатов к формату, ожидаемому Cursor:

```javascript
function formatMCPResult(toolName, result) {
  // Обработка специальных случаев для разных инструментов
  if (Array.isArray(result)) {
    return {
      method: toolName,
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
      result: result,
    };
  }
  // ... специальная обработка для разных типов инструментов ...
}
```

### 3. Специальная обработка инструментов без параметров

Добавлена обработка инструментов `list_users` и `list_groups`, которые не требуют параметров:

```javascript
// Специальная обработка для инструментов без параметров
if (toolName === "list_users" || toolName === "list_groups") {
  log(`ℹ️ Инструмент ${toolName} не требует параметров, игнорируем валидацию`);

  // Вызываем инструмент напрямую
  const implementation = toolsMap[toolName];
  // ... обработка и возврат результата ...
}
```

### 4. Исправление GraphQL запросов

Исправлены GraphQL запросы для методов `listUsers`, `searchUsers` и `createUser` - удалено поле `updatedAt`, которое не существует в типе `UserMinimal`:

```javascript
const query = gql`
  query ListUsers {
    users {
      list {
        id
        name
        email
        isActive
        createdAt
      }
    }
  }
`;
```

### 5. Добавление схем для инструментов без параметров

Добавлены схемы параметров для инструментов `list_users` и `list_groups` в `schemas.js`:

```javascript
/**
 * Схема параметров для получения списка пользователей
 */
export const ListUsersParamsSchema = z.object({
  random_string: z
    .string()
    .optional()
    .describe("Dummy parameter for no-parameter tools"),
});

/**
 * Схема параметров для получения списка групп
 */
export const ListGroupsParamsSchema = z.object({
  random_string: z
    .string()
    .optional()
    .describe("Dummy parameter for no-parameter tools"),
});
```

### 6. Адаптация для инструмента search_users

Добавлена специальная обработка для преобразования параметра `q` в `query` для инструмента `search_users`:

```javascript
// Специальная обработка для инструмента search_users (Cursor ожидает параметр 'q')
if (toolName === "search_users" && params.q && !params.query) {
  log(`ℹ️ Преобразование параметра q -> query для инструмента search_users`);
  params.query = params.q;
  delete params.q;
}
```

## Тестирование

После внесения исправлений:

1. **JSON-RPC прямые вызовы инструментов работают корректно**:

   ```bash
   curl -X POST http://localhost:3200/mcp -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"list_users","params":{}}'
   ```

2. **Вызовы через tools/call также работают**:

   ```bash
   curl -X POST http://localhost:3200/mcp -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"list_pages","arguments":{"limit":5}}}'
   ```

3. **Вызовы через Cursor MCP интерфейс теперь работают корректно**:

   ```javascript
   mcp_wikijs_list_pages({ limit: 3 });
   mcp_wikijs_get_page({ id: 98 });
   ```

4. **Для инструмента search_users используется параметр q**:
   ```javascript
   mcp_wikijs_search_users({ q: "admin" });
   ```

## Применение исправления

Исправление интегрировано в файл `fixed_mcp_http_server.js`. Для запуска сервера с исправлениями используйте скрипт:

```bash
./start_fixed_http.sh
```

## Влияние на интеграцию с Cursor

Это исправление обеспечивает полную совместимость Wiki.js MCP с Cursor. Теперь Cursor может использовать все инструменты Wiki.js без ошибок, получая правильно форматированные ответы, соответствующие ожиданиям MCP-клиента.
