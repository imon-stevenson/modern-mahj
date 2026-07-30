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

const bodyStyle: React.CSSProperties = {
  font: '600 13px var(--font-ui)',
  color: 'var(--felt-ink)',
};

const plural = (n: number) => (n === 1 ? 'tile' : 'tiles');

export function CharlestonUI(): React.ReactElement {
  const charleston = useMahjStore((s) => s.charleston);
  const selections = charleston.selections.east;
  const clearSelection = useMahjStore((s) => s.clearSelection);
  const submit = useMahjStore((s) => s.submitCharlestonSelection);
  const runBotsAll = useMahjStore((s) => s.runBotCharlestonForAll);
  const advance = useMahjStore((s) => s.advanceCharleston);
  const agreeSecond = useMahjStore((s) => s.agreeSecondCharleston);
  const setCourtesyOffer = useMahjStore((s) => s.setCourtesyOffer);
  const proposeCourtesy = useMahjStore((s) => s.proposeCourtesyCount);
  const confirmCourtesy = useMahjStore((s) => s.confirmCourtesy);
  const courtesyOffers = charleston.courtesyOffers;

  if (charleston.pass === null && charleston.secondCharlestonAgreed === null) {
    // Between first and second — bots agreed, waiting on the human.
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={eyebrowStyle}>Charleston</div>
        <div style={bodyStyle}>First Charleston complete. Continue with a second Charleston?</div>
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
    // A computer player declined the optional second Charleston. Per the rules
    // it only takes one decline to skip it — make that clear to the human.
    const decliners = charleston.secondDecliners ?? [];
    const names = decliners.map((seat) => seat[0]!.toUpperCase() + seat.slice(1));
    const who =
      names.length === 0
        ? 'A computer player'
        : names.length === 1
          ? names[0]!
          : names.length === 2
            ? `${names[0]} and ${names[1]}`
            : `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={eyebrowStyle}>Charleston</div>
        <div style={bodyStyle}>
          {who} declined the second Charleston, so it's skipped. Only one player has to
          decline for it to be skipped.
        </div>
        <div>
          <button type="button" className="btn btn-gold" onClick={() => agreeSecond(false)}>
            Continue to courtesy pass
          </button>
        </div>
      </div>
    );
  }

  const pass = charleston.pass;
  if (!pass) return <></>;

  // ---- Courtesy pass: negotiate a count with West, then select tiles ----
  if (pass === 'courtesy') {
    const step = charleston.courtesyStep ?? 'choose';
    const agreed = charleston.courtesyAgreedCount;

    if (step === 'choose') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={eyebrowStyle}>Courtesy Pass · East ↔ West</div>
          <div style={bodyStyle}>
            How many tiles would you like to exchange with WEST? You'll pass and receive the
            same number (West may offer fewer).
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {[0, 1, 2, 3].map((n) => (
              <button
                key={n}
                type="button"
                className={courtesyOffers.east === n ? 'btn btn-gold' : 'btn btn-ghost'}
                style={{ padding: '6px 14px' }}
                onClick={() => setCourtesyOffer('east', n)}
              >
                {n}
              </button>
            ))}
          </div>
          <div>
            <button
              type="button"
              className="btn btn-gold"
              onClick={() => proposeCourtesy(courtesyOffers.east)}
            >
              {courtesyOffers.east === 0 ? 'Skip courtesy pass' : `Propose ${courtesyOffers.east}`}
            </button>
          </div>
        </div>
      );
    }

    if (step === 'confirm') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={eyebrowStyle}>Courtesy Pass · East ↔ West</div>
          <div style={bodyStyle}>
            {agreed > 0
              ? `West can only courtesy pass ${agreed} ${plural(agreed)}. Continue with ${agreed}?`
              : `West doesn't want to courtesy pass any tiles.`}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {agreed > 0 && (
              <button type="button" className="btn btn-gold" onClick={() => confirmCourtesy(true)}>
                Yes, exchange {agreed}
              </button>
            )}
            <button type="button" className="btn btn-ghost" onClick={() => confirmCourtesy(false)}>
              Decline courtesy
            </button>
          </div>
        </div>
      );
    }

    // step === 'select'
    const canSubmit = selections.length === agreed;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={eyebrowStyle}>Courtesy Pass · East ↔ West</div>
        <div style={bodyStyle}>
          Select {agreed} {plural(agreed)} to pass to WEST ·{' '}
          <span className="mono" style={{ color: 'var(--gold)' }}>
            {selections.length}/{agreed}
          </span>{' '}
          selected
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="btn btn-ghost" onClick={() => clearSelection('east')}>
            Clear
          </button>
          <button
            type="button"
            className="btn btn-gold"
            onClick={() => advance()}
            disabled={!canSubmit}
          >
            Pass
          </button>
        </div>
      </div>
    );
  }

  // ---- First / second Charleston: always exactly 3 tiles ----
  const target = passTarget('east', pass);
  const direction = passDirection(pass);

  const doPass = () => {
    submit('east', selections);
    runBotsAll();
    // Give React a tick to flush selections before advancing.
    setTimeout(() => advance(), 0);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={eyebrowStyle}>{PASS_LABEL[pass]}</div>
      <div style={bodyStyle}>
        Pass {direction} to {target.toUpperCase()} ·{' '}
        <span className="mono" style={{ color: 'var(--gold)' }}>
          {selections.length}/3
        </span>{' '}
        selected
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" className="btn btn-ghost" onClick={() => clearSelection('east')}>
          Clear
        </button>
        <button
          type="button"
          className="btn btn-gold"
          onClick={doPass}
          disabled={selections.length !== 3}
        >
          Pass tiles
        </button>
      </div>
    </div>
  );
}
