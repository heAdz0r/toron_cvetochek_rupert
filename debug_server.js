// Упрощенный сервер для отладки поиска
import http from "http";
import { WikiJsClient } from "./wikijs_client.js";

// Создаем экземпляр клиента Wiki.js
const WIKIJS_BASE_URL = process.env.WIKIJS_BASE_URL || "http://localhost:8080";
const WIKIJS_TOKEN = process.env.WIKIJS_TOKEN || "";

// Инициализируем клиент Wiki.js
const wikiClient = new WikiJsClient(WIKIJS_BASE_URL, WIKIJS_TOKEN);

console.log(`Wiki.js API configured for: ${WIKIJS_BASE_URL}`);
console.log(`Token set: ${!!WIKIJS_TOKEN}`);

const server = http.createServer(async (req, res) => {
  console.log(
    `\n[${new Date().toISOString()}] Received request: ${req.method} ${req.url}`
  );

  // Добавляем CORS заголовки
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Обработка OPTIONS запроса
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Обработка запросов MCP
  if (req.url === "/mcp" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      try {
        console.log("\nRequest body:", body);
        const request = JSON.parse(body);
        console.log("Parsed request:", JSON.stringify(request, null, 2));

        // Проверяем формат JSON-RPC 2.0
        if (request.jsonrpc === "2.0") {
          if (request.method === "initialize") {
            // Обработка инициализации
            console.log("Handling initialize request");

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                jsonrpc: "2.0",
                id: request.id,
                result: {
                  protocolVersion: "2025-03-26",
                  capabilities: {
                    tools: { enabled: true },
                    prompts: { enabled: false },
                    resources: { enabled: true },
                    logging: { enabled: false },
                    roots: { listChanged: false },
                  },
                  serverInfo: {
                    name: "wikijs-mcp-debug",
                    version: "1.0.0",
                  },
                },
              })
            );
          } else if (
            request.method === "tools/list" ||
            request.method === "workspace/tools"
          ) {
            // Обработка запроса инструментов
            console.log("Handling tools list request");

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                jsonrpc: "2.0",
                id: request.id,
                result: {
                  tools: [
                    {
                      name: "mcp_wikijs_search",
                      description: "Поиск страниц в Wiki.js",
                      parameters: {
                        type: "object",
                        properties: {
                          query: {
                            type: "string",
                            description: "Поисковый запрос",
                          },
                        },
                        required: ["query"],
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
                  ],
                },
              })
            );
          } else if (
            request.method === "tools/execute" ||
            request.method === "workspace/executeCommand"
          ) {
            // Обработка выполнения команд
            const toolName = request.params.name || request.params.command;
            const args = request.params.arguments || {};

            console.log("Tool execution request:");
            console.log("- Tool name:", toolName);
            console.log("- Arguments:", JSON.stringify(args, null, 2));

            if (toolName === "mcp_wikijs_search") {
              if (!args.query) {
                console.log("Error: Missing query parameter");
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(
                  JSON.stringify({
                    jsonrpc: "2.0",
                    id: request.id,
                    error: {
                      code: -32602,
                      message: "Invalid params",
                      data: "Missing required parameter: query",
                    },
                  })
                );
                return;
              }

              try {
                console.log("Executing search with query:", args.query);
                const searchResults = await wikiClient.searchPages(args.query);
                console.log(
                  "Search results:",
                  searchResults ? searchResults.length : 0,
                  "pages found"
                );

                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(
                  JSON.stringify({
                    jsonrpc: "2.0",
                    id: request.id,
                    result: {
                      content: [
                        {
                          type: "text",
                          text: JSON.stringify(searchResults, null, 2),
                        },
                      ],
                    },
                  })
                );
              } catch (error) {
                console.error("Search error:", error);
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(
                  JSON.stringify({
                    jsonrpc: "2.0",
                    id: request.id,
                    error: {
                      code: -32603,
                      message: "Internal error",
                      data: error.message,
                    },
                  })
                );
              }
            } else {
              console.log("Unknown tool:", toolName);
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  jsonrpc: "2.0",
                  id: request.id,
                  error: {
                    code: -32601,
                    message: "Method not found",
                    data: `Unknown tool: ${toolName}`,
                  },
                })
              );
            }
          } else if (request.method === "notifications/initialized") {
            console.log("Handling notifications/initialized");
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                jsonrpc: "2.0",
                id: request.id,
              })
            );
          } else {
            console.log("Unknown method:", request.method);
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
          console.log("Invalid JSON-RPC request");
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              jsonrpc: "2.0",
              id: request.id || null,
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
  } else if (req.url === "/health" && req.method === "GET") {
    // Проверка здоровья
    console.log("Health check request");

    try {
      const status = await wikiClient.checkConnection();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: "ok",
          message: "Debug MCP Server is running",
          wiki_connection: status,
        })
      );
    } catch (error) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: "error",
          message: "Error checking Wiki.js connection",
          error: error.message,
        })
      );
    }
  } else {
    console.log("Unknown endpoint");
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "error",
        message: "Not found",
        endpoint: req.url,
      })
    );
  }
});

const PORT = 3200;
server.listen(PORT, () => {
  console.log(`Debug MCP Server running at http://localhost:${PORT}`);
  console.log(`Test the server: curl -s http://localhost:${PORT}/health`);
});
