const {v4: uuidv4} = require('uuid');
const {saveExpense} = require('../../utils/firebaseUtility');
const {appendExpenseToSheet} = require('../../utils/googleSheetsUtility');
const {clearUserState} = require('../userState');
const {BUDGET_ID} = require('../../configs/consts');

module.exports = async function handleSetNote(bot, chatId, text, state) {
  const newExpense = {
    id: uuidv4(),
    type: state.category === 'Дохід' ? 'income' : 'expense',
    sum: state.sum,
    category: state.category,
    bank: state.bank || null,
    note: text,
    date: new Date(),
  };

  await Promise.all([
    saveExpense({budgetId: BUDGET_ID, userId: chatId.toString(), data: newExpense}),
    appendExpenseToSheet(newExpense),
  ]);

  clearUserState(chatId);
  bot.api.sendMessage(chatId, 'Запис створено! Введіть нову суму для нового запису.');
};
