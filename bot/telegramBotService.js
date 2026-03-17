const {bot} = require('../configs/telegramConfig');
const {getUserState, clearUserState} = require('./userState');
const handleStart = require('./handlers/handleStart');
const handleMonthSum = require('./handlers/handleMonthSum');
const handleWaitingSum = require('./handlers/handleWaitingSum');
const handleSetCategory = require('./handlers/handleSetCategory');
const handleSetNote = require('./handlers/handleSetNote');
const handleSetBank = require('./handlers/handleSetBank');
const handleEdit = require('./handlers/handleEdit');
const handleEditChoose = require('./handlers/handleEditChoose');
const handleEditSum = require('./handlers/handleEditSum');
const handleEditCategory = require('./handlers/handleEditCategory');
const handleEditNote = require('./handlers/handleEditNote');

function setupBotCommandsService() {
  bot.api.setMyCommands([
    {command: 'start', description: 'Розпочати введення витрати'},
    {command: 'month', description: 'Сума витрат за поточний місяць'},
    {command: 'edit', description: 'Редагувати останній запис'},
    {command: 'cancel', description: 'Скасувати поточну дію'},
  ]).catch(() => {});

  bot.command('start', async (ctx) => {
    const chatId = ctx.chat.id;
    await handleStart(bot, chatId);
  });

  bot.command('month', async (ctx) => {
    await handleMonthSum(bot, ctx.chat.id);
  });

  bot.command('edit', async (ctx) => {
    await handleEdit(bot, ctx.chat.id);
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

      case 'set_category':
        return handleSetCategory(bot, chatId, text);

      case 'set_bank':
        return handleSetBank(bot, chatId, text);

      case 'set_note':
        return handleSetNote(bot, chatId, text, state);

      case 'edit_choose':
        return handleEditChoose(bot, chatId, text, state);

      case 'edit_sum':
        return handleEditSum(bot, chatId, text, state);

      case 'edit_category':
        return handleEditCategory(bot, chatId, text, state);

      case 'edit_note':
        return handleEditNote(bot, chatId, text, state);

      default:
        return ctx.reply('Щось пішло не так. Спробуйте ще раз або натисніть /start.');
    }
  });
}

module.exports = setupBotCommandsService;
