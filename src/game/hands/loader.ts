import { HandsFile } from './schema';
import type { HandsFile as HandsFileT, NMJLHand } from './schema';
import raw from './hands.json';

let cache: HandsFileT | null = null;

export function loadHands(): HandsFileT {
  if (cache) return cache;
  const parsed = HandsFile.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new Error(
      `hands.json failed schema validation at ${issue?.path.join('.') ?? '<root>'}: ${issue?.message ?? 'unknown error'}`,
    );
  }
  cache = parsed.data;
  return cache;
}

export function allHands(): NMJLHand[] {
  return loadHands().hands;
}

// Test-only helpers so tests can bypass the JSON cache with fixture data.
export function __setHandsCache(data: HandsFileT | null): void {
  cache = data;
}
