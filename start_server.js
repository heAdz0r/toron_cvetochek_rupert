// Start script for MCP server
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Получаем текущую директорию
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Загружаем конфигурацию из .cursor/mcp.json
function loadConfig() {
  try {
    // Сначала пробуем глобальную конфигурацию
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    const globalConfigPath = path.join(homeDir, ".cursor", "mcp.json");

    // Затем локальную конфигурацию
    const localConfigPath = path.join(__dirname, ".cursor", "mcp.json");

    let config;

    if (fs.existsSync(localConfigPath)) {
      config = JSON.parse(fs.readFileSync(localConfigPath, "utf8"));
      console.log("Используется локальная конфигурация MCP");
    } else if (fs.existsSync(globalConfigPath)) {
      config = JSON.parse(fs.readFileSync(globalConfigPath, "utf8"));
      console.log("Используется глобальная конфигурация MCP");
    } else {
      console.warn(
        "Конфигурация MCP не найдена, используются значения по умолчанию"
      );
      return null;
    }

    return config;
  } catch (error) {
    console.error("Ошибка при загрузке конфигурации:", error);
    return null;
  }
}

// Загружаем конфигурацию
const config = loadConfig();

// Получаем настройки для Wiki.js
if (config && config.mcpServers && config.mcpServers.wikijs) {
  const wikiJsConfig = config.mcpServers.wikijs;

  // Устанавливаем переменные окружения из конфигурации
  if (wikiJsConfig.env) {
    if (wikiJsConfig.env.WIKIJS_BASE_URL) {
      process.env.WIKIJS_BASE_URL = wikiJsConfig.env.WIKIJS_BASE_URL;
      console.log(`Wiki.js Base URL: ${process.env.WIKIJS_BASE_URL}`);
    }

    if (wikiJsConfig.env.WIKIJS_TOKEN) {
      process.env.WIKIJS_TOKEN = wikiJsConfig.env.WIKIJS_TOKEN;
      console.log("Wiki.js Token настроен");
    }
  }
}

// Запускаем сервер
let serverProcess;

async function startServer() {
  try {
    // Импортируем сервер динамически
    const module = await import("./simple_server.js");
    serverProcess = module.default; // Если сервер экспортируется как default
    return true;
  } catch (error) {
    console.error("Ошибка при запуске сервера:", error);
    return false;
  }
}

// Обработка сигналов завершения
function handleShutdown(signal) {
  console.log(`Получен сигнал ${signal}, завершаю сервер...`);

  // Закрываем сервер
  if (serverProcess && typeof serverProcess.close === "function") {
    serverProcess.close((err) => {
      console.log(
        `Сервер завершил работу с кодом ${err ? err.message : "null"}`
      );
      process.exit(err ? 1 : 0);
    });
  } else {
    console.log("Сервер не был запущен или не поддерживает закрытие");
    process.exit(0);
  }
}

// Регистрируем обработчики сигналов
process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));
process.on("SIGHUP", () => handleShutdown("SIGHUP"));

// Запускаем сервер
startServer();
