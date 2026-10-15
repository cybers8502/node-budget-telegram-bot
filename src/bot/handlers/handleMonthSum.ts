import type {Bot} from 'grammy';
import {BUDGET_ID} from '../../configs/consts';
import type {Expense} from '../../types';
import {toJsDate} from '../../utils/date';
import {getMonthExpenses} from '../../utils/firebaseUtility';

const isIncome = (e: Expense) => e.type === 'income' || e.category === 'Дохід';

export default async function handleMonthSum(bot: Bot, chatId: number) {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const expenses = await getMonthExpenses({
    budgetId: BUDGET_ID,
    userId: chatId.toString(),
    from,
    to,
  });

  const total = expenses.reduce((acc, e) => {
    if (!e.sum) return acc;
    return isIncome(e) ? acc - e.sum : acc + e.sum;
  }, 0);
  const month = now.toLocaleString('uk-UA', {month: 'long', year: 'numeric'});

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const todayTotal = expenses
    .filter((e) => {
      const d = toJsDate(e.date);
      return d >= todayStart && d < todayEnd && !isIncome(e);
    })
    .reduce((acc, e) => acc + (e.sum || 0), 0);

  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const avgDaily = dayOfMonth > 0 ? total / dayOfMonth : 0;
  const projected = Math.round(avgDaily * daysInMonth);

  // Топ категорій
  const onlyExpenses = expenses.filter((e) => !isIncome(e) && e.sum);
  const byCat: Record<string, number> = {};
  for (const e of onlyExpenses) {
    byCat[e.category] = (byCat[e.category] || 0) + e.sum;
  }
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
        topCats.map(([cat, sum], i) => `${i + 1}. ${cat} — ${Math.round(sum)}`).join('\n')
      : '';

  const biggestText = biggest
    ? `\n\nНайбільша витрата: ${Math.round(biggest.sum)} (${biggest.category}${biggest.note ? ` — ${biggest.note}` : ''})`
    : '';

  const txText =
    onlyExpenses.length > 0 ? `\nТранзакцій: ${onlyExpenses.length}, середня: ${Math.round(avgTx)}` : '';

  await bot.api.sendMessage(
    chatId,
    `Витрати за ${month}: ${Math.round(total)}${usdMonth}\nСьогодні: ${Math.round(todayTotal)}\nНа день (середнє): ${Math.round(avgDaily)}\nПрогноз на місяць: ${projected}${usdProjected}${topCatsText}${biggestText}${txText}`,
  );
}
