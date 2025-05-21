const fs = require("fs");
const path = require("path");
const axios = require("axios");

// Путь к исходной директории проекта
const sourceDir = "../toron_cvetochek_rupert";

// API URL Wiki.js (изменить на актуальный после установки)
const wikiApiUrl = "http://localhost:8080/graphql";

// Токен API (нужно будет получить после настройки Wiki.js)
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

// Функция для проверки существования страницы
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

// Функция для отправки данных в Wiki.js API
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

      // Сначала попробуем более простой запрос без переменных
      const createMutation = `
        mutation {
          pages {
            create(
              content: ${JSON.stringify(content)}
              description: ${JSON.stringify(description)}
              editor: "markdown"
              isPublished: true
              isPrivate: false
              locale: "en"
              path: ${JSON.stringify(wikiPath)}
              tags: ${JSON.stringify(tags)}
              title: ${JSON.stringify(title)}
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
        },
      });

      if (response.data.errors) {
        console.error(
          `Ошибка при создании страницы ${wikiPath}:`,
          JSON.stringify(response.data.errors, null, 2)
        );

        // Если была ошибка, попробуем другой подход - с переменными
        console.log("Пробуем альтернативный подход с переменными...");

        const createMutationWithVars = `
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

        const alternativeResponse = await axios({
          url: wikiApiUrl,
          method: "post",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiToken}`,
          },
          data: {
            query: createMutationWithVars,
            variables: {
              path: wikiPath,
              content,
              title,
              description,
              tags,
            },
          },
        });

        if (alternativeResponse.data.errors) {
          console.error(
            `Ошибка при втором подходе для ${wikiPath}:`,
            JSON.stringify(alternativeResponse.data.errors, null, 2)
          );
          return null;
        }

        console.log(`Страница создана (альтернативный метод): ${wikiPath}`);
        return alternativeResponse.data;
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

// Функция для обработки всех .md файлов в директории
async function processDirectory(dirPath, basePath = "") {
  try {
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

        console.log(`Обработка файла: ${file} -> ${wikiPath}`);

        // Отправляем в Wiki.js с паузой между запросами
        await createWikiPage(wikiPath, content, metadata);

        // Добавляем паузу между запросами, чтобы не перегрузить API
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  } catch (error) {
    console.error(`Ошибка при обработке директории ${dirPath}:`, error.message);
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
  try {
    console.log("Создание главной страницы...");
    const homePagePath = path.join(__dirname, "home-page.md");

    if (!fs.existsSync(homePagePath)) {
      console.error("Файл home-page.md не найден!");
      return;
    }

    const homePageContent = fs.readFileSync(homePagePath, "utf8");
    await createWikiPage("home", homePageContent, {
      title: "Приключения Цветочка, Торона и Руперта",
      description: "Добро пожаловать в сказочный мир Вечноцветия!",
      tags: ["главная"],
    });
  } catch (error) {
    console.error("Ошибка при создании главной страницы:", error.message);
  }
}

// Запускаем процесс миграции
async function runMigration() {
  console.log("Начинаем миграцию в Wiki.js...");

  try {
    // Проверяем соединение с API
    console.log("Проверка соединения с API...");
    const testQuery = `
      query {
        pages {
          list {
            id
            title
            path
          }
        }
      }
    `;

    const testResponse = await axios({
      url: wikiApiUrl,
      method: "post",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
      data: {
        query: testQuery,
      },
    });

    if (testResponse.data.errors) {
      console.error(
        "Ошибка при подключении к API:",
        JSON.stringify(testResponse.data.errors, null, 2)
      );
      return;
    }

    console.log("Соединение с API установлено успешно!");

    // Сначала создаем главную страницу
    await createHomePage();

    // Затем мигрируем остальной контент
    await processDirectory(sourceDir);

    console.log("Миграция завершена!");
  } catch (err) {
    console.error("Ошибка при миграции:", err.message);
    if (err.response && err.response.data) {
      console.error(
        "Детали ответа:",
        JSON.stringify(err.response.data, null, 2)
      );
    }
  }
}

runMigration();
