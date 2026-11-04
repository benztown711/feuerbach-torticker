import { useEffect, useState } from 'preact/hooks';
import { parseLinkPath, type LeadLinkData, type TrainerLinkData } from '../../domain/live-link';
import { couplingKind, knowsTeam, replacesOrganizer, titleOf, trainerTeamsOf } from '../../domain/live-spieltag';
import { shortTeamName } from '../../domain/team-name';
import type { LeadCert, Settings } from '../../domain/types';
import { getSettings } from '../../platform/db';
import { coupleLead, coupleTrainer, verifyLeadLink, verifyTrainerLink } from '../../platform/live-setup';
import { CoupleDialog } from '../components/couple-dialog';
import { navigate } from '../router';

const base = import.meta.env.BASE_URL;

type Link = { kind: 'lead'; lead: LeadLinkData; cert: LeadCert } | { kind: 'trainer'; trainer: TrainerLinkData };

/** Geprüfter Link mit Titel und Mannschaften (Name), sonst null. */
async function verified(
  kind: 'lead' | 'trainer',
  data: string,
): Promise<{ link: Link; title: string; teams: string[] } | null> {
  const parsed = parseLinkPath(`/${kind}/${data}`);
  if (parsed.kind === 'trainer') {
    const config = await verifyTrainerLink(parsed.trainer);
    const teams = trainerTeamsOf(parsed.trainer).map((t) => t.name);
    return config ? { link: { kind: 'trainer', trainer: parsed.trainer }, title: config.title, teams } : null;
  }
  if (parsed.kind !== 'lead') return null;
  const v = await verifyLeadLink(parsed.lead);
  return v
    ? { link: { kind: 'lead', lead: parsed.lead, cert: v.cert }, title: v.config.title, teams: [v.cert.name] }
    : null;
}

/** "E1, E2 und E3" */
const andList = (xs: string[]): string =>
  xs.length > 1 ? `${xs.slice(0, -1).join(', ')} und ${xs[xs.length - 1]}` : xs.join('');

/**
 * Spec 006 FR-L03, US1-S6: Trainer- oder Lead-Link im Browser angetippt. iOS öffnet Links nie in der
 * installierten App (research.md R-L6), darum: Anleitung zum Einfügen, "Link kopieren", "Hier im Browser koppeln".
 */
export function LeadLinkScreen({ data, kind }: { data: string; kind: 'lead' | 'trainer' }) {
  const [state, setState] = useState<
    | { kind: 'loading' }
    | { kind: 'invalid' }
    | { kind: 'ok'; link: Link; title: string; teams: string[]; settings: Settings }
  >({ kind: 'loading' });
  const [ask, setAsk] = useState(false);
  const [copied, setCopied] = useState('');
  const [busy, setBusy] = useState(false);
  const label = kind === 'trainer' ? 'Trainer-Link' : 'Lead-Link';

  useEffect(() => {
    void (async () => {
      const v = await verified(kind, data);
      if (!v) {
        setState({ kind: 'invalid' });
        return;
      }
      setState({ kind: 'ok', ...v, settings: await getSettings() });
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
  const names = ok ? andList(ok.teams.map(shortTeamName)) : '';
  const linkOf = (l: Link) => (l.kind === 'lead' ? l.lead : l.trainer);

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
              {label} für „{ok.title}“
            </h2>
            <p class="live__text">
              Damit sendet dieses Handy die Spiele von {names}, die es erfasst, automatisch an „{ok.title}“.
            </p>
            <ol class="live__steps">
              <li>„Link kopieren“ tippen.</li>
              <li>Den Torticker vom Home-Bildschirm öffnen.</li>
              <li>Mehr → Live-Spieltag → „Trainer-Link einfügen“ bzw. „Link einfügen“.</li>
            </ol>
            <button type="button" class="btn btn--primary" data-testid="btn-copy-lead-link" onClick={() => void copy()}>
              Link kopieren
            </button>
            {copied && (
              <p class="field__help" role="status">
                {copied}
              </p>
            )}
            <p class="field__help">Du nutzt den Torticker nur hier im Browser? Dann kannst du direkt koppeln.</p>
            <button type="button" class="btn btn--secondary" data-testid="btn-couple-here" onClick={() => setAsk(true)}>
              Hier im Browser koppeln
            </button>
          </>
        )}
      </div>
      {ok && ask && (
        <CoupleDialog
          trainer={ok.link.kind === 'trainer'}
          teams={ok.teams.map(shortTeamName)}
          title={ok.title}
          replace={couplingKind(ok.settings, linkOf(ok.link)) === 'replace'}
          adds={ok.teams.filter((n) => !knowsTeam(ok.settings, n)).map(shortTeamName)}
          losesOrganizer={
            ok.settings.live && replacesOrganizer(ok.settings, linkOf(ok.link)) ? titleOf(ok.settings.live) : null
          }
          busy={busy}
          onYes={() => {
            if (busy) return;
            setBusy(true);
            const l = ok.link;
            void (l.kind === 'lead' ? coupleLead(l.lead, l.cert) : coupleTrainer(l.trainer))
              .then(() => navigate('/live-spieltag', true))
              .catch(() => {
                setBusy(false);
                setAsk(false);
                setCopied('Koppeln hat nicht geklappt. Bitte erneut versuchen.');
              });
          }}
          onNo={() => setAsk(false)}
        />
      )}
    </main>
  );
}
