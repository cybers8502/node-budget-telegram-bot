const {updateExpense} = require('../../utils/firebaseUtility');
const {clearUserState} = require('../userState');
const {BUDGET_ID} = require('../../configs/consts');

module.exports = async function handleEditNote(bot, chatId, text, state) {
  const expense = state.expense;

  await updateExpense({
    budgetId: BUDGET_ID,
    userId: chatId.toString(),
    expenseId: expense.id,
    data: {note: text},
  });

  clearUserState(chatId);
  bot.api.sendMessage(chatId, `Опис оновлено. Введіть нову суму для нового запису.`);
};