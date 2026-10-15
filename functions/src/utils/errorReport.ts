const MAX_REPORT_LENGTH = 600;

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

// Context plus the error text only: no stack and no user data, it goes to a chat
export function formatErrorReport(context: string, err: unknown): string {
  return `⚠️ ${context}\n${errorMessage(err)}`.slice(0, MAX_REPORT_LENGTH);
}

// Lets a key through once per window, so one failing loop cannot flood the admin chat
export function createThrottle(windowMs: number) {
  const last = new Map<string, number>();
  return (key: string, now: number = Date.now()): boolean => {
    const previous = last.get(key);
    if (previous !== undefined && now - previous < windowMs) return false;
    last.set(key, now);
    return true;
  };
}

// ADMIN_TG_ID, or the first allowed user when it is not set (a personal bot has one owner)
export function pickAdminId(adminId: string | undefined, allowedUsers: string | undefined): number | null {
  const candidate = adminId?.trim() || (allowedUsers ?? '').split(',')[0]?.trim();
  const id = Number(candidate);
  return candidate && Number.isInteger(id) ? id : null;
}
