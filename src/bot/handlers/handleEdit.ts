import type {Bot} from 'grammy';
import {BUDGET_ID} from '../../configs/consts';
import {toJsDate} from '../../utils/date';
import {getLastExpense} from '../../utils/firebaseUtility';
import {editChooseKeyboard} from '../keyboards';
import {clearUserState, setUserState} from '../userState';

export default async function handleEdit(bot: Bot, chatId: number) {
  const lastExpense = await getLastExpense({budgetId: BUDGET_ID, userId: chatId.toString()});

  if (!lastExpense) {
    await bot.api.sendMessage(chatId, 'Немає записів для редагування.');
    return;
  }

  const absSum = Math.abs(lastExpense.sum);
  const dateStr = toJsDate(lastExpense.date).toLocaleDateString('uk-UA');

  clearUserState(chatId);
  setUserState(chatId, {step: 'edit_choose', expense: lastExpense});

  await bot.api.sendMessage(
    chatId,
    `Останній запис:\n` +
      `Сума: ${absSum} грн\n` +
      `Категорія: ${lastExpense.category}\n` +
      `Банк: ${lastExpense.bank}\n` +
      `Опис: ${lastExpense.note}\n` +
      `Дата: ${dateStr}\n\n` +
      `Що змінити?`,
    {reply_markup: editChooseKeyboard()},
  );
}
