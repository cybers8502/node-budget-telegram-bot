import {InlineKeyboard} from 'grammy';
import banks from './banks';
import categories from './categories';
import type {Expense} from '../types';

function optionsKeyboard(options: string[], prefix: string): InlineKeyboard {
  const kb = new InlineKeyboard();
  options.forEach((option, i) => {
    kb.text(option, `${prefix}:${i}`);
    if (i % 2 === 1) kb.row();
  });
  if (options.length % 2 !== 0) kb.row();
  return kb.text('Скасувати', 'flow:cancel');
}

export const categoryKeyboard = () => optionsKeyboard(categories, 'cat');

export const bankKeyboard = () => optionsKeyboard(banks, 'bank');

export const noteKeyboard = () =>
  new InlineKeyboard().text('Пропустити', 'flow:skip').text('Скасувати', 'flow:cancel');

export function editChooseKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('Суму', 'edit:1')
    .text('Категорію', 'edit:2')
    .row()
    .text('Банк', 'edit:4')
    .text('Нотатку', 'edit:3')
    .row()
    .text('🗑 Видалити запис', 'del:ask');
}

export function deleteConfirmKeyboard(): InlineKeyboard {
  return new InlineKeyboard().text('Так, видалити', 'del:yes').text('Скасувати', 'del:no');
}

export function aiConfirmKeyboard(): InlineKeyboard {
  return new InlineKeyboard().text('Так, записати', 'ai:yes').text('Скасувати', 'ai:no');
}

export function recentExpensesKeyboard(expenses: Expense[]): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const e of expenses) {
    const label = [`${Math.abs(e.sum)}`, e.category, e.note].filter(Boolean).join(' · ');
    kb.text(label.slice(0, 60), `rec:${e.id}`).row();
  }
  return kb;
}
