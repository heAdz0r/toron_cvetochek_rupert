import { WikiJsToolDefinition } from "./types.js";

// Список инструментов MCP для работы с Wiki.js
export const wikiJsTools: WikiJsToolDefinition[] = [
  // Получение страницы по ID
  {
    type: "function",
    function: {
      name: "get_page",
      description: "Получает информацию о странице Wiki.js по её ID",
      parameters: {
        type: "object",
        properties: {
          id: {
            type: "number",
            description: "ID страницы в Wiki.js",
          },
        },
        required: ["id"],
      },
    },
  },

  // Получение контента страницы по ID
  {
    type: "function",
    function: {
      name: "get_page_content",
      description: "Получает содержимое страницы Wiki.js по её ID",
      parameters: {
        type: "object",
        properties: {
          id: {
            type: "number",
            description: "ID страницы в Wiki.js",
          },
        },
        required: ["id"],
      },
    },
  },

  // Получение списка страниц
  {
    type: "function",
    function: {
      name: "list_pages",
      description: "Получает список страниц Wiki.js с возможностью сортировки",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description:
              "Максимальное количество страниц для возврата (по умолчанию 50)",
          },
          orderBy: {
            type: "string",
            description: "Поле для сортировки (TITLE, CREATED, UPDATED)",
          },
        },
        required: [],
      },
    },
  },

  // Поиск страниц
  {
    type: "function",
    function: {
      name: "search_pages",
      description: "Поиск страниц по запросу в Wiki.js",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Поисковый запрос",
          },
          limit: {
            type: "number",
            description:
              "Максимальное количество результатов (по умолчанию 10)",
          },
        },
        required: ["query"],
      },
    },
  },

  // Создание страницы
  {
    type: "function",
    function: {
      name: "create_page",
      description: "Создает новую страницу в Wiki.js",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Заголовок страницы",
          },
          content: {
            type: "string",
            description: "Содержимое страницы (в формате Markdown)",
          },
          path: {
            type: "string",
            description: "Путь к странице (например, 'folder/page')",
          },
          description: {
            type: "string",
            description: "Краткое описание страницы",
          },
        },
        required: ["title", "content", "path"],
      },
    },
  },

  // Обновление страницы
  {
    type: "function",
    function: {
      name: "update_page",
      description: "Обновляет существующую страницу в Wiki.js",
      parameters: {
        type: "object",
        properties: {
          id: {
            type: "number",
            description: "ID страницы для обновления",
          },
          content: {
            type: "string",
            description: "Новое содержимое страницы (в формате Markdown)",
          },
        },
        required: ["id", "content"],
      },
    },
  },

  // Удаление страницы
  {
    type: "function",
    function: {
      name: "delete_page",
      description: "Удаляет страницу из Wiki.js",
      parameters: {
        type: "object",
        properties: {
          id: {
            type: "number",
            description: "ID страницы для удаления",
          },
        },
        required: ["id"],
      },
    },
  },

  // Получение списка пользователей
  {
    type: "function",
    function: {
      name: "list_users",
      description: "Получает список пользователей Wiki.js",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },

  // Поиск пользователей
  {
    type: "function",
    function: {
      name: "search_users",
      description: "Поиск пользователей по запросу в Wiki.js",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Поисковый запрос (имя или email)",
          },
        },
        required: ["query"],
      },
    },
  },

  // Получение списка групп
  {
    type: "function",
    function: {
      name: "list_groups",
      description: "Получает список групп пользователей Wiki.js",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },

  // Создание пользователя
  {
    type: "function",
    function: {
      name: "create_user",
      description: "Создает нового пользователя в Wiki.js",
      parameters: {
        type: "object",
        properties: {
          email: {
            type: "string",
            description: "Email пользователя",
          },
          name: {
            type: "string",
            description: "Имя пользователя",
          },
          passwordRaw: {
            type: "string",
            description: "Пароль пользователя (в открытом виде)",
          },
          providerKey: {
            type: "string",
            description:
              "Ключ провайдера аутентификации (по умолчанию 'local')",
          },
          groups: {
            type: "array",
            items: {
              type: "number",
            },
            description:
              "Массив ID групп, в которые будет добавлен пользователь (по умолчанию [2])",
          },
          mustChangePassword: {
            type: "boolean",
            description:
              "Требовать смену пароля при следующем входе (по умолчанию false)",
          },
          sendWelcomeEmail: {
            type: "boolean",
            description: "Отправить приветственное письмо (по умолчанию false)",
          },
        },
        required: ["email", "name", "passwordRaw"],
      },
    },
  },

  // Обновление пользователя
  {
    type: "function",
    function: {
      name: "update_user",
      description: "Обновляет информацию о пользователе Wiki.js",
      parameters: {
        type: "object",
        properties: {
          id: {
            type: "number",
            description: "ID пользователя для обновления",
          },
          name: {
            type: "string",
            description: "Новое имя пользователя",
          },
        },
        required: ["id", "name"],
      },
    },
  },
];
