import {describe, expect, it} from 'vitest';
import {createThrottle, errorMessage, formatErrorReport, pickAdminId} from '../src/utils/errorReport';

describe('formatErrorReport', () => {
  it('shows the context and the message, not the stack', () => {
    const text = formatErrorReport('recurringExpenses failed for user 1', new Error('quota exceeded'));
    expect(text).toBe('⚠️ recurringExpenses failed for user 1\nquota exceeded');
  });

  it('handles non-Error values and truncates long reports', () => {
    expect(errorMessage('boom')).toBe('boom');
    expect(errorMessage({code: 5})).toBe('[object Object]');
    expect(formatErrorReport('ctx', new Error('x'.repeat(2000)))).toHaveLength(600);
  });
});

describe('createThrottle', () => {
  it('lets a key through once per window and keys apart', () => {
    const allow = createThrottle(1000);
    expect(allow('a', 0)).toBe(true);
    expect(allow('a', 500)).toBe(false);
    expect(allow('b', 500)).toBe(true);
    expect(allow('a', 1000)).toBe(true);
  });
});

describe('pickAdminId', () => {
  it('prefers ADMIN_TG_ID', () => {
    expect(pickAdminId('42', '1,2')).toBe(42);
    expect(pickAdminId(' 42 ', undefined)).toBe(42);
  });

  it('falls back to the first allowed user', () => {
    expect(pickAdminId(undefined, '370531242, 99')).toBe(370531242);
    expect(pickAdminId('', '7')).toBe(7);
  });

  it('is null when nothing usable is configured', () => {
    expect(pickAdminId(undefined, undefined)).toBeNull();
    expect(pickAdminId('', '')).toBeNull();
    expect(pickAdminId('abc', undefined)).toBeNull();
  });
});
