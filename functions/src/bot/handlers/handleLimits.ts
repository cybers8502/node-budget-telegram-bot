import type {Bot} from 'grammy';
import {formatLimitLine, parseLimitArgs} from '../../utils/limits';
import {categorySpend, getLimits, setLimit} from '../../utils/limitStore';

const HELP = 'Задати ліміт: /limit їжа 5000. Прибрати: /limit їжа 0.';

// /limits: all limits with this month's spend
export async function handleLimits(bot: Bot, chatId: number) {
  const limits = await getLimits(chatId);
  const entries = Object.entries(limits);
  if (entries.length === 0) {
    await bot.api.sendMessage(chatId, `Лімітів ще немає. ${HELP}`);
    return;
  }

  const now = new Date();
  const lines = await Promise.all(
    entries.map(async ([category, limit]) =>
      formatLimitLine(category, await categorySpend(chatId, category, now), limit),
    ),
  );
  await bot.api.sendMessage(chatId, `Ліміти на цей місяць:\n${lines.join('\n')}\n\n${HELP}`);
}

// /limit <category> <amount>
export async function handleSetLimit(bot: Bot, chatId: number, args: string) {
  const parsed = parseLimitArgs(args);
  if (!parsed) {
    await bot.api.sendMessage(chatId, `Не зрозумів. ${HELP}`);
    return;
  }

  await setLimit(chatId, parsed.category, parsed.amount);
  await bot.api.sendMessage(
    chatId,
    parsed.amount > 0
      ? `Ліміт на «${parsed.category}»: ${Math.round(parsed.amount)} грн на місяць.`
      : `Ліміт на «${parsed.category}» прибрано.`,
  );
}
