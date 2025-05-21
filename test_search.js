// Тест функции поиска в Wiki.js через MCP
import { MCPClient } from "./mcp_client.js";

async function testSearch() {
  try {
    const client = new MCPClient();

    console.log("Инициализация MCP подключения...");
    await client.initialize();

    console.log('\nТестирование поиска по слову "цветочек"...');
    const searchResult = await client.sendRequest("tools/execute", {
      name: "mcp_wikijs_search",
      arguments: {
        query: "цветочек",
      },
    });

    console.log("Полный ответ:", JSON.stringify(searchResult, null, 2));

    if (searchResult && searchResult.content && searchResult.content[0]) {
      console.log("\nНайденные страницы:");
      try {
        const results = JSON.parse(searchResult.content[0].text);
        if (Array.isArray(results)) {
          results.forEach((page) => {
            console.log(`- [${page.id}] ${page.title}`);
          });
          console.log(`\nВсего найдено: ${results.length} страниц`);
        } else {
          console.log("Неожиданный формат результатов:", results);
        }
      } catch (error) {
        console.error("Ошибка при разборе результатов:", error);
        console.log("Содержимое:", searchResult.content[0].text);
      }
    } else {
      console.log("Ответ не содержит ожидаемых данных");
    }

    console.log("\nТесты поиска завершены!");
  } catch (error) {
    console.error("Ошибка при тестировании поиска:", error);
  }
}

// Запускаем тест
testSearch();
