import { useMahjStore } from '../store';
import { passDirection, passTarget } from '../game/charleston';

const PASS_LABEL: Record<string, string> = {
  firstRight: 'First Charleston · Pass Right',
  firstAcross: 'First Charleston · Pass Across',
  firstLeft: 'First Charleston · Pass Left',
  secondLeft: 'Second Charleston · Pass Left',
  secondAcross: 'Second Charleston · Pass Across',
  secondRight: 'Second Charleston · Pass Right',
  courtesy: 'Courtesy Pass · East ↔ West, South ↔ North',
};

const eyebrowStyle: React.CSSProperties = {
  font: '600 11px var(--font-ui)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--gold)',
};

export function CharlestonUI(): React.ReactElement {
  const charleston = useMahjStore((s) => s.charleston);
  const selections = charleston.selections.east;
  const clearSelection = useMahjStore((s) => s.clearSelection);
  const submit = useMahjStore((s) => s.submitCharlestonSelection);
  const runBotsAll = useMahjStore((s) => s.runBotCharlestonForAll);
  const advance = useMahjStore((s) => s.advanceCharleston);
  const agreeSecond = useMahjStore((s) => s.agreeSecondCharleston);
  const setCourtesyOffer = useMahjStore((s) => s.setCourtesyOffer);
  const courtesyOffers = charleston.courtesyOffers;

  if (charleston.pass === null && charleston.secondCharlestonAgreed === null) {
    // Between first and second — bots agreed, waiting on the human.
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={eyebrowStyle}>Charleston</div>
        <div style={{ font: '600 13px var(--font-ui)', color: 'var(--felt-ink)' }}>
          First Charleston complete. Continue with a second Charleston?
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="btn btn-gold" onClick={() => agreeSecond(true)}>
            Yes, second Charleston
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => agreeSecond(false)}>
            No, skip to courtesy
          </button>
        </div>
      </div>
    );
  }
  if (charleston.pass === null && charleston.secondCharlestonAgreed === false) {
    return <></>;
  }

  const pass = charleston.pass;
  if (!pass) return <></>;

  const target = passTarget('east', pass);
  const direction = passDirection(pass);
  const isCourtesy = pass === 'courtesy';
  const requiredCount = isCourtesy ? courtesyOffers.east : 3;

  const canSubmit = isCourtesy
    ? selections.length === requiredCount
    : selections.length === 3;

  const doPass = () => {
    submit('east', selections);
    runBotsAll();
    // Give React a tick to flush selections before advancing.
    setTimeout(() => advance(), 0);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={eyebrowStyle}>{PASS_LABEL[pass]}</div>
      <div style={{ font: '600 13px var(--font-ui)', color: 'var(--felt-ink)' }}>
        Pass {direction} to {target.toUpperCase()} ·{' '}
        <span className="mono" style={{ color: 'var(--gold)' }}>
          {selections.length}/{requiredCount}
        </span>{' '}
        selected
      </div>

      {isCourtesy && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ font: '600 12px var(--font-ui)', color: 'var(--felt-ink-soft)' }}>
            Courtesy tiles:
          </span>
          {[0, 1, 2, 3].map((n) => (
            <button
              key={n}
              type="button"
              className={courtesyOffers.east === n ? 'btn btn-gold' : 'btn btn-ghost'}
              style={{ padding: '6px 12px' }}
              onClick={() => setCourtesyOffer('east', n)}
            >
              {n}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" className="btn btn-ghost" onClick={() => clearSelection('east')}>
          Clear
        </button>
        <button type="button" className="btn btn-gold" onClick={doPass} disabled={!canSubmit}>
          Pass {isCourtesy ? '' : 'tiles'}
        </button>
      </div>
    </div>
  );
}
