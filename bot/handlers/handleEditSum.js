const {updateExpense} = require('../../utils/firebaseUtility');
const {clearUserState} = require('../userState');
const {BUDGET_ID} = require('../../configs/consts');

function evalArithmetic(expr) {
  if (!/^[\d\s+\-*/.()]+$/.test(expr)) return null;
  try {
    // eslint-disable-next-line no-new-func
    const result = Function('"use strict"; return (' + expr + ')')();
    if (typeof result !== 'number' || !isFinite(result)) return null;
    return Math.round(result * 100) / 100;
  } catch {
    return null;
  }
}

module.exports = async function handleEditSum(bot, chatId, text, state) {
  const sum = evalArithmetic(text);
  if (sum === null || sum <= 0) {
    bot.api.sendMessage(chatId, 'Будь ласка, введіть суму або вираз (наприклад: 100, 50+30).');
    return;
  }

  const expense = state.expense;

  await updateExpense({
    budgetId: BUDGET_ID,
    userId: chatId.toString(),
    expenseId: expense.id,
    data: {sum},
  });

  clearUserState(chatId);
  bot.api.sendMessage(chatId, `Суму оновлено: ${sum} грн. Введіть нову суму для нового запису.`);
};