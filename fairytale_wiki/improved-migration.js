const fs = require("fs");
const path = require("path");
const axios = require("axios");

// Путь к исходной директории проекта
const sourceDir = "../toron_cvetochek_rupert";

// API URL Wiki.js (изменить на актуальный после установки)
const wikiApiUrl = "http://localhost:8080/graphql";

// Токен API (нужно будет получить после настройки Wiki.js)
const apiToken = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGkiOjEsImdycCI6MSwiaWF0IjoxNzQ3ODI3ODM4LCJleHAiOjE3NzkzODU0MzgsImF1ZCI6InVybjp3aWtpLmpzIiwiaXNzIjoidXJuOndpa2kuanMifQ.a7hDtaAK8EXWvTPJYlYHb8AFfuufJy1sIrwh-AWkRPjaYH-VqtTECLOiq_855Pc8xAu3xrmhUvGw_9L_SfuEc6iVCVBBpB-uFmXzFn7BkYHYqdkCXBtpYB56J6Wn7fQo2Bby6LA6RJ699Ti1r8dedZ4urLmYsNnoh-mbmjtZ6gBosrY2P1oQYu3V1PdZ2cX8UvEuUdKA9duq99oDVFTGIdyDO2c5aZ2jQBX2dFzqIkBh2qSes_qIN0iQEBCSpNwJ5BijbpOlQwQTbcvfjWXEcP_2-qFOM40EI9LwqhfOXyhMkQhLPNlSPEAOW3DpNhHtOU6o9z8Y-fBRlqb-b1oPdA";

// Соответствие директорий тегам
const directoryToTags = {
  "characters/main_heroes": ["персонаж", "главный герой"],
  "characters/villains": ["персонаж", "злодей"],
  "characters/friends_allies": ["персонаж", "друг", "союзник"],
  "characters/relatives": ["персонаж", "родственник"],
  "characters/other": ["персонаж", "второстепенный"],
  places: ["место", "локация"],
  world_description: ["мир", "описание"],
  artifacts_and_magic: ["артефакт", "магия"],
  journey: ["приключение", "сюжет"],
  relationship: ["отношения"],
};

// Получить метаданные из содержимого файла
function extractMetadata(content) {
  const metadata = {
    title: "",
    description: "",
    tags: [],
  };

  // Извлекаем заголовок
  const titleMatch = content.match(/^# (.+)$/m);
  if (titleMatch && titleMatch.length > 1) {
    metadata.title = titleMatch[1];
  }

  // Извлекаем первый абзац для описания
  const descMatch = content.match(/^# .+\n\n(.+?)(\n\n|$)/m);
  if (descMatch && descMatch.length > 1) {
    metadata.description = descMatch[1].substring(0, 200); // Ограничиваем длину описания
  }

  return metadata;
}

// Функция для отправки данных в Wiki.js API
async function createWikiPage(wikiPath, content, metadata) {
  try {
    // Преобразуем заголовок из маркдауна
    const title =
      metadata.title || wikiPath.split("/").pop().replace(/-/g, " ");
    const description = metadata.description || "";
    const tags = metadata.tags || [];

    // Настраиваем мутацию GraphQL для создания страницы
    const mutation = `
      mutation ($path: String!, $content: String!, $title: String!, $description: String!, $tags: [String!]!) {
        pages {
          create(
            content: $content
            description: $description
            editor: "markdown"
            isPublished: true
            locale: "ru"
            path: $path
            tags: $tags
            title: $title
          ) {
            responseResult {
              succeeded
              errorCode
              slug
              message
            }
            page {
              id
              path
              title
            }
          }
        }
      }
    `;

    const response = await axios({
      url: wikiApiUrl,
      method: "post",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
      data: {
        query: mutation,
        variables: {
          path: wikiPath,
          content,
          title,
          description,
          tags,
        },
      },
    });

    console.log(`Создана страница: ${wikiPath}`);
    return response.data;
  } catch (error) {
    console.error(`Ошибка при создании страницы ${wikiPath}:`, error.message);
    return null;
  }
}

// Функция для обработки всех .md файлов в директории
async function processDirectory(dirPath, basePath = "") {
  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Рекурсивно обрабатываем поддиректории
      await processDirectory(filePath, path.join(basePath, file));
    } else if (file.endsWith(".md")) {
      // Обрабатываем .md файлы
      let content = fs.readFileSync(filePath, "utf8");

      // Корректируем внутренние ссылки для Wiki.js
      content = updateInternalLinks(content);

      // Создаем путь для Wiki.js (без .md)
      const relativeDirPath = path
        .relative(sourceDir, dirPath)
        .replace(/\\/g, "/");
      const wikiPath = path
        .join(relativeDirPath, file.replace(".md", ""))
        .replace(/\\/g, "/");

      // Извлекаем метаданные
      const metadata = extractMetadata(content);

      // Добавляем теги в зависимости от директории
      metadata.tags = [];
      for (const dirPattern in directoryToTags) {
        if (relativeDirPath.includes(dirPattern)) {
          metadata.tags = metadata.tags.concat(directoryToTags[dirPattern]);
        }
      }

      // Отправляем в Wiki.js
      await createWikiPage(wikiPath, content, metadata);
    }
  }
}

// Функция для обновления внутренних ссылок в маркдауне
function updateInternalLinks(content) {
  // Заменяем ссылки между файлами
  content = content.replace(
    /\[([^\]]+)\]\(([^)]+\.md)(?:#([^)]+))?\)/g,
    (match, text, link, anchor) => {
      // Убираем .md из ссылки
      let newLink = link.replace(".md", "");

      // Обрабатываем относительные пути
      if (newLink.startsWith("../")) {
        // Преобразуем в абсолютные пути для Wiki.js
        newLink = "/" + newLink.replace(/\.\.\//g, "");
      }

      // Добавляем якорь, если он был
      if (anchor) {
        newLink += "#" + anchor;
      }

      return `[${text}](${newLink})`;
    }
  );

  return content;
}

// Создание начальной страницы
async function createHomePage() {
  const homePageContent = fs.readFileSync("home-page.md", "utf8");
  await createWikiPage("home", homePageContent, {
    title: "Приключения Цветочка, Торона и Руперта",
    description: "Добро пожаловать в сказочный мир Вечноцветия!",
    tags: ["главная"],
  });
}

// Запускаем процесс миграции
async function runMigration() {
  console.log("Начинаем миграцию в Wiki.js...");

  try {
    // Сначала создаем главную страницу
    await createHomePage();

    // Затем мигрируем остальной контент
    await processDirectory(sourceDir);

    console.log("Миграция завершена!");
  } catch (err) {
    console.error("Ошибка при миграции:", err);
  }
}

runMigration();
