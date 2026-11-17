/** شجرة بطولة إقصائية: دوال خالصة قابلة للاختبار. */

export type BracketMatch = { round: number; slot: number; clubA: string | null; clubB: string | null };

export function bracketSize(teams: number): number {
  let size = 2;
  while (size < teams) size *= 2;
  return size;
}

/** يخلط القائمة (Fisher-Yates) بمولّد عشوائي قابل للاستبدال في الاختبار. */
export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * يبني كل مباريات الأدوار. الفرق الزائدة عن القوة الأقرب لـ2 تُمنح "باي" (تتأهل مباشرة)،
 * وكل باي في مباراة مختلفة حتى لا تتقابل فرقتان بلا خصم.
 */
export function buildBracket(clubIds: string[], rng: () => number = Math.random): BracketMatch[] {
  const size = bracketSize(clubIds.length);
  const teams = shuffle(clubIds, rng);
  const firstRoundMatches = size / 2;
  const byes = size - teams.length;
  const matches: BracketMatch[] = [];
  let cursor = 0;
  for (let slot = 0; slot < firstRoundMatches; slot++) {
    if (slot < byes) {
      matches.push({ round: 1, slot, clubA: teams[cursor++], clubB: null });
    } else {
      matches.push({ round: 1, slot, clubA: teams[cursor++], clubB: teams[cursor++] });
    }
  }
  for (let round = 2, count = firstRoundMatches / 2; count >= 1; round++, count /= 2) {
    for (let slot = 0; slot < count; slot++) matches.push({ round, slot, clubA: null, clubB: null });
  }
  return matches;
}

export function totalRounds(size: number): number {
  return Math.round(Math.log2(size));
}

/** أين يذهب الفائز: المباراة التالية وأي خانة. */
export function nextPosition(slot: number): { slot: number; side: "a" | "b" } {
  return { slot: Math.floor(slot / 2), side: slot % 2 === 0 ? "a" : "b" };
}

export const MAX_TEAMS_OPTIONS = [4, 8, 16] as const;
export const MIN_TEAMS_TO_START = 4;
