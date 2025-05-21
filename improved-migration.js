const fs = require("fs");
const path = require("path");
const axios = require("axios");

// Путь к исходной директории проекта
const sourceDir = "../toron_cvetochek_rupert";

// API URL Wiki.js (изменить на актуальный после установки)
const wikiApiUrl = "http://localhost:8080/graphql";

// Токен API (нужно будет получить после настройки Wiki.js)
const apiToken =
  "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGkiOjEsImdycCI6MSwiaWF0IjoxNzQ3ODI3ODM4LCJleHAiOjE3NzkzODU0MzgsImF1ZCI6InVybjp3aWtpLmpzIiwiaXNzIjoidXJuOndpa2kuanMifQ.a7hDtaAK8EXWvTPJYlYHb8AFfuufJy1sIrwh-AWkRPjaYH-VqtTECLOiq_855Pc8xAu3xrmhUvGw_9L_SfuEc6iVCVBBpB-uFmXzFn7BkYHYqdkCXBtpYB56J6Wn7fQo2Bby6LA6RJ699Ti1r8dedZ4urLmYsNnoh-mbmjtZ6gBosrY2P1oQYu3V1PdZ2cX8UvEuUdKA9duq99oDVFTGIdyDO2c5aZ2jQBX2dFzqIkBh2qSes_qIN0iQEBCSpNwJ5BijbpOlQwQTbcvfjWXEcP_2-qFOM40EI9LwqhfOXyhMkQhLPNlSPEAOW3DpNhHtOU6o9z8Y-fBRlqb-b1oPdA";

// Соответствие директорий тегам
const directoryToTags = {
  "characters/main_heroes": ["персонаж", "главный герой"],
  "characters/villains": ["персонаж", "злодей"],
  "characters/friends_allies": ["персонаж", "друг", "союзник"],
  "characters/relatives": ["персонаж", "родственник"],
  "characters/other": ["персонаж", "второстепенный"],
  places: ["место", "локация"],
  world_description: ["мир", "описание"],
  artifacts_and_magic: ["артефакт", "магия"],
  journey: ["приключение", "сюжет"],
  relationship: ["отношения"],
};

// ... остальной код остается без изменений
