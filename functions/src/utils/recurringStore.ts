import type {RecurringItem} from '../types';
import {userRef} from './firebaseUtility';

const recurringCollection = (chatId: number | string) => userRef(chatId).collection('recurring');

export async function listRecurring(chatId: number | string): Promise<RecurringItem[]> {
  const snap = await recurringCollection(chatId).get();
  return snap.docs.map((d) => d.data() as RecurringItem).sort((a, b) => a.day - b.day);
}

export async function addRecurring(chatId: number, item: RecurringItem): Promise<void> {
  await recurringCollection(chatId).doc(item.id).set(item);
}

export async function deleteRecurring(chatId: number | string, id: string): Promise<void> {
  await recurringCollection(chatId).doc(id).delete();
}

export async function updateRecurring(
  chatId: number | string,
  id: string,
  patch: Partial<RecurringItem>,
): Promise<void> {
  await recurringCollection(chatId).doc(id).update(patch);
}
