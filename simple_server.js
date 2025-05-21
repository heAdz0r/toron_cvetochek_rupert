// Simple test HTTP server
import http from "http";
import { WikiJsClient } from "./wikijs_client.js";

// Создаем экземпляр клиента Wiki.js
const WIKIJS_BASE_URL = process.env.WIKIJS_BASE_URL || "http://localhost:8080";
const WIKIJS_TOKEN = process.env.WIKIJS_TOKEN || "";

// Инициализируем клиент Wiki.js
const wikiClient = new WikiJsClient(WIKIJS_BASE_URL, WIKIJS_TOKEN);

console.log(`Wiki.js API configured for: ${WIKIJS_BASE_URL}`);

// Хранилище для SSE клиентов
const sseClients = new Set();

const server = http.createServer((req, res) => {
  // Add CORS headers for MCP
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle OPTIONS request for CORS preflight
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

  // Handle MCP protocol requests
  if (req.url === "/mcp" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", () => {
      try {
        const request = JSON.parse(body);
        console.log("Received MCP request:", JSON.stringify(request, null, 2));

        // Обработка JSON-RPC 2.0 запросов
        if (request.jsonrpc === "2.0") {
          if (request.method === "initialize") {
            // Ответ на инициализацию сервера
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                jsonrpc: "2.0",
                id: request.id,
                result: {
                  protocolVersion:
                    request.params?.protocolVersion || "2025-03-26",
                  capabilities: {
                    tools: {
                      enabled: true,
                    },
                    prompts: {
                      enabled: false,
                    },
                    resources: {
                      enabled: true,
                    },
                    logging: {
                      enabled: false,
                    },
                    roots: {
                      listChanged: false,
                    },
                  },
                  serverInfo: {
                    name: "wikijs-mcp",
                    version: "1.0.0",
                  },
                },
              })
            );
          } else if (
            request.method === "workspace/tools" ||
            request.method === "tools/list"
          ) {
            // Ответ на запрос инструментов
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                jsonrpc: "2.0",
                id: request.id,
                result: {
                  tools: [
                    {
                      name: "mcp_wikijs_get_page",
                      description: "Получает страницу из Wiki.js",
                      inputSchema: {
                        type: "object",
                        properties: {
                          id: {
                            type: "number",
                            description: "ID страницы",
                          },
                        },
                        required: ["id"],
                      },
                      outputSchema: {
                        type: "object",
                        properties: {
                          id: { type: "number" },
                          title: { type: "string" },
                          content: { type: "string" },
                          path: { type: "string" },
                          description: { type: "string" },
                        },
                      },
                      metadata: {
                        title: "Получить страницу",
                        description:
                          "Получает содержимое страницы Wiki.js по её ID",
                        ui: {
                          icon: "document",
                          ui_type: "default",
                        },
                      },
                    },
                    {
                      name: "mcp_wikijs_search",
                      description: "Поиск страниц в Wiki.js",
                      inputSchema: {
                        type: "object",
                        properties: {
                          query: {
                            type: "string",
                            description: "Поисковый запрос",
                          },
                        },
                        required: ["query"],
                      },
                      outputSchema: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "number" },
                            title: { type: "string" },
                            description: { type: "string" },
                            path: { type: "string" },
                          },
                        },
                      },
                      metadata: {
                        title: "Поиск",
                        description: "Поиск страниц по ключевым словам",
                        ui: {
                          icon: "search",
                          ui_type: "default",
                        },
                      },
                    },
                    {
                      name: "mcp_wikijs_list_all",
                      description: "Получает список всех страниц в Wiki.js",
                      inputSchema: {
                        type: "object",
                        properties: {},
                      },
                      outputSchema: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "number" },
                            title: { type: "string" },
                            path: { type: "string" },
                          },
                        },
                      },
                      metadata: {
                        title: "Все страницы",
                        description: "Получает список всех страниц в Wiki.js",
                        ui: {
                          icon: "list",
                          ui_type: "default",
                        },
                      },
                    },
                  ],
                },
              })
            );
          } else if (
            request.method === "workspace/executeCommand" ||
            request.method === "tools/execute"
          ) {
            // Обработка выполнения команд
            const command = request.params.command || request.params.name;
            const args = request.params.arguments || [];

            console.log(`Executing command: ${command} with args:`, args);

            // Обработка команд асинхронно
            handleCommand(command, args[0] || {})
              .then((result) => {
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(
                  JSON.stringify({
                    jsonrpc: "2.0",
                    id: request.id,
                    result: {
                      content: [
                        { type: "text", text: JSON.stringify(result, null, 2) },
                      ],
                    },
                  })
                );
              })
              .catch((err) => {
                console.error(`Error executing command ${command}:`, err);
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(
                  JSON.stringify({
                    jsonrpc: "2.0",
                    id: request.id,
                    error: {
                      code: -32603,
                      message: "Internal error",
                      data: err.message,
                    },
                  })
                );
              });
          } else if (request.method === "notifications/initialized") {
            // Обработка уведомления об инициализации
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                jsonrpc: "2.0",
                id: request.id,
              })
            );
          } else {
            // Обработка неизвестного метода
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                jsonrpc: "2.0",
                id: request.id,
                error: {
                  code: -32601,
                  message: "Method not found",
                  data: `Unknown method: ${request.method}`,
                },
              })
            );
          }
        } else {
          // Обратная совместимость с предыдущим форматом запросов
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              jsonrpc: "2.0",
              id: request.id || 0,
              error: {
                code: -32600,
                message: "Invalid Request",
                data: 'Expected jsonrpc:"2.0" in request',
              },
            })
          );
        }
      } catch (err) {
        console.error("Error processing request:", err);
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            jsonrpc: "2.0",
            id: null,
            error: {
              code: -32700,
              message: "Parse error",
              data: err.message,
            },
          })
        );
      }
    });
  } else if (req.url === "/health") {
    // Health check endpoint
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        message: "MCP Server is running",
        wiki_url: WIKIJS_BASE_URL,
        has_token: !!WIKIJS_TOKEN,
      })
    );
  } else {
    // Default response for other routes
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        message: "Simple server running",
        url: req.url,
      })
    );
  }
});

