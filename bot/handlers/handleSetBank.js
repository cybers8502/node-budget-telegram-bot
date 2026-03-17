const {setUserState} = require('../userState');
const banks = require('../banks');

module.exports = function handleSetBank(bot, chatId, text) {
  const index = Number(text) - 1;

  if (isNaN(index) || index < 0 || index >= banks.length) {
    bot.api.sendMessage(chatId, 'Введіть номер банку зі списку.');
    return;
  }

  setUserState(chatId, {step: 'set_note', bank: banks[index]});
  bot.api.sendMessage(chatId, 'Введіть короткий опис витрати (до 100 символів):');
};