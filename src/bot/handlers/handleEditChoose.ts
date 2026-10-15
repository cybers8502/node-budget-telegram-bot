import type {Bot} from 'grammy';
import {bankKeyboard, categoryKeyboard} from '../keyboards';
import {setUserState} from '../userState';

export default function handleEditChoose(bot: Bot, chatId: number, text: string) {
  const choice = text.trim();

  if (choice === '1') {
    setUserState(chatId, {step: 'edit_sum'});
    return bot.api.sendMessage(chatId, 'Введіть нову суму:');
  }
  if (choice === '2') {
    setUserState(chatId, {step: 'edit_category'});
    return bot.api.sendMessage(chatId, 'Виберіть нову категорію:', {reply_markup: categoryKeyboard()});
  }
  if (choice === '3') {
    setUserState(chatId, {step: 'edit_note'});
    return bot.api.sendMessage(chatId, 'Введіть новий опис:');
  }
  if (choice === '4') {
    setUserState(chatId, {step: 'edit_bank'});
    return bot.api.sendMessage(chatId, 'Оберіть новий банк:', {reply_markup: bankKeyboard()});
  }
  return bot.api.sendMessage(chatId, 'Введіть 1, 2, 3 або 4.');
}
