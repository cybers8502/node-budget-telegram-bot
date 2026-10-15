import {db} from '../configs/firebaseConfig';
import {BUDGET_ID} from '../configs/consts';
import type {Expense} from '../types';

export const budgetRef = () => db.collection('budgets').doc(BUDGET_ID);

// users/{chatId}: the root of everything stored for one person
export const userRef = (chatId: number | string) => budgetRef().collection('users').doc(String(chatId));

// Expense operations bound to one user, so callers do not repeat the budget and user ids
export function forUser(chatId: number | string) {
  const expenses = () => userRef(chatId).collection('expenses');

  return {
    async saveExpense(data: Expense): Promise<void> {
      await expenses().doc(data.id).set(data);
    },

    async getLastExpense(): Promise<Expense | null> {
      const snap = await expenses().orderBy('date', 'desc').limit(1).get();
      return snap.empty ? null : (snap.docs[0].data() as Expense);
    },

    async getMonthExpenses(from: Date, to: Date): Promise<Expense[]> {
      const snap = await expenses().where('date', '>=', from).where('date', '<', to).get();
      return snap.docs.map((d) => d.data() as Expense);
    },

    async updateExpense(expenseId: string, data: Partial<Expense>): Promise<void> {
      await expenses().doc(expenseId).update(data);
    },

    async getRecentExpenses(limit: number): Promise<Expense[]> {
      const snap = await expenses().orderBy('date', 'desc').limit(limit).get();
      return snap.docs.map((d) => d.data() as Expense);
    },

    async getExpenseById(expenseId: string): Promise<Expense | null> {
      const snap = await expenses().doc(expenseId).get();
      return snap.exists ? (snap.data() as Expense) : null;
    },

    async deleteExpense(expenseId: string): Promise<void> {
      await expenses().doc(expenseId).delete();
    },
  };
}

// chat ids of everyone who has data (user documents exist only as parents of subcollections, so list refs)
export async function listUserIds(): Promise<string[]> {
  const refs = await budgetRef().collection('users').listDocuments();
  return refs.map((r) => r.id);
}
