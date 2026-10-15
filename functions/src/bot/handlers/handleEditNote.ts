import type {Bot} from 'grammy';
import type {UserState} from '../../types';
import {forUser} from '../../utils/firebaseUtility';
import {clearUserState} from '../userState';

export default async function handleEditNote(bot: Bot, chatId: number, text: string, state: UserState) {
  if (!state.expense) {
    await clearUserState(chatId);
    await bot.api.sendMessage(chatId, 'Стан було втрачено. Почніть заново: /edit');
    return;
  }

  await forUser(chatId).updateExpense(state.expense.id, {note: text});

  await clearUserState(chatId);
  await bot.api.sendMessage(chatId, 'Опис оновлено. Введіть нову суму для нового запису.');
}
