import {describe, expect, it} from 'vitest';
import type {RecurringItem} from '../src/types';
import {
  afterPayment,
  buildRecurringExpense,
  buildSubsOverview,
  initialLastRun,
  isDueTomorrow,
  isRecurringDue,
  monthKey,
  parseRecurringArgs,
  progressLabel,
  recurringExpenseId,
} from '../src/utils/recurring';

const item = (over: Partial<RecurringItem> = {}): RecurringItem => ({
  id: 'abc',
  day: 5,
  sum: 800,
  category: "Підписки і зв'язок",
  bank: 'Моно',
  note: 'Netflix',
  ...over,
});

const today = (day: number, month = 9, year = 2026) => ({year, month, day});

describe('isRecurringDue', () => {
  it('is due on and after its day, not before', () => {
    expect(isRecurringDue(item(), today(4), 31)).toBe(false);
    expect(isRecurringDue(item(), today(5), 31)).toBe(true);
    expect(isRecurringDue(item(), today(20), 31)).toBe(true);
  });

  it('runs once per month', () => {
    expect(isRecurringDue(item({lastRun: '2026-10'}), today(20), 31)).toBe(false);
    expect(isRecurringDue(item({lastRun: '2026-09'}), today(5), 31)).toBe(true);
  });

  it('uses the last day of a short month for days 29-31', () => {
    expect(isRecurringDue(item({day: 31}), today(27, 1, 2026), 28)).toBe(false);
    expect(isRecurringDue(item({day: 31}), today(28, 1, 2026), 28)).toBe(true);
  });
});

describe('recurring expenses', () => {
  it('uses a deterministic id per item and month, so a retry cannot duplicate', () => {
    expect(monthKey(today(5))).toBe('2026-10');
    expect(recurringExpenseId(item(), today(5))).toBe('rec-abc-2026-10');
    expect(recurringExpenseId(item(), today(5, 10))).toBe('rec-abc-2026-11');
  });

  it('builds the expense from the item', () => {
    const now = new Date('2026-10-05T05:00:00Z');
    expect(buildRecurringExpense(item(), today(5), now)).toEqual({
      id: 'rec-abc-2026-10',
      type: 'expense',
      sum: 800,
      category: "Підписки і зв'язок",
      bank: 'Моно',
      note: 'Netflix',
      date: now,
    });
    expect(buildRecurringExpense(item({category: 'Дохід'}), today(5), now)).toMatchObject({
      type: 'income',
      kind: 'income',
    });
  });

  it('tags installment payments but not subscriptions', () => {
    const now = new Date('2026-10-05T05:00:00Z');
    expect(buildRecurringExpense(item({payments: 6, paid: 1}), today(5), now).tags).toEqual(['розстрочка']);
    expect(buildRecurringExpense(item(), today(5), now)).not.toHaveProperty('tags');
  });
});

describe('parseRecurringArgs', () => {
  it('parses day, sum, category, bank and note', () => {
    expect(parseRecurringArgs('5 800 підписка моно Netflix')).toMatchObject({
      day: 5,
      sum: 800,
      category: "Підписки і зв'язок",
      bank: 'Моно',
      note: 'Netflix',
    });
  });

  it('defaults the bank to null', () => {
    expect(parseRecurringArgs('1 12000 жкх')).toMatchObject({bank: null, note: ''});
  });

  it('reports what is wrong', () => {
    expect(parseRecurringArgs('800 підписка')).toMatch(/format|day/);
    expect(parseRecurringArgs('abc')).toBe('format');
    expect(parseRecurringArgs('32 800 підписка')).toBe('day');
    expect(parseRecurringArgs('5 підписка')).toBe('sum');
    expect(parseRecurringArgs('5 800 моно')).toBe('category');
    expect(parseRecurringArgs('5 20 usd підписка')).toBe('currency');
  });
});

