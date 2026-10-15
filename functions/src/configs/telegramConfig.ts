import {Bot, webhookCallback} from 'grammy';

export const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN || 'placeholder');

// 3) Middleware для різних фреймворків (Express/Fastify)
export function getWebhookMiddleware(
  framework: Parameters<typeof webhookCallback>[1] = 'express',
  secretToken?: string,
) {
  return webhookCallback(bot, framework, {secretToken});
}

// 4) Зручно мати хелпер для локального полінгу
export async function startPolling(): Promise<void> {
  await bot.start();
  console.log('Bot started in polling mode');
}
