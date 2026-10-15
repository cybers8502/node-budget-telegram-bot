import {FieldValue, Timestamp} from 'firebase-admin/firestore';
import {AI_DAILY_LIMIT, AI_HISTORY_TTL_MS, AI_HISTORY_TURNS} from '../configs/aiConfig';
import {db} from '../configs/firebaseConfig';
import {formatKyivIso} from './date';
import {userRef} from './firebaseUtility';

export interface AiTurn {
  q: string;
  a: string;
}

const stateCollection = (chatId: number) => userRef(chatId).collection('state');

// Counts one /ai question against today's (Kyiv) quota; false when the limit is already reached
export async function consumeAiQuota(chatId: number): Promise<boolean> {
  const ref = stateCollection(chatId).doc('aiUsage');
  const day = formatKyivIso(new Date());

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data() as {day?: string; count?: number} | undefined;
    const count = data?.day === day ? (data.count ?? 0) : 0;
    if (count >= AI_DAILY_LIMIT) return false;
    tx.set(ref, {day, count: count + 1});
    return true;
  });
}

// Previous question/answer pairs (final texts only, no tool traffic) so follow-ups like "а минулого місяця?" work
export async function getAiHistory(chatId: number): Promise<AiTurn[]> {
  const snap = await stateCollection(chatId).doc('aiHistory').get();
  if (!snap.exists) return [];
  const {turns, updatedAt} = snap.data() as {turns?: AiTurn[]; updatedAt?: Timestamp};
  if (!turns || (updatedAt && Date.now() - updatedAt.toMillis() > AI_HISTORY_TTL_MS)) return [];
  return turns;
}

export async function appendAiHistory(chatId: number, turn: AiTurn): Promise<void> {
  const turns = [...(await getAiHistory(chatId)), turn].slice(-AI_HISTORY_TURNS);
  await stateCollection(chatId).doc('aiHistory').set({turns, updatedAt: FieldValue.serverTimestamp()});
}

export async function clearAiHistory(chatId: number): Promise<void> {
  await stateCollection(chatId).doc('aiHistory').delete();
}
