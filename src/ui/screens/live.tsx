import { useEffect, useState } from 'preact/hooks';
import { getColor } from '../../domain/jersey-colors';
import { findLink, viewerLinkPath } from '../../domain/live-link';
import { addableTeams } from '../../domain/live-manage';
import {
  checkTitle,
  couplingKind,
  DEFAULT_LIVE_TITLE,
  isOrganizer,
  isRetired,
  knowsTeam,
  liveTeamOptions,
  MAX_LIVE_TEAMS,
  replacesOrganizer,
  titleOf,
  validateLiveInput,
  type LiveTeamOption,
} from '../../domain/live-spieltag';
import { shortTeamName } from '../../domain/team-name';
import type { LiveSpieltag, Settings } from '../../domain/types';
import { getSettings } from '../../platform/db';
import { onLiveSettings } from '../../platform/live-events';
import {
  addTeamToLive,
  coupleLink,
  createLive,
  endCoupling,
  linkOf,
  reissueLive,
  removeTeamFromLive,
  renameLive,
  shareTrainerLink,
  shareViewerLink,
  verifyLink,
  type VerifiedLink,
} from '../../platform/live-setup';
import type { LiveOverviewWatch } from '../../platform/live-watch';
import type { ShareResult } from '../../platform/share';
import { Confirm } from '../components/confirm';
import { CoupleDialog } from '../components/couple-dialog';
import { Sheet } from '../components/sheet';
import { navigate } from '../router';

/**
 * Spec 006: "Mehr" → "Live-Spieltag": leer, anlegen, Übersicht mit Verwalten (US5), Lead-Ansicht, Link einfügen,
 * Hinweis "neu ausgestellt".
 */

