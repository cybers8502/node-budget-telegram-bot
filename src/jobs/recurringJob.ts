import {InlineKeyboard} from 'grammy';
import {BUDGET_ID} from '../configs/consts';
import {bot} from '../configs/telegramConfig';
import type {RecurringItem} from '../types';
import {daysInKyivMonth, kyivParts, kyivStartOf} from '../utils/date';
import {listUserIds, saveExpense} from '../utils/firebaseUtility';
import {limitWarningFor} from '../utils/limitStore';
import {
  afterPayment,
  buildRecurringExpense,
  isDueTomorrow,
  isRecurringDue,
  monthKey,
  progressLabel,
} from '../utils/recurring';
import {deleteRecurring, listRecurring, updateRecurring} from '../utils/recurringStore';

const HALF_DAY_MS = 12 * 60 * 60 * 1000;

const label = (item: RecurringItem, progress: string) => {
  const text = [`${item.sum} грн`, item.category, item.bank, item.note].filter(Boolean).join(' · ');
  return progress ? `${text} (${progress})` : text;
};

// Creates this month's record for every item that is due and tells the user; finished installment plans are removed
async function chargeDue(userId: string, items: RecurringItem[], now: Date): Promise<void> {
  const today = kyivParts(now);
  const due = items.filter((item) => isRecurringDue(item, today, daysInKyivMonth(now)));
  if (due.length === 0) return;

  const lines: string[] = [];
  for (const item of due) {
    const expense = buildRecurringExpense(item, today, now);
    await saveExpense({budgetId: BUDGET_ID, userId, data: expense});

    const {paid, finished} = afterPayment(item);
    const isPlan = item.payments !== undefined;
    if (finished) await deleteRecurring(userId, item.id);
    else await updateRecurring(userId, item.id, {lastRun: monthKey(today), ...(isPlan && {paid})});

    const warning = await limitWarningFor(Number(userId), expense);
    const progress = isPlan ? progressLabel({...item, paid}) : '';
    lines.push(
      label(item, progress) +
        (finished ? '\nОстанній платіж, розстрочку закрито.' : '') +
        (warning ? `\n${warning}` : ''),
    );
  }

  await bot.api.sendMessage(Number(userId), `Автоматично записано:\n${lines.join('\n')}`);
}

// The day before the charge: one message listing what is charged tomorrow, with a delete button per item
async function remindTomorrow(userId: string, items: RecurringItem[], now: Date): Promise<void> {
  const tomorrowDate = new Date(
    kyivStartOf(kyivParts(now).year, kyivParts(now).month, kyivParts(now).day + 1).getTime() + HALF_DAY_MS,
  );
  const tomorrow = kyivParts(tomorrowDate);
  const dim = daysInKyivMonth(tomorrowDate);

  const soon = items.filter((item) => isDueTomorrow(item, tomorrow, dim));
  if (soon.length === 0) return;

  const kb = new InlineKeyboard();
  const lines = soon.map((item) => {
    const progress = item.payments !== undefined ? progressLabel(item, 1) : '';
    kb.text(`🗑 Видалити: ${item.note || item.category}`.slice(0, 60), `rcr:del:${item.id}`).row();
    return `• ${label(item, progress)}`;
  });

  await bot.api.sendMessage(Number(userId), `Завтра спишеться:\n${lines.join('\n')}`, {reply_markup: kb});
  for (const item of soon) await updateRecurring(userId, item.id, {reminded: monthKey(tomorrow)});
}

// Daily: charge what is due today, then remind about what is charged tomorrow
export async function runRecurringJob(now: Date = new Date()): Promise<void> {
  for (const userId of await listUserIds(BUDGET_ID)) {
    try {
      await chargeDue(userId, await listRecurring(userId), now);
      // Reload: charging changed lastRun/paid, and finished plans are gone
      await remindTomorrow(userId, await listRecurring(userId), now);
    } catch (err) {
      console.error('Recurring job failed for user', userId, err);
    }
  }
}
