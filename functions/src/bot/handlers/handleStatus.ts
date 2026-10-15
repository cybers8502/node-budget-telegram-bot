import type {Bot} from 'grammy';
import {TIME_ZONE} from '../../utils/date';
import {getJobs} from '../../utils/jobStatus';
import {adminChatId} from '../../utils/monitoring';

const JOB_NAMES = ['recurringExpenses', 'weeklyDigest'];

// /status (admin only): result of the last run of each scheduled job
export default async function handleStatus(bot: Bot, chatId: number) {
  if (chatId !== adminChatId()) {
    await bot.api.sendMessage(chatId, 'Ця команда лише для адміністратора.');
    return;
  }

  const jobs = await getJobs();
  const lines = JOB_NAMES.map((name) => {
    const job = jobs[name];
    if (!job) return `${name}: ще не запускалась`;

    const at = job.at
      ?.toDate()
      .toLocaleString('uk-UA', {timeZone: TIME_ZONE, dateStyle: 'short', timeStyle: 'short'});
    return `${name}: ${job.ok ? '✅' : '❌'} ${at ?? ''} · ${job.detail}`;
  });
  await bot.api.sendMessage(chatId, `Планові функції:\n${lines.join('\n')}`);
}
