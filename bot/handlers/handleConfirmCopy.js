const {v4: uuidv4} = require('uuid');
const {getLastExpense, saveExpense} = require('../../utils/firebaseUtility');
const {appendExpenseToSheet} = require('../../utils/googleSheetsUtility');
const {clearUserState, setUserState} = require('../userState');
const {BUDGET_ID} = require('../../configs/consts');

module.exports = async function handleConfirmCopy(bot, chatId, text, state) {
  const userId = chatId.toString();
  const budgetId = BUDGET_ID;

  if (text.toLowerCase() === 'так') {
    const lastExpense = await getLastExpense({budgetId, userId});

    const isIncome = lastExpense?.type === 'income' || lastExpense?.category === 'Дохід';
    const newExpense = {
      ...(lastExpense || {}),
      id: uuidv4(),
      type: isIncome ? 'income' : 'expense',
      sum: state.sum,
      date: new Date(),
    };

    await Promise.all([
      saveExpense({budgetId, userId, data: newExpense}),
      appendExpenseToSheet(newExpense),
    ]);
    clearUserState(chatId);
    bot.api.sendMessage(chatId, 'Запис створено! Введіть нову суму для нового запису.');
  } else if (text.toLowerCase() === 'ні') {
    setUserState(chatId, {step: 'set_category'});

    const categories = require('../categories');
    bot.api.sendMessage(
      chatId,
      `Виберіть категорію витрати (введіть цифру):\n` +
        categories.map((cat, i) => `${i + 1}. ${cat}`).join('\n'),
    );
  } else {
    bot.api.sendMessage(chatId, 'Відповідь не зрозуміла. Напишіть "так" або "ні".');
  }
};
