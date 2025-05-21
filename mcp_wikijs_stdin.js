#!/usr/bin/env node

/**
 * MCP-сервер Wiki.js для Cursor - улучшенная версия
 * Реализация MCP протокола через stdio
 */

import fetch from "node-fetch";
import { wikiJsTools } from "./dist/tools.js";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

// Настройки
const WIKIJS_BASE_URL = process.env.WIKIJS_BASE_URL || "http://localhost:8080";
const WIKIJS_TOKEN = process.env.WIKIJS_TOKEN || "";
const API_URL = `${WIKIJS_BASE_URL}/graphql`;

console.error("Wiki.js MCP Server (stdin) running");
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

  // Проверяем наличие полной строки JSON
  if (inputBuffer.includes("\n")) {
    const lines = inputBuffer.split("\n");
    inputBuffer = lines.pop() || ""; // Оставляем неполную строку в буфере

    for (const line of lines) {
      if (line.trim()) {
        try {
          await processRequest(line);
        } catch (error) {
          console.error(`Ошибка обработки запроса: ${error}`);
        }
      }
    }
  }
});

async function processRequest(requestStr) {
  try {
    const request = JSON.parse(requestStr);
    console.error(`Получен запрос: ${JSON.stringify(request, null, 2)}`);

    if (request.type === "query") {
      if (request.query === "tools") {
        // Обновленный формат в соответствии с последней версией протокола MCP
        sendResponse({
          id: request.id,
          type: "response",
          body: {
            model_context_protocol: {
              version: "0.1",
              capabilities: ["tools"],
            },
            tools: wikiJsTools.map((tool) => ({
              type: "function",
              function: {
                ...tool.function,
                metadata: {
                  title: tool.function.name
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (c) => c.toUpperCase()),
                  description: tool.function.description,
                  ui: {
                    icon: "document",
                    ui_type: "default",
                  },
                },
              },
            })),
          },
        });
      } else if (request.query === "metadata") {
        // Отвечаем на запрос метаданных
        sendResponse({
          id: request.id,
          type: "response",
          body: {
            model_context_protocol: {
              version: "0.1",
              capabilities: ["tools"],
            },
            metadata: {
              title: "Wiki.js MCP",
              description: "Интеграция Wiki.js для Cursor через MCP протокол",
              version: "1.0.0",
              icon: "document",
            },
          },
        });
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

// ... existing code ...
