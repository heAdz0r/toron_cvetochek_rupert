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
import fs from "fs";
import { ZodError } from "zod";

// Получаем текущую директорию
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Импортируем инструменты Wiki.js
import { wikiJsTools, wikiJsToolsWithImpl } from "./dist/tools.js";

// Импортируем схемы Zod для валидации
import {
  safeValidateToolParams,
  safeValidateToolResult,
} from "./dist/schemas.js";

// Настройки сервера
const PORT = process.env.PORT || 3200;
const WIKIJS_BASE_URL = process.env.WIKIJS_BASE_URL || "http://localhost:8080";
const WIKIJS_TOKEN = process.env.WIKIJS_TOKEN || "";
const API_URL = `${WIKIJS_BASE_URL}/graphql`;

// Создаем лог-файл сервера
const logFile = fs.createWriteStream(path.join(__dirname, "server.log"), {
  flags: "a",
});

// Хранилище для SSE клиентов
const sseClients = new Set();

// Функция для логирования
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  logFile.write(logMessage + "\n");
}

// Проверяем, доступен ли API
async function checkApiAccess() {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${WIKIJS_TOKEN}`,
      },
      body: JSON.stringify({
        query: `query { pages { list { id, title } } }`,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.errors) {
        log(`⚠️ Ошибка API: ${JSON.stringify(data.errors)}`);
        return false;
      }
      return true;
    }
    return false;
  } catch (error) {
    log(`⚠️ Ошибка подключения к Wiki.js API: ${error.message}`);
    return false;
  }
}

// Получаем определения инструментов для MCP
const tools = wikiJsTools.map((tool) => ({
  function: tool.function,
}));

// Имена доступных инструментов
const toolNames = tools.map((tool) => tool.function.name);

// Преобразуем инструменты в объект для быстрого доступа по имени
const toolsMap = wikiJsToolsWithImpl.reduce((acc, tool) => {
  acc[tool.function.name] = tool.implementation;
  return acc;
}, {});

// Функция для отправки SSE события всем клиентам
function sendSSEEvent(eventName, data) {
  const eventString = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    client.write(eventString);
  }
}

// Функция для отправки JSON-ответа
function sendJSONResponse(res, data) {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

// Обработка запросов к MCP HTTP серверу
const server = http.createServer(async (req, res) => {
  // Настройка CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Обработка OPTIONS запроса (CORS preflight)
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Логируем запрос
  log(`📥 ${req.method} ${req.url}`);

  // Разбираем URL для извлечения пути и параметров
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // Обработка MCP запросов в формате JSON-RPC для Cursor
  if (pathname === "/mcp" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      try {
        const request = JSON.parse(body);
        log(`📩 Получен JSON-RPC запрос: ${JSON.stringify(request, null, 2)}`);

        // Обработка JSON-RPC 2.0 запросов
        if (request.jsonrpc === "2.0") {
          if (request.method === "initialize") {
            // Ответ на инициализацию сервера
            sendJSONResponse(res, {
              jsonrpc: "2.0",
              id: request.id,
              result: {
                protocolVersion:
                  request.params?.protocolVersion || "2023-07-01",
                capabilities: {
                  tools: { enabled: true },
                  prompts: { enabled: false },
                  resources: { enabled: false },
                  logging: { enabled: true },
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
            const toolName = request.params.command || request.params.name;
            const params =
              request.params.arguments || request.params.params || {};

            log(
              `🔧 Выполнение инструмента: ${toolName} с параметрами: ${JSON.stringify(
                params
              )}`
            );

            try {
              // Валидация параметров
              const validationResult = safeValidateToolParams(toolName, params);
              if (!validationResult.success) {
                log(
                  `❌ Ошибка валидации параметров для ${toolName}: ${JSON.stringify(
                    validationResult.error.format()
                  )}`
                );

                sendJSONResponse(res, {
                  jsonrpc: "2.0",
                  id: request.id,
                  error: {
                    code: -32602,
                    message: "Invalid params",
                    data: validationResult.error.format(),
                  },
                });
                return;
              }

              // Вызываем инструмент
              const implementation = toolsMap[toolName];
              if (!implementation) {
                throw new Error(
                  `Реализация инструмента ${toolName} не найдена`
                );
              }

              const result = await implementation(validationResult.data);

              // Валидируем результат
              const resultValidation = safeValidateToolResult(toolName, result);
              if (!resultValidation.success) {
                log(
                  `⚠️ Предупреждение: результат инструмента ${toolName} не соответствует схеме: ${JSON.stringify(
                    resultValidation.error
                  )}`
                );
              }

              sendJSONResponse(res, {
                jsonrpc: "2.0",
                id: request.id,
                result: {
                  content:
                    typeof result === "string"
                      ? [{ type: "text", text: result }]
                      : [
                          {
                            type: "text",
                            text: JSON.stringify(result, null, 2),
                          },
                        ],
                },
              });

              log(`✅ Инструмент ${toolName} успешно выполнен`);

              // Отправляем событие о выполнении команды
              sendSSEEvent("command_executed", {
                tool: toolName,
                status: "success",
              });
            } catch (error) {
              log(
                `❌ Ошибка при выполнении инструмента ${toolName}: ${error.message}`
              );

              sendJSONResponse(res, {
                jsonrpc: "2.0",
                id: request.id,
                error: {
                  code: -32603,
                  message: "Internal error",
                  data: error.message,
                },
              });

              // Отправляем событие об ошибке
              sendSSEEvent("command_error", {
                tool: toolName,
                error: error.message,
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
        log(`❌ Ошибка обработки JSON-RPC запроса: ${error.message}`);
        sendJSONResponse(res, {
          error: {
            message: `Error processing request: ${error.message}`,
          },
        });
      }
    });
    return;
  }

  // Обработка SSE для событий MCP
  if (pathname === "/mcp/events" && req.method === "GET") {
    log(`📡 Установка SSE соединения для событий MCP`);

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
      log(`📴 SSE клиент отключился`);
    });

    return;
  }

  // Проверка состояния сервера
  if (pathname === "/health") {
    const isApiAccessible = await checkApiAccess();
    const status = isApiAccessible ? "ok" : "error";
    const message = isApiAccessible
      ? "MCP Server is running and connected to Wiki.js"
      : "MCP Server is running but cannot connect to Wiki.js API";

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status,
        message,
      })
    );
    return;
  }

  // Если запрос к корню, возвращаем информацию о сервере
  if (pathname === "/" || pathname === "") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        name: "WikiJs MCP HTTP Server",
        version: "1.0.0",
        endpoints: {
          "/health": "Проверка состояния сервера",
          "/tools": "Список доступных инструментов",
          "/mcp": "MCP JSON-RPC endpoint для Cursor",
          "/mcp/events": "SSE endpoint для событий MCP",
          "/{tool_name}": "Прямой вызов инструмента по имени",
        },
      })
    );
    return;
  }

  // Получение списка инструментов
  if (pathname === "/tools") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(tools));
    return;
  }

  // Извлекаем имя инструмента из URL
  const toolName = pathname.substring(1); // Убираем ведущий "/"

  // Проверяем, существует ли инструмент
  if (!toolNames.includes(toolName)) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error: `Инструмент "${toolName}" не найден`,
        available_tools: toolNames,
      })
    );
    return;
  }

  try {
    // Объект для хранения параметров инструмента
    let params = {};

    // Получаем параметры в зависимости от метода запроса
    if (req.method === "GET") {
      // Для GET параметры берутся из URL
      for (const [key, value] of url.searchParams.entries()) {
        // Преобразуем строковые параметры в соответствующие типы
        if (value === "true") {
          params[key] = true;
        } else if (value === "false") {
          params[key] = false;
        } else if (!isNaN(Number(value)) && value.trim() !== "") {
          params[key] = Number(value);
        } else {
          params[key] = value;
        }
      }
    } else if (req.method === "POST") {
      // Для POST параметры берутся из тела запроса
      const bodyChunks = [];
      req.on("data", (chunk) => {
        bodyChunks.push(chunk);
      });

      await new Promise((resolve, reject) => {
        req.on("end", resolve);
        req.on("error", reject);
      });

      const bodyRaw = Buffer.concat(bodyChunks).toString();
      if (bodyRaw) {
        try {
          params = JSON.parse(bodyRaw);
        } catch (e) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              error: "Неверный формат JSON в теле запроса",
            })
          );
          return;
        }
      }
    } else {
      // Неподдерживаемый метод запроса
      res.writeHead(405, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: `Метод ${req.method} не поддерживается`,
        })
      );
      return;
    }

    // Валидируем параметры с помощью Zod
    const validationResult = safeValidateToolParams(toolName, params);

    if (!validationResult.success) {
      log(
        `❌ Ошибка валидации параметров для ${toolName}: ${JSON.stringify(
          validationResult.error.format()
        )}`
      );

      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: "Ошибка валидации параметров",
          details: validationResult.error.format(),
        })
      );
      return;
    }

    // Используем валидированные параметры
    params = validationResult.data;

    // Логируем вызов инструмента
    log(
      `🔧 Вызов инструмента ${toolName} с параметрами: ${JSON.stringify(
        params
      )}`
    );

    // Вызываем инструмент
    const implementation = toolsMap[toolName];
    if (!implementation) {
      throw new Error(`Реализация инструмента ${toolName} не найдена`);
    }

    const result = await implementation(params);

    // Валидируем результат с помощью Zod
    const resultValidation = safeValidateToolResult(toolName, result);

    if (!resultValidation.success) {
      log(
        `⚠️ Предупреждение: результат инструмента ${toolName} не соответствует схеме: ${JSON.stringify(
          resultValidation.error
        )}`
      );
      // Продолжаем выполнение, но логируем ошибку
    }

    // Возвращаем результат
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(result));

    // Логируем успешное выполнение
    log(`✅ Инструмент ${toolName} успешно выполнен`);

    // Отправляем событие о выполнении инструмента
    sendSSEEvent("tool_executed", {
      tool: toolName,
      status: "success",
    });
  } catch (error) {
    // Обрабатываем ошибки Zod отдельно
    if (error instanceof ZodError) {
      log(`❌ Ошибка валидации: ${error.message}`);
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: "Ошибка валидации",
          details: error.format(),
        })
      );
      return;
    }

    // Обрабатываем остальные ошибки
    log(`❌ Ошибка при выполнении инструмента ${toolName}: ${error.message}`);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error: `Ошибка при выполнении инструмента: ${error.message}`,
      })
    );

    // Отправляем событие об ошибке
    sendSSEEvent("tool_error", {
      tool: toolName,
      error: error.message,
    });
  }
});

// Запускаем сервер
server.listen(PORT, async () => {
  log(`🚀 MCP HTTP сервер запущен на порту ${PORT}`);
  log(`🔗 Подключение к Wiki.js API: ${API_URL}`);
  log(`🔌 MCP JSON-RPC endpoint: http://localhost:${PORT}/mcp`);
  log(`📡 MCP SSE events endpoint: http://localhost:${PORT}/mcp/events`);

  const isApiAccessible = await checkApiAccess();
  if (isApiAccessible) {
    log(`✅ Подключение к Wiki.js API установлено успешно`);
    log(`📋 Доступно ${tools.length} инструментов: ${toolNames.join(", ")}`);
  } else {
    log(`⚠️ Не удалось подключиться к Wiki.js API. Проверьте настройки.`);
  }
});
