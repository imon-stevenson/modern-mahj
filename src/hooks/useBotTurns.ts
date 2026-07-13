import { useEffect } from 'react';
import { useMahjStore } from '../store';

// Drives bot turns during play. Whenever it becomes a bot's turn and there is
// no pending call, we schedule that bot's turn after `botDelayMs`. The delay
// gives the human time to see the previous action.
export function useBotTurns(): void {
  const phase = useMahjStore((s) => s.phase);
  const currentSeat = useMahjStore((s) => s.currentSeat);
  const awaitingCall = useMahjStore((s) => s.awaitingCall);
  const players = useMahjStore((s) => s.players);
  const botDelayMs = useMahjStore((s) => s.botDelayMs);
  const runBotTurn = useMahjStore((s) => s.runBotTurn);

  useEffect(() => {
    if (phase !== 'play') return;
    if (awaitingCall) return;
    if (!players[currentSeat].isBot) return;
    const timer = setTimeout(() => runBotTurn(currentSeat), botDelayMs);
    return () => clearTimeout(timer);
  }, [phase, currentSeat, awaitingCall, players, botDelayMs, runBotTurn]);
}
