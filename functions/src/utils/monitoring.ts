import {bot} from '../configs/telegramConfig';
import {createThrottle, errorMessage, formatErrorReport, pickAdminId} from './errorReport';

const THROTTLE_MS = 10 * 60 * 1000;
const allow = createThrottle(THROTTLE_MS);

export const adminChatId = () => pickAdminId(process.env.ADMIN_TG_ID, process.env.ALLOWED_TG_USERS);

// Logs the error and tells the admin in Telegram (same error at most once per 10 minutes per instance)
export async function reportError(context: string, err: unknown): Promise<void> {
  console.error(context, err);

  const admin = adminChatId();
  if (admin === null || !allow(`${context}:${errorMessage(err).slice(0, 80)}`)) return;

  try {
    await bot.api.sendMessage(admin, formatErrorReport(context, err));
  } catch (sendErr) {
    console.error('Admin notification failed:', sendErr);
  }
}
