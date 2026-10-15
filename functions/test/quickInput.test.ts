import {describe, expect, it} from 'vitest';
import {parseQuickInput} from '../src/bot/quickInput';

describe('parseQuickInput', () => {
  it('parses a bare sum', () => {
    expect(parseQuickInput('250')).toEqual({sum: 250, note: ''});
  });

  it('parses sum, category alias, bank and note', () => {
    expect(parseQuickInput('250 продукти моно сільпо')).toEqual({
      sum: 250,
      category: 'Їжа',
      bank: 'Моно',
      note: 'сільпо',
    });
  });

  it('evaluates an expression as the sum', () => {
    expect(parseQuickInput('50+30 кафе')).toMatchObject({sum: 80, category: 'Кафе'});
    expect(parseQuickInput('50 + 30 кафе')).toMatchObject({sum: 80, category: 'Кафе'});
  });

  it('falls back to the first token when the leading expression is invalid', () => {
    expect(parseQuickInput('100 2 кави')).toEqual({sum: 100, note: '2 кави'});
  });

  it('matches category and bank names case-insensitively', () => {
    expect(parseQuickInput('100 КАФЕ Mono')).toMatchObject({category: 'Кафе', bank: 'Моно'});
  });

  it('matches a category by prefix of at least 3 letters only', () => {
    expect(parseQuickInput('100 роз')).toMatchObject({category: 'Розваги'});
    expect(parseQuickInput('100 ро')).toEqual({sum: 100, note: 'ро'});
  });

  it('maps income aliases and cash', () => {
    expect(parseQuickInput('1000 зарплата')).toMatchObject({category: 'Дохід'});
    expect(parseQuickInput('250 кеш бензин')).toMatchObject({category: 'Авто', bank: 'Готівка'});
  });

  it('uses only the first category and first bank, the rest goes to the note', () => {
    expect(parseQuickInput('100 їжа кафе моно сенс')).toEqual({
      sum: 100,
      category: 'Їжа',
      bank: 'Моно',
      note: 'кафе сенс',
    });
  });

  it('truncates the note to 100 characters', () => {
    expect(parseQuickInput(`100 ${'а'.repeat(150)}`)?.note).toHaveLength(100);
  });

  it('returns null without a positive sum', () => {
    expect(parseQuickInput('абв')).toBeNull();
    expect(parseQuickInput('0 їжа')).toBeNull();
    expect(parseQuickInput('')).toBeNull();
  });
});

describe('parseQuickInput currency', () => {
  it('recognises currency words and symbols', () => {
    expect(parseQuickInput('20 usd кафе')).toMatchObject({sum: 20, currency: 'USD', category: 'Кафе'});
    expect(parseQuickInput('15 євро їжа')).toMatchObject({sum: 15, currency: 'EUR', category: 'Їжа'});
    expect(parseQuickInput('100 $')).toMatchObject({sum: 100, currency: 'USD', note: ''});
  });

  it('splits a currency glued to the amount', () => {
    expect(parseQuickInput('20$ кафе')).toMatchObject({sum: 20, currency: 'USD', category: 'Кафе'});
    expect(parseQuickInput('15€')).toMatchObject({sum: 15, currency: 'EUR'});
    expect(parseQuickInput('50+30usd')).toMatchObject({sum: 80, currency: 'USD'});
  });

  it('leaves UAH entries and unrelated words alone', () => {
    expect(parseQuickInput('250 кафе').currency).toBeUndefined();
    expect(parseQuickInput('100 usdt')).toMatchObject({note: 'usdt'});
  });
});
