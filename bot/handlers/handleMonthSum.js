const {getMonthExpenses} = require('../../utils/firebaseUtility');
const {BUDGET_ID} = require('../../configs/consts');

module.exports = async function handleMonthSum(bot, chatId) {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const expenses = await getMonthExpenses({
    budgetId: BUDGET_ID,
    userId: chatId.toString(),
    from,
    to,
  });

  const total = expenses.reduce((acc, e) => acc + (e.sum || 0), 0);
  const month = now.toLocaleString('uk-UA', {month: 'long', year: 'numeric'});

  bot.api.sendMessage(chatId, `Витрати за ${month}: ${total}`);
};