// Скрипт для тестирования SSE соединения
import fetch from "node-fetch";
import http from "http";

/**
 * Тестирует HTTP соединение
 */
async function testHttpConnection() {
  try {
    console.log("Тестирование HTTP соединения...");

    // Проверка здоровья сервера
    const healthResponse = await fetch("http://localhost:3200/health");
    const healthData = await healthResponse.json();
    console.log("Health check:", healthData);

    // Тестирование initialize
    const initializeResponse = await fetch("http://localhost:3200/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        method: "initialize",
        params: {
          protocolVersion: "2025-03-26",
          capabilities: {
            tools: true,
            prompts: false,
            resources: true,
            logging: false,
            roots: {
              listChanged: false,
            },
          },
          clientInfo: {
            name: "test-client",
            version: "1.0.0",
          },
        },
        jsonrpc: "2.0",
        id: 1,
      }),
    });

    const initializeData = await initializeResponse.json();
    console.log(
      "Initialize response:",
      JSON.stringify(initializeData, null, 2)
    );

    // Тестирование запроса инструментов
    const toolsResponse = await fetch("http://localhost:3200/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        method: "workspace/tools",
        jsonrpc: "2.0",
        id: 2,
      }),
    });

    const toolsData = await toolsResponse.json();
    console.log("Tools response:", JSON.stringify(toolsData, null, 2));

    console.log("HTTP тесты завершены успешно!");
  } catch (error) {
    console.error("Ошибка при тестировании HTTP:", error);
  }
}

/**
 * Тестирует SSE соединение
 */
function testSSEConnection() {
  console.log("Тестирование SSE соединения...");

  // Опции запроса
  const options = {
    hostname: "localhost",
    port: 3200,
    path: "/mcp/events",
    method: "GET",
    headers: {
      Accept: "text/event-stream",
    },
  };

  // Создаем запрос
  const req = http.request(options, (res) => {
    console.log("SSE статус:", res.statusCode);
    console.log("SSE заголовки:", res.headers);

    if (res.statusCode !== 200) {
      console.error(`Ошибка SSE соединения: статус ${res.statusCode}`);
      return;
    }

    if (res.headers["content-type"] !== "text/event-stream") {
      console.error(
        `Ошибка SSE соединения: неверный content-type ${res.headers["content-type"]}`
      );
      return;
    }

    console.log("SSE соединение установлено успешно!");

    res.on("data", (chunk) => {
      console.log("SSE данные получены:", chunk.toString());
    });

    // Закрыть соединение через 5 секунд
    setTimeout(() => {
      console.log("Закрытие SSE соединения...");
      req.destroy();
    }, 5000);
  });

  req.on("error", (error) => {
    console.error("Ошибка SSE соединения:", error);
  });

  req.end();
}

// Запускаем тесты
async function runTests() {
  await testHttpConnection();
  testSSEConnection();
}

runTests();