/**
 * Отправляет событие всем подключенным SSE клиентам
 * @param {string} eventName - Имя события
 * @param {Object} data - Данные события
 */
function sendSSEEvent(eventName, data) {
  const eventString = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;

  sseClients.forEach((client) => {
    try {
      client.write(eventString);
    } catch (error) {
      console.error("Ошибка отправки SSE события:", error);
      sseClients.delete(client);
    }
  });
}

/**
 * Обработчик команд Wiki.js API
 * @param {string} command - Имя команды
 * @param {Object} params - Параметры команды
 * @returns {Promise<Object>} - Результат выполнения команды
 */
async function handleCommand(command, params) {
  try {
    switch (command) {
      case "mcp_wikijs_get_page":
        if (!params.id) {
          throw new Error("ID страницы не указан");
        }
        return await wikiClient.getPageById(params.id);

      case "mcp_wikijs_search":
        if (!params.query) {
          throw new Error("Поисковый запрос не указан");
        }
        return await wikiClient.searchPages(params.query);

      case "mcp_wikijs_list_all":
        return await wikiClient.getAllPages();

      default:
        throw new Error(`Неизвестная команда: ${command}`);
    }
  } catch (error) {
    console.error(`Error in command handler: ${error.message}`);
    throw error;
  }
}

const PORT = 3200;
server.listen(PORT, () => {
  console.log(`MCP Server running at http://localhost:${PORT}`);
  console.log(`Test the server: curl -s http://localhost:${PORT}/health`);
});

// Экспортируем сервер для использования в других модулях
export default server;
