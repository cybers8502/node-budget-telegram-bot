const {setUserState} = require('../userState');
const categories = require('../categories');

module.exports = function handleSetCategory(bot, chatId, text) {
  const index = Number(text) - 1;

  if (isNaN(index) || index < 0 || index >= categories.length) {
    bot.api.sendMessage(chatId, 'Введіть номер категорії зі списку.');
    return;
  }

  setUserState(chatId, {step: 'set_note', category: categories[index]});
  bot.api.sendMessage(chatId, 'Введіть короткий опис витрати (до 100 символів):');
};
