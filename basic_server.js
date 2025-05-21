#!/usr/bin/env node

const http = require("http");

// Create simple HTTP server
const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    // Health check endpoint
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", message: "Server is running" }));
  } else if (req.url === "/mcp" && req.method === "POST") {
    // MCP endpoint - process request
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", () => {
      try {
        const request = JSON.parse(body);
        console.log("Received request:", JSON.stringify(request, null, 2));

        if (request.type === "query" && request.query === "tools") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              id: request.id,
              type: "response",
              body: {
                model_context_protocol: {
                  version: "0.1",
                  capabilities: ["tools"],
                },
                tools: [
                  {
                    type: "function",
                    function: {
                      name: "get_page",
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
                        title: "Get Page",
                        description: "Получает страницу из Wiki.js",
                        ui: {
                          icon: "document",
                          ui_type: "default",
                        },
                      },
                    },
                  },
                ],
              },
            })
          );
        } else if (request.type === "query" && request.query === "metadata") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              id: request.id,
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
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              id: request.id || "unknown",
              type: "error",
              body: {
                message: "Unsupported request type",
              },
            })
          );
        }
      } catch (err) {
        console.error("Error processing request:", err);
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid request" }));
      }
    });
  } else {
    // Handle other routes
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  }
});

// Start the server
const PORT = 3200;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
