import { useEffect, useState } from 'preact/hooks';
import { getColor } from '../../domain/jersey-colors';
import { findLink, type LeadLinkData } from '../../domain/live-link';
import {
  couplingKind,
  DEFAULT_LIVE_TITLE,
  isOrganizer,
  liveTeamOptions,
  titleOf,
  validateLiveInput,
} from '../../domain/live-spieltag';
import { shortTeamName } from '../../domain/team-name';
import type { LeadCert, LiveSpieltag, Settings } from '../../domain/types';
import { normalizeName } from '../../domain/validation';
import { getSettings } from '../../platform/db';
import { coupleLead, createLive, shareLeadLink, shareViewerLink, verifyLeadLink } from '../../platform/live-setup';
import type { ShareResult } from '../../platform/share';
import { CoupleDialog } from '../components/couple-dialog';
import { navigate } from '../router';

/** Spec 006: "Mehr" → "Live-Spieltag" (US1): leer, anlegen, Übersicht, Lead-Ansicht, Link einfügen. */

type View = 'main' | 'form' | 'paste';
interface Pending {
  lead: LeadLinkData;
  cert: LeadCert;
}

const SHARE_MSG: Record<ShareResult, string> = {
  shared: '',
  copied: 'Link kopiert. Füge ihn in WhatsApp ein.',
  cancelled: '',
  failed: 'Teilen hat nicht geklappt.',
};

function Mark({ color }: { color: string }) {
  return <span class="team__mark" style={{ background: getColor(color)?.value }} aria-hidden="true" />;
}

function Topbar({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header class="topbar">
      <button type="button" class="icon-btn" aria-label="Zurück" onClick={onBack}>
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" class="icon">
          <path d="M15 5l-7 7 7 7" />
        </svg>
      </button>
      <h1 class="topbar__title t-zwischentitel">{title}</h1>
    </header>
  );
}

function PreviewNote() {
  return (
    <p class="hint" data-testid="live-preview-note">
      Im Aufbau: Das automatische Senden und das Dashboard für Eltern kommen mit den nächsten Updates.
    </p>
  );
}

export function LiveScreen() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [view, setView] = useState<View>('main');
  const [msg, setMsg] = useState('');
  const [pending, setPending] = useState<Pending | null>(null);

  useEffect(() => {
    void getSettings().then(setSettings);
  }, []);

  const share = async (p: Promise<ShareResult>): Promise<void> => {
    const text = SHARE_MSG[await p];
    setMsg(text);
    if (text) setTimeout(() => setMsg(''), 4000);
  };

  if (!settings) return <main class="page" aria-busy="true" />;
  const live = settings.live;
  const back = () => (view === 'main' ? navigate('/mehr') : setView('main'));

  const couple = async (): Promise<void> => {
    if (!pending) return;
    setSettings(await coupleLead(pending.lead, pending.cert));
    setPending(null);
    setView('main');
  };

  return (
    <main class="page">
      <Topbar title={view === 'form' ? 'Live-Spieltag anlegen' : 'Live-Spieltag'} onBack={back} />
      {view === 'form' && (
        <LiveForm
          settings={settings}
          onCancel={() => setView('main')}
          onCreated={(s) => {
            setSettings(s);
            setView('main');
          }}
        />
      )}
      {view === 'paste' && <PasteLink onCancel={() => setView('main')} onLead={setPending} />}
      {view === 'main' && !live && (
        <div class="form live" data-testid="live-empty">
          <PreviewNote />
          <p class="live__lead">
            Eltern verfolgen eure Spiele live auf einem Dashboard. Festgelegte Handys am Spielfeldrand senden die Stände
            automatisch.
          </p>
          <div class="live__box">
            <span class="field__label t-label">WAS DAS HANDY VERLÄSST</span>
            <p class="live__text">
              Mannschaften, Trikotfarben, Spielverlauf, Tore mit Vornamen. Verschlüsselt, nur über den Live-Spieltag.
              Kader, Karten und Lesezeichen bleiben auf dem Handy.
            </p>
          </div>
          <button type="button" class="btn btn--primary" data-testid="btn-live-create" onClick={() => setView('form')}>
            Live-Spieltag anlegen
          </button>
          <button
            type="button"
            class="btn btn--secondary"
            data-testid="btn-paste-link"
            onClick={() => setView('paste')}
          >
            Lead-Link einfügen
          </button>
        </div>
      )}
      {view === 'main' && live && isOrganizer(live) && (
        <Overview live={live} onShare={share} onPaste={() => setView('paste')} />
      )}
      {view === 'main' && live && !isOrganizer(live) && <LeadInfo live={live} onPaste={() => setView('paste')} />}
      {msg && (
        <div class="toast" role="status" data-testid="live-msg">
          {msg}
        </div>
      )}
      {pending && (
        <CoupleDialog
          cert={pending.cert}
          title={pending.lead.view.title}
          replace={couplingKind(settings, pending.lead) === 'replace'}
          addsTeam={!settings.teams.some((t) => normalizeName(t.name) === normalizeName(pending.cert.name))}
          onYes={() => void couple()}
          onNo={() => setPending(null)}
        />
      )}
    </main>
  );
}

