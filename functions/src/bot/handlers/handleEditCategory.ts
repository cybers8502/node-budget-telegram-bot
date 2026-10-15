import type {Bot} from 'grammy';
import type {UserState} from '../../types';
import {forUser} from '../../utils/firebaseUtility';
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

  await forUser(chatId).updateExpense(state.expense.id, {
    category: newCategory,
    type: newCategory === 'Дохід' ? 'income' : 'expense',
  });

  await clearUserState(chatId);
  await bot.api.sendMessage(
    chatId,
    `Категорію оновлено: ${newCategory}. Введіть нову суму для нового запису.`,
  );
}
