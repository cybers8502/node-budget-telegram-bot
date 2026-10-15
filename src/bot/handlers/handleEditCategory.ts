import type {Bot} from 'grammy';
import {BUDGET_ID} from '../../configs/consts';
import type {UserState} from '../../types';
import {updateExpense} from '../../utils/firebaseUtility';
import categories from '../categories';
import {clearUserState} from '../userState';

export default async function handleEditCategory(bot: Bot, chatId: number, index: number, state: UserState) {
  if (index < 0 || index >= categories.length) {
    await bot.api.sendMessage(chatId, 'Невідома категорія. Спробуйте ще раз.');
    return;
  }

  if (!state.expense) {
    await clearUserState(chatId);
    await bot.api.sendMessage(chatId, 'Стан було втрачено. Почніть заново: /edit');
    return;
  }

  const newCategory = categories[index];

  await updateExpense({
    budgetId: BUDGET_ID,
    userId: chatId.toString(),
    expenseId: state.expense.id,
    data: {
      category: newCategory,
      type: newCategory === 'Дохід' ? 'income' : 'expense',
    },
  });

  await clearUserState(chatId);
  await bot.api.sendMessage(
    chatId,
    `Категорію оновлено: ${newCategory}. Введіть нову суму для нового запису.`,
  );
}
