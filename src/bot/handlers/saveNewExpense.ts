import {randomUUID} from 'node:crypto';
import type {Bot} from 'grammy';
import type {Expense, UserState} from '../../types';
import {BUDGET_ID} from '../../configs/consts';
import {saveExpense} from '../../utils/firebaseUtility';
import {clearUserState} from '../userState';

export default async function saveNewExpense(bot: Bot, chatId: number, state: UserState, note: string) {
  if (!state.sum || !state.category) {
    await clearUserState(chatId);
    await bot.api.sendMessage(chatId, 'Стан було втрачено. Будь ласка, введіть суму ще раз.');
    return;
  }

  const newExpense: Expense = {
    id: randomUUID(),
    type: state.category === 'Дохід' ? 'income' : 'expense',
    sum: state.sum,
    category: state.category,
    bank: state.bank || null,
    note,
    date: new Date(),
  };

  await saveExpense({budgetId: BUDGET_ID, userId: chatId.toString(), data: newExpense});
  await clearUserState(chatId);

  const summary = [`${state.sum} грн`, state.category, state.bank, note].filter(Boolean).join(' · ');
  await bot.api.sendMessage(chatId, `Запис створено: ${summary}\nВведіть нову суму для нового запису.`);
}
