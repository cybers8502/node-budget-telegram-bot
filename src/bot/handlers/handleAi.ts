import Anthropic from '@anthropic-ai/sdk';
import type {Bot} from 'grammy';
import {CLAUDE_MODEL, MAX_OUTPUT_TOKENS, MAX_TOOL_ITERATIONS, TURN_TOKEN_LIMIT} from '../../configs/aiConfig';
import {BUDGET_ID} from '../../configs/consts';
import type {Expense} from '../../types';
import {formatKyivIso, parseKyivDate, toJsDate} from '../../utils/date';
import {getMonthExpenses} from '../../utils/firebaseUtility';
import categories from '../categories';

const TELEGRAM_MESSAGE_LIMIT = 4096;
const MAX_ROWS = 200;

let client: Anthropic | undefined;
const getClient = () => {
  client ??= new Anthropic();
  return client;
};

const tools: Anthropic.Tool[] = [
  {
    name: 'get_expenses',
    description:
      "Get the user's own expense/income records for a date range (read-only). Returns totals per category " +
      'and the individual records (newest first, capped). Income has category "Дохід".',
    input_schema: {
      type: 'object',
      properties: {
        from: {
          type: 'string',
          description: 'Start date inclusive, YYYY-MM-DD',
        },
        to: {type: 'string', description: 'End date exclusive, YYYY-MM-DD'},
        category: {
          type: 'string',
          description: 'Optional category filter, exactly as in the category list',
        },
      },
      required: ['from', 'to'],
      additionalProperties: false,
    },
  },
];

interface GetExpensesInput {
  from: string;
  to: string;
  category?: string;
}

const isIncome = (e: Expense) => e.type === 'income' || e.category === 'Дохід';

async function getExpenses(chatId: number, {from, to, category}: GetExpensesInput) {
  const startDate = parseKyivDate(from);
  const endDate = parseKyivDate(to);
  if (!startDate || !endDate) {
    throw new Error('Invalid date, use YYYY-MM-DD');
  }

  let expenses = await getMonthExpenses({
    budgetId: BUDGET_ID,
    userId: chatId.toString(),
    from: startDate,
    to: endDate,
  });
  if (category) expenses = expenses.filter((e) => e.category === category);
  expenses.sort((a, b) => toJsDate(b.date).getTime() - toJsDate(a.date).getTime());

  const byCategory: Record<string, number> = {};
  let income = 0;
  for (const e of expenses) {
    if (!e.sum) continue;
    if (isIncome(e)) income += e.sum;
    else byCategory[e.category] = (byCategory[e.category] || 0) + e.sum;
  }

  return {
    count: expenses.length,
    total_expenses: Math.round(Object.values(byCategory).reduce((a, b) => a + b, 0)),
    total_income: Math.round(income),
    by_category: byCategory,
    records: expenses.slice(0, MAX_ROWS).map((e) => ({
      date: formatKyivIso(toJsDate(e.date)),
      sum: e.sum,
      category: e.category,
      note: e.note,
      bank: e.bank,
    })),
    truncated: expenses.length > MAX_ROWS,
  };
}

async function runTool(chatId: number, name: string, input: unknown) {
  if (name === 'get_expenses') return getExpenses(chatId, input as GetExpensesInput);
  throw new Error(`Unknown tool: ${name}`);
}

function buildSystemPrompt() {
  return [
    'You are a personal finance assistant inside a Telegram expense-tracking bot.',
    "Answer the user's question about their own expenses in Ukrainian, briefly: replies are read on a phone.",
    'Use plain text without markdown. Amounts are in UAH.',
    `Today is ${formatKyivIso(new Date())}.`,
    `Expense categories: ${categories.join(', ')}.`,
    'Use the get_expenses tool for any figure; never invent numbers.',
    "If the question is not about the user's budget, say briefly that you only help with expenses.",
  ].join('\n');
}

async function ask(chatId: number, question: string): Promise<string> {
  const messages: Anthropic.MessageParam[] = [{role: 'user', content: question}];
  let tokensUsed = 0;

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const response = await getClient().messages.create({
      model: CLAUDE_MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      output_config: {effort: 'low'},
      system: buildSystemPrompt(),
      tools,
      messages,
    });

    tokensUsed += response.usage.input_tokens + response.usage.output_tokens;

    if (response.stop_reason === 'refusal') return 'Не можу відповісти на це запитання.';

    if (response.stop_reason === 'tool_use') {
      if (tokensUsed > TURN_TOKEN_LIMIT) return 'Запитання завелике для обробки. Спробуйте звузити період.';

      messages.push({role: 'assistant', content: response.content});

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;
        try {
          const result = await runTool(chatId, block.name, block.input);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(result),
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
    if (response.stop_reason === 'max_tokens') return `${text}\n\n(відповідь обрізано)`.trim();
    return text || 'Порожня відповідь, спробуйте перефразувати.';
  }

  return 'Не вдалося завершити відповідь, спробуйте простіше запитання.';
}

export default async function handleAi(bot: Bot, chatId: number, question?: string) {
  if (!question) {
    return bot.api.sendMessage(
      chatId,
      'Напишіть запитання після команди, напр.: /ai скільки я витратив на каву цього місяця?',
    );
  }

  bot.api.sendChatAction(chatId, 'typing').catch(() => {});

  let reply: string;
  try {
    reply = await ask(chatId, question);
  } catch (err) {
    console.error('AI error:', err);
    reply =
      err instanceof Anthropic.RateLimitError
        ? 'Забагато запитів, спробуйте за хвилину.'
        : 'Помилка AI, спробуйте пізніше.';
  }

  return bot.api.sendMessage(chatId, reply.slice(0, TELEGRAM_MESSAGE_LIMIT));
}
