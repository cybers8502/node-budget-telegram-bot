import Anthropic from '@anthropic-ai/sdk';
import type {Bot} from 'grammy';
import {CLAUDE_MODEL, MAX_OUTPUT_TOKENS, MAX_TOOL_ITERATIONS, TURN_TOKEN_LIMIT} from '../../configs/aiConfig';
import type {Expense} from '../../types';
import {appendAiHistory, consumeAiQuota, getAiHistory} from '../../utils/aiStore';
import {formatKyivDate, formatKyivIso, toJsDate} from '../../utils/date';
import {type ToolContext, runTool, tools} from '../ai/tools';
import categories from '../categories';
import {aiConfirmKeyboard} from '../keyboards';
import {reportError} from '../../utils/monitoring';
import {resetUserState} from '../userState';

const TELEGRAM_MESSAGE_LIMIT = 4096;

let client: Anthropic | undefined;
const getClient = () => {
  client ??= new Anthropic();
  return client;
};

function buildSystemPrompt() {
  return [
    'You are a personal finance assistant inside a Telegram expense-tracking bot.',
    "Answer the user's question about their own expenses in Ukrainian, briefly: replies are read on a phone.",
    'Use plain text without markdown. Amounts are in UAH.',
    `Today is ${formatKyivIso(new Date())}.`,
    `Expense categories: ${categories.join(', ')}.`,
    'Use the tools for any figure; never invent numbers. Prefer get_summary for totals, comparisons and trends, ' +
      'and get_expenses to list or look up individual records.',
    'Use add_expense only when the user explicitly asks to add or record an expense. It only prepares a draft: ' +
      'the user confirms it with buttons, so never say it is already saved.',
    "If the question is not about the user's budget, say briefly that you only help with expenses.",
  ].join('\n');
}

interface Answer {
  text: string;
  draft?: Expense;
}

async function ask(chatId: number, question: string): Promise<Answer> {
  const history = await getAiHistory(chatId);
  const messages: Anthropic.MessageParam[] = [
    ...history.flatMap<Anthropic.MessageParam>((t) => [
      {role: 'user', content: t.q},
      {role: 'assistant', content: t.a},
    ]),
    {role: 'user', content: question},
  ];
  const ctx: ToolContext = {chatId};
  let tokensUsed = 0;

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const response = await getClient().messages.create({
      model: CLAUDE_MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      output_config: {effort: 'low'},
      // Caches tools + system + the growing tool-loop history between iterations
      cache_control: {type: 'ephemeral'},
      system: buildSystemPrompt(),
      tools,
      messages,
    });

    tokensUsed += response.usage.input_tokens + response.usage.output_tokens;
    console.info('AI usage', {
      input: response.usage.input_tokens,
      output: response.usage.output_tokens,
      cacheRead: response.usage.cache_read_input_tokens,
      cacheWrite: response.usage.cache_creation_input_tokens,
    });

    if (response.stop_reason === 'refusal') return {text: 'Не можу відповісти на це запитання.'};

    if (response.stop_reason === 'tool_use') {
      if (tokensUsed > TURN_TOKEN_LIMIT)
        return {text: 'Запитання завелике для обробки. Спробуйте звузити період.'};

      messages.push({role: 'assistant', content: response.content});

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;
        try {
          const result = await runTool(ctx, block.name, block.input);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: typeof result === 'string' ? result : JSON.stringify(result),
          });
        } catch (err) {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: err instanceof Error ? err.message : String(err),
            is_error: true,
          });
        }
      }
      messages.push({role: 'user', content: toolResults});
      continue;
    }

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
    if (response.stop_reason === 'max_tokens')
      return {text: `${text}\n\n(відповідь обрізано)`.trim(), draft: ctx.draft};
    return {text: text || 'Порожня відповідь, спробуйте перефразувати.', draft: ctx.draft};
  }

  return {text: 'Не вдалося завершити відповідь, спробуйте простіше запитання.'};
}

function describeDraft(e: Expense): string {
  const parts = [`${e.sum} грн`, e.category, e.bank, e.note, formatKyivDate(toJsDate(e.date))];
  return `Записати: ${parts.filter(Boolean).join(' · ')}?`;
}

export default async function handleAi(bot: Bot, chatId: number, question?: string) {
  if (!question) {
    return bot.api.sendMessage(
      chatId,
      'Напишіть запитання після команди, напр.: /ai скільки я витратив на каву цього місяця? ' +
        'Можна й додати запис: /ai додай 250 на продукти, моно.',
    );
  }

  if (!(await consumeAiQuota(chatId))) {
    return bot.api.sendMessage(chatId, 'Денний ліміт запитів до AI вичерпано, спробуйте завтра.');
  }

  bot.api.sendChatAction(chatId, 'typing').catch(() => {});

  let answer: Answer;
  try {
    answer = await ask(chatId, question);
  } catch (err) {
    if (!(err instanceof Anthropic.RateLimitError)) await reportError('/ai failed', err);
    return bot.api.sendMessage(
      chatId,
      err instanceof Anthropic.RateLimitError
        ? 'Забагато запитів, спробуйте за хвилину.'
        : 'Помилка AI, спробуйте пізніше.',
    );
  }

  await appendAiHistory(chatId, {q: question, a: answer.text}).catch((err) =>
    console.error('AI history error:', err),
  );

  if (!answer.draft) return bot.api.sendMessage(chatId, answer.text.slice(0, TELEGRAM_MESSAGE_LIMIT));

  // The draft waits in the conversation state until the user presses a button
  await resetUserState(chatId, {step: 'ai_confirm', expense: answer.draft});
  const draftText = describeDraft(answer.draft);
  const text = `${answer.text.slice(0, TELEGRAM_MESSAGE_LIMIT - draftText.length - 2)}\n\n${draftText}`;
  return bot.api.sendMessage(chatId, text, {reply_markup: aiConfirmKeyboard()});
}
