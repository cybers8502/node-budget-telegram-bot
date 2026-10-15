import type {Expense} from '../types';

// Firestore returns Timestamp objects; freshly built expenses carry a Date
export function toJsDate(date: Expense['date']): Date {
  return date instanceof Date ? date : date.toDate();
}
