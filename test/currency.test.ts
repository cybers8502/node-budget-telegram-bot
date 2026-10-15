import {describe, expect, it} from 'vitest';
import {toUah} from '../src/utils/currency';

describe('toUah', () => {
  it('converts and rounds to kopecks', () => {
    expect(toUah(20, 41.5)).toBe(830);
    expect(toUah(15.5, 44.1234)).toBe(683.91);
  });
});
