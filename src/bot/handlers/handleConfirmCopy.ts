import {randomUUID} from 'node:crypto';
import type {Bot} from 'grammy';
import {BUDGET_ID} from '../../configs/consts';
import type {Expense, UserState} from '../../types';
import {getLastExpense, saveExpense} from '../../utils/firebaseUtility';
import {appendExpenseToSheet} from '../../utils/googleSheetsUtility';
import {categoryKeyboard} from '../keyboards';
import {clearUserState, setUserState} from '../userState';

export default async function handleConfirmCopy(bot: Bot, chatId: number, text: string, state: UserState) {
  const userId = chatId.toString();
  const budgetId = BUDGET_ID;

  if (text.toLowerCase() === 'так') {
    const lastExpense = await getLastExpense({budgetId, userId});

    const isIncome = lastExpense?.type === 'income' || lastExpense?.category === 'Дохід';
    const newExpense = {
      ...(lastExpense || {}),
      id: randomUUID(),
      type: isIncome ? 'income' : 'expense',
      sum: state.sum,
      date: new Date(),
    } as Expense;

    await Promise.all([saveExpense({budgetId, userId, data: newExpense}), appendExpenseToSheet(newExpense)]);
    clearUserState(chatId);
    await bot.api.sendMessage(chatId, 'Запис створено! Введіть нову суму для нового запису.');
  } else if (text.toLowerCase() === 'ні') {
    setUserState(chatId, {step: 'set_category'});

    await bot.api.sendMessage(chatId, 'Виберіть категорію:', {reply_markup: categoryKeyboard()});
  } else {
    await bot.api.sendMessage(chatId, 'Відповідь не зрозуміла. Напишіть "так" або "ні".');
  }
}
