import { useEffect, useState } from 'preact/hooks';
import { parseLinkPath, type LeadLinkData } from '../../domain/live-link';
import { couplingKind } from '../../domain/live-spieltag';
import { shortTeamName } from '../../domain/team-name';
import type { LeadCert, Settings } from '../../domain/types';
import { normalizeName } from '../../domain/validation';
import { getSettings } from '../../platform/db';
import { coupleLead, verifyLeadLink } from '../../platform/live-setup';
import { CoupleDialog } from '../components/couple-dialog';
import { navigate } from '../router';

const base = import.meta.env.BASE_URL;

/**
 * Spec 006 FR-L03, US1-S6: Lead-Link im Browser angetippt. iOS öffnet Links nie in der installierten App
 * (research.md R-L6), darum: Anleitung zum Einfügen, "Link kopieren", "Hier im Browser koppeln".
 */
export function LeadLinkScreen({ data }: { data: string }) {
  const [state, setState] = useState<
    { kind: 'loading' } | { kind: 'invalid' } | { kind: 'ok'; lead: LeadLinkData; cert: LeadCert; settings: Settings }
  >({ kind: 'loading' });
  const [ask, setAsk] = useState(false);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    void (async () => {
      const link = parseLinkPath(`/lead/${data}`);
      const cert = link.kind === 'lead' ? await verifyLeadLink(link.lead) : null;
      if (link.kind !== 'lead' || !cert) {
        setState({ kind: 'invalid' });
        return;
      }
      setState({ kind: 'ok', lead: link.lead, cert, settings: await getSettings() });
    })();
  }, [data]);

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied('Link kopiert.');
    } catch {
      setCopied('Kopieren ging nicht. Bitte den Link in WhatsApp lange antippen und kopieren.');
    }
  };

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
            Dieser Lead-Link ist nicht gültig. Bitte den Link erneut beim Organisator anfordern.
          </p>
        )}
        {state.kind === 'ok' && (
          <>
            <h2 class="live__title t-zwischentitel">Lead-Link für {shortTeamName(state.cert.name)}</h2>
            <p class="live__text">
              Damit sendet das Handy am Spielfeldrand die Spiele von {shortTeamName(state.cert.name)} an „
              {state.lead.view.title}“.
            </p>
            <ol class="live__steps">
              <li>„Link kopieren“ tippen.</li>
              <li>Den Torticker vom Home-Bildschirm öffnen.</li>
              <li>Mehr → Live-Spieltag → „Lead-Link einfügen“.</li>
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
      {state.kind === 'ok' && ask && (
        <CoupleDialog
          cert={state.cert}
          title={state.lead.view.title}
          replace={couplingKind(state.settings, state.lead) === 'replace'}
          addsTeam={!state.settings.teams.some((t) => normalizeName(t.name) === normalizeName(state.cert.name))}
          onYes={() => void coupleLead(state.lead, state.cert).then(() => navigate('/live-spieltag', true))}
          onNo={() => setAsk(false)}
        />
      )}
    </main>
  );
}
