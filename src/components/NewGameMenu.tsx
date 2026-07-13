import { useState } from 'react';
import { useMahjStore } from '../store';
import type { Difficulty } from '../game/types';

export function NewGameMenu(): React.ReactElement {
  const currentDifficulty = useMahjStore((s) => s.difficulty);
  const phase = useMahjStore((s) => s.phase);
  const newGame = useMahjStore((s) => s.newGame);
  const [difficulty, setDifficulty] = useState<Difficulty>(currentDifficulty);

  const isMidGame = phase === 'charleston' || phase === 'play';

  return (
    <div style={{ border: '1px solid #333', padding: 8, margin: 4 }}>
      <div>
        <strong>New Game</strong>
      </div>
      <label>
        Difficulty:{' '}
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as Difficulty)}
        >
          <option value="beginner">Beginner (no call timer)</option>
          <option value="intermediate">Intermediate (5s call timer)</option>
          <option value="expert">Expert (5s call timer)</option>
        </select>
      </label>
      <button
        type="button"
        onClick={() => {
          if (isMidGame && !confirm('Abandon the in-progress game?')) return;
          newGame(difficulty);
        }}
      >
        Start
      </button>
    </div>
  );
}
