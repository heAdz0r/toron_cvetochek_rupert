const axios = require("axios");

// Конфигурация
const API_URL = "http://localhost:8080/graphql";
const API_TOKEN =
  "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGkiOjEsImdycCI6MSwiaWF0IjoxNzQ3ODI3ODM4LCJleHAiOjE3NzkzODU0MzgsImF1ZCI6InVybjp3aWtpLmpzIiwiaXNzIjoidXJuOndpa2kuanMifQ.a7hDtaAK8EXWvTPJYlYHb8AFfuufJy1sIrwh-AWkRPjaYH-VqtTECLOiq_855Pc8xAu3xrmhUvGw_9L_SfuEc6iVCVBBpB-uFmXzFn7BkYHYqdkCXBtpYB56J6Wn7fQo2Bby6LA6RJ699Ti1r8dedZ4urLmYsNnoh-mbmjtZ6gBosrY2P1oQYu3V1PdZ2cX8UvEuUdKA9duq99oDVFTGIdyDO2c5aZ2jQBX2dFzqIkBh2qSes_qIN0iQEBCSpNwJ5BijbpOlQwQTbcvfjWXEcP_2-qFOM40EI9LwqhfOXyhMkQhLPNlSPEAOW3DpNhHtOU6o9z8Y-fBRlqb-b1oPdA";

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

// Функция для создания структуры разделов
async function createStructure() {
  console.log("Создание структуры разделов...");

  // Определяем структуру разделов
  const sections = [
    {
      title: "Персонажи",
      path: "/characters",
      tags: ["раздел", "персонажи"],
      content:
        "# Персонажи\n\nВ этом разделе содержится информация обо всех персонажах сказочного мира.",
    },
    {
      title: "Главные герои",
      path: "/characters/main_heroes",
      tags: ["раздел", "персонажи", "главные герои"],
      content:
        "# Главные герои\n\nВ этом разделе представлены три главных героя сказочного мира - Цветочек, Торон и Руперт.",
    },
    {
      title: "Злодеи",
      path: "/characters/villains",
      tags: ["раздел", "персонажи", "злодеи"],
      content:
        "# Злодеи\n\nЗдесь собрана информация о злодеях и антагонистах, которые противостоят главным героям.",
    },
    {
      title: "Друзья и союзники",
      path: "/characters/friends_allies",
      tags: ["раздел", "персонажи", "друзья"],
      content:
        "# Друзья и союзники\n\nВ этом разделе представлены друзья и союзники главных героев, которые помогают им в приключениях.",
    },
    {
      title: "Родители",
      path: "/characters/parents",
      tags: ["раздел", "персонажи", "родители"],
      content:
        "# Родители\n\nЗдесь содержится информация о родителях главных героев и других персонажей.",
    },
    {
      title: "Отношения",
      path: "/relationship",
      tags: ["раздел", "отношения"],
      content:
        "# Отношения\n\nВ этом разделе описаны взаимоотношения между персонажами сказочного мира.",
    },
    {
      title: "Места",
      path: "/places",
      tags: ["раздел", "места"],
      content:
        "# Места\n\nЗдесь собрана информация о всех значимых локациях сказочного мира.",
    },
    {
      title: "Мир",
      path: "/world_description",
      tags: ["раздел", "мир"],
      content:
        "# Мир\n\nВ этом разделе содержится общая информация о мире Вечноцветия, его устройстве и особенностях.",
    },
    {
      title: "Артефакты и магия",
      path: "/artifacts_and_magic",
      tags: ["раздел", "артефакты", "магия"],
      content:
        "# Артефакты и магия\n\nЗдесь представлена информация о магических предметах и системе магии в мире Вечноцветия.",
    },
    {
      title: "Приключения",
      path: "/journey",
      tags: ["раздел", "приключения"],
      content:
        "# Приключения\n\nВ этом разделе собраны истории о приключениях главных героев.",
    },
  ];

  // Создаем страницы для каждого раздела
  for (const section of sections) {
    await createPage(
      section.title,
      section.content,
      section.path,
      section.tags
    );
    // Добавляем небольшую задержку между запросами
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log("Структура разделов успешно создана!");
}

// Запускаем функцию создания структуры
createStructure();
