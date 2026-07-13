// Mulberry32 — small, deterministic 32-bit PRNG. Good enough for shuffling
// game state; makes tests reproducible when we seed it.

export type Rng = {
  seed: number;
  next: () => number; // 0 <= x < 1
  nextInt: (maxExclusive: number) => number;
  pick: <T>(items: readonly T[]) => T;
};

export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const nextInt = (maxExclusive: number): number => Math.floor(next() * maxExclusive);
  const pick = <T,>(items: readonly T[]): T => items[nextInt(items.length)]!;
  return { seed, next, nextInt, pick };
}

export function shuffleInPlace<T>(arr: T[], rng: Rng): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rng.nextInt(i + 1);
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}
