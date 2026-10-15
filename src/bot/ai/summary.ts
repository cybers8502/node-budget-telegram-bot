import {randomUUID} from 'node:crypto';
import type {Expense} from '../../types';
import {formatKyivIso, parseKyivDate, toJsDate} from '../../utils/date';
import banks from '../banks';
import categories from '../categories';

export const GROUP_BY = ['category', 'bank', 'month', 'day'] as const;
export type GroupBy = (typeof GROUP_BY)[number];

const MAX_GROUPS = 370;
const UNKNOWN_BANK = 'unknown';

const round = (n: number) => Math.round(n * 100) / 100;
export const isIncome = (e: Expense) => e.type === 'income' || e.category === 'Дохід';

function groupKey(e: Expense, groupBy: GroupBy): string {
  if (groupBy === 'category') return e.category;
  if (groupBy === 'bank') return e.bank || UNKNOWN_BANK;
  const day = formatKyivIso(toJsDate(e.date));
  return groupBy === 'month' ? day.slice(0, 7) : day;
}

// Aggregates on the server so the model never has to add up records itself
export function buildSummary(expenses: Expense[], groupBy: GroupBy) {
  const groups = new Map<string, {expenses: number; income: number; count: number}>();
  let totalExpenses = 0;
  let totalIncome = 0;

  for (const e of expenses) {
    if (!e.sum) continue;
    const key = groupKey(e, groupBy);
    const g = groups.get(key) ?? {expenses: 0, income: 0, count: 0};
    if (isIncome(e)) {
      g.income += e.sum;
      totalIncome += e.sum;
    } else {
      g.expenses += e.sum;
      totalExpenses += e.sum;
    }
    g.count++;
    groups.set(key, g);
  }

  const rows = [...groups.entries()]
    .map(([key, g]) => ({key, expenses: round(g.expenses), income: round(g.income), count: g.count}))
    // categories and banks: biggest spend first; months and days: chronological
    .sort((a, b) =>
      groupBy === 'category' || groupBy === 'bank' ? b.expenses - a.expenses : a.key.localeCompare(b.key),
    );

  return {
    group_by: groupBy,
    total_expenses: round(totalExpenses),
    total_income: round(totalIncome),
    groups: rows.slice(0, MAX_GROUPS),
    truncated: rows.length > MAX_GROUPS,
  };
}

export interface AddExpenseInput {
  sum?: unknown;
  category?: unknown;
  bank?: unknown;
  note?: unknown;
  date?: unknown;
}

// Validates what the model proposed; the result is only a draft until the user confirms it
export function buildDraft(input: AddExpenseInput, now: Date = new Date()): Expense | string {
  const {sum, category, bank, note, date} = input;
  if (typeof sum !== 'number' || !Number.isFinite(sum) || sum <= 0) return 'sum must be a positive number';
  if (typeof category !== 'string' || !categories.includes(category)) {
    return `category must be exactly one of: ${categories.join(', ')}`;
  }
  if (bank !== undefined && bank !== null && (typeof bank !== 'string' || !banks.includes(bank))) {
    return `bank must be exactly one of: ${banks.join(', ')}`;
  }

  let when = now;
  if (date !== undefined && date !== null) {
    const day = typeof date === 'string' ? parseKyivDate(date) : null;
    if (!day) return 'date must be YYYY-MM-DD';
    // Noon of that Kyiv day keeps the record inside it whatever the DST offset
    when = new Date(day.getTime() + 12 * 60 * 60 * 1000);
  }

  return {
    id: randomUUID(),
    type: category === 'Дохід' ? 'income' : 'expense',
    sum: round(sum),
    category,
    bank: (bank as string | undefined) || null,
    note: typeof note === 'string' ? note.slice(0, 100) : '',
    date: when,
  };
}
