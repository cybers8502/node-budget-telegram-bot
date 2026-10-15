import {formatKyivIso} from './date';

export type ForeignCurrency = 'USD' | 'EUR';

const RATE_TIMEOUT_MS = 5000;
const cache = new Map<string, number>();

// Official NBU rate (UAH per 1 unit), cached per Kyiv day; null when NBU is unreachable
export async function getUahRate(currency: ForeignCurrency): Promise<number | null> {
  const key = `${currency}:${formatKyivIso(new Date())}`;
  const cached = cache.get(key);
  if (cached) return cached;

  try {
    const res = await fetch(
      `https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=${currency}&json`,
      {
        signal: AbortSignal.timeout(RATE_TIMEOUT_MS),
      },
    );
    const [item] = (await res.json()) as {rate?: number}[];
    if (!item?.rate || !Number.isFinite(item.rate) || item.rate <= 0) return null;
    cache.set(key, item.rate);
    return item.rate;
  } catch (err) {
    console.error('NBU rate request failed:', err);
    return null;
  }
}

export function toUah(amount: number, rate: number): number {
  return Math.round(amount * rate * 100) / 100;
}
