const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { promisify } = require("util");
const readFileAsync = promisify(fs.readFile);
const readDirAsync = promisify(fs.readdir);
const statAsync = promisify(fs.stat);

// Конфигурация
const config = {
  sourceDir: path.resolve(__dirname, "toron_cvetochek_rupert"),
  wikiApiUrl: "http://localhost:8080/graphql",
  apiToken:
    "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGkiOjEsImdycCI6MSwiaWF0IjoxNzQ3ODI3ODM4LCJleHAiOjE3NzkzODU0MzgsImF1ZCI6InVybjp3aWtpLmpzIiwiaXNzIjoidXJuOndpa2kuanMifQ.a7hDtaAK8EXWvTPJYlYHb8AFfuufJy1sIrwh-AWkRPjaYH-VqtTECLOiq_855Pc8xAu3xrmhUvGw_9L_SfuEc6iVCVBBpB-uFmXzFn7BkYHYqdkCXBtpYB56J6Wn7fQo2Bby6LA6RJ699Ti1r8dedZ4urLmYsNnoh-mbmjtZ6gBosrY2P1oQYu3V1PdZ2cX8UvEuUdKA9duq99oDVFTGIdyDO2c5aZ2jQBX2dFzqIkBh2qSes_qIN0iQEBCSpNwJ5BijbpOlQwQTbcvfjWXEcP_2-qFOM40EI9LwqhfOXyhMkQhLPNlSPEAOW3DpNhHtOU6o9z8Y-fBRlqb-b1oPdA",
  homepagePath: path.resolve(__dirname, "fairytale_wiki/wiki-homepage.md"),
  locale: "ru",
};

// Соответствие директорий тегам
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

