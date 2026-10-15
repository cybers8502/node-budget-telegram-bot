import {InlineKeyboard} from 'grammy';
import banks from './banks';
import categories from './categories';

function optionsKeyboard(options: string[], prefix: string): InlineKeyboard {
  const kb = new InlineKeyboard();
  options.forEach((option, i) => {
    kb.text(option, `${prefix}:${i}`);
    if (i % 2 === 1) kb.row();
  });
  if (options.length % 2 !== 0) kb.row();
  return kb;
}

export const categoryKeyboard = () => optionsKeyboard(categories, 'cat');

export const bankKeyboard = () => optionsKeyboard(banks, 'bank');

export function editChooseKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('Суму', 'edit:1')
    .text('Категорію', 'edit:2')
    .row()
    .text('Банк', 'edit:4')
    .text('Нотатку', 'edit:3');
}
