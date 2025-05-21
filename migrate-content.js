const fs = require("fs");
const axios = require("axios");
const path = require("path");
const { promisify } = require("util");
const readFileAsync = promisify(fs.readFile);

// Конфигурация
const API_URL = "http://localhost:8080/graphql";
const API_TOKEN =
  "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGkiOjEsImdycCI6MSwiaWF0IjoxNzQ3ODI3ODM4LCJleHAiOjE3NzkzODU0MzgsImF1ZCI6InVybjp3aWtpLmpzIiwiaXNzIjoidXJuOndpa2kuanMifQ.a7hDtaAK8EXWvTPJYlYHb8AFfuufJy1sIrwh-AWkRPjaYH-VqtTECLOiq_855Pc8xAu3xrmhUvGw_9L_SfuEc6iVCVBBpB-uFmXzFn7BkYHYqdkCXBtpYB56J6Wn7fQo2Bby6LA6RJ699Ti1r8dedZ4urLmYsNnoh-mbmjtZ6gBosrY2P1oQYu3V1PdZ2cX8UvEuUdKA9duq99oDVFTGIdyDO2c5aZ2jQBX2dFzqIkBh2qSes_qIN0iQEBCSpNwJ5BijbpOlQwQTbcvfjWXEcP_2-qFOM40EI9LwqhfOXyhMkQhLPNlSPEAOW3DpNhHtOU6o9z8Y-fBRlqb-b1oPdA";
const SOURCE_DIR = path.resolve(__dirname, "toron_cvetochek_rupert");

// Директории к тегам
const directoryToTags = {
  "characters/main_heroes": ["персонаж", "главный герой"],
  "characters/villains": ["персонаж", "злодей"],
  "characters/friends_allies": ["персонаж", "друг", "союзник"],
  "characters/parents": ["персонаж", "родственник", "родитель"],
  places: ["место", "локация"],
  world_description: ["мир", "описание"],
  artifacts_and_magic: ["артефакт", "магия"],
  journey: ["приключение", "сюжет"],
  relationship: ["отношения"],
};

// Создание клиента для API запросов
const client = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${API_TOKEN}`,
  },
});

// Функция для создания страницы
async function createPage(title, content, path, tags) {
  try {
    // Подготовка GraphQL запроса
    const mutation = `
      mutation CreatePage($content: String!, $title: String!, $path: String!, $tags: [String]!) {
        pages {
          create(
            content: $content
            description: ""
            editor: "markdown"
            isPrivate: false
            isPublished: true
            locale: "ru"
            path: $path
            tags: $tags
            title: $title
          ) {
            responseResult {
              succeeded
              message
            }
          }
        }
      }
    `;

    // Выполнение запроса
    const response = await client.post("", {
      query: mutation,
      variables: {
        content,
        title,
        path,
        tags,
      },
    });

    // Обработка результата
    if (response.data.errors) {
      console.error(
        `Ошибка при создании страницы ${path}:`,
        response.data.errors
      );
      return false;
    }

    if (response.data.data.pages.create.responseResult.succeeded) {
      console.log(`Страница ${path} успешно создана!`);
      return true;
    } else {
      console.error(
        `Ошибка при создании ${path}:`,
        response.data.data.pages.create.responseResult.message
      );
      return false;
    }
  } catch (error) {
    console.error(`Ошибка при выполнении запроса для ${path}:`, error.message);
    if (error.response) {
      console.error("Ответ сервера:", error.response.data);
    }
    return false;
  }
}

// Преобразование пути к файлу в Wiki.js-путь
const filePathToWikiPath = (filePath) => {
  // Удаляем расширение файла и заменяем обратные слеши на прямые
  const relativePath = path
    .relative(SOURCE_DIR, filePath)
    .replace(/\\/g, "/")
    .replace(/\.md$/, "");

  return "/" + relativePath;
};

// Функция для миграции конкретного файла
async function migrateFile(filePath) {
  try {
    const content = await readFileAsync(filePath, "utf8");
    const relativePath = path
      .relative(SOURCE_DIR, filePath)
      .replace(/\\/g, "/");
    const wikiPath = filePathToWikiPath(filePath);

    // Получаем имя файла без расширения как заголовок
    const title = path
      .basename(filePath, ".md")
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    // Определяем теги на основе директории
    let tags = [];
    for (const [dirPath, dirTags] of Object.entries(directoryToTags)) {
      if (relativePath.startsWith(dirPath)) {
        tags = [...dirTags];
        break;
      }
    }

    console.log(`Миграция файла: ${relativePath} -> ${wikiPath} (${title})`);
    const result = await createPage(title, content, wikiPath, tags);
    return result;
  } catch (error) {
    console.error(`Ошибка при миграции файла ${filePath}:`, error.message);
    return false;
  }
}

// Основная функция для миграции набора файлов
async function migrateMainContent() {
  console.log("Начинаем миграцию основного контента...");

  // Список важных файлов для миграции
  const filesToMigrate = [
    // Главные герои
    "characters/main_heroes/cvetochek.md",
    "characters/main_heroes/toron.md",
    "characters/main_heroes/rupert.md",

    // Основные локации
    "places/vechnotsvetie_korolevstvo.md",
    "places/volshebniy_les.md",
    "places/ognennaya_gora_zamok_torona.md",
    "places/zacharovanniy_les_bashnya_ruperta.md",

    // Отношения
    "relationship/cvetochek_toron_rupert.md",

    // Описание мира
    "world_description/vechnotsvetie_obschee.md",

    // Артефакты
    "artifacts_and_magic/magic_system_overview.md",
    "artifacts_and_magic/notable_artifacts.md",
  ];

  let successCount = 0;
  let failCount = 0;

  for (const file of filesToMigrate) {
    const fullPath = path.join(SOURCE_DIR, file);

    // Проверяем существование файла
    if (!fs.existsSync(fullPath)) {
      console.error(`Файл не найден: ${fullPath}`);
      failCount++;
      continue;
    }

    // Мигрируем файл
    const success = await migrateFile(fullPath);

    // Делаем паузу между запросами для предотвращения перегрузки API
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log(
    `\nМиграция завершена!\nУспешно: ${successCount}\nС ошибками: ${failCount}`
  );
}

// Запускаем миграцию
migrateMainContent();
