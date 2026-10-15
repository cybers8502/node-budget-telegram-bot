import type {Bot} from 'grammy';
import {bankKeyboard, categoryKeyboard} from '../keyboards';
import {parseQuickInput} from '../quickInput';
import {resetUserState} from '../userState';
import saveNewExpense from './saveNewExpense';

export default async function handleWaitingSum(bot: Bot, chatId: number, text: string) {
  const entry = parseQuickInput(text);
  if (!entry) {
    await bot.api.sendMessage(
      chatId,
      'Будь ласка, введіть суму або вираз (наприклад: 100, 50+30, 200/4). Можна одразу з категорією, банком і описом: 250 продукти моно сільпо.',
    );
    return;
  }

  const {sum, category, bank, note} = entry;

  // Sum only: the regular step-by-step flow
  if (!category && !bank && !note) {
    await resetUserState(chatId, {step: 'set_category', sum});
    await bot.api.sendMessage(chatId, `Сума: ${sum}\nВиберіть категорію:`, {
      reply_markup: categoryKeyboard(),
    });
    return;
  }

  // Quick input: `note` being set makes the later steps save instead of asking for a description
  const state = {sum, category, bank, note};
  if (category && bank) {
    await saveNewExpense(bot, chatId, state, note);
    return;
  }

  const details = [
    `Сума: ${sum}`,
    category && `Категорія: ${category}`,
    bank && `Банк: ${bank}`,
    note && `Опис: ${note}`,
  ];
  const summary = details.filter(Boolean).join('\n');
  if (!category) {
    await resetUserState(chatId, {step: 'set_category', ...state});
    await bot.api.sendMessage(chatId, `${summary}\nВиберіть категорію:`, {
      reply_markup: categoryKeyboard(),
    });
  } else {
    await resetUserState(chatId, {step: 'set_bank', ...state});
    await bot.api.sendMessage(chatId, `${summary}\nОберіть банк:`, {
      reply_markup: bankKeyboard(),
    });
  }
}
