import {randomUUID} from 'node:crypto';
import {type QuickEntry, parseQuickInput} from '../bot/quickInput';
import type {Expense, RecurringItem} from '../types';
import {incomeFields} from './monthStats';

export interface KyivToday {
  year: number;
  month: number; // 0-based
  day: number;
}

export const monthKey = ({year, month}: KyivToday) => `${year}-${String(month + 1).padStart(2, '0')}`;

// Days 29-31 fall on the last day of a shorter month
export const chargeDay = (item: RecurringItem, daysInMonth: number) => Math.min(item.day, daysInMonth);

// Due once per month on its day; catches up if a run was missed
export function isRecurringDue(item: RecurringItem, today: KyivToday, daysInMonth: number): boolean {
  if (item.lastRun === monthKey(today)) return false;
  return today.day >= chargeDay(item, daysInMonth);
}

// Gets a "charged tomorrow" reminder once per month, the day before its charge day
export function isDueTomorrow(
  item: RecurringItem,
  tomorrow: KyivToday,
  daysInTomorrowsMonth: number,
): boolean {
  const key = monthKey(tomorrow);
  if (item.lastRun === key || item.reminded === key) return false;
  return tomorrow.day === chargeDay(item, daysInTomorrowsMonth);
}

// A new item whose charge day already passed this month starts next month instead of charging at once
export function initialLastRun(
  item: RecurringItem,
  today: KyivToday,
  daysInMonth: number,
): string | undefined {
  return today.day >= chargeDay(item, daysInMonth) ? monthKey(today) : undefined;
}

// State after one more payment; `finished` when an installment plan has been paid in full
export function afterPayment(item: RecurringItem): {paid: number; finished: boolean} {
  const paid = (item.paid ?? 0) + 1;
  return {paid, finished: item.payments !== undefined && paid >= item.payments};
}

// The id is fixed per item and month, so a retried job overwrites the record instead of duplicating it
export function recurringExpenseId(item: RecurringItem, today: KyivToday): string {
  return `rec-${item.id}-${monthKey(today)}`;
}

// Matches the tag the r-budget web app puts on installment payments
export const INSTALLMENT_TAG = 'розстрочка';

export function buildRecurringExpense(item: RecurringItem, today: KyivToday, now: Date): Expense {
  return {
    id: recurringExpenseId(item, today),
    ...incomeFields(item.category),
    sum: item.sum,
    category: item.category,
    bank: item.bank,
    note: item.note,
    ...(item.payments !== undefined && {tags: [INSTALLMENT_TAG]}),
    date: now,
  };
}

// "3/6" for installments, nothing for open-ended subscriptions; `extra` counts a payment just made or due
export function progressLabel(item: RecurringItem, extra = 0): string {
  return item.payments === undefined ? '' : `${(item.paid ?? 0) + extra}/${item.payments}`;
}

export function describeRecurring(item: RecurringItem): string {
  const progress = progressLabel(item);
  const text = [`${item.day}-го`, `${item.sum} грн`, item.category, item.bank, item.note]
    .filter(Boolean)
    .join(' · ');
  return progress ? `${text} (${progress})` : text;
}

// Month overview for /subs: what is already charged, what is still to come, and the month's total
export function buildSubsOverview(
  items: RecurringItem[],
  today: KyivToday,
  daysInMonth: number,
  monthLabel: string,
): string {
  if (items.length === 0)
    return 'Підписок і розстрочок немає. Додати: /recurring 5 800 підписка моно Netflix';

  const key = monthKey(today);
  const mm = String(today.month + 1).padStart(2, '0');
  let charged = 0;
  let upcoming = 0;

  const lines = [...items]
    .sort((a, b) => chargeDay(a, daysInMonth) - chargeDay(b, daysInMonth))
    .map((item) => {
      const done = item.lastRun === key;
      if (done) charged += item.sum;
      else upcoming += item.sum;

      const progress = progressLabel(item, done ? 0 : 1);
      const date = `${String(chargeDay(item, daysInMonth)).padStart(2, '0')}.${mm}`;
      const parts = [date, `${item.sum} грн`, item.category, item.bank, item.note]
        .filter(Boolean)
        .join(' · ');
      return `${done ? '✅' : '⏳'} ${parts}${progress ? ` (${progress})` : ''}`;
    });

  return [
    `Підписки та розстрочки · ${monthLabel}`,
    ...lines,
    '',
    `Разом за місяць: ${charged + upcoming} грн (списано ${charged}, ще ${upcoming})`,
  ].join('\n');
}

// "x6" / "6x" (total payments) or "2/6" (2 of 6 already paid) marks an installment plan
function takeInstallment(words: string[]): {rest: string[]; payments?: number; paid?: number} | 'invalid' {
  const rest: string[] = [];
  let payments: number | undefined;
  let paid: number | undefined;

  for (const word of words) {
    const times = /^(?:[x×х](\d{1,3})|(\d{1,3})[x×х])$/i.exec(word);
    const progress = /^(\d{1,3})\/(\d{1,3})$/.exec(word);
    if (payments === undefined && times) {
      payments = Number(times[1] ?? times[2]);
    } else if (payments === undefined && progress) {
      paid = Number(progress[1]);
      payments = Number(progress[2]);
    } else {
      rest.push(word);
    }
  }

  if (payments === undefined) return {rest};
  if (payments < 1 || (paid !== undefined && paid >= payments)) return 'invalid';
  return {rest, payments, paid};
}

export type RecurringDraft = Omit<RecurringItem, 'lastRun' | 'reminded'>;

// "/recurring 5 800 підписка моно Netflix" (a day of the month, then the usual quick input);
// add "x6" for a 6-payment installment plan, or "2/6" when 2 of 6 payments are already made
export function parseRecurringArgs(text: string): RecurringDraft | string {
  const match = /^(\d{1,2})\s+(.+)$/.exec(text.trim());
  if (!match) return 'format';

  const day = Number(match[1]);
  if (day < 1 || day > 31) return 'day';

  const plan = takeInstallment(match[2].split(/\s+/));
  if (plan === 'invalid') return 'payments';

  const entry: QuickEntry | null = parseQuickInput(plan.rest.join(' '));
  if (!entry) return 'sum';
  if (entry.currency) return 'currency';
  if (!entry.category) return 'category';

  return {
    id: randomUUID(),
    day,
    sum: entry.sum,
    category: entry.category,
    bank: entry.bank ?? null,
    note: entry.note,
    ...(plan.payments !== undefined && {payments: plan.payments, paid: plan.paid ?? 0}),
  };
}
