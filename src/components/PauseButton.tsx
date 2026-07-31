import { useMahjStore } from "../store";

// Header control to pause/resume play. Only relevant during the play phase (when
// bots take turns on a timer). Resume is also available on the board overlay.
export function PauseButton(): React.ReactElement | null {
  const phase = useMahjStore((s) => s.phase);
  const paused = useMahjStore((s) => s.paused);
  const pauseGame = useMahjStore((s) => s.pauseGame);
  const resumeGame = useMahjStore((s) => s.resumeGame);

  if (phase !== "play") return null;

  return (
    <button
      type="button"
      className={paused ? "btn btn-gold" : "btn btn-outline"}
      aria-pressed={paused}
      onClick={() => (paused ? resumeGame() : pauseGame())}
    >
      {paused ? "Resume ▶︎" : "Pause ⏸"}
    </button>
  );
}
