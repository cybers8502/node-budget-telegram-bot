const { Bot, webhookCallback } = require('grammy');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) throw new Error('TELEGRAM_BOT_TOKEN env is required');

const bot = new Bot(TOKEN);

// 1) Глобальний обробник помилок (щоб не падати мовчки)
bot.catch((err) => {
    console.error('grammY error:', err.error || err);
});

// 3) Middleware для різних фреймворків (Express/Fastify)
function getWebhookMiddleware(framework = 'express', secretToken) {
    return webhookCallback(bot, framework, { secretToken });
}

// 4) Зручно мати хелпер для локального полінгу
async function startPolling() {
    await bot.start();
    console.log('Bot started in polling mode');
}

module.exports = { bot, getWebhookMiddleware, startPolling };
