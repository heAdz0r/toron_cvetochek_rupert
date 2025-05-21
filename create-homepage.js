const fs = require("fs");
const axios = require("axios");
const path = require("path");

// Конфигурация
const API_URL = "http://localhost:8080/graphql";
const API_TOKEN =
  "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGkiOjEsImdycCI6MSwiaWF0IjoxNzQ3ODI3ODM4LCJleHAiOjE3NzkzODU0MzgsImF1ZCI6InVybjp3aWtpLmpzIiwiaXNzIjoidXJuOndpa2kuanMifQ.a7hDtaAK8EXWvTPJYlYHb8AFfuufJy1sIrwh-AWkRPjaYH-VqtTECLOiq_855Pc8xAu3xrmhUvGw_9L_SfuEc6iVCVBBpB-uFmXzFn7BkYHYqdkCXBtpYB56J6Wn7fQo2Bby6LA6RJ699Ti1r8dedZ4urLmYsNnoh-mbmjtZ6gBosrY2P1oQYu3V1PdZ2cX8UvEuUdKA9duq99oDVFTGIdyDO2c5aZ2jQBX2dFzqIkBh2qSes_qIN0iQEBCSpNwJ5BijbpOlQwQTbcvfjWXEcP_2-qFOM40EI9LwqhfOXyhMkQhLPNlSPEAOW3DpNhHtOU6o9z8Y-fBRlqb-b1oPdA";
const HOMEPAGE_PATH = path.resolve(
  __dirname,
  "fairytale_wiki/wiki-homepage.md"
);

// Создание клиента для API запросов
const client = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${API_TOKEN}`,
  },
});

// Функция для создания домашней страницы
async function createHomePage() {
  try {
    // Чтение содержимого файла домашней страницы
    const content = fs.readFileSync(HOMEPAGE_PATH, "utf8");

    // Подготовка GraphQL запроса
    const mutation = `
      mutation CreateHomePage($content: String!, $title: String!) {
        pages {
          create(
            content: $content
            description: ""
            editor: "markdown"
            isPrivate: false
            isPublished: true
            locale: "ru"
            path: "home"
            tags: ["главная"]
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
        content: content,
        title: "Приключения Цветочка, Торона и Руперта",
      },
    });

    // Обработка результата
    if (response.data.errors) {
      console.error(
        "Ошибка при создании домашней страницы:",
        response.data.errors
      );
      return;
    }

    if (response.data.data.pages.create.responseResult.succeeded) {
      console.log("Домашняя страница успешно создана!");
    } else {
      console.error(
        "Ошибка:",
        response.data.data.pages.create.responseResult.message
      );
    }
  } catch (error) {
    console.error("Ошибка при выполнении запроса:", error.message);
    if (error.response) {
      console.error("Ответ сервера:", error.response.data);
    }
  }
}

// Запуск функции создания домашней страницы
createHomePage();
