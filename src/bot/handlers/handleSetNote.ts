import {randomUUID} from 'node:crypto';
import type {Bot} from 'grammy';
import {BUDGET_ID} from '../../configs/consts';
import type {Expense, UserState} from '../../types';
import {saveExpense} from '../../utils/firebaseUtility';
import {appendExpenseToSheet} from '../../utils/googleSheetsUtility';
import {clearUserState} from '../userState';

export default async function handleSetNote(bot: Bot, chatId: number, text: string, state: UserState) {
  if (!state.sum || !state.category) {
    clearUserState(chatId);
    await bot.api.sendMessage(chatId, 'Стан було втрачено. Будь ласка, введіть суму ще раз.');
    return;
  }

  const newExpense: Expense = {
    id: randomUUID(),
    type: state.category === 'Дохід' ? 'income' : 'expense',
    sum: state.sum,
    category: state.category,
    bank: state.bank || null,
    note: text,
    date: new Date(),
  };

  await Promise.all([
    saveExpense({budgetId: BUDGET_ID, userId: chatId.toString(), data: newExpense}),
    appendExpenseToSheet(newExpense),
  ]);

  clearUserState(chatId);
  await bot.api.sendMessage(chatId, 'Запис створено! Введіть нову суму для нового запису.');
}
