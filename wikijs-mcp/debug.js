#!/usr/bin/env node

/**
 * Утилита для отладки MCP сервера Wiki.js
 * Позволяет выполнять различные операции для тестирования и отладки
 */

import fetch from "node-fetch";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import readline from "readline";

// Получаем текущую директорию
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Настройки
const PORT = process.env.PORT || 3200;
const WIKIJS_BASE_URL = process.env.WIKIJS_BASE_URL || "http://localhost:8080";
const WIKIJS_TOKEN = process.env.WIKIJS_TOKEN || "";
const BASE_URL = `http://localhost:${PORT}`;
let server_process = null;

// Создаем интерфейс чтения с консоли
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Функция для задания вопроса
function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

// Функция для запуска сервера
async function startServer() {
  console.log(`Запуск MCP сервера на порту ${PORT}...`);

  // Устанавливаем переменные окружения
  const env = {
    ...process.env,
    PORT,
    WIKIJS_BASE_URL,
    WIKIJS_TOKEN,
  };

  // Запускаем сервер
  server_process = spawn("node", ["mcp_http_server.js"], {
    env,
    cwd: __dirname,
    stdio: "pipe", // Перенаправляем вывод для логирования
  });

  // Настраиваем логгирование вывода сервера
  const logFile = fs.createWriteStream(path.join(__dirname, "debug.log"), {
    flags: "a",
  });

  // Обработка вывода
  server_process.stdout.on("data", (data) => {
    const output = data.toString();
    logFile.write(`[STDOUT] ${output}`);
    console.log(`[STDOUT] ${output}`);
  });

  server_process.stderr.on("data", (data) => {
    const output = data.toString();
    logFile.write(`[STDERR] ${output}`);
    console.error(`[STDERR] ${output}`);
  });

  // Обработка событий завершения
  server_process.on("close", (code) => {
    console.log(`Сервер завершил работу с кодом ${code}`);
    logFile.end();
    server_process = null;
  });

  console.log(`Запущен MCP сервер, PID: ${server_process.pid}`);
  logFile.write(
    `[DEBUG] Запущен MCP сервер ${new Date().toISOString()}, PID: ${
      server_process.pid
    }\n`
  );

  // Ждем немного для инициализации сервера
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Проверяем, что сервер запустился успешно
  try {
    const response = await fetch(`${BASE_URL}/health`);
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Статус сервера: ${data.status} - ${data.message}`);
      return true;
    }
  } catch (error) {
    console.error(`❌ Ошибка при проверке сервера: ${error.message}`);
  }

  return false;
}

// Остановка сервера
function stopServer() {
  if (server_process) {
    console.log(`Остановка сервера, PID: ${server_process.pid}...`);
    server_process.kill();
    return true;
  }

  console.log("Сервер не запущен");
  return false;
}

// Проверка статуса сервера
async function checkServerStatus() {
  try {
    const response = await fetch(`${BASE_URL}/health`);
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Статус сервера: ${data.status} - ${data.message}`);
      return data;
    }
  } catch (error) {
    console.error(`❌ Ошибка при проверке сервера: ${error.message}`);
  }

  return null;
}

// Получение списка инструментов
async function getTools() {
  try {
    const response = await fetch(`${BASE_URL}/tools`);
    if (response.ok) {
      const tools = await response.json();
      console.log(`✅ Получено ${tools.length} инструментов:`);

      tools.forEach((tool, index) => {
        console.log(
          `${index + 1}. ${tool.function.name} - ${tool.function.description}`
        );
      });

      return tools;
    }
  } catch (error) {
    console.error(`❌ Ошибка при получении инструментов: ${error.message}`);
  }

  return [];
}

