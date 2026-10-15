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

  it('respects operator precedence and associativity', () => {
    expect(evalArithmetic('2+3*4')).toBe(14);
    expect(evalArithmetic('10-2-3')).toBe(5);
    expect(evalArithmetic('100/5/2')).toBe(10);
    expect(evalArithmetic('(2+3)*4')).toBe(20);
  });

  it('supports unary signs and decimals', () => {
    expect(evalArithmetic('-5+10')).toBe(5);
    expect(evalArithmetic('2*-3')).toBe(-6);
    expect(evalArithmetic('.5+5.')).toBe(5.5);
    expect(evalArithmetic('12.50')).toBe(12.5);
  });

  it('rejects malformed numbers, adjacent operands and unsupported operators', () => {
    expect(evalArithmetic('1..2')).toBeNull();
    expect(evalArithmetic('100 200')).toBeNull();
    expect(evalArithmetic('2**3')).toBeNull();
    expect(evalArithmetic('()')).toBeNull();
    expect(evalArithmetic('1e3')).toBeNull();
  });

  it('rejects absurdly deep nesting instead of overflowing the stack', () => {
    expect(evalArithmetic(`${'('.repeat(5000)}1${')'.repeat(5000)}`)).toBeNull();
    expect(evalArithmetic(`${'('.repeat(20)}1${')'.repeat(20)}`)).toBe(1);
  });
});
