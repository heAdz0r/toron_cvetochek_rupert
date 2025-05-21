#!/usr/bin/env node

// Скрипт для тестирования MCP сервера через stdio

import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Запуск MCP сервера
const serverPath = path.join(__dirname, "mcp_stdio.js");
const serverProcess = spawn("node", [serverPath], {
  stdio: ["pipe", "pipe", "inherit"],
  env: {
    ...process.env,
    WIKIJS_BASE_URL: "http://localhost:8080",
    WIKIJS_TOKEN:
      "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGkiOjEsImdycCI6MSwiaWF0IjoxNzQ3ODI3ODM4LCJleHAiOjE3NzkzODU0MzgsImF1ZCI6InVybjp3aWtpLmpzIiwiaXNzIjoidXJuOndpa2kuanMifQ.a7hDtaAK8EXWvTPJYlYHb8AFfuufJy1sIrwh-AWkRPjaYH-VqtTECLOiq_855Pc8xAu3xrmhUvGw_9L_SfuEc6iVCVBBpB-uFmXzFn7BkYHYqdkCXBtpYB56J6Wn7fQo2Bby6LA6RJ699Ti1r8dedZ4urLmYsNnoh-mbmjtZ6gBosrY2P1oQYu3V1PdZ2cX8UvEuUdKA9duq99oDVFTGIdyDO2c5aZ2jQBX2dFzqIkBh2qSes_qIN0iQEBCSpNwJ5BijbpOlQwQTbcvfjWXEcP_2-qFOM40EI9LwqhfOXyhMkQhLPNlSPEAOW3DpNhHtOU6o9z8Y-fBRlqb-b1oPdA",
  },
});

// Обработка ответов от сервера
serverProcess.stdout.setEncoding("utf8");
let responseBuffer = "";

serverProcess.stdout.on("data", (chunk) => {
  responseBuffer += chunk;
  if (responseBuffer.includes("\n")) {
    const lines = responseBuffer.split("\n");
    responseBuffer = lines.pop(); // Оставляем неполную строку в буфере

    for (const line of lines) {
      if (line.trim()) {
        try {
          const response = JSON.parse(line);
          console.log("Получен ответ:", JSON.stringify(response, null, 2));
        } catch (error) {
          console.error("Ошибка при разборе ответа:", error.message);
          console.error("Исходный текст:", line);
        }
      }
    }
  }
});

// Функция для отправки запроса серверу
function sendRequest(request) {
  console.log(`Отправка запроса: ${JSON.stringify(request)}`);
  serverProcess.stdin.write(JSON.stringify(request) + "\n");
}

// Ждем немного, чтобы сервер запустился
setTimeout(() => {
  // Запрашиваем список инструментов
  sendRequest({
    id: "1",
    type: "query",
    query: "tools",
  });

  // Запрашиваем список страниц
  setTimeout(() => {
    sendRequest({
      id: "2",
      type: "function_call",
      name: "list_pages",
      parameters: {
        limit: 5,
      },
    });
  }, 1000);
}, 2000);

// Обработка завершения сервера
serverProcess.on("close", (code) => {
  console.log(`MCP сервер завершил работу с кодом ${code}`);
  process.exit(0);
});

// Корректное завершение при прерывании
process.on("SIGINT", () => {
  console.log("Получен сигнал SIGINT, завершаем работу...");
  serverProcess.kill();
  process.exit(0);
});
