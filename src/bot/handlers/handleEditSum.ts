import type {Bot} from 'grammy';
import {BUDGET_ID} from '../../configs/consts';
import type {UserState} from '../../types';
import {evalArithmetic} from '../../utils/evalArithmetic';
import {updateExpense} from '../../utils/firebaseUtility';
import {clearUserState} from '../userState';

export default async function handleEditSum(bot: Bot, chatId: number, text: string, state: UserState) {
  const sum = evalArithmetic(text);
  if (sum === null || sum <= 0) {
    await bot.api.sendMessage(chatId, 'Будь ласка, введіть суму або вираз (наприклад: 100, 50+30).');
    return;
  }

  if (!state.expense) {
    clearUserState(chatId);
    await bot.api.sendMessage(chatId, 'Стан було втрачено. Почніть заново: /edit');
    return;
  }

  await updateExpense({
    budgetId: BUDGET_ID,
    userId: chatId.toString(),
    expenseId: state.expense.id,
    data: {sum},
  });

  clearUserState(chatId);
  await bot.api.sendMessage(chatId, `Суму оновлено: ${sum} грн. Введіть нову суму для нового запису.`);
}
