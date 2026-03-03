const { onRequest } = require("firebase-functions/v2/https");
const express = require("express");
const { getWebhookMiddleware, bot} = require("./configs/telegramConfig");
const setupBotCommandsService = require("./bot/telegramBotService");
const {webhookCallback} = require("grammy");

const app = express();
app.use(express.json());

const SECRET = process.env.SECRET || 'your own secret key';

setupBotCommandsService();

app.get("/_health", (_req, res) => res.status(200).send("OK"));

// Слухаємо корінь, бо викликати будемо прямим URL функції
app.use("/", webhookCallback(bot, "express", {
  secretToken: SECRET,
}));

exports.telegramWebhook = onRequest(
    { region: "europe-west3", memory: "256MiB", minInstances: 0, invoker: "public" },
    app
);
