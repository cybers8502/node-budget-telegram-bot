import {bot} from '../configs/telegramConfig';
import type {JobResult} from './runMonitored';
import {kyivParts, kyivStartOf} from '../utils/date';
import {buildDigest} from '../utils/digest';
import {forUser, listUserIds} from '../utils/firebaseUtility';
import {reportError} from '../utils/monitoring';
import {isDigestEnabled} from '../utils/prefsStore';

// Weekly: the seven full Kyiv days before today (Monday run: last Monday to Sunday) vs. the week before
export async function runDigestJob(now: Date = new Date()): Promise<JobResult> {
  const {year, month, day} = kyivParts(now);
  const weekEnd = kyivStartOf(year, month, day);
  const weekStart = kyivStartOf(year, month, day - 7);
  const prevStart = kyivStartOf(year, month, day - 14);

  let sent = 0;
  let failed = 0;

  for (const userId of await listUserIds()) {
    try {
      if (!(await isDigestEnabled(userId))) continue;

      const user = forUser(userId);
      const [prevWeek, week] = await Promise.all([
        user.getMonthExpenses(prevStart, weekStart),
        user.getMonthExpenses(weekStart, weekEnd),
      ]);

      const text = buildDigest(week, prevWeek);
      if (text) {
        await bot.api.sendMessage(Number(userId), `Підсумок тижня\n\n${text}`);
        sent++;
      }
    } catch (err) {
      failed++;
      await reportError(`weeklyDigest failed for user ${userId}`, err);
    }
  }

  return {failed, detail: `надіслано: ${sent}`};
}
