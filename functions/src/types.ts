import type {Timestamp} from 'firebase-admin/firestore';

export type ExpenseType = 'expense' | 'income';

export interface Expense {
  id: string;
  type?: ExpenseType; // missing on legacy records, then derived from category
  sum: number;
  category: string;
  bank?: string | null;
  note?: string;
  tags?: string[]; // e.g. INSTALLMENT_TAG on payments of an installment plan
  date: Date | Timestamp;
  // Set when entered in a foreign currency: `sum` is always UAH, converted at the NBU rate of that day
  currency?: string;
  originalSum?: number;
  rate?: number;
}

// A monthly expense created automatically by the scheduled job (budgets/{id}/users/{chatId}/recurring/{id})
export interface RecurringItem {
  id: string;
  day: number; // 1-31; short months use their last day
  sum: number;
  category: string;
  bank: string | null;
  note: string;
  lastRun?: string; // 'YYYY-MM' of the last month it was created for
  reminded?: string; // 'YYYY-MM' of the month the "charged tomorrow" reminder was sent for
  payments?: number; // total number of payments of an installment plan; unset = open-ended subscription
  paid?: number; // payments made so far (installments)
}

export type Step =
  | 'waiting_sum'
  | 'set_category'
  | 'set_bank'
  | 'set_note'
  | 'edit_choose'
  | 'edit_sum'
  | 'edit_category'
  | 'edit_bank'
  | 'edit_note'
  | 'ai_confirm';

export interface UserState {
  step?: Step;
  sum?: number;
  category?: string;
  bank?: string;
  foreign?: {currency: string; amount: number; rate: number}; // original amount of a foreign-currency entry
  note?: string; // set by quick input: the expense is saved as soon as category and bank are known
  expense?: Expense;
}
