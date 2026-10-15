import {describe, expect, it} from 'vitest';
import {buildDraft, buildSummary} from '../src/bot/ai/summary';
import type {Expense} from '../src/types';

const exp = (over: Partial<Expense>): Expense => ({
  id: 'x',
  sum: 100,
  category: 'Їжа',
  bank: 'Моно',
  note: '',
  date: new Date('2026-10-10T09:00:00Z'),
  ...over,
});

describe('buildSummary', () => {
  const data = [
    exp({sum: 100, category: 'Їжа', bank: 'Моно'}),
    exp({sum: 50.5, category: 'Їжа', bank: null}),
    exp({sum: 300, category: 'Кафе', bank: 'ПБ', date: new Date('2026-11-02T09:00:00Z')}),
    exp({sum: 1000, category: 'Дохід', type: 'income', bank: 'ПБ'}),
  ];

  it('groups by category, biggest spend first, and separates income', () => {
    const s = buildSummary(data, 'category');
    expect(s.total_expenses).toBe(450.5);
    expect(s.total_income).toBe(1000);
    expect(s.groups.map((g) => g.key)).toEqual(['Кафе', 'Їжа', 'Дохід']);
    expect(s.groups[1]).toEqual({key: 'Їжа', expenses: 150.5, income: 0, count: 2});
  });

  it('groups by bank and names a missing bank "unknown"', () => {
    const keys = buildSummary(data, 'bank').groups.map((g) => g.key);
    expect(keys).toContain('unknown');
    expect(keys).toContain('Моно');
  });

  it('groups by month and day chronologically in Kyiv time', () => {
    expect(buildSummary(data, 'month').groups.map((g) => g.key)).toEqual(['2026-10', '2026-11']);
    expect(buildSummary(data, 'day').groups.map((g) => g.key)).toEqual(['2026-10-10', '2026-11-02']);
    // 22:30Z on 31 October is already 1 November in Kyiv
    const edge = [exp({date: new Date('2026-10-31T22:30:00Z')})];
    expect(buildSummary(edge, 'month').groups[0].key).toBe('2026-11');
  });

  it('treats legacy records without type by their category and skips zero sums', () => {
    const s = buildSummary([exp({category: 'Дохід', sum: 10}), exp({sum: 0})], 'category');
    expect(s.total_income).toBe(10);
    expect(s.total_expenses).toBe(0);
    expect(s.groups).toHaveLength(1);
  });
});

describe('buildDraft', () => {
  const now = new Date('2026-10-15T10:00:00Z');

  it('builds an expense with defaults', () => {
    const d = buildDraft({sum: 250, category: 'Їжа'}, now) as Expense;
    expect(d).toMatchObject({type: 'expense', sum: 250, category: 'Їжа', bank: null, note: ''});
    expect(d.date).toEqual(now);
    expect(d.id).toBeTruthy();
  });

  it('marks income and keeps bank, note and an explicit date inside that Kyiv day', () => {
    const d = buildDraft(
      {sum: 1000, category: 'Дохід', bank: 'ПБ', note: 'аванс', date: '2026-10-01'},
      now,
    ) as Expense;
    expect(d).toMatchObject({type: 'income', bank: 'ПБ', note: 'аванс'});
    expect((d.date as Date).toISOString()).toBe('2026-10-01T09:00:00.000Z');
  });

  it('truncates the note to 100 characters', () => {
    const d = buildDraft({sum: 1, category: 'Їжа', note: 'а'.repeat(300)}, now) as Expense;
    expect(d.note).toHaveLength(100);
  });

  it('rejects invalid input with a message for the model', () => {
    expect(buildDraft({sum: 0, category: 'Їжа'}, now)).toMatch(/sum/);
    expect(buildDraft({sum: '5', category: 'Їжа'}, now)).toMatch(/sum/);
    expect(buildDraft({sum: 5, category: 'Космос'}, now)).toMatch(/category/);
    expect(buildDraft({sum: 5, category: 'Їжа', bank: 'Невідомий'}, now)).toMatch(/bank/);
    expect(buildDraft({sum: 5, category: 'Їжа', date: '15.10.2026'}, now)).toMatch(/date/);
  });
});
