import {db} from '../configs/firebaseConfig';
import type {Expense} from '../types';

const expensesCollection = (budgetId: string, userId: string) =>
  db.collection('budgets').doc(budgetId).collection('users').doc(userId).collection('expenses');

export async function saveExpense({
  budgetId,
  userId,
  data,
}: {
  budgetId: string;
  userId: string;
  data: Expense;
}): Promise<void> {
  await expensesCollection(budgetId, userId).doc(data.id).set(data);
}

export async function getLastExpense({
  budgetId,
  userId,
}: {
  budgetId: string;
  userId: string;
}): Promise<Expense | null> {
  const snap = await expensesCollection(budgetId, userId).orderBy('date', 'desc').limit(1).get();
  if (snap.empty) return null;
  return snap.docs[0].data() as Expense;
}

export async function getMonthExpenses({
  budgetId,
  userId,
  from,
  to,
}: {
  budgetId: string;
  userId: string;
  from: Date;
  to: Date;
}): Promise<Expense[]> {
  const snap = await expensesCollection(budgetId, userId)
    .where('date', '>=', from)
    .where('date', '<', to)
    .get();
  return snap.docs.map((d) => d.data() as Expense);
}

export async function updateExpense({
  budgetId,
  userId,
  expenseId,
  data,
}: {
  budgetId: string;
  userId: string;
  expenseId: string;
  data: Partial<Expense>;
}): Promise<void> {
  await expensesCollection(budgetId, userId).doc(expenseId).update(data);
}

export async function getRecentExpenses({
  budgetId,
  userId,
  limit,
}: {
  budgetId: string;
  userId: string;
  limit: number;
}): Promise<Expense[]> {
  const snap = await expensesCollection(budgetId, userId).orderBy('date', 'desc').limit(limit).get();
  return snap.docs.map((d) => d.data() as Expense);
}

export async function getExpenseById({
  budgetId,
  userId,
  expenseId,
}: {
  budgetId: string;
  userId: string;
  expenseId: string;
}): Promise<Expense | null> {
  const snap = await expensesCollection(budgetId, userId).doc(expenseId).get();
  return snap.exists ? (snap.data() as Expense) : null;
}

export async function deleteExpense({
  budgetId,
  userId,
  expenseId,
}: {
  budgetId: string;
  userId: string;
  expenseId: string;
}): Promise<void> {
  await expensesCollection(budgetId, userId).doc(expenseId).delete();
}
