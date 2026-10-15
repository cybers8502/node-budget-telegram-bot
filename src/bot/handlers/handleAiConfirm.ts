import type {Bot} from 'grammy';
import {BUDGET_ID} from '../../configs/consts';
import type {UserState} from '../../types';
import {saveExpense} from '../../utils/firebaseUtility';
import {clearUserState} from '../userState';

// `ai:yes` | `ai:no` callbacks for an expense drafted by /ai
export default async function handleAiConfirm(
  bot: Bot,
  chatId: number,
  action: string,
  state: UserState | null,
) {
  if (state?.step !== 'ai_confirm' || !state.expense) {
    await bot.api.sendMessage(chatId, 'Немає запису для підтвердження. Спробуйте /ai ще раз.');
    return;
  }

  await clearUserState(chatId);

  if (action !== 'yes') {
    await bot.api.sendMessage(chatId, 'Скасовано, запис не створено.');
    return;
  }

  await saveExpense({budgetId: BUDGET_ID, userId: chatId.toString(), data: state.expense});
  const {sum, category, note} = state.expense;
  await bot.api.sendMessage(chatId, `Запис створено: ${sum} грн · ${category}${note ? ` · ${note}` : ''}`);
}
