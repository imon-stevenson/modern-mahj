import { useState } from "react"
import { Board } from "./components/Board"
import { NewGameMenu } from "./components/NewGameMenu"
import { RulesPanel } from "./components/RulesPanel"
import { CardDrawer } from "./components/CardDrawer"
import { RotateNudge } from "./components/RotateNudge"
import { EmojiRain } from "./components/EmojiRain"
import { PauseButton } from "./components/PauseButton"
import { useBotTurns } from "./hooks/useBotTurns"
import { useAutoHideHeader } from "./hooks/useAutoHideHeader"
import { useIsDesktop } from "./hooks/useIsDesktop"

export default function App(): React.ReactElement {
  useBotTurns()
  const [cardOpen, setCardOpen] = useState(false)
  const headerHidden = useAutoHideHeader()
  const isDesktop = useIsDesktop()

  return (
    <div className="min-h-screen bg-ivory">
      <header
        id="app-header"
        className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 bg-paper border-b border-solid border-hairline py-2 px-[clamp(16px,4vw,40px)] transition-transform duration-[240ms] ease-[ease] will-change-transform"
        // Auto-hide on scroll down, reveal on scroll up (always shown at top).
        style={{
          transform: headerHidden ? "translateY(-100%)" : "translateY(0)",
        }}
      >
        <div className="font-ui text-[18px] font-extrabold tracking-[-0.01em]">
          My <span className="text-label-blue">· Modern Mahj</span>
        </div>
        <div className="flex items-center gap-3">
          <PauseButton />
          <NewGameMenu />
        </div>
      </header>

      <main
        className="max-w-[1240px] mx-auto flex flex-col gap-8 p-[clamp(16px,3vw,32px)]"
        style={{ paddingTop: isDesktop ? 64 : 32 }}
      >
        <Board />

        <RulesPanel />
      </main>

      <CardDrawer
        open={cardOpen}
        onOpen={() => setCardOpen(true)}
        onClose={() => setCardOpen(false)}
      />

      <RotateNudge />
      <EmojiRain />
    </div>
  )
}
