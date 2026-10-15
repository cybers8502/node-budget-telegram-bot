import type {Bot} from 'grammy';
import banks from '../banks';
import {noteKeyboard} from '../keyboards';
import {getUserState, setUserState} from '../userState';
import saveNewExpense from './saveNewExpense';

export default async function handleSetBank(bot: Bot, chatId: number, index: number) {
  if (index < 0 || index >= banks.length) {
    await bot.api.sendMessage(chatId, 'Невідомий банк. Спробуйте ще раз.');
    return;
  }

  const bank = banks[index];
  const state = await getUserState(chatId);

  // Quick input already carries the description
  if (state?.note !== undefined) {
    await saveNewExpense(bot, chatId, {...state, bank}, state.note);
    return;
  }

  await setUserState(chatId, {step: 'set_note', bank});
  await bot.api.sendMessage(chatId, 'Введіть короткий опис витрати (до 100 символів):', {
    reply_markup: noteKeyboard(),
  });
}
