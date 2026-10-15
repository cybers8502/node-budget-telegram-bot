import type {Timestamp} from 'firebase-admin/firestore';

export type ExpenseType = 'expense' | 'income';

export interface Expense {
  id: string;
  type?: ExpenseType; // missing on legacy records, then derived from category
  sum: number;
  category: string;
  bank?: string | null;
  note?: string;
  date: Date | Timestamp;
}

export type Step =
  | 'waiting_sum'
  | 'confirm_copy'
  | 'set_category'
  | 'set_bank'
  | 'set_note'
  | 'edit_choose'
  | 'edit_sum'
  | 'edit_category'
  | 'edit_bank'
  | 'edit_note';

export interface UserState {
  step?: Step;
  sum?: number;
  category?: string;
  bank?: string;
  expense?: Expense;
}
