import {BUDGET_ID} from '../configs/consts';
import {bot} from '../configs/telegramConfig';
import {kyivParts, kyivStartOf} from '../utils/date';
import {buildDigest} from '../utils/digest';
import {getMonthExpenses, listUserIds} from '../utils/firebaseUtility';
import {isDigestEnabled} from '../utils/prefsStore';

// Weekly: the seven full Kyiv days before today (Monday run: last Monday to Sunday) vs. the week before
export async function runDigestJob(now: Date = new Date()): Promise<void> {
  const {year, month, day} = kyivParts(now);
  const weekEnd = kyivStartOf(year, month, day);
  const weekStart = kyivStartOf(year, month, day - 7);
  const prevStart = kyivStartOf(year, month, day - 14);

  for (const userId of await listUserIds(BUDGET_ID)) {
    try {
      if (!(await isDigestEnabled(userId))) continue;

      const range = {budgetId: BUDGET_ID, userId};
      const [prevWeek, week] = await Promise.all([
        getMonthExpenses({...range, from: prevStart, to: weekStart}),
        getMonthExpenses({...range, from: weekStart, to: weekEnd}),
      ]);

      const text = buildDigest(week, prevWeek);
      if (text) await bot.api.sendMessage(Number(userId), `Підсумок тижня\n\n${text}`);
    } catch (err) {
      console.error('Digest job failed for user', userId, err);
    }
  }
}
