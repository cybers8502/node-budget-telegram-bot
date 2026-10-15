import type {Bot} from 'grammy';
import {BUDGET_ID} from '../../configs/consts';
import type {UserState} from '../../types';
import {deleteExpense} from '../../utils/firebaseUtility';
import {deleteConfirmKeyboard} from '../keyboards';
import {clearUserState} from '../userState';

// `del:ask` | `del:yes` | `del:no` callbacks
export default async function handleDelete(
  bot: Bot,
  chatId: number,
  action: string,
  state: UserState | null,
) {
  if (state?.step !== 'edit_choose' || !state.expense) {
    await bot.api.sendMessage(chatId, 'Стан було втрачено. Почніть заново: /last');
    return;
  }

  if (action === 'ask') {
    const {sum, category, note} = state.expense;
    await bot.api.sendMessage(
      chatId,
      `Видалити запис: ${Math.abs(sum)} грн · ${category}${note ? ` · ${note}` : ''}?`,
      {reply_markup: deleteConfirmKeyboard()},
    );
    return;
  }

  if (action === 'yes') {
    await deleteExpense({budgetId: BUDGET_ID, userId: chatId.toString(), expenseId: state.expense.id});
    await clearUserState(chatId);
    await bot.api.sendMessage(chatId, 'Запис видалено. Введіть нову суму для нового запису.');
    return;
  }

  await clearUserState(chatId);
  await bot.api.sendMessage(chatId, 'Видалення скасовано.');
}
