const {setUserState} = require('../userState');
const categories = require('../categories');
const banks = require('../banks');

module.exports = function handleSetCategory(bot, chatId, text) {
  const index = Number(text) - 1;

  if (isNaN(index) || index < 0 || index >= categories.length) {
    bot.api.sendMessage(chatId, 'Введіть номер категорії зі списку.');
    return;
  }

  setUserState(chatId, {step: 'set_bank', category: categories[index]});
  bot.api.sendMessage(
    chatId,
    `Оберіть банк:\n` + banks.map((b, i) => `${i + 1}. ${b}`).join('\n'),
  );
};