function LiveForm({
  settings,
  onCancel,
  onCreated,
}: {
  settings: Settings;
  onCancel: () => void;
  onCreated: (s: Settings) => void;
}) {
  const options = liveTeamOptions(settings.teams);
  const [title, setTitle] = useState(DEFAULT_LIVE_TITLE);
  const [ids, setIds] = useState<string[]>(options.map((o) => o.team.id));
  const [self, setSelf] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const check = validateLiveInput({ title, teamIds: ids, selfTeamId: self }, settings.teams);
  const [tried, setTried] = useState(false);

  if (options.length === 0) {
    return (
      <div class="form live">
        <p class="hint" data-testid="live-no-teams">
          Lege zuerst deine Mannschaften in den{' '}
          <button type="button" class="link-btn" onClick={() => navigate('/einstellungen')}>
            Einstellungen
          </button>{' '}
          an.
        </p>
      </div>
    );
  }

  const toggle = (id: string): void => {
    const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
    setIds(next);
    if (self && !next.includes(self)) setSelf(null);
  };

  const save = async (): Promise<void> => {
    setTried(true);
    if (!check.ok || busy) return;
    setBusy(true);
    onCreated(await createLive({ title, teamIds: ids, selfTeamId: self }));
  };

  return (
    <form
      class="form live"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <div class="field">
        <label class="field__label t-label" for="live-title">
          TITEL
        </label>
        <input
          id="live-title"
          class="input"
          data-testid="input-live-title"
          maxLength={40}
          value={title}
          onInput={(e) => setTitle((e.target as HTMLInputElement).value)}
        />
        {tried && check.errors.title && <p class="field__error">{check.errors.title}</p>}
      </div>
      <div class="field">
        <span class="field__label t-label" id="live-teams">
          MANNSCHAFTEN
        </span>
        <div class="chips" role="group" aria-labelledby="live-teams">
          {options.map((o) => (
            <button
              type="button"
              key={o.team.id}
              class="chip chip--wide"
              aria-pressed={ids.includes(o.team.id)}
              data-testid={`live-team-chip-${o.key}`}
              onClick={() => toggle(o.team.id)}
            >
              {o.key}
            </button>
          ))}
        </div>
        <p class="field__help">Aus „Meine Mannschaften“, bis zu sechs.</p>
        {tried && check.errors.teams && <p class="field__error">{check.errors.teams}</p>}
      </div>
      <div class="field">
        <span class="field__label t-label" id="live-self">
          DIESES HANDY SENDET FÜR
        </span>
        <div class="chips" role="group" aria-labelledby="live-self">
          <button
            type="button"
            class="chip chip--wide"
            aria-pressed={self === null}
            data-testid="live-self-chip-none"
            onClick={() => setSelf(null)}
          >
            Keine
          </button>
          {options
            .filter((o) => ids.includes(o.team.id))
            .map((o) => (
              <button
                type="button"
                key={o.team.id}
                class="chip chip--wide"
                aria-pressed={self === o.team.id}
                data-testid={`live-self-chip-${o.key}`}
                onClick={() => setSelf(o.team.id)}
              >
                {o.key}
              </button>
            ))}
        </div>
      </div>
      <button type="submit" class="btn btn--primary" data-testid="btn-live-save" disabled={busy}>
        Anlegen
      </button>
      <button type="button" class="btn btn--secondary" onClick={onCancel}>
        Abbrechen
      </button>
    </form>
  );
}

