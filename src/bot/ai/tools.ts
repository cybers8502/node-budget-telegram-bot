import type Anthropic from '@anthropic-ai/sdk';
import {BUDGET_ID} from '../../configs/consts';
import type {Expense} from '../../types';
import {formatKyivIso, parseKyivDate, toJsDate} from '../../utils/date';
import {getMonthExpenses} from '../../utils/firebaseUtility';
import {GROUP_BY, type GroupBy, buildSummary, isIncome} from './summary';

const MAX_ROWS = 200;

export const tools: Anthropic.Tool[] = [
  {
    name: 'get_expenses',
    description:
      "Get the user's own expense/income records for a date range (read-only). Returns totals per category " +
      'and the individual records (newest first, capped). Use it to list or look up specific records. ' +
      'Income has category "Дохід".',
    input_schema: {
      type: 'object',
      properties: {
        from: {type: 'string', description: 'Start date inclusive, YYYY-MM-DD'},
        to: {type: 'string', description: 'End date exclusive, YYYY-MM-DD'},
        category: {type: 'string', description: 'Optional category filter, exactly as in the category list'},
      },
      required: ['from', 'to'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_summary',
    description:
      'Aggregate expenses and income for a date range, grouped by category, bank, month or day (read-only). ' +
      'Prefer it over get_expenses for totals, comparisons between periods, trends and "where does the money go" ' +
      'questions: the sums are computed on the server. Call it once per period to compare periods.',
    input_schema: {
      type: 'object',
      properties: {
        from: {type: 'string', description: 'Start date inclusive, YYYY-MM-DD'},
        to: {type: 'string', description: 'End date exclusive, YYYY-MM-DD'},
        group_by: {type: 'string', enum: [...GROUP_BY], description: 'How to group the records'},
        category: {type: 'string', description: 'Optional category filter, exactly as in the category list'},
      },
      required: ['from', 'to', 'group_by'],
      additionalProperties: false,
    },
  },
];

// Context of one /ai turn passed to the tools
export interface ToolContext {
  chatId: number;
}

interface RangeInput {
  from: string;
  to: string;
  category?: string;
}

async function loadRange(chatId: number, {from, to, category}: RangeInput): Promise<Expense[]> {
  const startDate = parseKyivDate(from);
  const endDate = parseKyivDate(to);
  if (!startDate || !endDate) throw new Error('Invalid date, use YYYY-MM-DD');

  const expenses = await getMonthExpenses({
    budgetId: BUDGET_ID,
    userId: chatId.toString(),
    from: startDate,
    to: endDate,
  });
  return category ? expenses.filter((e) => e.category === category) : expenses;
}

async function getExpenses(chatId: number, input: RangeInput) {
  const expenses = await loadRange(chatId, input);
  expenses.sort((a, b) => toJsDate(b.date).getTime() - toJsDate(a.date).getTime());

  const {total_expenses, total_income, groups} = buildSummary(expenses, 'category');
  return {
    count: expenses.length,
    total_expenses,
    total_income,
    by_category: Object.fromEntries(groups.filter((g) => g.expenses > 0).map((g) => [g.key, g.expenses])),
    records: expenses.slice(0, MAX_ROWS).map((e) => ({
      date: formatKyivIso(toJsDate(e.date)),
      sum: e.sum,
      category: e.category,
      note: e.note,
      bank: e.bank,
      income: isIncome(e),
    })),
    truncated: expenses.length > MAX_ROWS,
  };
}

async function getSummary(chatId: number, input: RangeInput & {group_by: GroupBy}) {
  if (!GROUP_BY.includes(input.group_by)) throw new Error(`group_by must be one of: ${GROUP_BY.join(', ')}`);
  return buildSummary(await loadRange(chatId, input), input.group_by);
}

export async function runTool(ctx: ToolContext, name: string, input: unknown) {
  if (name === 'get_expenses') return getExpenses(ctx.chatId, input as RangeInput);
  if (name === 'get_summary') return getSummary(ctx.chatId, input as RangeInput & {group_by: GroupBy});
  throw new Error(`Unknown tool: ${name}`);
}
