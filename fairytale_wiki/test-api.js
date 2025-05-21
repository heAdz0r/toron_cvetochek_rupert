const axios = require("axios");

// API URL Wiki.js
const wikiApiUrl = "http://localhost:8080/graphql";

// Токен API
const apiToken =
  "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGkiOjEsImdycCI6MSwiaWF0IjoxNzQ3ODI3ODM4LCJleHAiOjE3NzkzODU0MzgsImF1ZCI6InVybjp3aWtpLmpzIiwiaXNzIjoidXJuOndpa2kuanMifQ.a7hDtaAK8EXWvTPJYlYHb8AFfuufJy1sIrwh-AWkRPjaYH-VqtTECLOiq_855Pc8xAu3xrmhUvGw_9L_SfuEc6iVCVBBpB-uFmXzFn7BkYHYqdkCXBtpYB56J6Wn7fQo2Bby6LA6RJ699Ti1r8dedZ4urLmYsNnoh-mbmjtZ6gBosrY2P1oQYu3V1PdZ2cX8UvEuUdKA9duq99oDVFTGIdyDO2c5aZ2jQBX2dFzqIkBh2qSes_qIN0iQEBCSpNwJ5BijbpOlQwQTbcvfjWXEcP_2-qFOM40EI9LwqhfOXyhMkQhLPNlSPEAOW3DpNhHtOU6o9z8Y-fBRlqb-b1oPdA";

// Простой запрос для получения списка страниц
async function testApi() {
  try {
    // Запрос на получение списка страниц
    const query = `
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

    const response = await axios({
      url: wikiApiUrl,
      method: "post",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
      data: {
        query,
      },
    });

    console.log("API работает! Список страниц:");
    console.log(JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.error("Ошибка при тестировании API:", error.message);
    if (error.response) {
      console.error(
        "Детали ответа:",
        JSON.stringify(error.response.data, null, 2)
      );
    }
    return false;
  }
}

// Тестовый запрос на создание страницы
async function testCreatePage() {
  try {
    const testMutation = `
      mutation {
        pages {
          create(
            content: "# Тестовая страница\\n\\nЭто тестовая страница для проверки API."
            description: "Тестовая страница"
            editor: "markdown"
            isPublished: true
            isPrivate: false
            locale: "en"
            path: "test-page"
            tags: ["тест"]
            title: "Тестовая страница"
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
        query: testMutation,
      },
    });

    console.log("Создание страницы:");
    console.log(JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.error("Ошибка при создании тестовой страницы:", error.message);
    if (error.response) {
      console.error(
        "Детали ответа:",
        JSON.stringify(error.response.data, null, 2)
      );
    }
    return false;
  }
}

// Запускаем тесты
async function runTests() {
  console.log("Тестирование API Wiki.js...");

  // Проверяем соединение и базовый запрос
  const apiWorks = await testApi();

  if (apiWorks) {
    // Если базовый запрос работает, пробуем создать страницу
    await testCreatePage();
  }
}

runTests();
