const {clearUserState, setUserState, getUserState} = require('../userState');

module.exports = function handleStart(bot, chatId) {
  clearUserState(chatId);
  setUserState(chatId, {step: 'waiting_sum'});

  bot.api.sendMessage(chatId, 'Вітаю! Введіть суму витрат (ціле число).');
};
