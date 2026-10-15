import {userRef} from './firebaseUtility';

const prefsDoc = (chatId: number | string) => userRef(chatId).collection('settings').doc('prefs');

// The weekly digest is on unless the user switched it off
export async function isDigestEnabled(chatId: number | string): Promise<boolean> {
  const snap = await prefsDoc(chatId).get();
  return snap.data()?.digest !== false;
}

export async function setDigestEnabled(chatId: number, enabled: boolean): Promise<void> {
  await prefsDoc(chatId).set({digest: enabled}, {merge: true});
}
