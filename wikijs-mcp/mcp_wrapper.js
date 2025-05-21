#!/usr/bin/env node

// Этот файл служит оберткой для MCP сервера Wiki.js, обеспечивая совместимость с Cursor

import { execSync, spawn } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// Получаем текущую директорию в ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Определяем путь к скрипту start.sh
const scriptPath = path.join(__dirname, "start.sh");

// Проверяем наличие скрипта
if (!fs.existsSync(scriptPath)) {
  console.error(`Ошибка: файл ${scriptPath} не найден`);
  process.exit(1);
}

// Останавливаем все предыдущие инстансы сервера
try {
  execSync('pkill -f "node dist/server.js" || true');
  console.log("Остановлены предыдущие инстансы сервера");
} catch (error) {
  // Игнорируем ошибки
}

// Запускаем скрипт start.sh
console.log("Запускаем MCP сервер Wiki.js...");

// Устанавливаем переменные окружения
process.env.PORT = process.env.PORT || "8000";
process.env.WIKIJS_BASE_URL =
  process.env.WIKIJS_BASE_URL || "http://localhost:8080";
process.env.WIKIJS_TOKEN =
  process.env.WIKIJS_TOKEN ||
  "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGkiOjEsImdycCI6MSwiaWF0IjoxNzQ3ODI3ODM4LCJleHAiOjE3NzkzODU0MzgsImF1ZCI6InVybjp3aWtpLmpzIiwiaXNzIjoidXJuOndpa2kuanMifQ.a7hDtaAK8EXWvTPJYlYHb8AFfuufJy1sIrwh-AWkRPjaYH-VqtTECLOiq_855Pc8xAu3xrmhUvGw_9L_SfuEc6iVCVBBpB-uFmXzFn7BkYHYqdkCXBtpYB56J6Wn7fQo2Bby6LA6RJ699Ti1r8dedZ4urLmYsNnoh-mbmjtZ6gBosrY2P1oQYu3V1PdZ2cX8UvEuUdKA9duq99oDVFTGIdyDO2c5aZ2jQBX2dFzqIkBh2qSes_qIN0iQEBCSpNwJ5BijbpOlQwQTbcvfjWXEcP_2-qFOM40EI9LwqhfOXyhMkQhLPNlSPEAOW3DpNhHtOU6o9z8Y-fBRlqb-b1oPdA";

// Запускаем сервер напрямую из Node.js
const serverPath = path.join(__dirname, "dist", "server.js");
const serverProcess = spawn("node", [serverPath], {
  stdio: "inherit",
  env: process.env,
});

serverProcess.on("close", (code) => {
  console.log(`MCP сервер Wiki.js завершил работу с кодом ${code}`);
});

// Обрабатываем сигналы для корректного завершения
process.on("SIGINT", () => {
  console.log("Получен сигнал SIGINT, завершаем работу...");
  serverProcess.kill();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("Получен сигнал SIGTERM, завершаем работу...");
  serverProcess.kill();
  process.exit(0);
});
