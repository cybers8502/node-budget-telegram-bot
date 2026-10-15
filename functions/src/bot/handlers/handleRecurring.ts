import type {Bot} from 'grammy';
import {InlineKeyboard} from 'grammy';
import {daysInKyivMonth, formatKyivMonth, kyivParts} from '../../utils/date';
import {
  buildSubsOverview,
  describeRecurring,
  initialLastRun,
  parseRecurringArgs,
} from '../../utils/recurring';
import {addRecurring, deleteRecurring, listRecurring} from '../../utils/recurringStore';

const HELP =
  'Додати: /recurring 5 800 підписка моно Netflix (число місяця, сума, категорія, банк, опис). ' +
  'Розстрочка: додайте x6 (6 платежів) або 2/6 (2 з 6 вже сплачено). ' +
  'Запис створюватиметься щомісяця о 8:00 за Києвом, а напередодні прийде нагадування.';

const ERRORS: Record<string, string> = {
  format: 'Не зрозумів. ',
  day: 'Число місяця має бути від 1 до 31. ',
  sum: 'Не бачу суми. ',
  currency: 'Повторювані витрати поки лише в гривнях. ',
  category: 'Потрібна категорія (наприклад: підписка). ',
  payments: 'Кількість платежів: x6, а у 2/6 перше число має бути меншим за друге. ',
};

// /recurring: list (with delete buttons), or add when arguments are given
export default async function handleRecurring(bot: Bot, chatId: number, args: string) {
  if (args) {
    const parsed = parseRecurringArgs(args);
    if (typeof parsed === 'string') {
      await bot.api.sendMessage(chatId, `${ERRORS[parsed]}${HELP}`);
      return;
    }

    // A charge day that already passed this month starts next month instead of charging at once
    const now = new Date();
    const lastRun = initialLastRun(parsed, kyivParts(now), daysInKyivMonth(now));
    await addRecurring(chatId, {...parsed, ...(lastRun && {lastRun})});
    await bot.api.sendMessage(
      chatId,
      `Додано: ${describeRecurring(parsed)}${lastRun ? '\nПерше списання з наступного місяця.' : ''}`,
    );
    return;
  }

  const items = await listRecurring(chatId);
  if (items.length === 0) {
    await bot.api.sendMessage(chatId, `Повторюваних витрат ще немає. ${HELP}`);
    return;
  }

  const kb = new InlineKeyboard();
  for (const item of items) kb.text(`🗑 ${describeRecurring(item)}`.slice(0, 60), `rcr:del:${item.id}`).row();
  await bot.api.sendMessage(chatId, `Повторювані витрати (натисніть, щоб видалити):\n\n${HELP}`, {
    reply_markup: kb,
  });
}

// /subs: all subscriptions and installments with this month's status
export async function handleSubs(bot: Bot, chatId: number) {
  const now = new Date();
  const text = buildSubsOverview(
    await listRecurring(chatId),
    kyivParts(now),
    daysInKyivMonth(now),
    formatKyivMonth(now),
  );
  await bot.api.sendMessage(chatId, text);
}

// `rcr:del:<id>` callback, also used by the "charged tomorrow" reminder
export async function handleRecurringCallback(bot: Bot, chatId: number, data: string) {
  const [action, id] = data.split(':');
  if (action !== 'del' || !id) return;
  await deleteRecurring(chatId, id);
  await bot.api.sendMessage(chatId, 'Видалено, надалі не списуватиметься. Вже створені записи лишаються.');
}
