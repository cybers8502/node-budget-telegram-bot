import type {Expense} from '../types';

// Cloud Functions run in UTC; all user-facing day/month boundaries are Kyiv time
export const TIME_ZONE = 'Europe/Kyiv';

// Firestore returns Timestamp objects; freshly built expenses carry a Date
export function toJsDate(date: Expense['date']): Date {
  return date instanceof Date ? date : date.toDate();
}

const partsFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
});

function kyivOffsetMs(date: Date): number {
  const p: Record<string, number> = {};
  for (const {type, value} of partsFormat.formatToParts(date)) p[type] = Number(value);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

// Calendar date in Kyiv; month is 0-based like Date#getMonth
export function kyivParts(date: Date = new Date()): {
  year: number;
  month: number;
  day: number;
} {
  const shifted = new Date(date.getTime() + kyivOffsetMs(date));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
  };
}

// Kyiv midnight of the given calendar date; month/day may overflow (month 12 = January next year)
export function kyivStartOf(year: number, month: number, day = 1): Date {
  const guess = Date.UTC(year, month, day);
  const offset = kyivOffsetMs(new Date(guess - kyivOffsetMs(new Date(guess))));
  return new Date(guess - offset);
}

export function kyivMonthRange(now: Date = new Date()): {
  from: Date;
  to: Date;
} {
  const {year, month} = kyivParts(now);
  return {
    from: kyivStartOf(year, month, 1),
    to: kyivStartOf(year, month + 1, 1),
  };
}

export function kyivDayRange(now: Date = new Date()): {from: Date; to: Date} {
  const {year, month, day} = kyivParts(now);
  return {
    from: kyivStartOf(year, month, day),
    to: kyivStartOf(year, month, day + 1),
  };
}

export function daysInKyivMonth(now: Date = new Date()): number {
  const {year, month} = kyivParts(now);
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

// "2026-10-15" -> Kyiv midnight of that day; null if invalid
export function parseKyivDate(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return null;
  const date = kyivStartOf(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

// "2026-10-15" in Kyiv
export function formatKyivIso(date: Date): string {
  const {year, month, day} = kyivParts(date);
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function formatKyivDate(date: Date): string {
  return date.toLocaleDateString('uk-UA', {timeZone: TIME_ZONE});
}

export function formatKyivMonth(date: Date): string {
  return date.toLocaleString('uk-UA', {
    month: 'long',
    year: 'numeric',
    timeZone: TIME_ZONE,
  });
}
