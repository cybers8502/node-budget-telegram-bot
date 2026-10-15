import {describe, expect, it} from 'vitest';
import {evalArithmetic} from '../src/utils/evalArithmetic';

describe('evalArithmetic', () => {
  it('evaluates plain numbers and expressions', () => {
    expect(evalArithmetic('100')).toBe(100);
    expect(evalArithmetic('50+30')).toBe(80);
    expect(evalArithmetic('200/4')).toBe(50);
    expect(evalArithmetic('2*(3+4)')).toBe(14);
    expect(evalArithmetic(' 10 - 3 ')).toBe(7);
  });

  it('rounds to two decimals', () => {
    expect(evalArithmetic('10/3')).toBe(3.33);
    expect(evalArithmetic('0.1+0.2')).toBe(0.3);
  });

  it('rejects anything that is not arithmetic', () => {
    expect(evalArithmetic('abc')).toBeNull();
    expect(evalArithmetic('process.exit()')).toBeNull();
    expect(evalArithmetic('100 їжа')).toBeNull();
    expect(evalArithmetic('')).toBeNull();
  });

  it('rejects invalid and non-finite results', () => {
    expect(evalArithmetic('1/0')).toBeNull();
    expect(evalArithmetic('((1+2)')).toBeNull();
    expect(evalArithmetic('5 +')).toBeNull();
  });
});
