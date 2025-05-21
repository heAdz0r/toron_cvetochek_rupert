# Миграция "Приключения Цветочка, Торона и Руперта" на Wiki.js

Этот репозиторий содержит инструменты для миграции проекта "Приключения Цветочка, Торона и Руперта" на платформу Wiki.js.

## Основные компоненты

- `docker-compose.yml` - конфигурация для запуска Wiki.js и PostgreSQL
- `improved-migration.js` - основной скрипт миграции
- `improved-migration-fix.js` - исправленный скрипт миграции с улучшенной обработкой ошибок
- `single-file-migration.js` - скрипт для миграции отдельных файлов или директорий
- `test-api.js` - скрипт для тестирования API Wiki.js
- `fairytale-theme.css` - CSS стили для оформления Wiki
- `templates/` - шаблоны для разных типов страниц

## Подготовка к работе

1. Установите Docker и Docker Compose:

   - [Docker Desktop для Mac](https://docs.docker.com/docker-for-mac/install/)
   - [Docker Desktop для Windows](https://docs.docker.com/docker-for-windows/install/)
   - [Docker для Linux](https://docs.docker.com/engine/install/)

2. Установите зависимости Node.js:
   ```bash
   npm install
   ```

## Запуск Wiki.js

Для запуска Wiki.js выполните:

```bash
npm run start
```

После запуска Wiki.js будет доступен по адресу: http://localhost:8080

Для остановки Wiki.js выполните:

```bash
npm run stop
```

## Просмотр логов

Для просмотра логов Wiki.js:

```bash
npm run logs
```

## Настройка Wiki.js

1. Откройте http://localhost:8080 в браузере
2. Пройдите первоначальную настройку:

   - Создайте администратора
   - Выберите русский язык
   - Настройте другие параметры

3. Создайте API токен:

   - Войдите в административную панель (значок шестеренки)
   - Перейдите в "Администрирование" > "API доступ"
   - Нажмите "Создать API ключ"
   - Назовите ключ, например, "Migration Key"
   - Установите полный доступ
   - Скопируйте созданный токен

4. Обновите скрипты миграции, вставив полученный токен

## Инструменты миграции

### Тестирование API

Перед запуском миграции рекомендуется проверить работу API:

```bash
npm run test:api
```

### Полная миграция

Существует несколько вариантов миграции:

1. Оригинальный скрипт:

   ```bash
   npm run migrate
   ```

2. Улучшенный скрипт:

   ```bash
   npm run migrate:improved
   ```

3. Исправленный скрипт с улучшенной обработкой ошибок:
   ```bash
   npm run migrate:fix
   ```

### Частичная миграция

Для миграции отдельных файлов или директорий:

```bash
# Миграция отдельного файла
npm run migrate:single ../toron_cvetochek_rupert/characters/main_heroes/cvetochek.md

# Миграция с указанием пути в Wiki.js
npm run migrate:single ../toron_cvetochek_rupert/characters/main_heroes/cvetochek.md characters/cvetochek

# Миграция целой директории
npm run migrate:single ../toron_cvetochek_rupert/characters/main_heroes
```

## Устранение проблем

При возникновении проблем с миграцией обратитесь к документу [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

Основные проблемы и их решения:

1. **Docker не запускается**:

   - Убедитесь, что Docker Desktop установлен и запущен
   - Проверьте, что порт 8080 не занят другими приложениями

2. **Ошибки API**:

   - Проверьте правильность API токена
   - Убедитесь, что у токена есть необходимые права доступа

3. **Ошибки при миграции**:
   - Используйте `npm run test:api` для проверки работы API
   - Попробуйте мигрировать отдельные файлы с помощью `npm run migrate:single`
   - Проверьте логи Wiki.js через `npm run logs`

## Структура данных

Проект структурирован следующим образом:

- `/characters/` - персонажи
  - `/main_heroes/` - главные герои
  - `/villains/` - злодеи
  - `/friends_allies/` - друзья и союзники
  - `/relatives/` - родственники
  - `/other/` - второстепенные персонажи
- `/places/` - места
- `/world_description/` - описание мира
- `/artifacts_and_magic/` - артефакты и магия
- `/journey/` - события приключений
- `/relationship/` - взаимоотношения

## После миграции

После успешной миграции:

1. Настройте навигацию в Wiki.js
2. Установите домашнюю страницу
3. Примените CSS стили из `fairytale-theme.css`
4. Настройте права доступа для пользователей
5. Настройте резервное копирование

Подробные инструкции доступны в [MIGRATION-GUIDE.md](MIGRATION-GUIDE.md).

## Полезные ресурсы

- [Документация Wiki.js](https://docs.requarks.io/)
- [Wiki.js API Reference](https://docs.requarks.io/dev/api)
- [GraphQL API Explorer](http://localhost:8080/graphql)
