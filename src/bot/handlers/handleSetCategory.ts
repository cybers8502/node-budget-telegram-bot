import type {Bot} from 'grammy';
import categories from '../categories';
import {bankKeyboard} from '../keyboards';
import {setUserState} from '../userState';

export default function handleSetCategory(bot: Bot, chatId: number, index: number) {
  if (index < 0 || index >= categories.length) {
    return bot.api.sendMessage(chatId, 'Невідома категорія. Спробуйте ще раз.');
  }

  setUserState(chatId, {step: 'set_bank', category: categories[index]});
  return bot.api.sendMessage(chatId, 'Оберіть банк:', {reply_markup: bankKeyboard()});
}
