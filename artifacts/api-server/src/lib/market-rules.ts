// قواعد سوق الانتقالات والمحفظة (دوال خالصة قابلة للاختبار بدون قاعدة بيانات).

export const PLAYER_START_BALANCE = 100_000;
export const CLUB_START_BUDGET = 10_000_000;
export const MAX_PRICE = 2_000_000_000;
/** حصة اللاعب من مبلغ الصفقة، والباقي للنادي الذي كان يلعب معه. */
export const PLAYER_SHARE_PERCENT = 70;

export function parsePrice(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isInteger(n) || n < 1 || n > MAX_PRICE) return null;
  return n;
}

export type SaleSplit = { playerShare: number; clubShare: number };

/**
 * يوزّع مبلغ الصفقة: 70% للاعب و30% لناديه السابق.
 * اللاعب الحر (بلا نادٍ سابق) يأخذ المبلغ كاملًا. المجموع دائمًا يساوي السعر تمامًا.
 */
export function splitSale(price: number, hasPreviousClub: boolean): SaleSplit {
  if (!hasPreviousClub) return { playerShare: price, clubShare: 0 };
  const playerShare = Math.floor((price * PLAYER_SHARE_PERCENT) / 100);
  return { playerShare, clubShare: price - playerShare };
}
