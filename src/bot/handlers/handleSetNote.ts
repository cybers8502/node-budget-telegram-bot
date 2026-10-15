import type {Bot} from 'grammy';
import type {UserState} from '../../types';
import saveNewExpense from './saveNewExpense';

export default function handleSetNote(bot: Bot, chatId: number, text: string, state: UserState) {
  return saveNewExpense(bot, chatId, state, text);
}
