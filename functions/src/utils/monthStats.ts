import type {Expense} from '../types';
import {kyivParts, toJsDate} from './date';

export const INCOME_CATEGORY = 'Дохід';

export const isIncome = (e: Expense) =>
  e.kind === 'income' || e.type === 'income' || e.category === INCOME_CATEGORY;

// `type` for the bot and `kind` for the web app; income is the only kind the bot writes
export const incomeFields = (category: string): Pick<Expense, 'type' | 'kind'> =>
  category === INCOME_CATEGORY ? {type: 'income', kind: 'income'} : {type: 'expense'};

// Expenses minus income, the same "net" figure /month has always shown
export function netTotal(expenses: Expense[]): number {
  return expenses.reduce((acc, e) => (!e.sum ? acc : isIncome(e) ? acc - e.sum : acc + e.sum), 0);
}

export function spentByCategory(expenses: Expense[]): Record<string, number> {
  const byCat: Record<string, number> = {};
  for (const e of expenses) {
    if (isIncome(e) || !e.sum) continue;
    byCat[e.category] = (byCat[e.category] || 0) + e.sum;
  }
  return byCat;
}

// Records made on or before the given day of the (Kyiv) month: "the same point of the previous month"
export function untilDay(expenses: Expense[], day: number): Expense[] {
  return expenses.filter((e) => kyivParts(toJsDate(e.date)).day <= day);
}

// "+12%" / "-5%" / "0%"; null when there is nothing to compare with
export function formatChange(current: number, previous: number): string | null {
  if (previous <= 0) return null;
  const percent = Math.round(((current - previous) / previous) * 100);
  return `${percent > 0 ? '+' : ''}${percent}%`;
}
