#!/usr/bin/env node

import express from "express";
import cors from "cors";

const app = express();
const PORT = 3200;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

// MCP endpoint
app.post("/mcp", (req, res) => {
  console.log("Received request:", JSON.stringify(req.body, null, 2));

  if (req.body.type === "query" && req.body.query === "tools") {
    res.json({
      id: req.body.id,
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
          {
            type: "function",
            function: {
              name: "list_pages",
              description: "Получает список страниц из Wiki.js",
              parameters: {
                type: "object",
                properties: {
                  limit: {
                    type: "number",
                    description: "Максимальное количество страниц",
                  },
                },
              },
              metadata: {
                title: "List Pages",
                description: "Получает список страниц из Wiki.js",
                ui: {
                  icon: "document",
                  ui_type: "default",
                },
              },
            },
          },
        ],
      },
    });
  } else if (req.body.type === "query" && req.body.query === "metadata") {
    res.json({
      id: req.body.id,
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
    });
  } else if (req.body.type === "function_call") {
    res.json({
      id: req.body.id,
      type: "response",
      body: {
        message: "Function call received",
        name: req.body.name,
        parameters: req.body.parameters,
      },
    });
  } else {
    res.json({
      id: req.body.id || "unknown",
      type: "error",
      body: {
        message: "Unsupported request type",
      },
    });
  }
});

app.listen(PORT, () => {
  console.log(`Test MCP server running on port ${PORT}`);
});
