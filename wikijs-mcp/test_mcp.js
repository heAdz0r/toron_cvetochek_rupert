#!/usr/bin/env node

/**
 * Тестовый скрипт для запуска и проверки MCP Wiki.js
 * Запускает HTTP сервер напрямую и проверяет его доступность
 */

import { spawn } from "child_process";
import path from "path";
import fetch from "node-fetch";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Получаем текущую директорию
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Конфигурация
const PORT = process.env.PORT || 3200;
const WIKIJS_BASE_URL = process.env.WIKIJS_BASE_URL || "http://localhost:8080";
const WIKIJS_TOKEN =
  process.env.WIKIJS_TOKEN ||
  "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGkiOjEsImdycCI6MSwiaWF0IjoxNzQ3ODI3ODM4LCJleHAiOjE3NzkzODU0MzgsImF1ZCI6InVybjp3aWtpLmpzIiwiaXNzIjoidXJuOndpa2kuanMifQ.a7hDtaAK8EXWvTPJYlYHb8AFfuufJy1sIrwh-AWkRPjaYH-VqtTECLOiq_855Pc8xAu3xrmhUvGw_9L_SfuEc6iVCVBBpB-uFmXzFn7BkYHYqdkCXBtpYB56J6Wn7fQo2Bby6LA6RJ699Ti1r8dedZ4urLmYsNnoh-mbmjtZ6gBosrY2P1oQYu3V1PdZ2cX8UvEuUdKA9duq99oDVFTGIdyDO2c5aZ2jQBX2dFzqIkBh2qSes_qIN0iQEBCSpNwJ5BijbpOlQwQTbcvfjWXEcP_2-qFOM40EI9LwqhfOXyhMkQhLPNlSPEAOW3DpNhHtOU6o9z8Y-fBRlqb-b1oPdA";

let mcp_process = null;

async function checkServerHealth(retries = 5, delayMs = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(`http://localhost:${PORT}/health`);
      if (response.ok) {
        const data = await response.json();
        return { ok: true, status: data.status, message: data.message };
      }
    } catch (error) {
      console.log(
        `Попытка подключения ${i + 1}/${retries} не удалась: ${error.message}`
      );
    }

    // Ждем перед следующей попыткой
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  return {
    ok: false,
    message: "Не удалось подключиться к серверу MCP после нескольких попыток",
  };
}

async function getTools() {
  try {
    const response = await fetch(`http://localhost:${PORT}/tools`);
    if (response.ok) {
      return await response.json();
    }
    return [];
  } catch (error) {
    console.error("Ошибка при получении инструментов:", error.message);
    return [];
  }
}

function startMCPServer() {
  console.log("Запуск HTTP MCP сервера для Wiki.js...");

  // Убиваем предыдущие экземпляры процесса, если они есть
  if (mcp_process) {
    mcp_process.kill();
  }

  // Запускаем HTTP сервер напрямую
  const env = {
    ...process.env,
    PORT,
    WIKIJS_BASE_URL,
    WIKIJS_TOKEN,
  };

  mcp_process = spawn("node", ["mcp_http_server.js"], {
    stdio: "inherit",
    cwd: __dirname,
    env,
  });

  mcp_process.on("error", (err) => {
    console.error(`Ошибка при запуске MCP сервера: ${err.message}`);
  });

  mcp_process.on("close", (code) => {
    console.log(`MCP сервер завершил работу с кодом ${code}`);
    mcp_process = null;
  });

  // Обрабатываем завершение процесса
  process.on("exit", () => {
    if (mcp_process) {
      console.log("Завершение работы MCP сервера...");
      mcp_process.kill();
    }
  });

  // Обрабатываем сигналы
  process.on("SIGINT", () => {
    console.log("Получен сигнал SIGINT, завершаем работу...");
    if (mcp_process) mcp_process.kill();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    console.log("Получен сигнал SIGTERM, завершаем работу...");
    if (mcp_process) mcp_process.kill();
    process.exit(0);
  });

  return mcp_process;
}

async function runTests() {
  console.log("Запуск тестирования MCP Wiki.js...");

  // Запускаем MCP сервер
  startMCPServer();

  // Проверяем, что сервер запустился и работает
  console.log("Проверка доступности сервера MCP...");

  // Ждем немного, чтобы сервер успел запуститься
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Проверяем доступность API
  const healthStatus = await checkServerHealth();

  if (healthStatus.ok) {
    console.log(`✅ Сервер MCP доступен: ${healthStatus.message}`);

    // Получаем список инструментов
    const tools = await getTools();

    if (tools.length > 0) {
      console.log(`✅ Получено ${tools.length} инструментов MCP:`);
      tools.forEach((tool) => {
        console.log(`  - ${tool.function.name}: ${tool.function.description}`);
      });
    } else {
      console.error("❌ Не удалось получить список инструментов");
    }
  } else {
    console.error(`❌ Ошибка: ${healthStatus.message}`);
  }
}

// Запускаем тесты
runTests();
