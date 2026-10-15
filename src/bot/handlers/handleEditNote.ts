import type {Bot} from 'grammy';
import {BUDGET_ID} from '../../configs/consts';
import type {UserState} from '../../types';
import {updateExpense} from '../../utils/firebaseUtility';
import {clearUserState} from '../userState';

export default async function handleEditNote(bot: Bot, chatId: number, text: string, state: UserState) {
  if (!state.expense) {
    clearUserState(chatId);
    await bot.api.sendMessage(chatId, 'Стан було втрачено. Почніть заново: /edit');
    return;
  }

  await updateExpense({
    budgetId: BUDGET_ID,
    userId: chatId.toString(),
    expenseId: state.expense.id,
    data: {note: text},
  });

  clearUserState(chatId);
  await bot.api.sendMessage(chatId, 'Опис оновлено. Введіть нову суму для нового запису.');
}
