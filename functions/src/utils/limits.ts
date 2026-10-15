import {evalArithmetic} from './evalArithmetic';
import {matchCategory} from '../bot/quickInput';

export const WARN_RATIO = 0.8;

export type LimitStatus = 'warn' | 'over' | null;

// Which threshold the new expense crossed: `before` and `after` are the category's spend in the month
export function limitCrossing(before: number, after: number, limit: number): LimitStatus {
  if (limit <= 0) return null;
  if (before < limit && after >= limit) return 'over';
  if (before < limit * WARN_RATIO && after >= limit * WARN_RATIO && after < limit) return 'warn';
  return null;
}

export function formatLimitLine(category: string, spent: number, limit: number): string {
  const percent = Math.round((spent / limit) * 100);
  return `${category}: ${Math.round(spent)} з ${Math.round(limit)} (${percent}%)`;
}

export function limitWarning(status: LimitStatus, category: string, spent: number, limit: number): string {
  if (!status) return '';
  const line = formatLimitLine(category, spent, limit);
  return status === 'over' ? `🚨 Ліміт перевищено. ${line}` : `⚠️ Майже ліміт. ${line}`;
}

// "/limit їжа 5000": the last word is the amount, the first word that matches a category picks it
export function parseLimitArgs(text: string): {category: string; amount: number} | null {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return null;

  const amount = evalArithmetic(words[words.length - 1]);
  if (amount === null || amount < 0) return null;

  for (const word of words.slice(0, -1)) {
    const category = matchCategory(word);
    if (category) return {category, amount};
  }
  return null;
}
