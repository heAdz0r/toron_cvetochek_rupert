# Приключения Цветочка, Торона и Руперта: База Знаний Сказочного Мира

## О проекте

Этот репозиторий представляет собой структурированную базу знаний для серии детских сказок о приключениях котёнка Цветочка, короля драконов Торона и волшебника Руперта. Проект создан для систематизации информации о персонажах, местах, артефактах и событиях сказочного мира, с целью облегчения создания новых историй и поддержания консистентности вселенной.

Изначально истории генерировались с помощью языковой модели для 4-5 летней девочки, и этот проект служит основой для дальнейшего творческого развития этого мира. В настоящее время информация организована в виде Wiki для более удобного доступа и редактирования.

## Доступ к Wiki

Вся информация о сказочном мире теперь доступна через Wiki, которая предлагает следующие преимущества:

- Удобная навигация между страницами
- Структурированные категории и теги
- Простое редактирование и добавление нового контента
- Поиск по всей базе знаний
- Визуальное представление связей между персонажами и локациями

## Структура Wiki

Wiki организована по следующим основным разделам:

- **Персонажи**: Информация о всех персонажах мира.
  - _Главные герои_: Подробные описания [Цветочка](characters/main_heroes/cvetochek.md), [Торона](characters/main_heroes/toron.md) и [Руперта](characters/main_heroes/rupert.md).
  - _Злодеи_: Описания антагонистов, с которыми сталкивались герои.
  - _Друзья и союзники_: Информация о положительных персонажах, встречающихся в сказках.
  - _Родственники_: Описания родственников главных героев.
  - _Прочие персонажи_: Персонажи, не вошедшие в основные категории.
- **Взаимоотношения**: Описания ключевых отношений между персонажами.
- **Локации**: Описания всех значимых мест действия, например, [Королевство Вечноцветие](places/vechnotsvetie_korolevstvo.md), [Волшебный Лес](places/volshebniy_les.md), [Замок Торона](places/ognennaya_gora_zamok_torona.md).
- **Описание мира**: Общая информация о мире Вечноцветия, его географии и особенностях.
- **Артефакты и магия**: Информация о магической системе мира и значимых волшебных предметах.
- **Приключения**: Готовые истории и шаблоны для создания новых приключений.

## Как использовать Wiki

1. **Для ознакомления с миром:** Начните с разделов "Описание мира", "Главные герои" и "Взаимоотношения".
2. **Для создания новых историй:**
   - Используйте описания персонажей для соответствия их характерам.
   - Выбирайте локации из раздела "Локации" или создавайте новые.
   - Обращайтесь к разделу "Артефакты и магия" для использования существующих элементов.
   - Используйте шаблоны из раздела "Приключения" для создания историй с определённым типом сюжета.
3. **Для поддержания консистентности:** Сверяйтесь с существующей информацией для избежания противоречий.
4. **Для развития мира:** При создании новых элементов, добавляйте их в Wiki, используя соответствующие теги и категории.

## Теги и категории Wiki

Для организации контента в Wiki используются следующие теги:

- `#главный_герой` - для основных персонажей
- `#локация` - для мест действия
- `#артефакт` - для волшебных предметов
- `#магия` - для описания магических способностей
- `#приключение` - для готовых историй
- `#злодей` - для антагонистов
- `#друг` - для союзников и друзей
- `#шаблон` - для шаблонов историй

## Вклад и развитие

Wiki является живым и развивающимся проектом. Если у вас есть идеи по его дополнению, новые истории или уточнения к существующей информации, вы можете:

- Создавать новые страницы в соответствующих разделах.
- Редактировать существующие страницы, добавляя новые детали.
- Предлагать новые категории или структуру разделов.

Главная цель – создать богатую и подробную вселенную, которая будет радовать юную читательницу и вдохновлять на новые сказочные приключения!

## Технические детали

Для обновления Wiki и поддержания её актуальности используйте скрипт миграции:

```
npm run migrate
```

## Контакты

(Здесь вы можете указать свои контакты, если планируете делиться проектом или принимать вклад от других).

---

Надеюсь, такое описание будет понятным и полезным! Оно объясняет цель проекта, его структуру и как с ним работать. Если нужно что-то добавить или изменить, дайте знать!

# WikiJS MCP

Wiki.js integration for the Cursor editor using Model Context Protocol (MCP).

## Overview

This project provides an MCP server for integrating Wiki.js knowledge base with Cursor, allowing AI assistants to retrieve information from your Wiki.js instance. The integration supports:

- Searching Wiki.js pages
- Retrieving page content by ID
- Listing all pages

## Requirements

- Node.js 18+
- A running Wiki.js instance (v2.5+)
- Wiki.js API access token with read permissions

## Setup

1. Clone this repository or download the source files.

2. Install dependencies:

   ```bash
   npm install
   ```

3. Configure the Wiki.js connection by creating a `.cursor/mcp.json` file in your home directory or in the project directory:

   ```json
   {
     "mcpServers": {
       "wikijs": {
         "transport": "http",
         "url": "http://localhost:3200/mcp",
         "events": "http://localhost:3200/mcp/events",
         "cwd": "/path/to/your/project",
         "env": {
           "WIKIJS_BASE_URL": "http://localhost:8080",
           "WIKIJS_TOKEN": "your-wikijs-api-token"
         }
       }
     }
   }
   ```

   Replace:

   - `/path/to/your/project` with your actual project path
   - `http://localhost:8080` with your Wiki.js URL
   - `your-wikijs-api-token` with your Wiki.js API token

4. Start the MCP server:
   ```bash
   npm start
   ```

## Usage

### In Cursor

1. Once the MCP server is running, open Cursor.
2. The WikiJS MCP tools should be available for the AI assistant to use.
3. You can ask the AI to search for or retrieve information from your Wiki.js instance.

### Testing

Test the HTTP client:

```bash
npm test
```

Test SSE connections:

```bash
npm run test:sse
```

## Configuration Details

### MCP Configuration

The `.cursor/mcp.json` configuration file can be placed in:

1. Project-specific: `./cursor/mcp.json` (higher precedence)
2. User-wide: `~/.cursor/mcp.json`

### Server Options

You can modify the `simple_server.js` file to adjust:

- Server port (default: 3200)
- CORS settings
- API capabilities

### Wiki.js Client Configuration

The WikiJS client can be configured by modifying the `wikijs_client.js` file.

## Troubleshooting

### Server Connection Issues

If Cursor can't connect to the MCP server:

1. Verify the server is running (`npm start`)
2. Check the server logs for errors
3. Make sure the URL in your `.cursor/mcp.json` matches the server address
4. Test with the included client: `npm test`

### Wiki.js API Issues

If the server can't connect to Wiki.js:

1. Verify your Wiki.js instance is running
2. Check that your API token has proper permissions
3. Confirm the base URL is correct and accessible
4. Ensure you have API access enabled in Wiki.js settings

## Advanced Usage

### Custom URL Paths

If you need to run the server on a different path or port, update:

1. The `PORT` variable in `simple_server.js`
2. The `url` and `events` fields in `.cursor/mcp.json`
3. The `mcpUrl` in test clients

### Implementing Additional Tools

To add more WikiJS functionality:

1. Extend the WikiJS client in `wikijs_client.js`
2. Add new tool definitions in the `tools` array in `simple_server.js`
3. Add the corresponding handler in the `handleCommand` function

## License

MIT License
