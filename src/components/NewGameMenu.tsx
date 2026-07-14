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
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          font: '600 13px var(--font-ui)',
          color: 'var(--ink-soft)',
        }}
      >
        Difficulty
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as Difficulty)}
          style={{
            font: '600 13px var(--font-ui)',
            padding: '7px 10px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--hairline)',
            background: 'var(--paper)',
            color: 'var(--ink)',
          }}
        >
          <option value="beginner">Beginner · no timer</option>
          <option value="intermediate">Intermediate · 5s</option>
          <option value="expert">Expert · 5s</option>
        </select>
      </label>
      <button
        type="button"
        className="btn btn-gold"
        onClick={() => {
          if (isMidGame && !confirm('Abandon the in-progress game?')) return;
          newGame(difficulty);
        }}
      >
        {isMidGame ? 'New Game' : 'Start Game'}
      </button>
    </div>
  );
}
