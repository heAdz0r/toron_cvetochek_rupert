// Простой HTTP клиент для MCP
import fetch from "node-fetch";

/**
 * Простой клиент для взаимодействия с MCP сервером
 */
export class MCPClient {
  /**
   * Создает новый экземпляр клиента MCP
   * @param {string} mcpUrl - URL эндпоинта MCP
   */
  constructor(mcpUrl = "http://localhost:3200/mcp") {
    this.mcpUrl = mcpUrl;
    this.requestId = 0;
    this.initialized = false;
  }

  /**
   * Отправляет JSON-RPC запрос на сервер MCP
   * @param {string} method - Метод JSON-RPC
   * @param {Object} params - Параметры запроса
   * @returns {Promise<Object>} Ответ сервера
   */
  async sendRequest(method, params = {}) {
    const id = this.requestId++;

    try {
      const response = await fetch(this.mcpUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id,
          method,
          params,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `HTTP error: ${response.status} ${response.statusText}`
        );
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(
          `MCP error ${result.error.code}: ${result.error.message}`
        );
      }

      return result.result;
    } catch (error) {
      console.error(`Error in MCP request ${method}:`, error);
      throw error;
    }
  }

  /**
   * Инициализирует соединение с сервером MCP
   * @returns {Promise<Object>} Информация о сервере
   */
  async initialize() {
    if (this.initialized) {
      return true;
    }

    try {
      const result = await this.sendRequest("initialize", {
        protocolVersion: "2025-03-26",
        capabilities: {
          tools: true,
          prompts: false,
          resources: true,
          logging: false,
          roots: {
            listChanged: false,
          },
        },
        clientInfo: {
          name: "mcp-test-client",
          version: "1.0.0",
        },
      });

      this.initialized = true;
      await this.sendRequest("notifications/initialized");

      return result;
    } catch (error) {
      console.error("Failed to initialize MCP connection:", error);
      throw error;
    }
  }

  /**
   * Получает список доступных инструментов
   * @returns {Promise<Array>} Список инструментов
   */
  async getTools() {
    if (!this.initialized) {
      await this.initialize();
    }

    const result = await this.sendRequest("tools/list");
    return result.tools;
  }

  /**
   * Выполняет инструмент MCP
   * @param {string} name - Имя инструмента
   * @param {Object} args - Аргументы инструмента
   * @returns {Promise<Object>} Результат выполнения
   */
  async executeTool(name, args = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const result = await this.sendRequest("tools/execute", {
      name,
      arguments: args,
    });

    return result;
  }
}

// Пример использования
async function testClient() {
  try {
    const client = new MCPClient();

    console.log("Инициализация соединения...");
    const initResult = await client.initialize();
    console.log("Сервер инициализирован:", initResult);

    console.log("\nПолучение списка инструментов...");
    const tools = await client.getTools();
    console.log(`Найдено ${tools.length} инструментов:`);
    tools.forEach((tool) => {
      console.log(`- ${tool.name}: ${tool.description}`);
    });

    console.log("\nТестирование инструмента списка страниц...");
    const allPages = await client.executeTool("mcp_wikijs_list_all");
    console.log("Результат:", allPages);

    console.log("\nТестирование инструмента поиска...");
    const searchResult = await client.executeTool("mcp_wikijs_search", {
      query: "test",
    });
    console.log("Результат поиска:", searchResult);

    console.log("\nТесты завершены успешно!");
  } catch (error) {
    console.error("Ошибка при тестировании:", error);
  }
}

// Запускаем тесты если скрипт выполняется напрямую
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  testClient();
}

// Импорты для запуска тестов
import { fileURLToPath } from "url";
