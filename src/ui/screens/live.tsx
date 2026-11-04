import { useEffect, useState } from 'preact/hooks';
import { getColor } from '../../domain/jersey-colors';
import { findLink, viewerLinkPath, type LeadLinkData, type TrainerLinkData } from '../../domain/live-link';
import {
  couplingKind,
  DEFAULT_LIVE_TITLE,
  isOrganizer,
  knowsTeam,
  liveTeamOptions,
  MAX_LIVE_TEAMS,
  replacesOrganizer,
  titleOf,
  trainerTeamsOf,
  validateLiveInput,
} from '../../domain/live-spieltag';
import { shortTeamName } from '../../domain/team-name';
import type { LeadCert, LiveSpieltag, Settings } from '../../domain/types';
import { getSettings } from '../../platform/db';
import {
  coupleLead,
  coupleTrainer,
  createLive,
  shareTrainerLink,
  shareViewerLink,
  verifyLeadLink,
  verifyTrainerLink,
} from '../../platform/live-setup';
import type { ShareResult } from '../../platform/share';
import { CoupleDialog } from '../components/couple-dialog';
import { navigate } from '../router';

/** Spec 006: "Mehr" → "Live-Spieltag" (US1): leer, anlegen, Übersicht, Lead-Ansicht, Link einfügen. */

type View = 'main' | 'form' | 'paste';
/** Geprüfter Link, der auf Bestätigung wartet; Titel aus der geprüften Konfiguration. */
type Pending =
  | { kind: 'lead'; lead: LeadLinkData; cert: LeadCert; title: string }
  | { kind: 'trainer'; trainer: TrainerLinkData; title: string };

/** Mannschaften (Name und Trikots) eines wartenden Links. */
const pendingTeams = (p: Pending): { name: string; homeColor: string }[] =>
  p.kind === 'lead' ? [p.cert] : trainerTeamsOf(p.trainer);

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

/** FR-L17: Dashboard in der App (Navigationsleiste bleibt). */
function DashboardButton({ label = 'Dashboard ansehen' }: { label?: string }) {
  return (
    <button
      type="button"
      class="btn btn--secondary"
      data-testid="btn-live-dashboard"
      onClick={() => navigate('/live-spieltag/dashboard')}
    >
      {label}
    </button>
  );
}

