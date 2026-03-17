const {getLastExpense} = require('../../utils/firebaseUtility');
const {clearUserState, setUserState} = require('../userState');
const {BUDGET_ID} = require('../../configs/consts');

module.exports = async function handleEdit(bot, chatId) {
  const lastExpense = await getLastExpense({budgetId: BUDGET_ID, userId: chatId.toString()});

  if (!lastExpense) {
    bot.api.sendMessage(chatId, 'Немає записів для редагування.');
    return;
  }

  const date = typeof lastExpense.date?.toDate === 'function'
    ? lastExpense.date.toDate()
    : new Date(lastExpense.date);
  const absSum = Math.abs(lastExpense.sum);
  const dateStr = date.toLocaleDateString('uk-UA');

  clearUserState(chatId);
  setUserState(chatId, {step: 'edit_choose', expense: lastExpense});

  bot.api.sendMessage(
    chatId,
    `Останній запис:\n` +
      `Сума: ${absSum} грн\n` +
      `Категорія: ${lastExpense.category}\n` +
      `Банк: ${lastExpense.bank}\n` +
      `Опис: ${lastExpense.note}\n` +
      `Дата: ${dateStr}\n\n` +
      `Що змінити?\n1. Суму\n2. Категорію\n3. Нотатку`,
  );
};