type Card = {
  title: string
  steps?: { n: number; text: string }[]
  bullets?: string[]
  note?: string
}

const CARDS: Card[] = [
  {
    title: "The Charleston",
    steps: [
      { n: 1, text: 'Right → Across ("Over") → Left (Compulsory)' },
      { n: 2, text: 'Left → Across ("Over") → Right (Optional)' },
      { n: 3, text: "Courtesy pass between opposites" },
    ],
    note: "NOTE: All users must agree on the second Charleston and you may never pass jokers.",
  },
  {
    title: "Calling a Tile",
    bullets: [
      'Click the "Call" button (or press "c" on your keyboard) before the timer runs out',
      "Only allowed for a pung, kong, or quint—never for a single or pair",
      "Exposure will go face-up on your rack, facing your opponents",
    ],
  },
  {
    title: "Jokers",
    bullets: [
      "Swap your matching tile for an exposed joker at the start of your turn by clicking on the joker, then clicking the tile on your rack",
      "Can replace any tile in a pung, kong, quint, or sextet",
      "May never replace for a single, pair, or NEWS/year set",
    ],
  },
  {
    title: "Getting Mahjong",
    bullets: [
      "Win by matching your hand to a line on the card",
      "Can be done by drawing or calling your 14th tile",
      "No winner means a “wall game” 😞",
      "Watch the rain",
    ],
  },
]

export function RulesPanel(): React.ReactElement {
  return (
    <section>
      <div className="eyebrow my-3">Rules &amp; Reference</div>

      <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(260px,1fr))]">
        {CARDS.map((card) => (
          <div key={card.title} className="card-surface p-[22px]">
            <div className="font-ui text-[15px] font-extrabold mb-[14px]">
              {card.title}
            </div>
            <div className="flex flex-col gap-2">
              {card.steps?.map((s) => (
                <div key={s.n} className="flex items-center gap-2.5">
                  <span className="flex-none w-5 h-5 rounded-full bg-label-blue text-white flex items-center justify-center font-ui text-[11px] font-bold">
                    {s.n}
                  </span>
                  <span className="font-ui text-[13px] font-semibold text-[oklch(0.35_0.01_260)]">
                    {s.text}
                  </span>
                </div>
              ))}
              {card.bullets?.map((b, i) => (
                <div
                  key={i}
                  className="flex gap-2 font-ui text-[13px] font-semibold text-[oklch(0.35_0.01_260)]"
                >
                  <span className="text-gold">•</span>
                  <span>{b}</span>
                </div>
              ))}
            </div>
            {card.note && (
              <div className="font-ui text-[12px] font-medium text-ink-faint mt-3">
                {card.note}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
