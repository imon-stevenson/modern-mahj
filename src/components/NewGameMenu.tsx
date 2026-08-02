import { useState } from "react"
import { useMahjStore } from "../store"
import type { Difficulty } from "../game/types"

export function NewGameMenu(): React.ReactElement {
  const currentDifficulty = useMahjStore((s) => s.difficulty)
  const phase = useMahjStore((s) => s.phase)
  const requestNewGame = useMahjStore((s) => s.requestNewGame)
  const [difficulty, setDifficulty] = useState<Difficulty>(currentDifficulty)

  const isMidGame = phase === "charleston" || phase === "play"

  return (
    <div className="flex items-center gap-3">
      <label className="flex items-center gap-2 font-ui text-[13px] font-semibold text-ink-soft">
        Difficulty
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as Difficulty)}
          className="font-ui text-[13px] font-semibold rounded-sm border border-solid border-hairline bg-paper text-ink px-2.5 py-[7px]"
        >
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="expert">Expert</option>
        </select>
      </label>
      <button
        type="button"
        className="btn btn-gold"
        onClick={() => {
          if (isMidGame && !confirm("Abandon the in-progress game?")) return
          requestNewGame(difficulty)
        }}
      >
        {isMidGame ? "New Game" : "Start Game"}
      </button>
    </div>
  )
}
