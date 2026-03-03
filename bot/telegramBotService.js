const {bot} = require('../configs/telegramConfig');
const {getUserState, clearUserState} = require('./userState');
const handleStart = require('./handlers/handleStart');
const handleMonthSum = require('./handlers/handleMonthSum');
const handleWaitingSum = require('./handlers/handleWaitingSum');
const handleConfirmCopy = require('./handlers/handleConfirmCopy');
const handleSetCategory = require('./handlers/handleSetCategory');
const handleSetNote = require('./handlers/handleSetNote');

function setupBotCommandsService() {
  bot.api.setMyCommands([
    {command: 'start', description: 'Розпочати введення витрати'},
    {command: 'month', description: 'Сума витрат за поточний місяць'},
    {command: 'cancel', description: 'Скасувати поточну дію'},
  ]);

  bot.command('start', async (ctx) => {
    const chatId = ctx.chat.id;
    await handleStart(bot, chatId);
  });

  bot.command('month', async (ctx) => {
    await handleMonthSum(bot, ctx.chat.id);
  });

  bot.command('cancel', async (ctx) => {
    const chatId = ctx.chat.id;
    await ctx.reply('Охрана отмєна!');
    clearUserState(chatId);
  });

  bot.on('message:text', async (ctx) => {
    const chatId = ctx.chat.id;
    const text = ctx.message.text?.trim();
    if (!text || text.startsWith('/')) return;

    const state = getUserState(chatId);

    if (!state || !state.step) {
      return handleWaitingSum(bot, chatId, text);
    }

    switch (state.step) {
      case 'waiting_sum':
        return handleWaitingSum(bot, chatId, text);

      case 'confirm_copy':
        return handleConfirmCopy(bot, chatId, text, state);

      case 'set_category':
        return handleSetCategory(bot, chatId, text);

      case 'set_note':
        return handleSetNote(bot, chatId, text, state);

      default:
        return ctx.reply('Щось пішло не так. Спробуйте ще раз або натисніть /start.');
    }
  });
}

module.exports = setupBotCommandsService;
