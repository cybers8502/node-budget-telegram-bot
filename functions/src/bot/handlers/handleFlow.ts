import type {Bot} from 'grammy';
import type {UserState} from '../../types';
import {clearUserState} from '../userState';
import saveNewExpense from './saveNewExpense';

// `flow:cancel` works at any step; `flow:skip` skips the description of a new expense
export default async function handleFlow(bot: Bot, chatId: number, action: string, state: UserState | null) {
  if (action === 'cancel') {
    await clearUserState(chatId);
    await bot.api.sendMessage(chatId, 'Скасовано. Введіть нову суму для нового запису.');
    return;
  }

  if (action === 'skip' && state?.step === 'set_note') {
    await saveNewExpense(bot, chatId, state, '');
    return;
  }

  await bot.api.sendMessage(chatId, 'Ця кнопка вже неактуальна. Почніть заново: /start');
}
