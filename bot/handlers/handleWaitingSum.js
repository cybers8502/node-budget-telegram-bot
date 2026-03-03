const {setUserState} = require('../userState');

function evalArithmetic(expr) {
  if (!/^[\d\s+\-*/.()]+$/.test(expr)) return null;
  try {
    // eslint-disable-next-line no-new-func
    const result = Function('"use strict"; return (' + expr + ')')();
    if (typeof result !== 'number' || !isFinite(result)) return null;
    return Math.round(result * 100) / 100;
  } catch {
    return null;
  }
}

module.exports = function handleWaitingSum(bot, chatId, text) {
  const sum = evalArithmetic(text);
  if (sum === null || sum <= 0) {
    bot.api.sendMessage(chatId, 'Будь ласка, введіть суму або вираз (наприклад: 100, 50+30, 200/4).');
    return;
  }

  setUserState(chatId, {step: 'confirm_copy', sum});
  bot.api.sendMessage(chatId, `Сума: ${sum}\nСкопіювати всі інші поля з попереднього запису? Відповідайте "так" або "ні".`);
};