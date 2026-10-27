import type {Bot} from 'grammy';
import type {UserState} from '../../types';
import {forUser} from '../../utils/firebaseUtility';
import {INCOME_CATEGORY, incomeFields} from '../../utils/monthStats';
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

  // Leaving the income category must also drop an income kind, which would otherwise win in the web app
  const wasIncome = state.expense.kind === 'income';
  await forUser(chatId).updateExpense(state.expense.id, {
    category: newCategory,
    ...incomeFields(newCategory),
    ...(newCategory !== INCOME_CATEGORY && wasIncome && {kind: 'expense' as const}),
  });

  await clearUserState(chatId);
  await bot.api.sendMessage(
    chatId,
    `Категорію оновлено: ${newCategory}. Введіть нову суму для нового запису.`,
  );
}
