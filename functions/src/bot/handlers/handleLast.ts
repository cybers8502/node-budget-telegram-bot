import type {Bot} from 'grammy';
import {forUser} from '../../utils/firebaseUtility';
import {recentExpensesKeyboard} from '../keyboards';
import {showEditMenu} from './handleEdit';

const LIST_SIZE = 8;

// /last: pick any of the recent records to edit or delete
export default async function handleLast(bot: Bot, chatId: number) {
  const expenses = await forUser(chatId).getRecentExpenses(LIST_SIZE);

  if (expenses.length === 0) {
    await bot.api.sendMessage(chatId, 'Немає записів.');
    return;
  }

  await bot.api.sendMessage(chatId, 'Останні записи, оберіть потрібний:', {
    reply_markup: recentExpensesKeyboard(expenses),
  });
}

// `rec:<id>` callback
export async function handleRecordSelected(bot: Bot, chatId: number, expenseId: string) {
  const expense = await forUser(chatId).getExpenseById(expenseId);

  if (!expense) {
    await bot.api.sendMessage(chatId, 'Запис не знайдено, можливо його вже видалено. Спробуйте /last.');
    return;
  }

  await showEditMenu(bot, chatId, expense);
}
