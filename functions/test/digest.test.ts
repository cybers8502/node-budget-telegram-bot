import {describe, expect, it} from 'vitest';
import type {Expense} from '../src/types';
import {buildDigest} from '../src/utils/digest';

const exp = (over: Partial<Expense>): Expense => ({
  id: 'x',
  sum: 100,
  category: 'Їжа',
  note: '',
  date: new Date('2026-10-10T09:00:00Z'),
  ...over,
});

describe('buildDigest', () => {
  const week = [
    exp({sum: 300, category: 'Їжа'}),
    exp({sum: 500, category: 'Кафе', note: 'вечеря'}),
    exp({sum: 200, category: 'Авто'}),
    exp({sum: 100, category: 'Їжа'}),
    exp({sum: 5000, category: 'Дохід', type: 'income'}),
  ];

  it('returns null for a week without expenses', () => {
    expect(buildDigest([], [exp({})])).toBeNull();
    expect(buildDigest([exp({category: 'Дохід', type: 'income'})], [])).toBeNull();
  });

  it('summarises total, change, top categories and the biggest expense (income ignored)', () => {
    const text = buildDigest(week, [exp({sum: 800})]) as string;
    expect(text).toContain('Тиждень: 1100 грн (+38% до попереднього)');
    expect(text).toContain('Транзакцій: 4, у середньому 275 грн');
    expect(text).toContain('1. Кафе — 500');
    expect(text).toContain('2. Їжа — 400');
    expect(text).toContain('Найбільша: 500 (Кафе — вечеря)');
    expect(text).not.toContain('Дохід —');
  });

  it('omits the change when there is no previous week', () => {
    expect(buildDigest(week, []) as string).toContain('Тиждень: 1100 грн\n');
  });
});
