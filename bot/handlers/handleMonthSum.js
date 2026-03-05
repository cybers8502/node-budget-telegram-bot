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

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const getDate = (e) => (typeof e.date?.toDate === 'function' ? e.date.toDate() : new Date(e.date));
  const todayTotal = expenses
    .filter((e) => { const d = getDate(e); return d >= todayStart && d < todayEnd; })
    .reduce((acc, e) => acc + (e.sum || 0), 0);

  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const avgDaily = dayOfMonth > 0 ? total / dayOfMonth : 0;
  const projected = Math.round(avgDaily * daysInMonth);

  let usdProjected = '';
  let usdMonth = '';
  try {
    const res = await fetch('https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=USD&json');
    const [usd] = await res.json();
    usdProjected = ` (~$${Math.round(projected / usd.rate)})`;
    usdMonth = ` (~$${Math.round(month / usd.rate)})`;
  } catch {
    // якщо НБУ недоступний — просто без конвертації
  }

  bot.api.sendMessage(
    chatId,
    `Витрати за ${month}: ${usdMonth}\nНа день: ${Math.round(avgDaily)}\nПрогноз на місяць: ${projected}${usdProjected}`,
  );
};