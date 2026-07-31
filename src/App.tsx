import { useState } from "react";
import { Board } from "./components/Board";
import { NewGameMenu } from "./components/NewGameMenu";
import { RulesPanel } from "./components/RulesPanel";
import { CardDrawer } from "./components/CardDrawer";
import { RotateNudge } from "./components/RotateNudge";
import { EmojiRain } from "./components/EmojiRain";
import { PauseButton } from "./components/PauseButton";
import { useBotTurns } from "./hooks/useBotTurns";
import { useAutoHideHeader } from "./hooks/useAutoHideHeader";

export default function App(): React.ReactElement {
  useBotTurns();
  const [cardOpen, setCardOpen] = useState(false);
  const headerHidden = useAutoHideHeader();
  return (
    <div style={{ minHeight: "100vh", background: "var(--ivory)" }}>
      <header
        id="app-header"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: "var(--paper)",
          borderBottom: "1px solid var(--hairline)",
          padding: "14px clamp(16px, 4vw, 40px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          // Auto-hide on scroll down, reveal on scroll up (always shown at top).
          transform: headerHidden ? "translateY(-100%)" : "translateY(0)",
          transition: "transform 240ms ease",
          willChange: "transform",
        }}
      >
        <div
          style={{ font: "800 18px var(--font-ui)", letterSpacing: "-0.01em" }}
        >
          My <span style={{ color: "var(--label-blue)" }}>· Modern Mahj</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <PauseButton />
          <NewGameMenu />
        </div>
      </header>

      <main
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          padding: "clamp(16px, 3vw, 32px)",
          display: "flex",
          flexDirection: "column",
          gap: 32,
        }}
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
  );
}
