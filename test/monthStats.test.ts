import {describe, expect, it} from 'vitest';
import type {Expense} from '../src/types';
import {formatChange, netTotal, spentByCategory, untilDay} from '../src/utils/monthStats';

const exp = (over: Partial<Expense>): Expense => ({
  id: 'x',
  sum: 100,
  category: 'Їжа',
  date: new Date('2026-09-10T09:00:00Z'),
  ...over,
});

describe('monthStats', () => {
  const data = [
    exp({sum: 100}),
    exp({sum: 50, category: 'Кафе'}),
    exp({sum: 30, category: 'Їжа', date: new Date('2026-09-20T09:00:00Z')}),
    exp({sum: 1000, category: 'Дохід', type: 'income'}),
  ];

  it('netTotal subtracts income and skips zero sums', () => {
    expect(netTotal(data)).toBe(100 + 50 + 30 - 1000);
    expect(netTotal([exp({sum: 0})])).toBe(0);
  });

  it('spentByCategory sums expenses only', () => {
    expect(spentByCategory(data)).toEqual({Їжа: 130, Кафе: 50});
  });

  it('untilDay keeps records up to that Kyiv day of the month', () => {
    expect(untilDay(data, 15)).toHaveLength(3);
    expect(untilDay(data, 9)).toHaveLength(0);
    // 21:30Z on 9 September is already 10 September in Kyiv
    expect(untilDay([exp({date: new Date('2026-09-09T21:30:00Z')})], 9)).toHaveLength(0);
  });

  it('formatChange gives a signed percentage or null without a base', () => {
    expect(formatChange(120, 100)).toBe('+20%');
    expect(formatChange(80, 100)).toBe('-20%');
    expect(formatChange(100, 100)).toBe('0%');
    expect(formatChange(100, 0)).toBeNull();
  });
});
