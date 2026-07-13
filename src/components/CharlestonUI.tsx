import { useMahjStore } from '../store';
import { passDirection, passTarget } from '../game/charleston';

const PASS_LABEL: Record<string, string> = {
  firstRight: 'First Charleston · Pass RIGHT',
  firstAcross: 'First Charleston · Pass ACROSS',
  firstLeft: 'First Charleston · Pass LEFT',
  secondLeft: 'Second Charleston · Pass LEFT',
  secondAcross: 'Second Charleston · Pass ACROSS',
  secondRight: 'Second Charleston · Pass RIGHT',
  courtesy: 'Courtesy Pass · East ↔ West, South ↔ North',
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
    // Between first and second — bots said yes, waiting on human.
    return (
      <div style={{ border: '1px solid #333', padding: 8, margin: 4 }}>
        <div>First Charleston complete. Continue with a second Charleston?</div>
        <button type="button" onClick={() => agreeSecond(true)}>Yes, second Charleston</button>
        <button type="button" onClick={() => agreeSecond(false)}>No, skip to courtesy</button>
      </div>
    );
  }
  if (charleston.pass === null && charleston.secondCharlestonAgreed === false) {
    // Someone said no; move on. We render nothing — parent will advance.
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
    <div style={{ border: '1px solid #333', padding: 8, margin: 4 }}>
      <div>
        <strong>{PASS_LABEL[pass]}</strong>
      </div>
      <div>
        You pass {direction} (to {target.toUpperCase()}).{' '}
        Selected {selections.length}/{requiredCount} tiles.
      </div>
      {isCourtesy && (
        <div>
          Courtesy tile count:{' '}
          {[0, 1, 2, 3].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setCourtesyOffer('east', n)}
              disabled={courtesyOffers.east === n}
            >
              {n}
            </button>
          ))}
        </div>
      )}
      <button type="button" onClick={() => clearSelection('east')}>
        Clear
      </button>
      <button type="button" onClick={doPass} disabled={!canSubmit}>
        Pass
      </button>
    </div>
  );
}