// Функция для создания HTTP клиента с настроенными заголовками
const createClient = () => {
  return axios.create({
    baseURL: config.wikiApiUrl,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiToken}`,
    },
  });
};

// Преобразование пути к файлу в Wiki.js-путь
const filePathToWikiPath = (filePath) => {
  // Удаляем расширение файла и заменяем обратные слеши на прямые
  const relativePath = path
    .relative(config.sourceDir, filePath)
    .replace(/\\/g, "/")
    .replace(/\.md$/, "");

  return "/" + relativePath;
};

// Функция для создания страницы в Wiki.js
const createPage = async (title, content, tags, path) => {
  const client = createClient();

  // Проверка наличия страницы перед созданием
  const queryPage = `
    query GetPage($path: String!) {
      pages {
        single(path: $path) {
          id
        }
      }
    }
  `;

  try {
    // Сначала проверяем, существует ли уже страница
    const pageResponse = await client.post("", {
      query: queryPage,
      variables: {
        path,
      },
    });

    // Если страница уже существует, обновляем её
    if (
      pageResponse.data.data.pages.single &&
      pageResponse.data.data.pages.single.id
    ) {
      console.log(`Страница ${path} уже существует, пропускаем...`);
      return true;
    }

    // Создаем новую страницу
    const mutation = `
      mutation CreatePage($content: String!, $description: String, $editor: String!, $isPrivate: Boolean!, $isPublished: Boolean!, $locale: String!, $path: String!, $tags: [String]!, $title: String!) {
        pages {
          create(
            content: $content
            description: $description
            editor: $editor
            isPrivate: $isPrivate
            isPublished: $isPublished
            locale: $locale
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

    const response = await client.post("", {
      query: mutation,
      variables: {
        content,
        description: "", // Описание можно оставить пустым
        editor: "markdown", // Используем markdown как редактор
        isPrivate: false, // Страница открыта для всех
        isPublished: true, // Страница опубликована
        locale: config.locale, // Используем русскую локаль по умолчанию
        path,
        tags,
        title,
      },
    });

    if (response.data.errors) {
      console.error(
        `Ошибка при создании страницы ${path}:`,
        response.data.errors
      );
      return false;
    }

    const result = response.data.data.pages.create.responseResult;
    if (result.succeeded) {
      console.log(`Страница ${path} успешно создана!`);
      return true;
    } else {
      console.error(`Ошибка при создании страницы ${path}:`, result.message);
      return false;
    }
  } catch (error) {
    console.error(`Ошибка при создании страницы ${path}:`, error.message);
    if (error.response) {
      console.error("Детали ошибки:", error.response.data);
    }
    return false;
  }
};

// Функция для создания домашней страницы
const createHomePage = async () => {
  try {
    const content = await readFileAsync(config.homepagePath, "utf8");

    const result = await createPage(
      "Приключения Цветочка, Торона и Руперта",
      content,
      ["главная"],
      "home"
    );

    if (result) {
      console.log("Домашняя страница успешно создана!");
    } else {
      console.error("Не удалось создать домашнюю страницу.");
    }
  } catch (error) {
    console.error("Ошибка при создании домашней страницы:", error.message);
  }
};

// Функция для обхода директории и создания страниц
const processDirectory = async (dir, basePath = "") => {
  try {
    const entries = await readDirAsync(dir);

    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stat = await statAsync(fullPath);

      if (stat.isDirectory()) {
        // Создаем директорию в вики, если требуется
        const relativePath = path
          .relative(config.sourceDir, fullPath)
          .replace(/\\/g, "/");

        if (relativePath !== "" && !relativePath.startsWith(".git")) {
          console.log(`Обработка директории: ${relativePath}`);

          // Рекурсивно обрабатываем подкаталоги
          await processDirectory(fullPath, path.join(basePath, entry));
        }
      } else if (entry.endsWith(".md") && entry !== "README.md") {
        // Обрабатываем только .md файлы, кроме README.md
        await processMarkdownFile(fullPath);
      }
    }
  } catch (error) {
    console.error(`Ошибка при обработке директории ${dir}:`, error.message);
  }
};

// Функция для обработки markdown-файла
const processMarkdownFile = async (filePath) => {
  try {
    const content = await readFileAsync(filePath, "utf8");
    const relativePath = path
      .relative(config.sourceDir, filePath)
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

    console.log(`Создание страницы: ${wikiPath} (${title})`);
    await createPage(title, content || "# " + title, tags, wikiPath);
  } catch (error) {
    console.error(`Ошибка при обработке файла ${filePath}:`, error.message);
  }
};

// Функция для создания структуры каталогов
const createDirectoryStructure = async () => {
  // Создаем корневые разделы
  const rootSections = [
    { title: "Персонажи", path: "/characters", tags: ["раздел", "персонажи"] },
    {
      title: "Главные герои",
      path: "/characters/main_heroes",
      tags: ["раздел", "персонажи", "главные герои"],
    },
    {
      title: "Злодеи",
      path: "/characters/villains",
      tags: ["раздел", "персонажи", "злодеи"],
    },
    {
      title: "Друзья и союзники",
      path: "/characters/friends_allies",
      tags: ["раздел", "персонажи", "друзья"],
    },
    {
      title: "Родители",
      path: "/characters/parents",
      tags: ["раздел", "персонажи", "родители"],
    },
    {
      title: "Отношения",
      path: "/relationship",
      tags: ["раздел", "отношения"],
    },
    { title: "Места", path: "/places", tags: ["раздел", "места"] },
    { title: "Мир", path: "/world_description", tags: ["раздел", "мир"] },
    {
      title: "Артефакты и магия",
      path: "/artifacts_and_magic",
      tags: ["раздел", "артефакты", "магия"],
    },
    { title: "Приключения", path: "/journey", tags: ["раздел", "приключения"] },
  ];

  for (const section of rootSections) {
    const content = `# ${
      section.title
    }\n\nЭтот раздел содержит информацию о ${section.title.toLowerCase()}.`;
    await createPage(section.title, content, section.tags, section.path);
  }
};

// Главная функция миграции
const migrateToWiki = async () => {
  try {
    console.log("Начинаем миграцию данных в Wiki.js...");

    // Создаем домашнюю страницу
    await createHomePage();

    // Создаем структуру разделов
    await createDirectoryStructure();

    // Обрабатываем директорию с контентом
    await processDirectory(config.sourceDir);

    console.log("Миграция завершена успешно!");
  } catch (error) {
    console.error("Ошибка при миграции:", error);
  }
};

// Запускаем миграцию
migrateToWiki();
