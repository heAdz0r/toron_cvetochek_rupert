#!/usr/bin/env node

/**
 * HTTP-сервер MCP для интеграции Wiki.js с Cursor
 * Использует Model Context Protocol для предоставления инструментов работы с Wiki.js
 */

import http from "http";
import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import fetch from "node-fetch";

// Получаем текущую директорию
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Импортируем инструменты Wiki.js
import { wikiJsTools } from "./dist/tools.js";

// Настройки сервера
const PORT = process.env.PORT || 3200;
const WIKIJS_BASE_URL = process.env.WIKIJS_BASE_URL || "http://localhost:8080";
const WIKIJS_TOKEN = process.env.WIKIJS_TOKEN || "";
const API_URL = `${WIKIJS_BASE_URL}/graphql`;

console.log(`Wiki.js MCP HTTP Server starting on port ${PORT}`);
console.log(`Using Wiki.js API at ${API_URL}`);

// Хранилище для SSE клиентов
const sseClients = new Set();

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
        query: `{ pages { list(limit: 1) { id } } }`,
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
    console.log("✅ Соединение с Wiki.js установлено успешно");
  } else {
    console.error("⚠️ Не удалось подключиться к Wiki.js API");
  }
});

// HTTP сервер для обработки MCP запросов
const server = http.createServer(async (req, res) => {
  // Добавляем CORS заголовки для интеграции с Cursor
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Обработка предварительных запросов CORS
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Обработка SSE подключения
  if (req.url === "/mcp/events" && req.method === "GET") {
    // Настройка соединения SSE
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    // Отправка начального сообщения
    res.write("event: connected\ndata: {}\n\n");

    // Добавление клиента в список активных
    sseClients.add(res);

    // Обработка закрытия соединения
    req.on("close", () => {
      sseClients.delete(res);
      console.log("SSE клиент отключился");
    });

    return;
  }

  // Проверка доступности сервера
  if (req.url === "/health" && req.method === "GET") {
    const isConnected = await checkConnection();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: isConnected ? "ok" : "error",
        message: isConnected
          ? "MCP Server is running and connected to Wiki.js"
          : "MCP Server is running but Wiki.js connection failed",
      })
    );
    return;
  }

  // Получение списка инструментов
  if (req.url === "/tools" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(wikiJsTools));
    return;
  }

  // Обработка MCP запросов
  if (req.url === "/mcp" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      try {
        const request = JSON.parse(body);
        console.log("Получен MCP запрос:", JSON.stringify(request, null, 2));

        // Обработка JSON-RPC 2.0 запросов
        if (request.jsonrpc === "2.0") {
          if (request.method === "initialize") {
            // Ответ на инициализацию сервера
            sendJSONResponse(res, {
              jsonrpc: "2.0",
              id: request.id,
              result: {
                protocolVersion:
                  request.params?.protocolVersion || "2025-03-26",
                capabilities: {
                  tools: { enabled: true },
                  prompts: { enabled: false },
                  resources: { enabled: true },
                  logging: { enabled: false },
                  roots: { listChanged: false },
                },
                serverInfo: {
                  name: "wikijs-mcp",
                  version: "1.0.0",
                },
              },
            });
          } else if (
            request.method === "workspace/tools" ||
            request.method === "tools/list"
          ) {
            // Преобразуем инструменты в формат, ожидаемый Cursor
            const toolsForCursor = wikiJsTools.map((tool) => ({
              name: tool.function.name,
              description: tool.function.description,
              inputSchema: tool.function.parameters,
              outputSchema: { type: "object" },
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
            }));

            sendJSONResponse(res, {
              jsonrpc: "2.0",
              id: request.id,
              result: {
                tools: toolsForCursor,
              },
            });
          } else if (
            request.method === "workspace/executeCommand" ||
            request.method === "tools/execute"
          ) {
            // Обработка выполнения команд
            const command = request.params.command || request.params.name;
            const args =
              request.params.arguments || request.params.params || {};

            console.log(`Выполнение команды: ${command} с аргументами:`, args);

            try {
              // Импортируем API для вызова инструментов
              const { default: WikiJsAPI } = await import("./dist/api.js");
              const api = new WikiJsAPI(WIKIJS_BASE_URL, WIKIJS_TOKEN);

              // Выполняем команду
              const result = await executeWikiJsCommand(api, command, args);

              sendJSONResponse(res, {
                jsonrpc: "2.0",
                id: request.id,
                result: {
                  content: [
                    { type: "text", text: JSON.stringify(result, null, 2) },
                  ],
                },
              });
            } catch (error) {
              console.error(`Ошибка выполнения команды ${command}:`, error);
              sendJSONResponse(res, {
                jsonrpc: "2.0",
                id: request.id,
                error: {
                  code: -32603,
                  message: "Internal error",
                  data: error.message,
                },
              });
            }
          } else {
            // Неизвестный метод
            sendJSONResponse(res, {
              jsonrpc: "2.0",
              id: request.id,
              error: {
                code: -32601,
                message: "Method not found",
              },
            });
          }
        } else {
          // Обработка нестандартных запросов
          sendJSONResponse(res, {
            error: {
              message: "Invalid request format, expected JSON-RPC 2.0",
            },
          });
        }
      } catch (error) {
        console.error("Ошибка обработки запроса:", error);
        sendJSONResponse(res, {
          error: {
            message: `Error processing request: ${error.message}`,
          },
        });
      }
    });
  } else {
    // Ответ на неизвестные запросы
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error: { message: "Not found" },
      })
    );
  }
});

// Функция для отправки JSON-ответа
function sendJSONResponse(res, data) {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

// Функция для отправки SSE событий всем клиентам
function sendSSEEvent(eventName, data) {
  const eventString = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    client.write(eventString);
  }
}

// Функция для выполнения команд Wiki.js
async function executeWikiJsCommand(api, command, params) {
  switch (command) {
    case "mcp_wikijs_get_page":
      return await api.getPage(params.id);
    case "mcp_wikijs_search":
      return await api.searchPages(params.query, params.limit);
    case "mcp_wikijs_list_all":
      return await api.listPages(params.limit, params.orderBy);
    // Добавьте здесь обработку других команд
    default:
      throw new Error(`Неизвестная команда: ${command}`);
  }
}

// Запуск сервера
server.listen(PORT, () => {
  console.log(`Wiki.js MCP HTTP Server запущен на порту ${PORT}`);
});

// Экспортируем сервер для возможности его закрытия
export default server;
