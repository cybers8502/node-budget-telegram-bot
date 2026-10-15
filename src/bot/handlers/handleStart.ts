import type {Bot} from 'grammy';
import {clearUserState, setUserState} from '../userState';

export default function handleStart(bot: Bot, chatId: number) {
  clearUserState(chatId);
  setUserState(chatId, {step: 'waiting_sum'});

  return bot.api.sendMessage(chatId, 'Вітаю! Введіть суму витрат (ціле число).');
}
