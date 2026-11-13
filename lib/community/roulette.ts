/**
 * Coffee Roulette matching (pure, deterministic with a seed, unit-tested).
 *
 * - Only opted-in participants take part (opt-outs are respected by the caller's input and here).
 * - Nobody is matched with themselves or with someone they met in the last 8 weeks.
 * - Complementary pairs score higher: shared goals (something to talk about) plus skills the other
 *   does not have (something to learn).
 * - An odd participant joins the best pair as a trio (no repeats with either); if no valid group
 *   exists for someone, they stay unmatched this week rather than breaking a rule.
 */
export const NO_REPEAT_DAYS = 56;

export type Participant = {
  id: string;
  optedIn: boolean;
  goals: readonly string[];
  skills: readonly string[];
  /** Member Plus perk: placed first, so priority members are matched before anyone else. */
  priority?: boolean;
};
export type PastMatch = { members: readonly string[]; at: Date };
export type MatchResult = { groups: string[][]; unmatched: string[] };

/** mulberry32 PRNG seeded from a string (FNV-1a hash): same seed, same week → same matches. */
export function seededRandom(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/** Higher is better: 2 per shared goal, +1 for each side bringing a skill the other lacks. */
export function complementScore(a: Participant, b: Participant): number {
  const shared = a.goals.filter((g) => b.goals.includes(g)).length;
  const aBrings = a.skills.some((s) => !b.skills.includes(s)) ? 1 : 0;
  const bBrings = b.skills.some((s) => !a.skills.includes(s)) ? 1 : 0;
  return shared * 2 + aBrings + bBrings;
}

export function matchParticipants(
  participants: readonly Participant[],
  history: readonly PastMatch[],
  seed: string,
  now: Date = new Date(),
): MatchResult {
  const cutoff = now.getTime() - NO_REPEAT_DAYS * 86_400_000;
  const recent = new Set<string>();
  for (const past of history) {
    if (past.at.getTime() < cutoff) continue;
    for (const a of past.members)
      for (const b of past.members) if (a !== b) recent.add(pairKey(a, b));
  }
  const unique = [...new Map(participants.filter((p) => p.optedIn).map((p) => [p.id, p])).values()];
  const shuffled = shuffle(unique, seededRandom(seed));
  const order = [...shuffled.filter((p) => p.priority), ...shuffled.filter((p) => !p.priority)];
  const free = new Set(order.map((p) => p.id));
  const byId = new Map(order.map((p) => [p.id, p]));
  const groups: string[][] = [];
  const unmatched: string[] = [];

  for (const person of order) {
    if (!free.has(person.id)) continue;
    free.delete(person.id);
    let best: Participant | null = null;
    let bestScore = -1;
    for (const id of free) {
      if (recent.has(pairKey(person.id, id))) continue;
      const score = complementScore(person, byId.get(id)!);
      if (score > bestScore) {
        best = byId.get(id)!;
        bestScore = score;
      }
    }
    if (best) {
      free.delete(best.id);
      groups.push([person.id, best.id]);
    } else {
      unmatched.push(person.id);
    }
  }

  // Odd one out (or anyone left without a partner): join the best pair as a trio, no repeats.
  for (const id of [...unmatched]) {
    let bestGroup: string[] | null = null;
    let bestScore = -1;
    for (const group of groups) {
      if (group.length !== 2 || group.some((m) => recent.has(pairKey(m, id)))) continue;
      const score = group.reduce((sum, m) => sum + complementScore(byId.get(m)!, byId.get(id)!), 0);
      if (score > bestScore) {
        bestGroup = group;
        bestScore = score;
      }
    }
    if (bestGroup) {
      bestGroup.push(id);
      unmatched.splice(unmatched.indexOf(id), 1);
    }
  }
  return { groups, unmatched };
}

/** Monday 00:00 UTC of the week containing `date` (rounds are weekly). */
export function weekStart(date: Date): Date {
  const day = (date.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - day));
}
