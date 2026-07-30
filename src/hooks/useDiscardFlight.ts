import { useEffect, useRef } from 'react';
import { useMahjStore } from '../store';
import { flyDiscard } from '../store/discardFlight';

// Watches for new discards and floats the discarded tile from the discarding
// player's seat to the pile. Fires once per discard; ignores the pile shrinking
// (a tile claimed by a call) so it never re-animates.
export function useDiscardFlight(): void {
  const discards = useMahjStore((s) => s.discards);
  const lastAction = useMahjStore((s) => s.lastAction);
  const lastFiredId = useRef<string | null>(null);

  useEffect(() => {
    const newest = discards[discards.length - 1];
    if (!newest) {
      lastFiredId.current = null;
      return;
    }
    if (newest.id === lastFiredId.current) return;
    lastFiredId.current = newest.id;
    // Only animate when the most recent action was actually this discard.
    if (lastAction?.kind === 'discard' && lastAction.tileId === newest.id) {
      flyDiscard(lastAction.seat, newest);
    }
  }, [discards, lastAction]);
}
