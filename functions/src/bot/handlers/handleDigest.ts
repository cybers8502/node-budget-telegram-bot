import type {Bot} from 'grammy';
import {isDigestEnabled, setDigestEnabled} from '../../utils/prefsStore';

// /digest on | off | (status)
export default async function handleDigest(bot: Bot, chatId: number, arg: string) {
  const value = arg.toLowerCase();
  if (value === 'on' || value === 'off') {
    await setDigestEnabled(chatId, value === 'on');
    await bot.api.sendMessage(
      chatId,
      value === 'on' ? 'Тижневий дайджест увімкнено (понеділок, 9:00).' : 'Тижневий дайджест вимкнено.',
    );
    return;
  }

  const enabled = await isDigestEnabled(chatId);
  await bot.api.sendMessage(
    chatId,
    `Тижневий дайджест: ${enabled ? 'увімкнено' : 'вимкнено'} (понеділок, 9:00). Змінити: /digest on або /digest off.`,
  );
}
