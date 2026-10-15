import type {Bot} from 'grammy';
import type {Expense} from '../../types';
import {formatKyivDate, toJsDate} from '../../utils/date';
import {forUser} from '../../utils/firebaseUtility';
import {editChooseKeyboard} from '../keyboards';
import {resetUserState} from '../userState';

// Shows one record and the "what to change / delete" menu; the record is kept in the conversation state
export async function showEditMenu(bot: Bot, chatId: number, expense: Expense) {
  const absSum = Math.abs(expense.sum);
  const dateStr = formatKyivDate(toJsDate(expense.date));

  await resetUserState(chatId, {step: 'edit_choose', expense});

  await bot.api.sendMessage(
    chatId,
    `Запис:\n` +
      `Сума: ${absSum} грн\n` +
      `Категорія: ${expense.category}\n` +
      `Банк: ${expense.bank}\n` +
      `Опис: ${expense.note}\n` +
      `Дата: ${dateStr}\n\n` +
      `Що змінити?`,
    {reply_markup: editChooseKeyboard()},
  );
}

export default async function handleEdit(bot: Bot, chatId: number) {
  const lastExpense = await forUser(chatId).getLastExpense();

  if (!lastExpense) {
    await bot.api.sendMessage(chatId, 'Немає записів для редагування.');
    return;
  }

  await showEditMenu(bot, chatId, lastExpense);
}
