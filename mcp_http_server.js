#!/usr/bin/env node

/**
 * MCP-сервер Wiki.js для Cursor - HTTP версия
 * Реализация MCP протокола через HTTP
 */

import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import { wikiJsTools } from "./dist/tools.js";

// Настройки
const PORT = process.env.PORT || 3200;
const WIKIJS_BASE_URL = process.env.WIKIJS_BASE_URL || "http://localhost:8080";
const WIKIJS_TOKEN = process.env.WIKIJS_TOKEN || "";
const API_URL = `${WIKIJS_BASE_URL}/graphql`;

const app = express();
app.use(cors());
app.use(express.json());

// Маршрут для проверки здоровья сервера
app.get("/health", (req, res) => {
  res.json({ status: "running", message: "Wiki.js MCP Server is running" });
});

// Маршрут для поддержки протокола MCP
app.post("/mcp", async (req, res) => {
  try {
    const request = req.body;
    console.log(`Received request: ${JSON.stringify(request, null, 2)}`);

    if (request.type === "query") {
      if (request.query === "tools") {
        // Отвечаем списком инструментов
        return res.json({
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
        return res.json({
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
        return res.json({
          id: request.id,
          type: "error",
          body: { message: `Неизвестный запрос: ${request.query}` },
        });
      }
    } else if (request.type === "function_call") {
      // Выполняем вызов функции
      const toolName = request.name;
      const params = request.parameters;

      const result = await executeFunction(toolName, params);
      return res.json({
        id: request.id,
        type: "response",
        body: result,
      });
    } else {
      return res.json({
        id: request.id,
        type: "error",
        body: { message: `Неизвестный тип запроса: ${request.type}` },
      });
    }
  } catch (error) {
    console.error(`Ошибка обработки запроса: ${error.message}`);
    return res.status(500).json({
      id: req.body.id || "unknown",
      type: "error",
      body: { message: `Ошибка обработки запроса: ${error.message}` },
    });
  }
});

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

async function executeFunction(functionName, parameters) {
  console.log(`Выполнение функции ${functionName} с параметрами:`, parameters);

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
      case "create_page":
        result = await createPage(
          parameters.title,
          parameters.content,
          parameters.path,
          parameters.description
        );
        break;
      case "update_page":
        result = await updatePage(parameters.id, parameters.content);
        break;
      case "delete_page":
        result = await deletePage(parameters.id);
        break;
      case "list_users":
        result = await listUsers();
        break;
      case "search_users":
        result = await searchUsers(parameters.query);
        break;
      case "list_groups":
        result = await listGroups();
        break;
      default:
        throw new Error(`Неизвестная функция: ${functionName}`);
    }

    return result;
  } catch (error) {
    console.error(
      `Ошибка выполнения функции ${functionName}: ${error.message}`
    );
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

async function createPage(title, content, path, description = "") {
  const query = `
    mutation ($input: PageCreateInput!) {
      pages {
        create(content: $input) {
          id
          path
          title
        }
      }
    }
  `;

  const input = {
    title,
    content,
    path,
    description,
    editor: "markdown",
    locale: "en",
    isPublished: true,
  };

  const result = await graphqlRequest(query, { input });
  return result.pages.create;
}

async function updatePage(id, content) {
  const query = `
    mutation ($id: Int!, $content: String!) {
      pages {
        update(id: $id, content: $content) {
          responseResult {
            succeeded
            message
          }
        }
      }
    }
  `;

  const result = await graphqlRequest(query, { id, content });
  return result.pages.update.responseResult;
}

async function deletePage(id) {
  const query = `
    mutation ($id: Int!) {
      pages {
        delete(id: $id) {
          responseResult {
            succeeded
            message
          }
        }
      }
    }
  `;

  const result = await graphqlRequest(query, { id });
  return result.pages.delete.responseResult;
}

async function listUsers() {
  const query = `
    query {
      users {
        list {
          id
          name
          email
          createdAt
          isActive
        }
      }
    }
  `;

  const result = await graphqlRequest(query);
  return result.users.list;
}

async function searchUsers(searchQuery) {
  const query = `
    query ($query: String!) {
      users {
        search(query: $query) {
          id
          name
          email
          isActive
        }
      }
    }
  `;

  const result = await graphqlRequest(query, { query: searchQuery });
  return result.users.search;
}

async function listGroups() {
  const query = `
    query {
      groups {
        list {
          id
          name
          isSystem
        }
      }
    }
  `;

  const result = await graphqlRequest(query);
  return result.groups.list;
}

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

// Запускаем сервер
app.listen(PORT, async () => {
  console.log(`Wiki.js MCP Server (HTTP) running on port ${PORT}`);
  console.log(`Using Wiki.js API at ${API_URL}`);

  // Проверяем соединение при запуске
  const isConnected = await checkConnection();
  if (isConnected) {
    console.log("✅ Соединение с Wiki.js установлено");
  } else {
    console.log("⚠️ Не удалось подключиться к Wiki.js API");
  }
});
