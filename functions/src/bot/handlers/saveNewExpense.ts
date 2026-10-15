import {randomUUID} from 'node:crypto';
import type {Bot} from 'grammy';
import type {Expense, UserState} from '../../types';
import {forUser} from '../../utils/firebaseUtility';
import {limitWarningFor} from '../../utils/limitStore';
import {clearUserState} from '../userState';

export default async function saveNewExpense(bot: Bot, chatId: number, state: UserState, note: string) {
  if (!state.sum || !state.category) {
    await clearUserState(chatId);
    await bot.api.sendMessage(chatId, 'Стан було втрачено. Будь ласка, введіть суму ще раз.');
    return;
  }

  const newExpense: Expense = {
    id: randomUUID(),
    type: state.category === 'Дохід' ? 'income' : 'expense',
    sum: state.sum,
    category: state.category,
    bank: state.bank || null,
    note,
    date: new Date(),
    ...(state.foreign && {
      currency: state.foreign.currency,
      originalSum: state.foreign.amount,
      rate: state.foreign.rate,
    }),
  };

  await forUser(chatId).saveExpense(newExpense);
  await clearUserState(chatId);
  const warning = await limitWarningFor(chatId, newExpense);

  const sumText = state.foreign
    ? `${state.foreign.amount} ${state.foreign.currency} ≈ ${state.sum} грн`
    : `${state.sum} грн`;
  const summary = [sumText, state.category, state.bank, note].filter(Boolean).join(' · ');
  await bot.api.sendMessage(
    chatId,
    `Запис створено: ${summary}${warning ? `\n${warning}` : ''}\nВведіть нову суму для нового запису.`,
  );
}