export function LiveScreen() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [view, setView] = useState<View>('main');
  const [msg, setMsg] = useState('');
  const [pending, setPending] = useState<Pending | null>(null);
  const [coupling, setCoupling] = useState(false);

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
    if (!pending || coupling) return;
    setCoupling(true);
    try {
      setSettings(
        await (pending.kind === 'lead' ? coupleLead(pending.lead, pending.cert) : coupleTrainer(pending.trainer)),
      );
      setView('main');
    } catch {
      setMsg('Koppeln hat nicht geklappt. Bitte erneut versuchen.');
    } finally {
      setPending(null);
      setCoupling(false);
    }
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
      {view === 'paste' && <PasteLink onCancel={() => setView('main')} onLink={setPending} />}
      {view === 'main' && !live && (
        <div class="form live" data-testid="live-empty">
          {settings?.liveView && <DashboardButton label={`Dashboard „${settings.liveView.title}“ ansehen`} />}
          <p class="live__lead">
            Eltern verfolgen eure Spiele live auf einem Dashboard. Die Handys der Trainergruppe senden die Spiele, die
            sie erfassen, automatisch.
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
            Trainer-Link einfügen
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
          trainer={pending.kind === 'trainer'}
          teams={pendingTeams(pending).map((t) => shortTeamName(t.name))}
          title={pending.title}
          replace={couplingKind(settings, pending.kind === 'lead' ? pending.lead : pending.trainer) === 'replace'}
          adds={pendingTeams(pending)
            .filter((t) => !knowsTeam(settings, t.name))
            .map((t) => shortTeamName(t.name))}
          losesOrganizer={
            live && replacesOrganizer(settings, pending.kind === 'lead' ? pending.lead : pending.trainer)
              ? titleOf(live)
              : null
          }
          busy={coupling}
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
  const [ids, setIds] = useState<string[]>(options.slice(0, MAX_LIVE_TEAMS).map((o) => o.team.id));
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const check = validateLiveInput({ title, teamIds: ids }, settings.teams);
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
    setIds(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
  };

  const save = async (): Promise<void> => {
    setTried(true);
    if (!check.ok || busy) return;
    setBusy(true);
    setFailed(false);
    try {
      onCreated(await createLive({ title, teamIds: ids }));
    } catch {
      setFailed(true);
      setBusy(false);
    }
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
      <p class="field__help">
        Danach teilst du zwei Links: den Zuschauer-Link für die Eltern und den Trainer-Link für eure Trainergruppe.
      </p>
      {failed && (
        <p class="field__error" role="alert">
          Anlegen hat nicht geklappt. Bitte erneut versuchen.
        </p>
      )}
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
        <span class="field__label t-label">TRAINER</span>
        <p class="live__text">
          Für eure Trainergruppe, nur dort teilen. Wer ihn einfügt, sendet die Spiele, die er erfasst, und darf den
          Live-Spieltag verwalten.
        </p>
        <button
          type="button"
          class="btn btn--primary"
          data-testid="btn-share-trainer"
          onClick={() => void onShare(shareTrainerLink(live))}
        >
          Trainer-Link teilen
        </button>
      </section>
      <section class="field">
        <span class="field__label t-label">MANNSCHAFTEN</span>
        <ul class="live__rows">
          {live.teams.map((t) => (
            <li key={t.key} class="live__row" data-testid={`live-team-row-${t.key}`}>
              <Mark color={t.homeColor} />
              <span class="live__row-text">
                <strong>{shortTeamName(t.name)}</strong>
              </span>
            </li>
          ))}
        </ul>
        <p class="field__help">
          Jedes Trainer-Handy sendet automatisch die Spiele, die es erfasst. Beim Anlegen eines Spiels lässt sich „Live
          aufs Dashboard“ abschalten, z. B. für ein Testspiel.
        </p>
      </section>
      <DashboardButton />
      <button type="button" class="btn btn--secondary" data-testid="btn-paste-link" onClick={onPaste}>
        Link einfügen
      </button>
    </div>
  );
}

function LeadInfo({ live, onPaste }: { live: LiveSpieltag; onPaste: () => void }) {
  const sending = live.teams.filter((t) => t.sends);
  return (
    <div class="form live">
      <div class="live__box" data-testid="live-lead-info">
        <span class="field__label t-label">DIESES HANDY SENDET LIVE</span>
        <strong class="live__teams">{sending.map((t) => shortTeamName(t.name)).join(', ')}</strong>
        <span>an „{titleOf(live)}“</span>
      </div>
      <p class="live__text">
        Jedes Spiel dieser Mannschaft geht ab dem Anlegen automatisch aufs Dashboard. Einzelne Spiele lassen sich im
        Spiel über „…“ ausnehmen, z. B. ein Testspiel.
      </p>
      <p class="live__text">Mit dem Trainer-Link eurer Trainergruppe sendet dieses Handy für alle Mannschaften.</p>
      <DashboardButton />
      <button type="button" class="btn btn--secondary" data-testid="btn-paste-link" onClick={onPaste}>
        Link einfügen
      </button>
    </div>
  );
}

function PasteLink({ onCancel, onLink }: { onCancel: () => void; onLink: (p: Pending) => void }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const apply = async (): Promise<void> => {
    const link = findLink(text);
    if (link.kind === 'view') {
      // US1-S5: Ein Zuschauer-Link macht das Handy nicht zum Lead-Handy, er zeigt nur das Dashboard.
      navigate(viewerLinkPath(link.view));
      return;
    }
    if (link.kind === 'invalid') {
      setError('Kein gültiger Link. Bitte den ganzen Link aus WhatsApp kopieren.');
      return;
    }
    if (link.kind === 'trainer') {
      const config = await verifyTrainerLink(link.trainer);
      if (config) onLink({ kind: 'trainer', trainer: link.trainer, title: config.title });
      else setError('Dieser Trainer-Link ist nicht gültig.');
      return;
    }
    const verified = await verifyLeadLink(link.lead);
    if (!verified) {
      setError('Dieser Lead-Link ist nicht gültig.');
      return;
    }
    onLink({ kind: 'lead', lead: link.lead, cert: verified.cert, title: verified.config.title });
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
          LINK
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