// Создание тестового запроса к инструменту
async function testTool(toolName, params = {}) {
  try {
    console.log(
      `🧪 Тестирование инструмента '${toolName}' с параметрами:`,
      params
    );

    const method =
      toolName.startsWith("create_") ||
      toolName.startsWith("update_") ||
      toolName.startsWith("delete_")
        ? "POST"
        : "GET";

    let url = `${BASE_URL}/${toolName}`;

    // Для GET-запросов преобразуем параметры в строку запроса
    if (method === "GET" && Object.keys(params).length > 0) {
      const queryParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        queryParams.append(key, String(value));
      }
      url += `?${queryParams.toString()}`;
    }

    // Отправляем запрос
    const startTime = Date.now();

    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: method === "POST" ? JSON.stringify(params) : undefined,
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    if (response.ok) {
      const result = await response.json();
      console.log(
        `✅ Результат (${duration}ms):`,
        JSON.stringify(result, null, 2)
      );
      return { success: true, data: result, duration };
    } else {
      const error = await response.text();
      console.error(`❌ Ошибка (${duration}ms): ${response.status} - ${error}`);
      return { success: false, error, duration };
    }
  } catch (error) {
    console.error(`❌ Ошибка при вызове инструмента: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Функция для тестирования производительности
async function benchmarkTool(toolName, params = {}, iterations = 10) {
  console.log(
    `🔄 Тестирование производительности '${toolName}' (${iterations} итераций)...`
  );

  const results = [];
  let successCount = 0;
  let totalDuration = 0;

  for (let i = 0; i < iterations; i++) {
    const result = await testTool(toolName, params);

    if (result.success) {
      successCount++;
      totalDuration += result.duration;
    }

    results.push(result);

    // Небольшая пауза между запросами
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  const avgDuration = successCount > 0 ? totalDuration / successCount : 0;

  console.log("\n📊 Результаты тестирования производительности:");
  console.log(`Успешных запросов: ${successCount}/${iterations}`);
  console.log(`Средняя длительность: ${avgDuration.toFixed(2)}ms`);
  console.log(
    `Минимальная длительность: ${Math.min(
      ...results.filter((r) => r.success).map((r) => r.duration)
    )}ms`
  );
  console.log(
    `Максимальная длительность: ${Math.max(
      ...results.filter((r) => r.success).map((r) => r.duration)
    )}ms`
  );

  return {
    successRate: successCount / iterations,
    avgDuration,
    results,
  };
}

// Главное меню
async function showMainMenu() {
  while (true) {
    console.log("\n===== Меню отладки MCP сервера Wiki.js =====");
    console.log("1. Запустить сервер");
    console.log("2. Остановить сервер");
    console.log("3. Проверить статус сервера");
    console.log("4. Получить список инструментов");
    console.log("5. Тестировать инструмент");
    console.log("6. Тест производительности инструмента");
    console.log("7. Просмотреть лог отладки");
    console.log("8. Выход");

    const choice = await question("Выберите действие (1-8): ");

    switch (choice) {
      case "1":
        await startServer();
        break;
      case "2":
        stopServer();
        break;
      case "3":
        await checkServerStatus();
        break;
      case "4":
        await getTools();
        break;
      case "5":
        await testToolMenu();
        break;
      case "6":
        await benchmarkMenu();
        break;
      case "7":
        await viewLogs();
        break;
      case "8":
        console.log("Завершение работы...");
        if (server_process) {
          stopServer();
        }
        rl.close();
        return;
      default:
        console.log("Неверный выбор. Пожалуйста, выберите число от 1 до 8.");
    }
  }
}

// Меню тестирования инструмента
async function testToolMenu() {
  // Получаем список инструментов
  const tools = await getTools();

  if (tools.length === 0) {
    console.log("❌ Нет доступных инструментов или сервер недоступен");
    return;
  }

  const toolIndex =
    parseInt(await question(`Выберите инструмент (1-${tools.length}): `)) - 1;

  if (toolIndex < 0 || toolIndex >= tools.length) {
    console.log("❌ Неверный выбор инструмента");
    return;
  }

  const selectedTool = tools[toolIndex];
  console.log(`Выбран инструмент: ${selectedTool.function.name}`);

  // Получаем параметры в зависимости от типа инструмента
  const params = {};

  if (
    selectedTool.function.parameters &&
    selectedTool.function.parameters.properties
  ) {
    const properties = selectedTool.function.parameters.properties;
    const required = selectedTool.function.parameters.required || [];

    console.log("Введите параметры инструмента:");

    for (const [key, schema] of Object.entries(properties)) {
      const isRequired = required.includes(key);
      const paramPrompt = `${key}${isRequired ? " (обязательно)" : ""}: `;

      let value = await question(paramPrompt);

      if (value.trim() === "" && !isRequired) {
        continue;
      }

      // Преобразуем значение в соответствии с типом
      if (schema.type === "number" || schema.type === "integer") {
        value = Number(value);
      } else if (schema.type === "boolean") {
        value = value.toLowerCase() === "true";
      }

      params[key] = value;
    }
  }

  // Тестируем инструмент
  await testTool(selectedTool.function.name, params);
}

// Меню теста производительности
async function benchmarkMenu() {
  // Получаем список инструментов
  const tools = await getTools();

  if (tools.length === 0) {
    console.log("❌ Нет доступных инструментов или сервер недоступен");
    return;
  }

  const toolIndex =
    parseInt(await question(`Выберите инструмент (1-${tools.length}): `)) - 1;

  if (toolIndex < 0 || toolIndex >= tools.length) {
    console.log("❌ Неверный выбор инструмента");
    return;
  }

  const selectedTool = tools[toolIndex];
  console.log(`Выбран инструмент: ${selectedTool.function.name}`);

  // Получаем параметры
  const params = {};

  if (
    selectedTool.function.parameters &&
    selectedTool.function.parameters.properties
  ) {
    const properties = selectedTool.function.parameters.properties;
    const required = selectedTool.function.parameters.required || [];

    console.log("Введите параметры инструмента:");

    for (const [key, schema] of Object.entries(properties)) {
      const isRequired = required.includes(key);
      const paramPrompt = `${key}${isRequired ? " (обязательно)" : ""}: `;

      let value = await question(paramPrompt);

      if (value.trim() === "" && !isRequired) {
        continue;
      }

      // Преобразуем значение в соответствии с типом
      if (schema.type === "number" || schema.type === "integer") {
        value = Number(value);
      } else if (schema.type === "boolean") {
        value = value.toLowerCase() === "true";
      }

      params[key] = value;
    }
  }

  // Получаем количество итераций
  const iterations = parseInt(
    (await question("Количество итераций (10): ")) || "10"
  );

  // Запускаем тест производительности
  await benchmarkTool(selectedTool.function.name, params, iterations);
}

// Просмотр логов
async function viewLogs() {
  const logPath = path.join(__dirname, "debug.log");

  if (!fs.existsSync(logPath)) {
    console.log("❌ Файл логов не найден");
    return;
  }

  const lines = parseInt(
    (await question("Сколько последних строк показать (20): ")) || "20"
  );

  try {
    // Читаем последние N строк из файла лога
    const data = fs.readFileSync(logPath, "utf8");
    const logLines = data.split("\n").filter((line) => line.trim() !== "");

    const startLine = Math.max(0, logLines.length - lines);
    const endLine = logLines.length;

    console.log(`\n📜 Последние ${endLine - startLine} строк из лога:`);

    for (let i = startLine; i < endLine; i++) {
      console.log(logLines[i]);
    }
  } catch (error) {
    console.error(`❌ Ошибка при чтении лог-файла: ${error.message}`);
  }
}

// Запускаем главное меню
console.log("🔍 Запуск утилиты отладки MCP сервера Wiki.js");
showMainMenu().catch((error) => {
  console.error(`❌ Ошибка: ${error.message}`);
  if (server_process) {
    stopServer();
  }
  rl.close();
});
