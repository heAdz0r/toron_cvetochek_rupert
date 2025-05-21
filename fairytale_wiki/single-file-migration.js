const fs = require("fs");
const path = require("path");
const axios = require("axios");

// API URL Wiki.js
const wikiApiUrl = "http://localhost:8080/graphql";

// Токен API
const apiToken =
  "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGkiOjEsImdycCI6MSwiaWF0IjoxNzQ3ODI3ODM4LCJleHAiOjE3NzkzODU0MzgsImF1ZCI6InVybjp3aWtpLmpzIiwiaXNzIjoidXJuOndpa2kuanMifQ.a7hDtaAK8EXWvTPJYlYHb8AFfuufJy1sIrwh-AWkRPjaYH-VqtTECLOiq_855Pc8xAu3xrmhUvGw_9L_SfuEc6iVCVBBpB-uFmXzFn7BkYHYqdkCXBtpYB56J6Wn7fQo2Bby6LA6RJ699Ti1r8dedZ4urLmYsNnoh-mbmjtZ6gBosrY2P1oQYu3V1PdZ2cX8UvEuUdKA9duq99oDVFTGIdyDO2c5aZ2jQBX2dFzqIkBh2qSes_qIN0iQEBCSpNwJ5BijbpOlQwQTbcvfjWXEcP_2-qFOM40EI9LwqhfOXyhMkQhLPNlSPEAOW3DpNhHtOU6o9z8Y-fBRlqb-b1oPdA";

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

// Базовая директория проекта
const baseDir = "../toron_cvetochek_rupert";

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

