const axios = require("axios");

// Базовый URL Wiki.js
const wikiBaseUrl = "http://localhost:8080";
const wikiApiUrl = "http://localhost:8080/graphql";

// Токен API
const apiToken =
  "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGkiOjEsImdycCI6MSwiaWF0IjoxNzQ3ODI3ODM4LCJleHAiOjE3NzkzODU0MzgsImF1ZCI6InVybjp3aWtpLmpzIiwiaXNzIjoidXJuOndpa2kuanMifQ.a7hDtaAK8EXWvTPJYlYHb8AFfuufJy1sIrwh-AWkRPjaYH-VqtTECLOiq_855Pc8xAu3xrmhUvGw_9L_SfuEc6iVCVBBpB-uFmXzFn7BkYHYqdkCXBtpYB56J6Wn7fQo2Bby6LA6RJ699Ti1r8dedZ4urLmYsNnoh-mbmjtZ6gBosrY2P1oQYu3V1PdZ2cX8UvEuUdKA9duq99oDVFTGIdyDO2c5aZ2jQBX2dFzqIkBh2qSes_qIN0iQEBCSpNwJ5BijbpOlQwQTbcvfjWXEcP_2-qFOM40EI9LwqhfOXyhMkQhLPNlSPEAOW3DpNhHtOU6o9z8Y-fBRlqb-b1oPdA";

// Проверка доступности сервера Wiki.js
async function checkServerStatus() {
  try {
    const response = await axios.get(wikiBaseUrl);
    console.log("✅ Wiki.js доступен");
    return true;
  } catch (error) {
    console.error("❌ Wiki.js недоступен:", error.message);
    console.log(
      "Убедитесь, что Docker запущен и контейнеры активны (npm run start)"
    );
    return false;
  }
}

// Проверка API
async function checkApiStatus() {
  try {
    // Запрос на получение информации о системе
    const query = `
      query {
        system {
          info {
            currentVersion
            latestVersion
            telemetry
            telemetryClientId
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

    if (response.data.errors) {
      console.error(
        "❌ API Wiki.js возвращает ошибки:",
        JSON.stringify(response.data.errors, null, 2)
      );
      return false;
    } else {
      const version = response.data.data.system.info.currentVersion;
      console.log(`✅ API Wiki.js работает (версия: ${version})`);
      return true;
    }
  } catch (error) {
    console.error("❌ API Wiki.js недоступен:", error.message);
    if (error.response) {
      console.error(
        "Детали ответа:",
        JSON.stringify(error.response.data, null, 2)
      );
    }
    return false;
  }
}

// Получение списка страниц
async function getPages() {
  try {
    // Запрос на получение списка страниц
    const query = `
      query {
        pages {
          list {
            id
            path
            title
            description
            createdAt
            updatedAt
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

    if (response.data.errors) {
      console.error(
        "❌ Ошибка при получении списка страниц:",
        JSON.stringify(response.data.errors, null, 2)
      );
      return [];
    } else {
      const pages = response.data.data.pages.list;
      console.log(`📑 Найдено страниц: ${pages.length}`);

      if (pages.length > 0) {
        console.log("\nСписок страниц:");
        pages.forEach((page) => {
          const dateCreated = new Date(page.createdAt).toLocaleString();
          console.log(
            `- ${page.title} (${page.path}), создана: ${dateCreated}`
          );
        });
      }

      return pages;
    }
  } catch (error) {
    console.error("❌ Ошибка при получении списка страниц:", error.message);
    if (error.response) {
      console.error(
        "Детали ответа:",
        JSON.stringify(error.response.data, null, 2)
      );
    }
    return [];
  }
}

// Получение списка локалей
async function getLocales() {
  try {
    // Запрос на получение списка локалей
    const query = `
      query {
        localization {
          locales {
            code
            name
            nativeName
            isRTL
            createdAt
            updatedAt
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

    if (response.data.errors) {
      console.error(
        "❌ Ошибка при получении списка локалей:",
        JSON.stringify(response.data.errors, null, 2)
      );
      return [];
    } else {
      const locales = response.data.data.localization.locales;
      console.log(`🌐 Доступные локали: ${locales.length}`);

      if (locales.length > 0) {
        console.log("\nСписок локалей:");
        locales.forEach((locale) => {
          console.log(
            `- ${locale.code}: ${locale.name} (${locale.nativeName})`
          );
        });
      }

      return locales;
    }
  } catch (error) {
    console.error("❌ Ошибка при получении списка локалей:", error.message);
    if (error.response) {
      console.error(
        "Детали ответа:",
        JSON.stringify(error.response.data, null, 2)
      );
    }
    return [];
  }
}

// Запуск проверок
async function runChecks() {
  console.log("=== Проверка статуса Wiki.js ===");

  const serverAvailable = await checkServerStatus();

  if (serverAvailable) {
    const apiWorks = await checkApiStatus();

    if (apiWorks) {
      console.log("\n=== Проверка содержимого Wiki.js ===");
      await getPages();

      console.log("\n=== Проверка локалей Wiki.js ===");
      const locales = await getLocales();

      // Подсказка о локали
      if (locales.length > 0) {
        const hasRuLocale = locales.some((locale) => locale.code === "ru");

        if (!hasRuLocale) {
          console.log("\n⚠️ Русская локаль ('ru') не настроена в Wiki.js");
          console.log(
            "Для использования русской локали в API запросах вам нужно:"
          );
          console.log("1. Войти в админ-панель Wiki.js");
          console.log("2. Перейти в Система > Локализация");
          console.log("3. Добавить русский язык");
          console.log(
            "4. После этого вы сможете использовать locale: 'ru' в скриптах миграции"
          );
        }
      }
    }
  }

  console.log("\n=== Рекомендации ===");
  console.log("1. Убедитесь, что Docker Desktop запущен");
  console.log("2. Запустите контейнеры: npm run start");
  console.log("3. Проверьте доступность Wiki.js: npm run check");
  console.log("4. Тестирование API: npm run test:api");
  console.log("5. Миграция одного файла: npm run migrate:single <путь>");
}

runChecks();
