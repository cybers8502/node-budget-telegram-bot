import {describe, expect, it} from 'vitest';
import {formatLimitLine, limitCrossing, limitWarning, parseLimitArgs} from '../src/utils/limits';

describe('limitCrossing', () => {
  it('warns when spend first reaches 80% and is still below the limit', () => {
    expect(limitCrossing(3900, 4100, 5000)).toBe('warn');
    expect(limitCrossing(4000, 4000, 5000)).toBeNull();
  });

  it('reports "over" when the limit is first reached or passed', () => {
    expect(limitCrossing(4900, 5100, 5000)).toBe('over');
    expect(limitCrossing(4900, 5000, 5000)).toBe('over');
  });

  it('jumping over both thresholds at once reports "over" only', () => {
    expect(limitCrossing(1000, 6000, 5000)).toBe('over');
  });

  it('stays quiet when nothing new is crossed', () => {
    expect(limitCrossing(1000, 2000, 5000)).toBeNull();
    expect(limitCrossing(4100, 4500, 5000)).toBeNull();
    expect(limitCrossing(5100, 5600, 5000)).toBeNull();
  });

  it('ignores a missing or zero limit', () => {
    expect(limitCrossing(0, 100, 0)).toBeNull();
  });
});

describe('limit messages', () => {
  it('formats the spent / limit line with a percentage', () => {
    expect(formatLimitLine('Кафе', 4100.4, 5000)).toBe('Кафе: 4100 з 5000 (82%)');
  });

  it('builds a warning only when a threshold was crossed', () => {
    expect(limitWarning(null, 'Кафе', 1, 2)).toBe('');
    expect(limitWarning('warn', 'Кафе', 4100, 5000)).toContain('Майже ліміт');
    expect(limitWarning('over', 'Кафе', 5100, 5000)).toContain('перевищено');
  });
});

describe('parseLimitArgs', () => {
  it('parses a category word and an amount', () => {
    expect(parseLimitArgs('їжа 5000')).toEqual({category: 'Їжа', amount: 5000});
    expect(parseLimitArgs('продукти 2500+2500')).toEqual({category: 'Їжа', amount: 5000});
    expect(parseLimitArgs('дім 8000')).toEqual({category: 'Дім', amount: 8000});
  });

  it('accepts 0 to remove a limit', () => {
    expect(parseLimitArgs('кафе 0')).toEqual({category: 'Кафе', amount: 0});
  });

  it('rejects unknown categories, missing or invalid amounts', () => {
    expect(parseLimitArgs('космос 100')).toBeNull();
    expect(parseLimitArgs('їжа')).toBeNull();
    expect(parseLimitArgs('їжа багато')).toBeNull();
    expect(parseLimitArgs('')).toBeNull();
  });
});