// Проверка существования страницы
async function checkPageExists(path) {
  try {
    const query = `
      query ($path: String!) {
        pages {
          single(path: $path) {
            id
            path
            title
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
        query,
        variables: {
          path,
        },
      },
    });

    // Проверяем, есть ли страница в ответе
    if (
      response.data &&
      response.data.data &&
      response.data.data.pages &&
      response.data.data.pages.single
    ) {
      return response.data.data.pages.single;
    }

    return null;
  } catch (error) {
    console.error(`Ошибка при проверке страницы ${path}:`, error.message);
    return null;
  }
}

// Обновление внутренних ссылок
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

// Создание или обновление страницы в Wiki.js
async function createWikiPage(wikiPath, content, metadata) {
  try {
    // Преобразуем заголовок из маркдауна
    const title =
      metadata.title || wikiPath.split("/").pop().replace(/-/g, " ");
    const description = metadata.description || "";
    const tags = metadata.tags || [];

    // Сначала проверяем, существует ли уже страница
    const existingPage = await checkPageExists(wikiPath);

    if (existingPage) {
      console.log(`Страница ${wikiPath} уже существует. Обновляем...`);

      // Используем мутацию для обновления существующей страницы
      const updateMutation = `
        mutation ($id: ID!, $content: String!, $description: String!, $tags: [String!]!) {
          pages {
            update(
              id: $id,
              content: $content,
              description: $description,
              editor: "markdown", 
              tags: $tags
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

      const updateResponse = await axios({
        url: wikiApiUrl,
        method: "post",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiToken}`,
        },
        data: {
          query: updateMutation,
          variables: {
            id: existingPage.id,
            content,
            description,
            tags,
          },
        },
      });

      if (updateResponse.data.errors) {
        console.error(
          `Ошибка при обновлении страницы ${wikiPath}:`,
          JSON.stringify(updateResponse.data.errors, null, 2)
        );
        return null;
      }

      console.log(`Страница обновлена: ${wikiPath}`);
      return updateResponse.data;
    } else {
      // Страница не существует, создаем новую
      console.log(`Создаем новую страницу: ${wikiPath}`);

      // Используем мутацию с переменными
      const createMutation = `
        mutation ($path: String!, $content: String!, $title: String!, $description: String!, $tags: [String!]!) {
          pages {
            create(
              content: $content
              description: $description
              editor: "markdown"
              isPublished: true
              isPrivate: false
              locale: "en"
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
          query: createMutation,
          variables: {
            path: wikiPath,
            content,
            title,
            description,
            tags,
          },
        },
      });

      if (response.data.errors) {
        console.error(
          `Ошибка при создании страницы ${wikiPath}:`,
          JSON.stringify(response.data.errors, null, 2)
        );
        return null;
      }

      console.log(`Страница создана: ${wikiPath}`);
      return response.data;
    }
  } catch (error) {
    console.error(`Ошибка при работе со страницей ${wikiPath}:`, error.message);
    if (error.response && error.response.data) {
      console.error(
        "Детали ошибки:",
        JSON.stringify(error.response.data, null, 2)
      );
    }
    return null;
  }
}

// Миграция одного файла
async function migrateSingleFile(filePath, wikiPath) {
  try {
    console.log(`Миграция файла: ${filePath} -> ${wikiPath}`);

    // Проверяем существование файла
    if (!fs.existsSync(filePath)) {
      console.error(`Файл не найден: ${filePath}`);
      return false;
    }

    // Читаем содержимое файла
    let content = fs.readFileSync(filePath, "utf8");

    // Обновляем внутренние ссылки
    content = updateInternalLinks(content);

    // Извлекаем метаданные
    const metadata = extractMetadata(content);

    // Определяем теги на основе пути
    const relativeDirPath = path
      .dirname(path.relative(baseDir, filePath))
      .replace(/\\/g, "/");
    metadata.tags = [];
    for (const dirPattern in directoryToTags) {
      if (relativeDirPath.includes(dirPattern)) {
        metadata.tags = metadata.tags.concat(directoryToTags[dirPattern]);
      }
    }

    // Создаем или обновляем страницу
    const result = await createWikiPage(wikiPath, content, metadata);
    return !!result;
  } catch (error) {
    console.error(`Ошибка при миграции файла ${filePath}:`, error.message);
    return false;
  }
}

// Миграция директории
async function migrateDirectory(dirPath) {
  try {
    console.log(`Миграция директории: ${dirPath}`);

    // Проверяем существование директории
    if (!fs.existsSync(dirPath)) {
      console.error(`Директория не найдена: ${dirPath}`);
      return false;
    }

    // Получаем относительный путь
    const relativeDirPath = path.relative(baseDir, dirPath).replace(/\\/g, "/");
    console.log(`Относительный путь: ${relativeDirPath}`);

    // Читаем файлы в директории
    const files = fs.readdirSync(dirPath);

    let successCount = 0;
    let failCount = 0;

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        // Рекурсивно обрабатываем поддиректории
        console.log(`Обнаружена поддиректория: ${file}`);
        await migrateDirectory(filePath);
      } else if (file.endsWith(".md")) {
        // Обрабатываем .md файлы
        const wikiPath = path
          .join(relativeDirPath, file.replace(".md", ""))
          .replace(/\\/g, "/");

        const success = await migrateSingleFile(filePath, wikiPath);
        if (success) {
          successCount++;
        } else {
          failCount++;
        }

        // Добавляем паузу между запросами
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    console.log(`Миграция директории ${dirPath} завершена.`);
    console.log(`Успешно: ${successCount}, с ошибками: ${failCount}`);
    return true;
  } catch (error) {
    console.error(`Ошибка при миграции директории ${dirPath}:`, error.message);
    return false;
  }
}

// Функция для запуска миграции
async function run() {
  // Получаем аргументы командной строки
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log("Использование:");
    console.log(
      "  node single-file-migration.js <путь_к_файлу_или_директории> [путь_в_wiki]"
    );
    console.log("Примеры:");
    console.log(
      "  node single-file-migration.js ../toron_cvetochek_rupert/characters/main_heroes/cvetochek.md"
    );
    console.log(
      "  node single-file-migration.js ../toron_cvetochek_rupert/characters/main_heroes/cvetochek.md characters/main_heroes/cvetochek"
    );
    console.log(
      "  node single-file-migration.js ../toron_cvetochek_rupert/characters/main_heroes"
    );
    return;
  }

  const sourcePath = args[0];

  try {
    // Проверяем существование пути
    if (!fs.existsSync(sourcePath)) {
      console.error(`Путь не существует: ${sourcePath}`);
      return;
    }

    const stat = fs.statSync(sourcePath);

    if (stat.isDirectory()) {
      // Миграция директории
      await migrateDirectory(sourcePath);
    } else {
      // Миграция одного файла
      const relativePath = path
        .relative(baseDir, sourcePath)
        .replace(/\\/g, "/");

      // Если указан второй аргумент, используем его как путь в Wiki.js
      // Иначе формируем автоматически
      const wikiPath = args[1] || relativePath.replace(".md", "");

      await migrateSingleFile(sourcePath, wikiPath);
    }

    console.log("Миграция завершена!");
  } catch (error) {
    console.error("Ошибка при миграции:", error.message);
    if (error.response && error.response.data) {
      console.error(
        "Детали ответа:",
        JSON.stringify(error.response.data, null, 2)
      );
    }
  }
}

// Запускаем скрипт
run();
