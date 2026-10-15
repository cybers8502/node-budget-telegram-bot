import type {Bot} from 'grammy';
import {getUahRate, toUah} from '../../utils/currency';
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

  const {category, bank, note} = entry;
  let sum = entry.sum;
  let foreign: {currency: string; amount: number; rate: number} | undefined;

  // "20 usd кафе": store the UAH equivalent at today's NBU rate, keep the original amount
  if (entry.currency) {
    const rate = await getUahRate(entry.currency);
    if (!rate) {
      await bot.api.sendMessage(
        chatId,
        'Не вдалося отримати курс НБУ. Введіть суму в гривнях або спробуйте пізніше.',
      );
      return;
    }
    foreign = {currency: entry.currency, amount: sum, rate};
    sum = toUah(sum, rate);
  }
  const sumLine = foreign
    ? `Сума: ${foreign.amount} ${foreign.currency} ≈ ${sum} грн (курс НБУ ${foreign.rate})`
    : `Сума: ${sum}`;

  // Sum only: the regular step-by-step flow
  if (!category && !bank && !note) {
    await resetUserState(chatId, {step: 'set_category', sum, foreign});
    await bot.api.sendMessage(chatId, `${sumLine}\nВиберіть категорію:`, {
      reply_markup: categoryKeyboard(),
    });
    return;
  }

  // Quick input: `note` being set makes the later steps save instead of asking for a description
  const state = {sum, category, bank, note, foreign};
  if (category && bank) {
    await saveNewExpense(bot, chatId, state, note);
    return;
  }

  const details = [
    sumLine,
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
