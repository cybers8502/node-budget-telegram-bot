import type {Bot} from 'grammy';
import {BUDGET_ID} from '../../configs/consts';
import type {Expense} from '../../types';
import {
  daysInKyivMonth,
  formatKyivMonth,
  kyivDayRange,
  kyivMonthRange,
  kyivParts,
  kyivStartOf,
  toJsDate,
} from '../../utils/date';
import {getMonthExpenses} from '../../utils/firebaseUtility';
import {formatChange, isIncome, netTotal, spentByCategory, untilDay} from '../../utils/monthStats';

export default async function handleMonthSum(bot: Bot, chatId: number) {
  const now = new Date();
  const {from, to} = kyivMonthRange(now);

  const expenses = await getMonthExpenses({
    budgetId: BUDGET_ID,
    userId: chatId.toString(),
    from,
    to,
  });

  const total = netTotal(expenses);

  const {year, month: monthIndex, day: dayOfMonth} = kyivParts(now);
  const prevExpenses = await getMonthExpenses({
    budgetId: BUDGET_ID,
    userId: chatId.toString(),
    from: kyivStartOf(year, monthIndex - 1, 1),
    to: from,
  });
  const month = formatKyivMonth(now);

  const {from: todayStart, to: todayEnd} = kyivDayRange(now);
  const todayTotal = expenses
    .filter((e) => {
      const d = toJsDate(e.date);
      return d >= todayStart && d < todayEnd && !isIncome(e);
    })
    .reduce((acc, e) => acc + (e.sum || 0), 0);

  const daysInMonth = daysInKyivMonth(now);
  const avgDaily = dayOfMonth > 0 ? total / dayOfMonth : 0;
  const projected = Math.round(avgDaily * daysInMonth);

  // Топ категорій
  const onlyExpenses = expenses.filter((e) => !isIncome(e) && e.sum);
  const byCat = spentByCategory(expenses);
  const prevByCat = spentByCategory(prevExpenses);
  const topCats = Object.entries(byCat)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  // Найбільша витрата
  const biggest = onlyExpenses.reduce<Expense | null>((max, e) => (!max || e.sum > max.sum ? e : max), null);

  // Середня транзакція
  const avgTx = onlyExpenses.length > 0 ? total / onlyExpenses.length : 0;

  let usdProjected = '';
  let usdMonth = '';
  try {
    const res = await fetch('https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=USD&json');
    const [usd] = (await res.json()) as {rate: number}[];
    usdProjected = ` (~$${Math.round(projected / usd.rate)})`;
    usdMonth = ` (~$${Math.round(total / usd.rate)})`;
  } catch {
    // якщо НБУ недоступний — просто без конвертації
  }

  const topCatsText =
    topCats.length > 0
      ? '\n\nТоп категорій:\n' +
        topCats
          .map(([cat, sum], i) => {
            const change = formatChange(sum, prevByCat[cat] || 0);
            return `${i + 1}. ${cat} — ${Math.round(sum)}${change ? ` (${change})` : ''}`;
          })
          .join('\n')
      : '';

  const biggestText = biggest
    ? `\n\nНайбільша витрата: ${Math.round(biggest.sum)} (${biggest.category}${biggest.note ? ` — ${biggest.note}` : ''})`
    : '';

  const txText =
    onlyExpenses.length > 0 ? `\nТранзакцій: ${onlyExpenses.length}, середня: ${Math.round(avgTx)}` : '';

  // Same point of the previous month vs. this month so far, plus last month's full total
  let prevText = '';
  if (prevExpenses.length > 0) {
    const prevToDate = netTotal(untilDay(prevExpenses, dayOfMonth));
    const change = formatChange(total, prevToDate);
    prevText = `\nМинулий місяць: ${Math.round(netTotal(prevExpenses))}, до цього дня: ${Math.round(prevToDate)}${change ? ` (зараз ${change})` : ''}`;
  }

  await bot.api.sendMessage(
    chatId,
    `Витрати за ${month}: ${Math.round(total)}${usdMonth}${prevText}\nСьогодні: ${Math.round(todayTotal)}\nНа день (середнє): ${Math.round(avgDaily)}\nПрогноз на місяць: ${projected}${usdProjected}${topCatsText}${biggestText}${txText}`,
  );
}
