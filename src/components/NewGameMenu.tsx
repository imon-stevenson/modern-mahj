import { useMahjStore } from "../store"

export function NewGameMenu(): React.ReactElement {
  const phase = useMahjStore((s) => s.phase)
  const requestNewGame = useMahjStore((s) => s.requestNewGame)

  const isMidGame = phase === "charleston" || phase === "play"

  return (
    <button
      type="button"
      className="btn btn-gold"
      onClick={() => {
        if (isMidGame && !confirm("Abandon the in-progress game?")) return
        requestNewGame()
      }}
    >
      {isMidGame ? "New Game" : "Start Game"}
    </button>
  )
}
