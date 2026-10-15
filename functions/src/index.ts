import express from 'express';
import {onRequest} from 'firebase-functions/v2/https';
import {onSchedule} from 'firebase-functions/v2/scheduler';
import {webhookCallback} from 'grammy';
import setupBotCommandsService from './bot/telegramBotService';
import {bot} from './configs/telegramConfig';
import {runDigestJob} from './jobs/digestJob';
import {runRecurringJob} from './jobs/recurringJob';

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

export const recurringExpenses = onSchedule(
  {
    schedule: '0 8 * * *',
    timeZone: 'Europe/Kyiv',
    region: 'europe-west3',
    memory: '256MiB',
    secrets: ['TELEGRAM_BOT_TOKEN'],
  },
  async () => {
    await runRecurringJob();
  },
);

export const weeklyDigest = onSchedule(
  {
    schedule: '0 9 * * 1',
    timeZone: 'Europe/Kyiv',
    region: 'europe-west3',
    memory: '256MiB',
    secrets: ['TELEGRAM_BOT_TOKEN'],
  },
  async () => {
    await runDigestJob();
  },
);
