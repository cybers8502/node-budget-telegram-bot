import type {Bot} from 'grammy';
import categories from '../categories';
import {bankKeyboard} from '../keyboards';
import {getUserState, setUserState} from '../userState';
import saveNewExpense from './saveNewExpense';

export default async function handleSetCategory(bot: Bot, chatId: number, index: number) {
  if (index < 0 || index >= categories.length) {
    await bot.api.sendMessage(chatId, 'Невідома категорія. Спробуйте ще раз.');
    return;
  }

  const category = categories[index];
  const state = await getUserState(chatId);

  // Quick input that already knows the bank is complete
  if (state?.note !== undefined && state.bank) {
    await saveNewExpense(bot, chatId, {...state, category}, state.note);
    return;
  }

  await setUserState(chatId, {step: 'set_bank', category});
  await bot.api.sendMessage(chatId, 'Оберіть банк:', {
    reply_markup: bankKeyboard(),
  });
}
