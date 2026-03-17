const {updateExpense} = require('../../utils/firebaseUtility');
const {clearUserState} = require('../userState');
const {BUDGET_ID} = require('../../configs/consts');
const categories = require('../categories');

module.exports = async function handleEditCategory(bot, chatId, text, state) {
  const index = Number(text) - 1;

  if (isNaN(index) || index < 0 || index >= categories.length) {
    bot.api.sendMessage(chatId, 'Введіть номер категорії зі списку.');
    return;
  }

  const expense = state.expense;
  const newCategory = categories[index];

  await updateExpense({
    budgetId: BUDGET_ID,
    userId: chatId.toString(),
    expenseId: expense.id,
    data: {
      category: newCategory,
      type: newCategory === 'Дохід' ? 'income' : 'expense',
    },
  });

  clearUserState(chatId);
  bot.api.sendMessage(chatId, `Категорію оновлено: ${newCategory}. Введіть нову суму для нового запису.`);
};