type View = 'main' | 'form' | 'paste';
/** Geprüfter Link, der auf Bestätigung wartet; Titel aus der geprüften Konfiguration. */
type Pending = VerifiedLink;

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
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [busy, setBusy] = useState(false);
  const [reissued, setReissued] = useState(false);

  useEffect(() => {
    void getSettings().then(setSettings);
  }, []);
  // US5-S1: von einem anderen Trainer-Handy übernommene Änderungen sofort zeigen.
  useEffect(() => onLiveSettings(setSettings), []);

  const show = (text: string): void => {
    setMsg(text);
    if (text) setTimeout(() => setMsg(''), 4000);
  };
  const share = async (p: Promise<ShareResult>): Promise<void> => show(SHARE_MSG[await p]);

  /** US5: Änderung ausführen, Ergebnis melden; bei Fehlern bleibt alles, wie es war. */
  const run = async (change: () => Promise<Settings>, done: string): Promise<boolean> => {
    if (busy) return false;
    setBusy(true);
    try {
      setSettings(await change());
      setDialog(null);
      show(done);
      return true;
    } catch (e) {
      show(e instanceof Error ? e.message : 'Das hat nicht geklappt. Bitte erneut versuchen.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  if (!settings) return <main class="page" aria-busy="true" />;
  const live = settings.live;
  const back = () => (view === 'main' ? navigate('/mehr') : setView('main'));

  const couple = async (): Promise<void> => {
    if (!pending || coupling) return;
    setCoupling(true);
    try {
      setSettings(await coupleLink(pending));
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
      {view === 'main' && live && isRetired(live) && (
        <Retired live={live} onPaste={() => setView('paste')} onDialog={setDialog} />
      )}
      {view === 'main' && live && !isRetired(live) && isOrganizer(live) && (
        <Overview
          live={live}
          canAdd={addableTeams(live, settings.teams).length > 0}
          reissued={reissued}
          onShare={share}
          onPaste={() => setView('paste')}
          onDialog={setDialog}
        />
      )}
      {view === 'main' && live && !isRetired(live) && !isOrganizer(live) && (
        <LeadInfo live={live} onPaste={() => setView('paste')} onDialog={setDialog} />
      )}
      {live && dialog?.kind === 'title' && (
        <TitleSheet
          live={live}
          busy={busy}
          onClose={() => setDialog(null)}
          onSave={(title) => void run(() => renameLive(title), 'Titel geändert. Das Dashboard zeigt ihn gleich.')}
        />
      )}
      {live && dialog?.kind === 'add' && (
        <AddSheet
          options={addableTeams(live, settings.teams)}
          busy={busy}
          onClose={() => setDialog(null)}
          onAdd={(o) =>
            void run(() => addTeamToLive(o), `${shortTeamName(o.team.name)} hinzugefügt. Die Links bleiben gleich.`)
          }
        />
      )}
      {dialog?.kind === 'remove' && (
        <Confirm
          title={`${dialog.name} entfernen?`}
          text={`Das Dashboard zeigt ${dialog.key} danach nicht mehr, und kein Trainer-Handy sendet mehr ${dialog.key}-Spiele. Die Spiele bleiben auf den Handys.`}
          yesLabel="Entfernen"
          onNo={() => setDialog(null)}
          onYes={() => void run(() => removeTeamFromLive(dialog.key), `${dialog.name} entfernt.`)}
        />
      )}
      {dialog?.kind === 'reissue' && (
        <Confirm
          title="Alle Links neu ausstellen?"
          text="Der alte Zuschauer-Link und der alte Trainer-Link zeigen danach keine neuen Stände mehr. Du schickst die neuen Links wieder an die Elterngruppe und an eure Trainergruppe. Nur nötig, wenn ein Link in falsche Hände geraten ist oder jemand die Trainergruppe verlässt."
          yesLabel="Neu ausstellen"
          onNo={() => setDialog(null)}
          onYes={() => void run(reissueLive, 'Neue Links ausgestellt.').then((ok) => ok && setReissued(true))}
        />
      )}
      {live && dialog?.kind === 'end' && (
        <Confirm
          title="Kopplung beenden?"
          text={`Dieses Handy sendet dann nichts mehr an „${titleOf(live)}“. Die Spiele bleiben auf dem Handy.`}
          yesLabel="Beenden"
          onNo={() => setDialog(null)}
          onYes={() => void run(endCoupling, 'Kopplung beendet. Dieses Handy sendet nichts mehr.')}
        />
      )}
      {msg && (
        <div class="toast" role="status" data-testid="live-msg">
          {msg}
        </div>
      )}
      {pending && (
        <CoupleDialog
          trainer={pending.kind === 'trainer'}
          teams={pending.teams.map((t) => shortTeamName(t.name))}
          title={pending.title}
          replace={couplingKind(settings, linkOf(pending)) === 'replace'}
          adds={pending.teams.filter((t) => !knowsTeam(settings, t.name)).map((t) => shortTeamName(t.name))}
          losesOrganizer={
            live && !isRetired(live) && replacesOrganizer(settings, linkOf(pending)) ? titleOf(live) : null
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

type Dialog =
  | { kind: 'title' }
  | { kind: 'add' }
  | { kind: 'remove'; key: string; name: string }
  | { kind: 'reissue' }
  | { kind: 'end' };

/** US5: "zuletzt gesendet" je Mannschaft, solange die Übersicht offen ist (nachgeladen). */
function useSent(live: LiveSpieltag): ((team: string) => string) | null {
  const [watch, setWatch] = useState<LiveOverviewWatch | null>(null);
  const [, setTick] = useState(0);
  useEffect(() => {
    let w: LiveOverviewWatch | null = null;
    let alive = true;
    import('../../platform/live-watch')
      .then((m) => {
        if (!alive) return;
        w = m.watchLive(live);
        w.onChange(() => setTick((n) => n + 1));
        setWatch(w);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
      w?.stop();
      setWatch(null);
    };
  }, [live.topic, live.orgPub]);
  return watch ? (team) => watch.sent(team) : null;
}

function Overview({
  live,
  canAdd,
  reissued,
  onShare,
  onPaste,
  onDialog,
}: {
  live: LiveSpieltag;
  canAdd: boolean;
  reissued: boolean;
  onShare: (p: Promise<ShareResult>) => Promise<void>;
  onPaste: () => void;
  onDialog: (d: Dialog) => void;
}) {
  const sent = useSent(live);
  return (
    <div class="form live" data-testid="live-overview">
      <h2 class="live__title t-zwischentitel" data-testid="live-title">
        {titleOf(live)}
      </h2>
      {reissued && (
        <div class="live__notice" role="status" data-testid="live-reissued">
          <strong>Neue Links ausgestellt</strong>
          <span>
            Die alten Links zeigen nichts Neues mehr. Schick jetzt beide neuen Links: den Zuschauer-Link an die
            Elterngruppe, den Trainer-Link an eure Trainergruppe.
          </span>
        </div>
      )}
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
                {sent && (
                  <span class="live__row-sub" data-testid={`live-team-sent-${t.key}`}>
                    {sent(t.key)}
                  </span>
                )}
              </span>
              {live.teams.length > 1 && (
                <button
                  type="button"
                  class="link-btn live__row-action"
                  data-testid={`btn-team-remove-${t.key}`}
                  aria-label={`${shortTeamName(t.name)} entfernen`}
                  onClick={() => onDialog({ kind: 'remove', key: t.key, name: shortTeamName(t.name) })}
                >
                  Entfernen
                </button>
              )}
            </li>
          ))}
        </ul>
        {canAdd && (
          <button
            type="button"
            class="btn btn--secondary"
            data-testid="btn-team-add"
            onClick={() => onDialog({ kind: 'add' })}
          >
            Mannschaft hinzufügen
          </button>
        )}
        <p class="field__help">
          Jedes Trainer-Handy sendet automatisch die Spiele, die es erfasst. „Zuletzt gesendet“ zählt für alle
          Trainer-Handys zusammen.
        </p>
      </section>
      <DashboardButton />
      <section class="field">
        <span class="field__label t-label">VERWALTEN</span>
        <ul class="live__rows">
          <li>
            <button
              type="button"
              class="live__action"
              data-testid="btn-live-title"
              onClick={() => onDialog({ kind: 'title' })}
            >
              Titel ändern
            </button>
          </li>
          <li>
            <button
              type="button"
              class="live__action live__action--danger"
              data-testid="btn-live-reissue"
              onClick={() => onDialog({ kind: 'reissue' })}
            >
              Alle Links neu ausstellen …
            </button>
          </li>
          <li>
            <button
              type="button"
              class="live__action live__action--danger"
              data-testid="btn-live-end"
              onClick={() => onDialog({ kind: 'end' })}
            >
              Kopplung beenden …
            </button>
          </li>
        </ul>
      </section>
      <button type="button" class="btn btn--secondary" data-testid="btn-paste-link" onClick={onPaste}>
        Link einfügen
      </button>
    </div>
  );
}

function EndButton({ onDialog }: { onDialog: (d: Dialog) => void }) {
  return (
    <button
      type="button"
      class="live__action live__action--danger"
      data-testid="btn-live-end"
      onClick={() => onDialog({ kind: 'end' })}
    >
      Kopplung beenden …
    </button>
  );
}

function LeadInfo({
  live,
  onPaste,
  onDialog,
}: {
  live: LiveSpieltag;
  onPaste: () => void;
  onDialog: (d: Dialog) => void;
}) {
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
      <EndButton onDialog={onDialog} />
    </div>
  );
}

/** US5-S3: Ein anderes Trainer-Handy hat alle Links neu ausgestellt; dieses Handy sendet nichts mehr. */
function Retired({
  live,
  onPaste,
  onDialog,
}: {
  live: LiveSpieltag;
  onPaste: () => void;
  onDialog: (d: Dialog) => void;
}) {
  return (
    <div class="form live">
      <div class="live__notice" role="status" data-testid="live-retired">
        <strong>Neu ausgestellt</strong>
        <span>
          „{titleOf(live)}“ wurde auf einem anderen Trainer-Handy neu ausgestellt. Dieses Handy sendet nichts mehr. Füge
          den neuen Trainer-Link aus eurer Trainergruppe ein.
        </span>
      </div>
      <button type="button" class="btn btn--primary" data-testid="btn-paste-link" onClick={onPaste}>
        Trainer-Link einfügen
      </button>
      <EndButton onDialog={onDialog} />
    </div>
  );
}

/** US5-S4: Titel ändern. */
function TitleSheet({
  live,
  busy,
  onSave,
  onClose,
}: {
  live: LiveSpieltag;
  busy: boolean;
  onSave: (title: string) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(titleOf(live));
  const [error, setError] = useState('');
  const save = (): void => {
    const check = checkTitle(title);
    if (!check.ok) setError(check.error ?? '');
    else onSave(check.title);
  };
  return (
    <Sheet title="Titel ändern" testId="title-sheet" onClose={onClose}>
      <form
        class="form"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div class="field">
          <label class="field__label t-label" for="title-edit">
            TITEL
          </label>
          <input
            id="title-edit"
            class="input"
            data-testid="input-title-edit"
            maxLength={40}
            value={title}
            onInput={(e) => setTitle((e.target as HTMLInputElement).value)}
          />
          {error && (
            <p class="field__error" data-testid="title-error">
              {error}
            </p>
          )}
        </div>
        <p class="field__help">
          Das Dashboard zeigt den neuen Titel, sobald dieses Handy Netz hat. Die Links bleiben gleich.
        </p>
        <button type="submit" class="btn btn--primary" data-testid="title-save" disabled={busy}>
          Speichern
        </button>
      </form>
    </Sheet>
  );
}

/** US5-S1: Mannschaft aus "Meine Mannschaften" hinzufügen. */
function AddSheet({
  options,
  busy,
  onAdd,
  onClose,
}: {
  options: LiveTeamOption[];
  busy: boolean;
  onAdd: (o: LiveTeamOption) => void;
  onClose: () => void;
}) {
  const [pick, setPick] = useState<LiveTeamOption | null>(null);
  return (
    <Sheet title="Mannschaft hinzufügen" testId="team-add-sheet" onClose={onClose}>
      <div class="field">
        <span class="field__label t-label" id="team-add-label">
          AUS „MEINE MANNSCHAFTEN“
        </span>
        <div class="chips" role="group" aria-labelledby="team-add-label">
          {options.map((o) => (
            <button
              type="button"
              key={o.team.id}
              class="chip chip--wide"
              aria-pressed={pick?.team.id === o.team.id}
              data-testid={`team-add-chip-${o.key}`}
              onClick={() => setPick(o)}
            >
              <Mark color={o.team.homeColor} />
              {o.key}
            </button>
          ))}
        </div>
      </div>
      <p class="field__help">
        Zuschauer-Link und Trainer-Link bleiben gleich. Die anderen Trainer-Handys übernehmen die Mannschaft, sobald sie
        das nächste Mal Stände empfangen, z. B. beim Anlegen eines Spiels.
      </p>
      <button
        type="button"
        class="btn btn--primary"
        data-testid="team-add-save"
        disabled={!pick || busy}
        onClick={() => pick && onAdd(pick)}
      >
        Hinzufügen
      </button>
    </Sheet>
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
    const verified = await verifyLink(link);
    if (verified) onLink(verified);
    else setError(`Dieser ${link.kind === 'trainer' ? 'Trainer-Link' : 'Lead-Link'} ist nicht gültig.`);
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
