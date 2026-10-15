import type {Bot} from 'grammy';
import {resetUserState} from '../userState';

export default async function handleStart(bot: Bot, chatId: number) {
  await resetUserState(chatId, {step: 'waiting_sum'});

  await bot.api.sendMessage(
    chatId,
    'Вітаю! Введіть суму витрат. Можна одразу з категорією, банком і описом: 250 продукти моно сільпо.',
  );
}
