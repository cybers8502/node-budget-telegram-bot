import {describe, expect, it} from 'vitest';
import {
  daysInKyivMonth,
  formatKyivIso,
  kyivDayRange,
  kyivMonthRange,
  kyivParts,
  parseKyivDate,
} from '../src/utils/date';

const iso = (d: Date) => d.toISOString();

describe('Kyiv time helpers', () => {
  // 2026-10-31 22:30Z is already 1 November in Kyiv (UTC+2, DST ended on 25 October)
  const lateOctober = new Date('2026-10-31T22:30:00Z');

  it('puts a record made just after Kyiv midnight into the new month', () => {
    expect(kyivParts(lateOctober)).toEqual({year: 2026, month: 10, day: 1});
    const {from, to} = kyivMonthRange(lateOctober);
    expect(iso(from)).toBe('2026-10-31T22:00:00.000Z');
    expect(iso(to)).toBe('2026-11-30T22:00:00.000Z');
  });

  it('uses UTC+3 in summer', () => {
    const summer = new Date('2026-07-15T12:00:00Z');
    expect(iso(kyivMonthRange(summer).from)).toBe('2026-06-30T21:00:00.000Z');
    expect(iso(kyivDayRange(summer).from)).toBe('2026-07-14T21:00:00.000Z');
    expect(iso(kyivDayRange(summer).to)).toBe('2026-07-15T21:00:00.000Z');
  });

  it('handles days that are 23 and 25 hours long (DST switch)', () => {
    const spring = kyivDayRange(new Date('2026-03-29T12:00:00Z'));
    expect((spring.to.getTime() - spring.from.getTime()) / 36e5).toBe(23);
    const autumn = kyivDayRange(new Date('2026-10-25T12:00:00Z'));
    expect((autumn.to.getTime() - autumn.from.getTime()) / 36e5).toBe(25);
  });

  it('rolls the month range over the year boundary', () => {
    const {from, to} = kyivMonthRange(new Date('2026-12-15T12:00:00Z'));
    expect(iso(from)).toBe('2026-11-30T22:00:00.000Z');
    expect(iso(to)).toBe('2026-12-31T22:00:00.000Z');
  });

  it('counts days in the month', () => {
    expect(daysInKyivMonth(new Date('2026-02-10T12:00:00Z'))).toBe(28);
    expect(daysInKyivMonth(new Date('2028-02-10T12:00:00Z'))).toBe(29);
    expect(daysInKyivMonth(new Date('2026-07-10T12:00:00Z'))).toBe(31);
  });

  it('parses and formats YYYY-MM-DD in Kyiv time', () => {
    expect(iso(parseKyivDate('2026-10-15') as Date)).toBe('2026-10-14T21:00:00.000Z');
    expect(parseKyivDate('bad')).toBeNull();
    expect(formatKyivIso(lateOctober)).toBe('2026-11-01');
  });
});
