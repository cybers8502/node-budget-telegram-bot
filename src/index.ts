import express from 'express';
import {onRequest} from 'firebase-functions/v2/https';
import {webhookCallback} from 'grammy';
import setupBotCommandsService from './bot/telegramBotService';
import {bot} from './configs/telegramConfig';

const app = express();
app.use(express.json());

const SECRET = process.env.SECRET || 'your own secret key';

setupBotCommandsService();

app.get('/_health', (_req, res) => {
  res.status(200).send('OK');
});

// Слухаємо корінь, бо викликати будемо прямим URL функції
app.use(
  '/',
  webhookCallback(bot, 'express', {
    secretToken: SECRET,
  }),
);

export const telegramWebhook = onRequest(
  {
    region: 'europe-west3',
    memory: '256MiB',
    minInstances: 0,
    invoker: 'public',
    secrets: ['TELEGRAM_BOT_TOKEN', 'SECRET', 'ANTHROPIC_API_KEY'],
  },
  app,
);
