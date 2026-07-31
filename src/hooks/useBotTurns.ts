import { useEffect } from 'react';
import { useMahjStore } from '../store';

// How long a bot "thinks" before playing its turn. Randomized per turn so the
// table feels human rather than mechanical. UI timing only — no game logic
// depends on this, so plain Math.random() is fine (no seeded determinism).
const BOT_THINK_MIN_MS = 2000;
const BOT_THINK_MAX_MS = 5000;

function botThinkDelay(): number {
  return BOT_THINK_MIN_MS + Math.random() * (BOT_THINK_MAX_MS - BOT_THINK_MIN_MS);
}

// Drives bot turns during play. Whenever it becomes a bot's turn and there is no
// pending call, we schedule that bot's turn after a randomized "thinking" pause.
export function useBotTurns(): void {
  const phase = useMahjStore((s) => s.phase);
  const currentSeat = useMahjStore((s) => s.currentSeat);
  const awaitingCall = useMahjStore((s) => s.awaitingCall);
  const players = useMahjStore((s) => s.players);
  const paused = useMahjStore((s) => s.paused);
  const runBotTurn = useMahjStore((s) => s.runBotTurn);

  useEffect(() => {
    if (phase !== 'play') return;
    if (paused) return;
    if (awaitingCall) return;
    if (!players[currentSeat].isBot) return;
    const timer = setTimeout(() => runBotTurn(currentSeat), botThinkDelay());
    return () => clearTimeout(timer);
  }, [phase, currentSeat, awaitingCall, players, paused, runBotTurn]);
}
