import {BUDGET_ID} from '../configs/consts';
import {db} from '../configs/firebaseConfig';

const prefsDoc = (chatId: number | string) =>
  db
    .collection('budgets')
    .doc(BUDGET_ID)
    .collection('users')
    .doc(chatId.toString())
    .collection('settings')
    .doc('prefs');

// The weekly digest is on unless the user switched it off
export async function isDigestEnabled(chatId: number | string): Promise<boolean> {
  const snap = await prefsDoc(chatId).get();
  return snap.data()?.digest !== false;
}

export async function setDigestEnabled(chatId: number, enabled: boolean): Promise<void> {
  await prefsDoc(chatId).set({digest: enabled}, {merge: true});
}
