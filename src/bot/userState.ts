import type {UserState} from '../types';

export const userState = new Map<number, UserState>();

export function clearUserState(chatId: number): void {
  userState.delete(chatId);
}

export function getUserState(chatId: number): UserState | null {
  return userState.get(chatId) || null;
}

export function setUserState(chatId: number, patch: UserState): void {
  const current = userState.get(chatId) || {};
  userState.set(chatId, {...current, ...patch});
}
