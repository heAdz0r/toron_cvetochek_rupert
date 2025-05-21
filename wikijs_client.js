// Клиент для работы с API Wiki.js
import fetch from "node-fetch";

/**
 * Клиент для работы с API Wiki.js
 */
export class WikiJsClient {
  /**
   * Создает экземпляр клиента Wiki.js
   * @param {string} baseUrl - Базовый URL Wiki.js, например http://localhost:8080
   * @param {string} token - API токен Wiki.js
   */
  constructor(baseUrl, token) {
    this.baseUrl = baseUrl;
    this.token = token;
    this.graphqlEndpoint = `${baseUrl}/graphql`;
  }

  /**
   * Выполняет GraphQL запрос к API Wiki.js
   * @param {string} query - GraphQL запрос
   * @param {Object} variables - Переменные для запроса
   * @returns {Promise<Object>} - Результат запроса
   */
  async executeQuery(query, variables = {}) {
    try {
      const response = await fetch(this.graphqlEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          query,
          variables,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `HTTP error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      if (data.errors) {
        throw new Error(`GraphQL error: ${data.errors[0].message}`);
      }

      return data.data;
    } catch (error) {
      console.error("Error executing GraphQL query:", error);
      throw error;
    }
  }

  /**
   * Получает страницу по её ID
   * @param {number} id - ID страницы
   * @returns {Promise<Object>} - Данные страницы
   */
  async getPageById(id) {
    const query = `
      query ($id: Int!) {
        pages {
          single(id: $id) {
            id
            path
            title
            description
            content
            createdAt
            updatedAt
            tags {
              tag
            }
          }
        }
      }
    `;

    const data = await this.executeQuery(query, { id });
    return data.pages.single;
  }

  /**
   * Поиск страниц по ключевым словам
   * @param {string} query - Поисковый запрос
   * @returns {Promise<Array>} - Массив найденных страниц
   */
  async searchPages(query) {
    // В некоторых версиях Wiki.js может быть другой формат запроса
    try {
      // Пробуем стандартный запрос
      const gqlQuery = `
        query ($query: String!) {
          pages {
            search(query: $query) {
              results {
                id
                title
                description
                path
                updatedAt
              }
            }
          }
        }
      `;

      const data = await this.executeQuery(gqlQuery, { query });

      // Проверяем формат ответа
      if (
        data.pages &&
        data.pages.search &&
        Array.isArray(data.pages.search.results)
      ) {
        return data.pages.search.results;
      } else {
        // Альтернативный запрос для старых версий
        return await this.searchPagesAlt(query);
      }
    } catch (error) {
      console.error("Error in search:", error.message);

      // Пробуем альтернативный метод
      return await this.searchPagesAlt(query);
    }
  }

  /**
   * Альтернативный метод поиска страниц для совместимости
   * @param {string} query - Поисковый запрос
   * @returns {Promise<Array>} - Массив найденных страниц
   */
  async searchPagesAlt(query) {
    try {
      // Альтернативный запрос
      const gqlQuery = `
        query ($query: String!) {
          pages {
            search(query: $query) {
              id
              title
              description
              path
              updatedAt
            }
          }
        }
      `;

      const data = await this.executeQuery(gqlQuery, { query });

      // Если возвращается массив напрямую
      if (data.pages && Array.isArray(data.pages.search)) {
        return data.pages.search;
      }

      // Если такой формат тоже не подошел, используем запрос всех страниц и фильтрацию
      console.log("Falling back to list all + filter method for search");
      const allPages = await this.getAllPages();

      // Простая фильтрация по заголовку и описанию
      return allPages.filter(
        (page) =>
          page.title.toLowerCase().includes(query.toLowerCase()) ||
          (page.description &&
            page.description.toLowerCase().includes(query.toLowerCase())) ||
          page.path.toLowerCase().includes(query.toLowerCase())
      );
    } catch (error) {
      console.error("Error in alternative search:", error.message);

      // В крайнем случае возвращаем пустой массив
      return [];
    }
  }

  /**
   * Получает список всех страниц
   * @returns {Promise<Array>} - Массив всех страниц
   */
  async getAllPages() {
    const query = `
      query {
        pages {
          list {
            id
            path
            title
            description
            updatedAt
          }
        }
      }
    `;

    const data = await this.executeQuery(query);
    return data.pages.list;
  }

  /**
   * Проверяет соединение с API Wiki.js
   * @returns {Promise<boolean>} - true если соединение успешно
   */
  async checkConnection() {
    try {
      const query = `
        query {
          site {
            info {
              title
              version
            }
          }
        }
      `;

      const data = await this.executeQuery(query);
      return {
        connected: true,
        info: data.site.info,
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message,
      };
    }
  }
}
