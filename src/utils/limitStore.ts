import {BUDGET_ID} from '../configs/consts';
import {db} from '../configs/firebaseConfig';
import type {Expense} from '../types';
import {kyivMonthRange, toJsDate} from './date';
import {getMonthExpenses} from './firebaseUtility';
import {limitCrossing, limitWarning} from './limits';

const limitsDoc = (chatId: number) =>
  db
    .collection('budgets')
    .doc(BUDGET_ID)
    .collection('users')
    .doc(chatId.toString())
    .collection('settings')
    .doc('limits');

export async function getLimits(chatId: number): Promise<Record<string, number>> {
  const snap = await limitsDoc(chatId).get();
  return (snap.data()?.limits as Record<string, number> | undefined) ?? {};
}

// amount 0 removes the limit
export async function setLimit(chatId: number, category: string, amount: number): Promise<void> {
  const limits = await getLimits(chatId);
  if (amount > 0) limits[category] = amount;
  else delete limits[category];
  await limitsDoc(chatId).set({limits});
}

export async function categorySpend(chatId: number, category: string, date: Date): Promise<number> {
  const {from, to} = kyivMonthRange(date);
  const expenses = await getMonthExpenses({budgetId: BUDGET_ID, userId: chatId.toString(), from, to});
  return expenses
    .filter((e) => e.category === category && e.type !== 'income')
    .reduce((acc, e) => acc + (e.sum || 0), 0);
}

// Call right after the expense is saved: returns a warning line when it crossed 80% or 100%, else ''
export async function limitWarningFor(chatId: number, expense: Expense): Promise<string> {
  if (expense.type === 'income' || expense.category === 'Дохід') return '';

  try {
    const limit = (await getLimits(chatId))[expense.category];
    if (!limit) return '';

    const after = await categorySpend(chatId, expense.category, toJsDate(expense.date));
    const status = limitCrossing(after - expense.sum, after, limit);
    return limitWarning(status, expense.category, after, limit);
  } catch (err) {
    console.error('Limit check failed:', err);
    return '';
  }
}
