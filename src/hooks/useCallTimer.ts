import { useEffect, useState } from 'react';
import { useMahjStore } from '../store';

// Ticks a live "seconds remaining" for the call prompt, and auto-passes when
// the deadline expires. If the call has no deadline (beginner mode), this is
// effectively inert.
export function useCallTimer(): number | null {
  const awaitingCall = useMahjStore((s) => s.awaitingCall);
  const passCall = useMahjStore((s) => s.passCall);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!awaitingCall?.deadline) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [awaitingCall?.deadline]);

  useEffect(() => {
    if (!awaitingCall?.deadline) return;
    if (now >= awaitingCall.deadline) passCall();
  }, [now, awaitingCall?.deadline, passCall]);

  if (!awaitingCall?.deadline) return null;
  return Math.max(0, Math.ceil((awaitingCall.deadline - now) / 1000));
}