function Overview({
  live,
  onShare,
  onPaste,
}: {
  live: LiveSpieltag;
  onShare: (p: Promise<ShareResult>) => Promise<void>;
  onPaste: () => void;
}) {
  return (
    <div class="form live" data-testid="live-overview">
      <PreviewNote />
      <h2 class="live__title t-zwischentitel" data-testid="live-title">
        {titleOf(live)}
      </h2>
      <section class="field">
        <span class="field__label t-label">ZUSCHAUER</span>
        <p class="live__text">Für die Elterngruppe. Gilt die ganze Saison, nur lesen.</p>
        <button
          type="button"
          class="btn btn--primary"
          data-testid="btn-share-viewer"
          onClick={() => void onShare(shareViewerLink(live))}
        >
          Zuschauer-Link teilen
        </button>
      </section>
      <section class="field">
        <span class="field__label t-label">LEAD-HANDYS</span>
        <ul class="live__rows">
          {live.teams.map((t) => (
            <li key={t.key} class="live__row" data-testid={`live-lead-row-${t.key}`}>
              <Mark color={t.homeColor} />
              <span class="live__row-text">
                <strong>{shortTeamName(t.name)}</strong>
                <span class="live__row-sub">{t.sends ? 'dieses Handy' : 'anderes Handy am Spielfeldrand'}</span>
              </span>
              {!t.sends && (
                <button
                  type="button"
                  class="link-btn"
                  data-testid={`btn-share-lead-${t.key}`}
                  onClick={() => void onShare(shareLeadLink(live, t.key))}
                >
                  Lead-Link teilen
                </button>
              )}
            </li>
          ))}
        </ul>
        <p class="field__help">
          Den Lead-Link nur an das Handy schicken, das den Torticker bedient. Ein Ersatzhandy darf ihn auch einfügen.
        </p>
      </section>
      <button type="button" class="btn btn--secondary" data-testid="btn-paste-link" onClick={onPaste}>
        Lead-Link einfügen
      </button>
    </div>
  );
}

function LeadInfo({ live, onPaste }: { live: LiveSpieltag; onPaste: () => void }) {
  const sending = live.teams.filter((t) => t.sends);
  return (
    <div class="form live">
      <PreviewNote />
      <div class="live__box" data-testid="live-lead-info">
        <span class="field__label t-label">DIESES HANDY SENDET LIVE</span>
        <strong class="live__teams">{sending.map((t) => shortTeamName(t.name)).join(', ')}</strong>
        <span>an „{titleOf(live)}“</span>
      </div>
      <p class="live__text">
        Jedes Spiel dieser Mannschaft geht ab dem Anlegen automatisch aufs Dashboard. Einzelne Spiele lassen sich im
        Spiel über „…“ ausnehmen, z. B. ein Testspiel.
      </p>
      <button type="button" class="btn btn--secondary" data-testid="btn-paste-link" onClick={onPaste}>
        Weiteren Lead-Link einfügen
      </button>
    </div>
  );
}

function PasteLink({ onCancel, onLead }: { onCancel: () => void; onLead: (p: Pending) => void }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const apply = async (): Promise<void> => {
    const link = findLink(text);
    if (link.kind === 'view') {
      setError('Das ist ein Zuschauer-Link. Das Dashboard für Eltern kommt mit dem nächsten Update.');
      return;
    }
    if (link.kind === 'invalid') {
      setError('Kein gültiger Link. Bitte den ganzen Link aus WhatsApp kopieren.');
      return;
    }
    const cert = await verifyLeadLink(link.lead);
    if (!cert) {
      setError('Dieser Lead-Link ist nicht gültig.');
      return;
    }
    onLead({ lead: link.lead, cert });
  };

  return (
    <form
      class="form live"
      onSubmit={(e) => {
        e.preventDefault();
        void apply();
      }}
    >
      <div class="field">
        <label class="field__label t-label" for="paste-link">
          LEAD-LINK
        </label>
        <textarea
          id="paste-link"
          class="textarea"
          rows={4}
          data-testid="paste-link-input"
          placeholder="Link aus WhatsApp hier einfügen"
          value={text}
          onInput={(e) => {
            setText((e.target as HTMLTextAreaElement).value);
            setError('');
          }}
        />
        <p class="field__help">
          Lange auf den Link in WhatsApp tippen, „Kopieren“, dann hier lange tippen und „Einsetzen“.
        </p>
        {error && (
          <p class="field__error" data-testid="paste-link-error">
            {error}
          </p>
        )}
      </div>
      <button type="submit" class="btn btn--primary" data-testid="paste-link-apply">
        Übernehmen
      </button>
      <button type="button" class="btn btn--secondary" onClick={onCancel}>
        Abbrechen
      </button>
    </form>
  );
}
