import type {Bot} from 'grammy';
import {evalArithmetic} from '../../utils/evalArithmetic';
import {categoryKeyboard} from '../keyboards';
import {setUserState} from '../userState';

export default function handleWaitingSum(bot: Bot, chatId: number, text: string) {
  const sum = evalArithmetic(text);
  if (sum === null || sum <= 0) {
    return bot.api.sendMessage(chatId, 'Будь ласка, введіть суму або вираз (наприклад: 100, 50+30, 200/4).');
  }

  setUserState(chatId, {step: 'set_category', sum});
  return bot.api.sendMessage(chatId, `Сума: ${sum}\nВиберіть категорію:`, {reply_markup: categoryKeyboard()});
}
