import type {Bot} from 'grammy';
import type {UserState} from '../../types';
import {forUser} from '../../utils/firebaseUtility';
import banks from '../banks';
import {clearUserState} from '../userState';

export default async function handleEditBank(bot: Bot, chatId: number, index: number, state: UserState) {
  if (index < 0 || index >= banks.length) {
    await bot.api.sendMessage(chatId, 'Невідомий банк. Спробуйте ще раз.');
    return;
  }

  if (!state.expense) {
    await clearUserState(chatId);
    await bot.api.sendMessage(chatId, 'Стан було втрачено. Почніть заново: /edit');
    return;
  }

  const newBank = banks[index];

  await forUser(chatId).updateExpense(state.expense.id, {bank: newBank});

  await clearUserState(chatId);
  await bot.api.sendMessage(chatId, `Банк оновлено: ${newBank}. Введіть нову суму для нового запису.`);
}
