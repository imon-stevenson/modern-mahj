type Card = {
  title: string;
  steps?: { n: number; text: string }[];
  bullets?: string[];
  note?: string;
};

const CARDS: Card[] = [
  {
    title: 'The Charleston',
    steps: [
      { n: 1, text: 'Right → Across → Left (required)' },
      { n: 2, text: 'Left → Across → Right (optional)' },
      { n: 3, text: 'Courtesy pass between opposites' },
    ],
    note: 'Never pass jokers. Remember: R-O-L (L-O-R).',
  },
  {
    title: 'Calling a tile',
    bullets: [
      'Only for a pung, kong, or quint',
      'Never for a single or pair — except the final tile for Mahjong',
      'Call before the next player draws',
      'Your exposure goes face-up on the rack',
    ],
  },
  {
    title: 'The Joker',
    bullets: [
      'Replaces any tile in a pung, kong, or quint',
      'Never for a single, pair, or NEWS / year set',
      'Swap your matching tile for an exposed joker at the start of your turn',
      'A discarded joker is dead — no one may pick it up',
    ],
  },
  {
    title: 'Getting Mahjong',
    bullets: [
      'A winning hand is 14 tiles',
      'Win by drawing or by calling the final discard',
      'Declare “Mahjong!” and expose the full hand',
      'No winner means a “wall game”',
    ],
  },
  {
    title: 'Dead hands',
    bullets: [
      'Wrong tile count, or wrong exposure count',
      'Drew or discarded out of turn',
      'Exposed jokers stay tradeable after a hand dies',
    ],
  },
];

export function RulesPanel(): React.ReactElement {
  return (
    <section>
      <div className="eyebrow" style={{ marginBottom: 6 }}>
        Rules &amp; Reference
      </div>
      <h2 style={{ font: '800 22px var(--font-ui)', marginBottom: 4 }}>Quick reference</h2>
      <p style={{ font: '500 14px var(--font-ui)', color: 'var(--ink-soft)', margin: '0 0 20px' }}>
        For the moments new players pause the game.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 16,
        }}
      >
        {CARDS.map((card) => (
          <div key={card.title} className="card-surface" style={{ padding: 22 }}>
            <div style={{ font: '800 15px var(--font-ui)', marginBottom: 14 }}>{card.title}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {card.steps?.map((s) => (
                <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    style={{
                      flex: '0 0 auto',
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: 'var(--label-blue)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      font: '700 11px var(--font-ui)',
                    }}
                  >
                    {s.n}
                  </span>
                  <span style={{ font: '600 13px var(--font-ui)', color: 'oklch(0.35 0.01 260)' }}>
                    {s.text}
                  </span>
                </div>
              ))}
              {card.bullets?.map((b, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    gap: 8,
                    font: '600 13px var(--font-ui)',
                    color: 'oklch(0.35 0.01 260)',
                  }}
                >
                  <span style={{ color: 'var(--gold)' }}>•</span>
                  <span>{b}</span>
                </div>
              ))}
            </div>
            {card.note && (
              <div style={{ font: '500 12px var(--font-ui)', color: 'var(--ink-faint)', marginTop: 12 }}>
                {card.note}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
