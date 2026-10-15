import {FieldValue, Timestamp} from 'firebase-admin/firestore';
import type {UserState} from '../types';
import {userRef} from '../utils/firebaseUtility';

// Conversation state lives in Firestore so it survives cold starts and instance recycling
const STATE_TTL_MS = 60 * 60 * 1000;

const stateDoc = (chatId: number) => userRef(chatId).collection('state').doc('current');

export async function clearUserState(chatId: number): Promise<void> {
  await stateDoc(chatId).delete();
}

export async function getUserState(chatId: number): Promise<UserState | null> {
  const snap = await stateDoc(chatId).get();
  if (!snap.exists) return null;

  const {updatedAt, ...state} = snap.data() as UserState & {
    updatedAt?: Timestamp;
  };
  if (updatedAt && Date.now() - updatedAt.toMillis() > STATE_TTL_MS) return null;
  return state;
}

export async function setUserState(chatId: number, patch: UserState): Promise<void> {
  const defined = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
  await stateDoc(chatId).set({...defined, updatedAt: FieldValue.serverTimestamp()}, {merge: true});
}

// Replaces the whole state instead of merging, so nothing leaks from an abandoned flow
export async function resetUserState(chatId: number, state: UserState): Promise<void> {
  const defined = Object.fromEntries(Object.entries(state).filter(([, v]) => v !== undefined));
  await stateDoc(chatId).set({
    ...defined,
    updatedAt: FieldValue.serverTimestamp(),
  });
}
