const fs = require("fs");
const path = require("path");
const axios = require("axios");

// Путь к исходной директории проекта
const sourceDir = "../toron_cvetochek_rupert";

// API URL Wiki.js (изменить на актуальный после установки)
const wikiApiUrl = "http://localhost:8080/graphql";

// Токен API (нужно будет получить после настройки Wiki.js)
const apiToken = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGkiOjEsImdycCI6MSwiaWF0IjoxNzQ3ODI3ODM4LCJleHAiOjE3NzkzODU0MzgsImF1ZCI6InVybjp3aWtpLmpzIiwiaXNzIjoidXJuOndpa2kuanMifQ.a7hDtaAK8EXWvTPJYlYHb8AFfuufJy1sIrwh-AWkRPjaYH-VqtTECLOiq_855Pc8xAu3xrmhUvGw_9L_SfuEc6iVCVBBpB-uFmXzFn7BkYHYqdkCXBtpYB56J6Wn7fQo2Bby6LA6RJ699Ti1r8dedZ4urLmYsNnoh-mbmjtZ6gBosrY2P1oQYu3V1PdZ2cX8UvEuUdKA9duq99oDVFTGIdyDO2c5aZ2jQBX2dFzqIkBh2qSes_qIN0iQEBCSpNwJ5BijbpOlQwQTbcvfjWXEcP_2-qFOM40EI9LwqhfOXyhMkQhLPNlSPEAOW3DpNhHtOU6o9z8Y-fBRlqb-b1oPdA";

// Функция для отправки данных в Wiki.js API
async function createWikiPage(path, content) {
  try {
    const mutation = `
      mutation ($path: String!, $content: String!) {
        pages {
          create(
            content: $content
            description: ""
            editor: "markdown"
            isPublished: true
            locale: "ru"
            path: $path
            tags: []
            title: "${path.split("/").pop().replace(".md", "")}"
          ) {
            responseResult {
              succeeded
              errorCode
              slug
              message
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
          path,
          content,
        },
      },
    });

    console.log(`Создана страница: ${path}`);
    return response.data;
  } catch (error) {
    console.error(`Ошибка при создании страницы ${path}:`, error.message);
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

      // Создаем путь для Wiki.js
      const wikiPath = path
        .join(basePath, file.replace(".md", ""))
        .replace(/\\/g, "/");

      // Отправляем в Wiki.js
      await createWikiPage(wikiPath, content);
    }
  }
}

// Функция для обновления внутренних ссылок в маркдауне
function updateInternalLinks(content) {
  // Заменяем все внутренние ссылки на формат Wiki.js
  // Например, ссылки вида [Текст](../path/to/file.md) -> [Текст](/path/to/file)

  // Первый паттерн: ссылки вида [текст](../../path/file.md)
  content = content.replace(
    /\[([^\]]+)\]\(([^)]+\.md)(?:#[^)]+)?\)/g,
    (match, text, link) => {
      // Убираем .md из ссылки
      const newLink = link.replace(".md", "");

      // Преобразуем относительные пути в абсолютные
      let absoluteLink = newLink;
      if (newLink.startsWith("../")) {
        // Для простоты просто удаляем префиксы ../
        absoluteLink = "/" + newLink.replace(/\.\.\//g, "");
      }

      return `[${text}](${absoluteLink})`;
    }
  );

  return content;
}

// Запускаем процесс миграции
console.log("Начинаем миграцию в Wiki.js...");
processDirectory(sourceDir)
  .then(() => console.log("Миграция завершена!"))
  .catch((err) => console.error("Ошибка миграции:", err));
