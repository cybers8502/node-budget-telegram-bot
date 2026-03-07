const {setUserState} = require('../userState');
const categories = require('../categories');

module.exports = function handleEditChoose(bot, chatId, text) {
  const choice = text.trim();

  if (choice === '1') {
    setUserState(chatId, {step: 'edit_sum'});
    bot.api.sendMessage(chatId, 'Введіть нову суму:');
  } else if (choice === '2') {
    setUserState(chatId, {step: 'edit_category'});
    bot.api.sendMessage(
      chatId,
      `Виберіть нову категорію (введіть цифру):\n` +
        categories.map((cat, i) => `${i + 1}. ${cat}`).join('\n'),
    );
  } else if (choice === '3') {
    setUserState(chatId, {step: 'edit_note'});
    bot.api.sendMessage(chatId, 'Введіть новий опис:');
  } else {
    bot.api.sendMessage(chatId, 'Введіть 1, 2 або 3.');
  }
};