const {v4: uuidv4} = require('uuid');
const {saveExpense} = require('../../utils/firebaseUtility');
const {clearUserState} = require('../userState');
const {BUDGET_ID} = require('../../configs/consts');

module.exports = async function handleSetNote(bot, chatId, text, state) {
  const newExpense = {
    id: uuidv4(),
    sum: state.sum,
    category: state.category,
    note: text,
    date: new Date(),
  };

  await saveExpense({
    budgetId: BUDGET_ID,
    userId: chatId.toString(),
    data: newExpense,
  });

  clearUserState(chatId);
  bot.api.sendMessage(chatId, 'Запис створено! Введіть нову суму для нового запису.');
};
