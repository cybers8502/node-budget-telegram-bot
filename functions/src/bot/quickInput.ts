import type {ForeignCurrency} from '../utils/currency';
import {evalArithmetic} from '../utils/evalArithmetic';
import banks from './banks';
import categories from './categories';

export interface QuickEntry {
  sum: number;
  category?: string;
  bank?: string;
  note: string;
  currency?: ForeignCurrency; // the sum is in this currency, not in UAH
}

const MAX_NOTE_LENGTH = 100;

// Extra words (lowercase) that map to a category/bank; names themselves always match
const categoryAliases: Record<string, string[]> = {
  Їжа: ['продукти', 'супермаркет', 'магазин'],
  Дім: ['побут', 'миючі'],
  Авто: ['мийка', 'сервіс'],
  Пальне: ['бензин', 'бенз', 'заправка'],
  Кафе: ['ресторан', 'кава', 'кофе'],
  Медицина: ['медецина', 'аптека', 'ліки', 'лікар'],
  Проїзд: ['таксі', 'метро', 'маршрутка', 'автобус'],
  Кредити: ['кредит'],
  ЖКХ: ['комуналка', 'комуналні'],
  "Підписки і зв'язок": ['підписка', 'підписки', 'інтернет', 'мобільний'],
  Проєкти: ['хостинг', 'домен'],
  Освіта: ['курси', 'навчання'],
  Дохід: ['зарплата', 'зп', 'аванс'],
};

const currencyWords: Record<ForeignCurrency, string[]> = {
  USD: ['usd', '$', 'долар', 'долара', 'доларів', 'дол'],
  EUR: ['eur', '€', 'євро'],
};

function findCurrency(word: string): ForeignCurrency | undefined {
  const w = word.toLowerCase();
  return (Object.keys(currencyWords) as ForeignCurrency[]).find((c) => currencyWords[c].includes(w));
}

const bankAliases: Record<string, string[]> = {
  Моно: ['mono', 'monobank'],
  'А-банк': ['абанк', 'a-bank', 'abank'],
  Готівка: ['кеш', 'cash', 'нал'],
};

export function matchCategory(word: string): string | undefined {
  return findOption(word, categories, categoryAliases, true);
}

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
  // "20$ кафе" and "20usd кафе": split the glued currency off the amount
  const spaced = text.trim().replace(/^([\d.+\-*/()\s]*\d)\s*(\$|€|usd|eur)(?![\p{L}])/iu, '$1 $2 ');
  const parsed = parseSum(spaced);
  if (!parsed) return null;

  const words = parsed.rest.split(/\s+/).filter(Boolean);
  let category: string | undefined;
  let bank: string | undefined;
  let currency: ForeignCurrency | undefined;
  const noteWords: string[] = [];

  for (const word of words) {
    if (!currency) {
      const found = findCurrency(word);
      if (found) {
        currency = found;
        continue;
      }
    }
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
    currency,
  };
}
