#!/usr/bin/env node

/**
 * MCP-сервер Wiki.js для работы через stdio (аналогично GitHub MCP)
 */

import fetch from "node-fetch";
import { wikiJsTools } from "./dist/tools.js";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

// Настройки
const PORT = process.env.PORT || 8000;
const WIKIJS_BASE_URL = process.env.WIKIJS_BASE_URL || "http://localhost:8080";
const WIKIJS_TOKEN = process.env.WIKIJS_TOKEN || "";
const API_URL = `${WIKIJS_BASE_URL}/graphql`;

console.error("Wiki.js MCP Server running on stdio");
console.error(`Using Wiki.js API at ${API_URL}`);

// Функция для проверки подключения к Wiki.js
async function checkConnection() {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${WIKIJS_TOKEN}`,
      },
      body: JSON.stringify({
        query: `{ pages { list { id } } }`,
      }),
    });

    const data = await response.json();
    return data && !data.errors;
  } catch (error) {
    console.error(`Ошибка при проверке соединения с Wiki.js: ${error.message}`);
    return false;
  }
}

// Проверяем соединение при запуске
checkConnection().then((isConnected) => {
  if (isConnected) {
    console.error("✅ Соединение с Wiki.js установлено");
  } else {
    console.error("⚠️ Не удалось подключиться к Wiki.js API");
  }
});

// Обработка запросов через stdio
process.stdin.setEncoding("utf8");

let inputBuffer = "";

process.stdin.on("data", async (chunk) => {
  inputBuffer += chunk;
  if (inputBuffer.includes("\n")) {
    const lines = inputBuffer.split("\n");
    inputBuffer = lines.pop(); // Оставляем неполную строку в буфере

    for (const line of lines) {
      if (line.trim()) {
        await processRequest(line);
      }
    }
  }
});

async function processRequest(requestStr) {
  try {
    const request = JSON.parse(requestStr);

    if (request.type === "query") {
      if (request.query === "tools") {
        // Отправляем список инструментов
        // Добавляем идентификатор model_context_protocol к инструментам для совместимости
        const toolsWithMcp = {
          model_context_protocol: "0.1",
          tools: wikiJsTools,
        };
        sendResponse({ id: request.id, type: "response", body: toolsWithMcp });
      } else {
        sendResponse({
          id: request.id,
          type: "error",
          body: { message: `Неизвестный запрос: ${request.query}` },
        });
      }
    } else if (request.type === "function_call") {
      // Выполняем вызов функции
      const toolName = request.name;
      const params = request.parameters;

      await executeFunction(request.id, toolName, params);
    } else {
      sendResponse({
        id: request.id,
        type: "error",
        body: { message: `Неизвестный тип запроса: ${request.type}` },
      });
    }
  } catch (error) {
    console.error(`Ошибка обработки запроса: ${error.message}`);
    try {
      const request = JSON.parse(requestStr);
      sendResponse({
        id: request.id,
        type: "error",
        body: { message: `Ошибка обработки запроса: ${error.message}` },
      });
    } catch {
      console.error("Не удалось отправить ответ об ошибке");
    }
  }
}

async function executeFunction(requestId, functionName, parameters) {
  console.error(
    `Выполнение функции ${functionName} с параметрами:`,
    parameters
  );

  try {
    let result;
    switch (functionName) {
      case "list_pages":
        result = await listPages(parameters.limit, parameters.orderBy);
        break;
      case "search_pages":
        result = await searchPages(parameters.query, parameters.limit);
        break;
      case "get_page":
        result = await getPage(parameters.id);
        break;
      case "get_page_content":
        result = await getPageContent(parameters.id);
        break;
      // Добавьте здесь остальные функции
      default:
        throw new Error(`Неизвестная функция: ${functionName}`);
    }

    sendResponse({ id: requestId, type: "response", body: result });
  } catch (error) {
    console.error(
      `Ошибка выполнения функции ${functionName}: ${error.message}`
    );
    sendResponse({
      id: requestId,
      type: "error",
      body: {
        message: `Ошибка выполнения функции ${functionName}: ${error.message}`,
      },
    });
  }
}

// Отправка ответа через stdout
function sendResponse(response) {
  process.stdout.write(JSON.stringify(response) + "\n");
}

// API функции
async function graphqlRequest(query, variables = {}) {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${WIKIJS_TOKEN}`,
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    const result = await response.json();

    if (result.errors) {
      throw new Error(result.errors[0].message);
    }

    return result.data;
  } catch (error) {
    console.error(`GraphQL request error: ${error.message}`);
    throw error;
  }
}

async function listPages(limit = 50, orderBy = "TITLE") {
  const query = `
    query ($limit: Int, $orderBy: PageOrderBy) {
      pages {
        list(limit: $limit, orderBy: $orderBy) {
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

  const result = await graphqlRequest(query, { limit, orderBy });
  return result.pages.list;
}

async function searchPages(searchQuery, limit = 10) {
  const query = `
    query ($query: String!, $limit: Int) {
      pages {
        search(query: $query, limit: $limit) {
          id
          path
          title
          description
        }
      }
    }
  `;

  const result = await graphqlRequest(query, { query: searchQuery, limit });
  return result.pages.search;
}

async function getPage(id) {
  const query = `
    query ($id: Int!) {
      pages {
        single(id: $id) {
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

  const result = await graphqlRequest(query, { id });
  return result.pages.single;
}

async function getPageContent(id) {
  const query = `
    query ($id: Int!) {
      pages {
        single(id: $id) {
          content
        }
      }
    }
  `;

  const result = await graphqlRequest(query, { id });
  return { content: result.pages.single.content };
}

// Обработка сигналов для корректного завершения
process.on("SIGINT", () => {
  console.error("Получен сигнал SIGINT, завершаем работу...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.error("Получен сигнал SIGTERM, завершаем работу...");
  process.exit(0);
});
