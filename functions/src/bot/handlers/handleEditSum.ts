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
    await clearUserState(chatId);
    await bot.api.sendMessage(chatId, 'Стан було втрачено. Почніть заново: /edit');
    return;
  }

  await updateExpense({
    budgetId: BUDGET_ID,
    userId: chatId.toString(),
    expenseId: state.expense.id,
    // A foreign-currency record keeps its rate; the original amount follows the new UAH sum
    data: {
      sum,
      ...(state.expense.rate && {originalSum: Math.round((sum / state.expense.rate) * 100) / 100}),
    },
  });

  await clearUserState(chatId);
  await bot.api.sendMessage(chatId, `Суму оновлено: ${sum} грн. Введіть нову суму для нового запису.`);
}
