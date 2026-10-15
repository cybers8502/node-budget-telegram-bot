import {evalArithmetic} from '../utils/evalArithmetic';
import banks from './banks';
import categories from './categories';

export interface QuickEntry {
  sum: number;
  category?: string;
  bank?: string;
  note: string;
}

const MAX_NOTE_LENGTH = 100;

// Extra words (lowercase) that map to a category/bank; names themselves always match
const categoryAliases: Record<string, string[]> = {
  Їжа: ['продукти', 'супермаркет', 'магазин'],
  'Дім/Ремонт': ['дім', 'ремонт'],
  Авто: ['бензин', 'заправка', 'пальне', 'мийка'],
  Кафе: ['ресторан', 'кава', 'кофе'],
  Медецина: ['аптека', 'ліки', 'лікар', 'медицина'],
  Проїзд: ['таксі', 'метро', 'маршрутка', 'автобус'],
  'Обслуговування кредиту': ['кредит'],
  ЖКХ: ['комуналка', 'комуналні'],
  Підписка: ['підписки'],
  Дохід: ['зарплата', 'зп', 'аванс'],
};

const bankAliases: Record<string, string[]> = {
  Моно: ['mono', 'monobank'],
  'А-банк': ['абанк', 'a-bank', 'abank'],
  Готівка: ['кеш', 'cash', 'нал'],
};

function findOption(word: string, options: string[], aliases: Record<string, string[]>, prefix: boolean) {
  const w = word.toLowerCase();
  return options.find((option) => {
    const name = option.toLowerCase();
    if (name === w || aliases[option]?.includes(w)) return true;
    return prefix && w.length >= 3 && name.startsWith(w);
  });
}

function parseSum(text: string): {sum: number; rest: string} | null {
  const lead = /^[\d.+\-*/()\s]+/.exec(text)?.[0];
  if (!lead) return null;

  // "50 + 30 їжа" evaluates the whole leading expression; "100 2 кави" falls back to its first token
  const firstToken = text.split(/\s+/)[0];
  for (const candidate of [lead.trim(), firstToken]) {
    const sum = evalArithmetic(candidate);
    if (sum !== null && sum > 0)
      return {
        sum,
        rest: text.slice(text.indexOf(candidate) + candidate.length).trim(),
      };
  }
  return null;
}

// "250 продукти моно сільпо" -> {sum: 250, category: 'Їжа', bank: 'Моно', note: 'сільпо'}
export function parseQuickInput(text: string): QuickEntry | null {
  const parsed = parseSum(text.trim());
  if (!parsed) return null;

  const words = parsed.rest.split(/\s+/).filter(Boolean);
  let category: string | undefined;
  let bank: string | undefined;
  const noteWords: string[] = [];

  for (const word of words) {
    if (!category) {
      const found = findOption(word, categories, categoryAliases, true);
      if (found) {
        category = found;
        continue;
      }
    }
    if (!bank) {
      const found = findOption(word, banks, bankAliases, false);
      if (found) {
        bank = found;
        continue;
      }
    }
    noteWords.push(word);
  }

  return {
    sum: parsed.sum,
    category,
    bank,
    note: noteWords.join(' ').slice(0, MAX_NOTE_LENGTH),
  };
}