describe('installments', () => {
  it('parses x6, 6x and 2/6 plans', () => {
    expect(parseRecurringArgs('5 1200 техніка моно ноутбук x6')).toMatchObject({
      sum: 1200,
      category: 'Техніка',
      note: 'ноутбук',
      payments: 6,
      paid: 0,
    });
    expect(parseRecurringArgs('5 1200 техніка 6x')).toMatchObject({payments: 6, paid: 0});
    expect(parseRecurringArgs('5 1200 техніка 2/6 ноутбук')).toMatchObject({
      payments: 6,
      paid: 2,
      note: 'ноутбук',
    });
  });

  it('leaves subscriptions open-ended', () => {
    const item = parseRecurringArgs('5 800 підписка Netflix') as Record<string, unknown>;
    expect(item.payments).toBeUndefined();
    expect(item.paid).toBeUndefined();
  });

  it('rejects impossible plans', () => {
    expect(parseRecurringArgs('5 1200 техніка x0')).toBe('payments');
    expect(parseRecurringArgs('5 1200 техніка 6/6')).toBe('payments');
    expect(parseRecurringArgs('5 1200 техніка 7/6')).toBe('payments');
  });

  it('counts payments and detects the last one', () => {
    expect(afterPayment(item({payments: 6, paid: 2}))).toEqual({paid: 3, finished: false});
    expect(afterPayment(item({payments: 6, paid: 5}))).toEqual({paid: 6, finished: true});
    expect(afterPayment(item({payments: 1}))).toEqual({paid: 1, finished: true});
    // a subscription never finishes
    expect(afterPayment(item())).toEqual({paid: 1, finished: false});
  });

  it('labels progress, counting a payment that is just made or due', () => {
    expect(progressLabel(item())).toBe('');
    expect(progressLabel(item({payments: 6, paid: 2}))).toBe('2/6');
    expect(progressLabel(item({payments: 6, paid: 2}), 1)).toBe('3/6');
  });
});

describe('reminders and start month', () => {
  it('reminds once, the day before the charge day', () => {
    expect(isDueTomorrow(item({day: 5}), today(5), 31)).toBe(true);
    expect(isDueTomorrow(item({day: 5}), today(6), 31)).toBe(false);
    expect(isDueTomorrow(item({day: 5, reminded: '2026-10'}), today(5), 31)).toBe(false);
    expect(isDueTomorrow(item({day: 5, lastRun: '2026-10'}), today(5), 31)).toBe(false);
  });

  it('uses the last day of the month the reminder falls in', () => {
    // item on the 31st: tomorrow is 28 February, the last day of that month
    expect(isDueTomorrow(item({day: 31}), today(28, 1, 2026), 28)).toBe(true);
    expect(isDueTomorrow(item({day: 31}), today(30, 3, 2026), 30)).toBe(true);
  });

  it('starts next month when the charge day has already passed', () => {
    expect(initialLastRun(item({day: 5}), today(15), 31)).toBe('2026-10');
    expect(initialLastRun(item({day: 5}), today(5), 31)).toBe('2026-10');
    expect(initialLastRun(item({day: 25}), today(15), 31)).toBeUndefined();
  });
});

describe('buildSubsOverview', () => {
  const items = [
    item({id: 'a', day: 5, sum: 800, note: 'Netflix', lastRun: '2026-10'}),
    item({id: 'b', day: 25, sum: 1200, category: 'Техніка', note: 'ноутбук', payments: 6, paid: 2}),
    item({id: 'c', day: 12, sum: 300, note: 'Spotify', paid: undefined, lastRun: '2026-10'}),
  ];

  it('lists items by charge day with status, progress and the month total', () => {
    const text = buildSubsOverview(items, today(15), 31, 'жовтень 2026');
    expect(text).toContain('Підписки та розстрочки · жовтень 2026');
    expect(text.indexOf('05.10')).toBeLessThan(text.indexOf('12.10'));
    expect(text.indexOf('12.10')).toBeLessThan(text.indexOf('25.10'));
    expect(text).toContain("✅ 05.10 · 800 грн · Підписки і зв'язок · Моно · Netflix");
    expect(text).toContain('⏳ 25.10 · 1200 грн · Техніка · Моно · ноутбук (3/6)');
    expect(text).toContain('Разом за місяць: 2300 грн (списано 1100, ще 1200)');
  });

  it('keeps an installment payment already made this month at its real number', () => {
    const done = [item({payments: 6, paid: 3, lastRun: '2026-10'})];
    expect(buildSubsOverview(done, today(15), 31, 'жовтень 2026')).toContain('(3/6)');
  });

  it('explains how to add one when there are none', () => {
    expect(buildSubsOverview([], today(15), 31, 'жовтень 2026')).toContain('/recurring');
  });
});
