import {bot} from '../configs/telegramConfig';
import {clearAiHistory} from '../utils/aiStore';
import handleAi from './handlers/handleAi';
import handleAiConfirm from './handlers/handleAiConfirm';
import handleEdit from './handlers/handleEdit';
import handleFlow from './handlers/handleFlow';
import handleEditBank from './handlers/handleEditBank';
import handleEditCategory from './handlers/handleEditCategory';
import handleEditChoose from './handlers/handleEditChoose';
import handleEditNote from './handlers/handleEditNote';
import handleDelete from './handlers/handleDelete';
import handleEditSum from './handlers/handleEditSum';
import handleLast, {handleRecordSelected} from './handlers/handleLast';
import {handleLimits, handleSetLimit} from './handlers/handleLimits';
import handleRecurring, {handleRecurringCallback, handleSubs} from './handlers/handleRecurring';
import handleMonthSum from './handlers/handleMonthSum';
import handleSetBank from './handlers/handleSetBank';
import handleSetCategory from './handlers/handleSetCategory';
import handleSetNote from './handlers/handleSetNote';
import handleStart from './handlers/handleStart';
import handleWaitingSum from './handlers/handleWaitingSum';
import {clearUserState, getUserState} from './userState';

const allowedUsers = new Set(
  (process.env.ALLOWED_TG_USERS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean),
);

export default function setupBotCommandsService() {
  // Whitelist: ignore everyone not in ALLOWED_TG_USERS (empty list denies all)
  bot.use(async (ctx, next) => {
    const userId = ctx.from?.id;
    if (userId === undefined || !allowedUsers.has(String(userId))) {
      console.warn('Blocked update from non-allowed user:', userId);
      return;
    }
    return next();
  });

  bot.api
    .setMyCommands([
      {command: 'start', description: 'Розпочати введення витрати'},
      {command: 'month', description: 'Сума витрат за поточний місяць'},
      {command: 'edit', description: 'Редагувати останній запис'},
      {command: 'last', description: 'Останні записи: редагувати або видалити'},
      {command: 'limits', description: 'Ліміти на категорії та поточні витрати'},
      {command: 'limit', description: 'Задати ліміт: /limit їжа 5000'},
      {command: 'recurring', description: 'Підписки й розстрочки: додати або видалити'},
      {command: 'subs', description: 'Усі підписки та розстрочки за цей місяць'},
      {command: 'ai', description: 'Запитати AI про витрати'},
      {command: 'cancel', description: 'Скасувати поточну дію'},
    ])
    .catch(() => {});

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

  bot.command('last', async (ctx) => {
    await handleLast(bot, ctx.chat.id);
  });

  bot.command('limits', async (ctx) => {
    await handleLimits(bot, ctx.chat.id);
  });

  bot.command('limit', async (ctx) => {
    await handleSetLimit(bot, ctx.chat.id, ctx.match?.trim() ?? '');
  });

  bot.command('recurring', async (ctx) => {
    await handleRecurring(bot, ctx.chat.id, ctx.match?.trim() ?? '');
  });

  bot.command('subs', async (ctx) => {
    await handleSubs(bot, ctx.chat.id);
  });

  bot.command('ai', async (ctx) => {
    await handleAi(bot, ctx.chat.id, ctx.match?.trim());
  });

  bot.command('cancel', async (ctx) => {
    const chatId = ctx.chat.id;
    await ctx.reply('Охрана отмєна!');
    await clearUserState(chatId);
    await clearAiHistory(chatId);
  });

  bot.on('callback_query:data', async (ctx) => {
    const chatId = ctx.chat?.id;
    if (chatId === undefined) return;
    const data = ctx.callbackQuery.data;
    const state = await getUserState(chatId);

    await ctx.answerCallbackQuery();

    if (data.startsWith('cat:')) {
      const index = Number(data.slice(4));
      if (state?.step === 'edit_category') {
        return handleEditCategory(bot, chatId, index, state);
      }
      return handleSetCategory(bot, chatId, index);
    }

    if (data.startsWith('bank:')) {
      const index = Number(data.slice(5));
      if (state?.step === 'edit_bank') {
        return handleEditBank(bot, chatId, index, state);
      }
      return handleSetBank(bot, chatId, index);
    }

    if (data.startsWith('rcr:')) {
      return handleRecurringCallback(bot, chatId, data.slice(4));
    }

    if (data.startsWith('flow:')) {
      return handleFlow(bot, chatId, data.slice(5), state);
    }

    if (data.startsWith('ai:')) {
      return handleAiConfirm(bot, chatId, data.slice(3), state);
    }

    if (data.startsWith('rec:')) {
      return handleRecordSelected(bot, chatId, data.slice(4));
    }

    if (data.startsWith('del:')) {
      return handleDelete(bot, chatId, data.slice(4), state);
    }

    if (data.startsWith('edit:')) {
      const choice = data.slice(5);
      return handleEditChoose(bot, chatId, choice);
    }
  });

  bot.on('message:text', async (ctx) => {
    const chatId = ctx.chat.id;
    const text = ctx.message.text?.trim();
    if (!text || text.startsWith('/')) return;

    const state = await getUserState(chatId);

    if (!state || !state.step) {
      return handleWaitingSum(bot, chatId, text);
    }

    switch (state.step) {
      case 'waiting_sum':
        return handleWaitingSum(bot, chatId, text);

      case 'set_note':
        return handleSetNote(bot, chatId, text, state);

      case 'edit_choose':
        return handleEditChoose(bot, chatId, text);

      case 'edit_sum':
        return handleEditSum(bot, chatId, text, state);

      case 'edit_note':
        return handleEditNote(bot, chatId, text, state);

      default:
        return ctx.reply('Щось пішло не так. Спробуйте ще раз або натисніть /start.');
    }
  });
}
