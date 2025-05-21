// Совместимый MCP сервер с поддержкой разных версий протокола
import http from "http";
import { WikiJsClient } from "./wikijs_client.js";

// Создаем экземпляр клиента Wiki.js
const WIKIJS_BASE_URL = process.env.WIKIJS_BASE_URL || "http://localhost:8080";
const WIKIJS_TOKEN = process.env.WIKIJS_TOKEN || "";

// Инициализируем клиент Wiki.js
const wikiClient = new WikiJsClient(WIKIJS_BASE_URL, WIKIJS_TOKEN);

console.log(`Wiki.js API configured for: ${WIKIJS_BASE_URL}`);

// Порт сервера
const PORT = 3200;

// Список инструментов
const tools = [
  {
    name: "mcp_wikijs_get_page",
    description: "Получает страницу из Wiki.js",
    parameters: {
      type: "object",
      properties: {
        id: {
          type: "number",
          description: "ID страницы",
        },
      },
      required: ["id"],
    },
    metadata: {
      title: "Получить страницу",
      description: "Получает содержимое страницы Wiki.js по её ID",
      ui: {
        icon: "document",
        ui_type: "default",
      },
    },
  },
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
  {
    name: "mcp_wikijs_list_all",
    description: "Получает список всех страниц в Wiki.js",
    parameters: {
      type: "object",
      properties: {},
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
];

// Создаем HTTP сервер
const server = http.createServer((req, res) => {
  // Добавляем CORS заголовки
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Обработка CORS preflight запросов
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Обработка SSE соединения
  if (
    req.url === "/mcp/events" ||
    req.url === "/events" ||
    req.url === "/sse"
  ) {
    handleSSE(req, res);
    return;
  }

  // Обработка MCP запросов
  if (
    (req.url === "/mcp" || req.url === "/api" || req.url === "/") &&
    req.method === "POST"
  ) {
    handleMCPRequest(req, res);
    return;
  }

  // Обработка проверки здоровья
  if (req.url === "/health" || req.url === "/status") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        message: "MCP Server is running",
        wiki_url: WIKIJS_BASE_URL,
        has_token: !!WIKIJS_TOKEN,
        version: "1.0.0",
      })
    );
    return;
  }

  // Обработка всех остальных запросов
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      status: "ok",
      message: "MCP Server is running",
      endpoints: {
        mcp: "/mcp - Main MCP endpoint",
        sse: "/mcp/events - SSE events endpoint",
        health: "/health - Health check endpoint",
      },
    })
  );
});

/**
 * Обработка SSE соединения
 */
function handleSSE(req, res) {
  // Настройка заголовков для SSE
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  // Отправка начального сообщения
  res.write("event: connected\ndata: {}\n\n");

  // Обработка закрытия соединения
  req.on("close", () => {
    console.log("SSE клиент отключился");
  });
}

/**
 * Обработка MCP запросов
 */
function handleMCPRequest(req, res) {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
  });

  req.on("end", async () => {
    try {
      const request = JSON.parse(body);
      console.log("Received MCP request:", JSON.stringify(request, null, 2));

      // Обработка запросов в формате JSON-RPC 2.0
      if (request.jsonrpc === "2.0") {
        await handleJsonRpcRequest(request, res);
      }
      // Обработка запросов в старом формате
      else if (request.type === "query") {
        handleLegacyRequest(request, res);
      }
      // Обработка запросов без указанного формата
      else {
        // Пытаемся угадать формат по содержимому
        if (request.method) {
          await handleJsonRpcRequest({ ...request, jsonrpc: "2.0" }, res);
        } else {
          // Отвечаем ошибкой для неизвестного формата
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              jsonrpc: "2.0",
              id: request.id || null,
              error: {
                code: -32600,
                message: "Invalid Request",
                data: "Unknown request format",
              },
            })
          );
        }
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
}

/**
 * Обработка запросов в формате JSON-RPC 2.0
 */
async function handleJsonRpcRequest(request, res) {
  const { method, id } = request;

  try {
    if (method === "initialize") {
      // Ответ на инициализацию
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: request.params?.protocolVersion || "2025-03-26",
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
        })
      );
    } else if (method === "workspace/tools") {
      // Список инструментов
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          jsonrpc: "2.0",
          id,
          result: { tools },
        })
      );
    } else if (method === "workspace/executeCommand") {
      // Выполнение команды
      const command = request.params.command;
      const args = request.params.arguments || [];

      console.log(`Executing command: ${command} with args:`, args);

      // Выполняем команду и возвращаем результат
      const result = await executeCommand(command, args[0] || {});

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          jsonrpc: "2.0",
          id,
          result,
        })
      );
    } else {
      // Неизвестный метод
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          jsonrpc: "2.0",
          id,
          error: {
            code: -32601,
            message: "Method not found",
            data: `Unknown method: ${method}`,
          },
        })
      );
    }
  } catch (err) {
    console.error(`Error handling JSON-RPC request:`, err);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        jsonrpc: "2.0",
        id,
        error: {
          code: -32603,
          message: "Internal error",
          data: err.message,
        },
      })
    );
  }
}

/**
 * Обработка запросов в старом формате
 */
function handleLegacyRequest(request, res) {
  const { type, query, id } = request;

  if (type === "query" && query === "tools") {
    // Возвращаем список инструментов в старом формате
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        id,
        type: "response",
        body: {
          model_context_protocol: {
            version: "0.1",
            capabilities: ["tools"],
          },
          tools: tools.map((tool) => ({
            type: "function",
            function: {
              name: tool.name,
              description: tool.description,
              parameters: tool.parameters,
              metadata: tool.metadata,
            },
          })),
        },
      })
    );
  } else if (type === "query" && query === "metadata") {
    // Возвращаем метаданные сервера
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        id,
        type: "response",
        body: {
          model_context_protocol: {
            version: "0.1",
            capabilities: ["tools"],
          },
          metadata: {
            title: "Wiki.js MCP",
            description: "Wiki.js integration for Cursor",
            version: "1.0.0",
            icon: "document",
          },
        },
      })
    );
  } else {
    // Неизвестный запрос
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        id: id || "unknown",
        type: "error",
        body: {
          message: "Unsupported request type",
        },
      })
    );
  }
}

/**
 * Выполнение команды
 */
async function executeCommand(command, params) {
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

// Запускаем сервер
server.listen(PORT, () => {
  console.log(`MCP Server running at http://localhost:${PORT}`);
  console.log(`SSE endpoint: http://localhost:${PORT}/mcp/events`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
