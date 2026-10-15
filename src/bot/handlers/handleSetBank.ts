import type {Bot} from 'grammy';
import banks from '../banks';
import {setUserState} from '../userState';

export default function handleSetBank(bot: Bot, chatId: number, index: number) {
  if (index < 0 || index >= banks.length) {
    return bot.api.sendMessage(chatId, 'Невідомий банк. Спробуйте ще раз.');
  }

  setUserState(chatId, {step: 'set_note', bank: banks[index]});
  return bot.api.sendMessage(chatId, 'Введіть короткий опис витрати (до 100 символів):');
}
