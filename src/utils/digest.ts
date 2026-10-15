import type {Expense} from '../types';
import {formatChange, isIncome, netTotal, spentByCategory} from './monthStats';

const round = (n: number) => Math.round(n);

// Plain-text weekly summary: spend, change vs. the week before, top categories and the biggest expense
export function buildDigest(week: Expense[], prevWeek: Expense[]): string | null {
  const spent = week.filter((e) => !isIncome(e) && e.sum);
  if (spent.length === 0) return null;

  const total = netTotal(spent);
  const change = formatChange(total, netTotal(prevWeek.filter((e) => !isIncome(e))));
  const top = Object.entries(spentByCategory(week))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const biggest = spent.reduce((max, e) => (e.sum > max.sum ? e : max));

  const lines = [
    `Тиждень: ${round(total)} грн${change ? ` (${change} до попереднього)` : ''}`,
    `Транзакцій: ${spent.length}, у середньому ${round(total / spent.length)} грн`,
    '',
    'Топ категорій:',
    ...top.map(([cat, sum], i) => `${i + 1}. ${cat} — ${round(sum)}`),
    '',
    `Найбільша: ${round(biggest.sum)} (${biggest.category}${biggest.note ? ` — ${biggest.note}` : ''})`,
  ];
  return lines.join('\n');
}
