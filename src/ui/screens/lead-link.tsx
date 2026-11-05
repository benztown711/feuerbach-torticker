import { useEffect, useState } from 'preact/hooks';
import { joinList } from '../../domain/format';
import { parseLinkPath } from '../../domain/live-link';
import { shortTeamName } from '../../domain/team-name';
import type { Settings } from '../../domain/types';
import { getSettings } from '../../platform/db';
import { verifyLink, type VerifiedLink } from '../../platform/live-setup';
import { isStandalone } from '../../platform/storage';
import { CoupleFlow, isCoupledWith } from '../components/couple-flow';
import { navigate } from '../router';

const base = import.meta.env.BASE_URL;

/**
 * Spec 006 FR-L03, US1-S6, Spec 012 FR-S06: Trainer- oder Lead-Link angetippt. Schon gekoppelt: direkt zum
 * Startbildschirm (der Link wirkt wie ein Startknopf). Sonst "Koppeln und loslegen"; "Link kopieren" nur für den
 * Torticker auf dem Home-Bildschirm, weil iOS Links nie in der installierten App öffnet (research.md R-L6).
 */
export function LeadLinkScreen({ data, kind }: { data: string; kind: 'lead' | 'trainer' }) {
  const [state, setState] = useState<
    { kind: 'loading' } | { kind: 'invalid' } | { kind: 'ok'; link: VerifiedLink; settings: Settings }
  >({ kind: 'loading' });
  const [ask, setAsk] = useState(false);
  const [copied, setCopied] = useState('');
  const installed = isStandalone();
  const label = kind === 'trainer' ? 'Trainer-Link' : 'Lead-Link';

  useEffect(() => {
    void (async () => {
      const link = await verifyLink(parseLinkPath(`/${kind}/${data}`));
      if (!link) {
        setState({ kind: 'invalid' });
        return;
      }
      const settings = await getSettings();
      if (isCoupledWith(settings, link)) {
        navigate('/', true);
        return;
      }
      setState({ kind: 'ok', link, settings });
    })();
  }, [data, kind]);

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied('Link kopiert.');
    } catch {
      setCopied('Kopieren ging nicht. Bitte den Link in WhatsApp lange antippen und kopieren.');
    }
  };

  const ok = state.kind === 'ok' ? state : null;
  const teams = ok ? ok.link.teams.map((t) => shortTeamName(t.name)) : [];

  return (
    <main class="page lead-link" data-testid="lead-link-page">
      <h1 class="start__bar t-kopfzeile">TORTICKER</h1>
      <div class="form live">
        <img
          class="lead-link__wappen"
          src={`${base}brand/wappen.svg`}
          alt="Wappen der Sportvg Feuerbach"
          width={42}
          height={50}
        />
        {state.kind === 'invalid' && (
          <p class="hint" data-testid="lead-link-invalid">
            Dieser {label} ist nicht gültig. Bitte den Link erneut in der Trainergruppe anfordern.
          </p>
        )}
        {ok && (
          <>
            <h2 class="live__title t-zwischentitel">
              {label} für „{ok.link.title}“
            </h2>
            <p class="live__text">
              Damit sendet dieses Handy die Spiele von {joinList(teams)}, die es erfasst, automatisch an „
              {ok.link.title}“.
            </p>
            <button type="button" class="btn btn--primary" data-testid="btn-couple-here" onClick={() => setAsk(true)}>
              Koppeln und loslegen
            </button>
            {!installed && (
              <>
                <p class="field__help" data-testid="lead-link-copy-hint">
                  Torticker schon auf dem Home-Bildschirm? Dann den Link kopieren und dort einfügen.
                </p>
                <button
                  type="button"
                  class="btn btn--secondary"
                  data-testid="btn-copy-lead-link"
                  onClick={() => void copy()}
                >
                  Link kopieren
                </button>
              </>
            )}
            {copied && (
              <p class="field__help" role="status">
                {copied}
              </p>
            )}
          </>
        )}
      </div>
      {ok && ask && (
        <CoupleFlow
          link={ok.link}
          settings={ok.settings}
          onDone={() => navigate('/', true)}
          onCancel={() => setAsk(false)}
          onError={() => {
            setAsk(false);
            setCopied('Koppeln hat nicht geklappt. Bitte erneut versuchen.');
          }}
        />
      )}
    </main>
  );
}
