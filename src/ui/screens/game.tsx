import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import {
  canAct,
  clockOf,
  endSection,
  kickoff,
  markSignalled,
  pauseClock,
  resumeClock,
  sectionLabel,
  swapVenue,
} from '../../domain/game';
import {
  addCard,
  addMark,
  addSub,
  cardLabel,
  cardText,
  gameEvents,
  isMark,
  MARK_COMMENT_MAX,
  removeEvent,
  setMarkComment,
  subText,
  updateCard,
  updateSub,
} from '../../domain/events';
import { addGoal, homeAway, score, undoGoal } from '../../domain/goals';
import { canAddLateGoal, canUndoWhistle, restRange, undoWhistle, whistleKind } from '../../domain/corrections';
import { formatMinute } from '../../domain/minute';
import { formatTime } from '../../domain/format';
import { activePlayers, otherPlayers, squadPlayers, visiblePlayers } from '../../domain/roster';
import { shortTeamName } from '../../domain/team-name';
import { anyEventFeature } from '../../domain/settings';
import type { CardColor, EventPerson, Game, Player, Settings, Side } from '../../domain/types';
import { kaderAsText, kitOf, parentAllowed, tickerSpieltag, tickerLine, type Ticker } from '../../domain/live-parent';
import { viewerPlayers } from '../../domain/viewer-squad';
import { buildShareText, markShared, needsReshare } from '../../domain/share-text';
import { getGame, getSettings, putGame } from '../../platform/db';
import {
  addShot,
  canExtraTime,
  endShootout,
  needsDrawDecision,
  settleDraw,
  shootoutState,
  startExtraTime,
  startShootout,
  undoShot,
} from '../../domain/cup';
import { totalSections } from '../../domain/minute';
import { shareText } from '../../platform/share';
import { audioReady, playSignal, setKeepAlive, unlockAudio } from '../../platform/signal';
import { keepAwake } from '../../platform/wake-lock';
import { ClockDisplay } from '../components/clock-display';
import type { LateDraft } from '../components/late-start-sheet';

/** Unterscheiden sich zwei Stände nur in den gemerkten Signalen (FR-007)? */
const onlySignals = (a: Game, b: Game): boolean =>
  JSON.stringify({ ...a, signalledThresholds: [] }) === JSON.stringify({ ...b, signalledThresholds: [] });

/** Spec 023 FR-J01: nur vor dem ersten Anpfiff (wie `canJoin`, ohne das nachgeladene Modul). */
const notStarted = (game: Game): boolean => game.clockEvents.length === 0;
import { Confirm } from '../components/confirm';
import { GoalButton } from '../components/goal-button';
import { applyKits, KitsSheet } from '../components/kits-sheet';
import { addGoalStep, PICKER_MS, type EditStep } from '../components/goal-steps';
import { loadGoalEditor, useGoalEditor } from '../components/goal-editor-load';
import { BookmarkIcon, CardGlyph, CardIcon, SubIcon } from '../components/event-icons';
import { GoalList } from '../components/goal-list';
import { LiveOthers } from '../components/live-others';
import { LivePill, useLiveStatus } from '../components/live-pill';
import { ShootoutView } from '../components/shootout';
import { MessageBand, type BandAction, type BandHint } from '../components/message-band';
import { useReshareTimer } from '../components/reshare-bar';
import { Scoreboard } from '../components/scoreboard';
import { Sheet } from '../components/sheet';
import { useDarkTheme, useNow, usePlayers } from '../hooks';
import { navigate } from '../router';
import { teamShortLabel } from '../../domain/history';
import { messageSlot, type SlotHint, type SlotMessage } from '../../domain/message-slot';
import { setLive } from '../../domain/live-snapshot';
import { liveTeamFor, sendingTeamFor } from '../../domain/live-spieltag';
import { onLiveSettings } from '../../platform/live-events';
import type { GameWatch } from '../../platform/live-watch';

const base = import.meta.env.BASE_URL;

type ShareSheetModule = typeof import('../components/share-sheet');
const UNDO_MS = 10_000;
const FLASH_MS = 3_000;
const HINT_MS = 1_500;
/** Spec 019 FR-A04: so lange steht das Ergebnis der Teilen-Aktion als Hinweis im Meldeband. */
const SHARE_MSG_MS = 5_000;

/** Spec 003 FR-E05: Schnellwahl für den Kommentar eines Lesezeichens. */
const QUICK_COMMENTS = ['Ansehen', 'Torchance', 'Abwehr', 'Standard'];

type Ask =
  | { kind: 'pause' | 'end' | 'swap' }
  | { kind: 'goalResume'; side: Side }
  | { kind: 'removeEvent'; id: string }
  | { kind: 'endShootout' }
  /** Spec 012 FR-S15: Pausen- bzw. Schlusspfiff zurücknehmen. */
  | { kind: 'undoWhistle' };

/** Spec 003: Entwurf einer Karte bzw. eines Wechsels (neu: id = null). */
type CardDraft = {
  id: string | null;
  at: number;
  card: CardColor;
  side: Side;
  oppText: string;
  comment: string;
  showNote: boolean;
  others: boolean;
};
type SubDraft = { id: string | null; at: number; out: string | null; inn: string | null; others: boolean };
const CARDS: CardColor[] = ['gelb', 'gelbrot', 'rot', 'zeit'];

export function GameScreen({ id, join = false, parent }: { id: string; join?: boolean; parent?: string }) {
  /** Spec 024 R-E6: Eltern-Fassung (Zuschauer-Link), Rückweg zum Dashboard. */
  const parentPath = parent ? `/live/${parent}` : null;
  const now = useNow(250);
  const dark = useDarkTheme();
  const [game, setGame] = useState<Game | null | undefined>(undefined);
  const [ask, setAsk] = useState<Ask | null>(null);
  const [menu, setMenu] = useState(false);
  /** Spec 017 R-C1: offenes Korrektur-Blatt (Tor-Blatt, Torschütze, Minute, Tor nachtragen). */
  const [edit, setEdit] = useState<EditStep | null>(null);
  const [undo, setUndo] = useState<{ goalId: string; until: number } | null>(null);
  const [flashUntil, setFlashUntil] = useState(0);
  const [hintUntil, setHintUntil] = useState(0);
  const [ownPlayers] = usePlayers();
  /** Spec 024 R-E5: Kader aus der Kopie (Eltern), für das Speichern als Freitext. */
  const parentPlayers = useRef<Player[]>([]);
  const [shareMsg, setShareMsg] = useState('');
  /** Spec 019 FR-A04: Der Teilen-Hinweis ist ein kurzer Hinweis und verschwindet nach SHARE_MSG_MS. */
  const [shareUntil, setShareUntil] = useState(0);
  const gameRef = useRef<Game | null>(null);
  // Spec 003: Ereignisse (Teil 1: Lesezeichen)
  const [settings, setSettings] = useState<Settings | null>(null);
  /** Spec 003 FR-E09: Auswahl der Kartenart nach "Karte". */
  const [cardPick, setCardPick] = useState(false);
  const [markUndo, setMarkUndo] = useState<{ id: string; until: number } | null>(null);
  const [markSheet, setMarkSheet] = useState<string | null>(null);
  const [markEdit, setMarkEdit] = useState<{ id: string; value: string } | null>(null);
  const [eventAt, setEventAt] = useState(0);
  const [cardDraft, setCardDraft] = useState<CardDraft | null>(null);
  const [subDraft, setSubDraft] = useState<SubDraft | null>(null);
  const [evUndo, setEvUndo] = useState<{ id: string; until: number } | null>(null);
  const [evSheet, setEvSheet] = useState<string | null>(null);
  // Spec 003 FR-P01 bis FR-P03: Pokal
  const [extraOpen, setExtraOpen] = useState(false);
  const [extraMin, setExtraMin] = useState(10);
  const [firstAsk, setFirstAsk] = useState(false);
  // Spec 012, Spec 023 FR-J20: Uhr korrigieren mit Restzeit (gewählt und beim Öffnen gerundet).
  const [clockFix, setClockFix] = useState<{ rest: number; start: number } | null>(null);
  /** Spec 023: Blatt "Spiel läuft schon", Blatt "Trikots" daraus (FR-J06) und "Rückgängig" nach dem Einstieg. */
  const [late, setLate] = useState<LateDraft | null>(null);
  const [lateKits, setLateKits] = useState(false);
  const [entryUndo, setEntryUndo] = useState<{ before: Game; text: string; until: number } | null>(null);
  /** Blatt "Spiel läuft schon" liegt im nachgeladenen Teil der Tor-Blätter (Bundle-Budget, Spec 021 R-W3). */
  const openLate = (): void =>
    void loadGoalEditor()
      .then((m) => {
        const g = gameRef.current;
        if (g && notStarted(g)) setLate(m.lateDraft(g));
      })
      .catch(() => undefined);
  /** Spec 017 FR-C10: Blatt "Trikots". */
  const [kitsOpen, setKitsOpen] = useState(false);
  /** Spec 017 FR-C21: Zeitpunkt der Korrektur, die "Korrigiert. Ergebnis neu teilen?" auslöst (0 = keine). */
  const [reshareAt, setReshareAt] = useState(0);
  useReshareTimer(reshareAt, () => setReshareAt(0));
  /**
   * Spec 020: Blatt "Teilen" mit "Live-Link für Eltern" (US2, FR-E60), vorab nachgeladen (R-E1, R-E10); Blatt
   * "Eltern live zuschauen lassen" ohne Live-Spieltag.
   */
  const [quick, setQuick] = useState<ShareSheetModule | null>(null);
  const [quickSheet, setQuickSheet] = useState(false);
  const [shareSheet, setShareSheet] = useState(false);
  useEffect(() => void import('../components/share-sheet').then(setQuick, () => undefined), []);
  /** Spec 021 R-W3: Tor-Blätter und Auswahl nachgeladen, beim Öffnen vorgeladen, bei Fehler beim nächsten Schritt neu. */
  const editor = useGoalEditor(edit);

  // Spec 024: Eltern erfassen ohne Vorlagen und Wechsel (dafür bräuchte es Kader-Kennungen auf dem Handy).
  const adjust = (s: Settings): Settings =>
    parentPath ? { ...s, features: { ...s.features, assists: false, subs: false } } : s;
  useEffect(() => {
    void getSettings().then((s) => setSettings(adjust(s)));
  }, []);
  // Spec 006 US5: Änderungen am Live-Spieltag (z. B. von einem anderen Trainer-Handy übernommen) übernehmen.
  useEffect(() => onLiveSettings((s) => setSettings(adjust(s))), []);

  useEffect(() => {
    void getGame(id).then((g) => {
      gameRef.current = g ?? null;
      setGame(g ?? null);
      // Spec 023 FR-J02, R-J6: aus "Neues Spiel" mit "Spiel läuft schon" gleich das Blatt öffnen.
      if (join) {
        openLate();
        navigate(parentPath ? `${parentPath}/spiel/${id}` : `/spiel/${id}`, true);
      }
    });
  }, [id]);

  /** FR-010: jede Änderung sofort speichern; erfüllt sich, wenn gespeichert ist. */
  const save = (raw: Game): Promise<void> => {
    // Spec 024 R-E5: Kinder aus der Kader-Kopie als Freitext (nichts gelangt in den Kader des Eltern-Handys).
    const g = parentPath ? kaderAsText(raw, parentPlayers.current) : raw;
    const before = gameRef.current;
    gameRef.current = g;
    setGame(g);
    // Spec 017 FR-C21: Korrektur an einem schon geteilten Ergebnis.
    if (before && needsReshare(before, g, players ?? [])) setReshareAt(Date.now());
    // Spec 023 FR-J05: "Rückgängig" gilt nur für den Einstieg selbst; jede weitere Erfassung (außer gemerkten
    // Signalen) beendet es, damit es nichts danach Erfasstes mitnimmt.
    if (before && !onlySignals(before, g)) setEntryUndo(null);
    return putGame(g);
  };
  const update = (g: Game): void => void save(g);
  /**
   * Spec 020 FR-E04, FR-E09: Live-Schalter nach dem Teilen auf den neuesten Stand (z. B. ein inzwischen gemerktes
   * Signal bleibt) und gespeichert, bevor das Spiel sofort gemeldet wird.
   */
  const goLive = async (live: (g: Game) => Game): Promise<void> => {
    const g = gameRef.current;
    if (g) await save(live(g));
  };

  // Spec 006 FR-L09: Menüeintrag nur, wenn dieses Gerät für die Mannschaft sendet (reagiert auf Start des Senders).
  const liveStatus = useLiveStatus(game);

  const clock = game ? clockOf(game, now) : null;
  const status = clock?.status;

  // Spec 006 US4 und FR-L24: eine Verbindung (nachgeladen), solange der Spielbildschirm eines nicht beendeten
  // Spiels offen und das Handy gekoppelt ist: Zeile mit den anderen Spielen und Übernahme durch ein anderes Handy.
  const [handedUntil, setHandedUntil] = useState(0);
  /** Spec 024 FR-E12: wer übernommen hat ("Anna tickert jetzt E2."). */
  const [handedBy, setHandedBy] = useState<Ticker | null>(null);
  const [watch, setWatch] = useState<GameWatch | null>(null);
  // Spec 024 R-E3: Eltern-Handy sendet mit dem Live-Spieltag aus dem Eltern-Paket.
  const tickerLive = useMemo(() => {
    const t = parentPath ? settings?.liveTicker : undefined;
    const kit = t ? kitOf(t.kit) : null;
    return t && kit ? tickerSpieltag(t, kit) : null;
  }, [settings?.liveTicker]);
  const live = settings?.live ?? tickerLive;
  const liveKey = game && live ? (sendingTeamFor(game, live)?.key ?? null) : null;
  const liveKeyRef = useRef(liveKey);
  liveKeyRef.current = liveKey;
  const watching = !!live && !!game && (status !== 'finished' || (!!game.shootout && !game.shootout.done));
  useEffect(() => {
    if (!live || !watching) return;
    let w: GameWatch | null = null;
    let alive = true;
    import('../../platform/live-watch')
      .then((m) => {
        if (!alive) return;
        w = m.watchGame(live, {
          team: () => liveKeyRef.current,
          current: () => gameRef.current,
          onTakenOver: (by) => {
            const g = gameRef.current;
            if (g) update(m.handOver(g));
            setHandedBy(by);
            setHandedUntil(Date.now() + 10_000);
          },
        });
        setWatch(w);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
      w?.stop();
      setWatch(null);
    };
    // Nur bei anderem Spiel, anderem Live-Spieltag oder Schlusspfiff neu verbinden bzw. trennen.
  }, [id, live?.topic, watching]);
  // FR-L24 auch prüfen, wenn dieses Handy (wieder) für die Mannschaft sendet, ohne dass eine Meldung kommt.
  useEffect(() => watch?.check(), [watch, liveKey]);
  // Spec 024 US4-S3: Trainer haben "Eltern dürfen tickern" ausgeschaltet; hier wird nur noch lokal erfasst.
  const boardConfig = parentPath ? (watch?.board().config ?? null) : null;
  const parentOff = !!boardConfig && !!liveKey && !parentAllowed(boardConfig, liveKey);
  const [offNotice, setOffNotice] = useState(false);
  useEffect(() => {
    if (!parentOff) return setOffNotice(false);
    setOffNotice(true);
    setHandedUntil(Date.now() + 10_000);
  }, [parentOff]);
  // Spec 024 FR-E16: Eltern wählen Torschützen aus der Kader-Kopie ihrer Mannschaft.
  const players = parentPath ? viewerPlayers(watch?.board().squads ?? [], liveKey ?? '') : ownPlayers;
  if (parentPath) parentPlayers.current = players ?? [];
  const ownKey = game && live ? (liveTeamFor(game.ownTeam, live)?.key ?? null) : null;

  // FR-007: Signal bei 00:00 und jeder vollen Nachspielminute; einmal je Schwelle, auch nach Neuladen.
  const due = clock?.dueThresholds.join(',') ?? '';
  useEffect(() => {
    const g = gameRef.current;
    if (!g || due === '') return;
    playSignal();
    setFlashUntil(Date.now() + FLASH_MS);
    update(markSignalled(g, due.split(',')));
  }, [due]);

  // FR-013: Bildschirm wach halten, solange die Uhr läuft oder angehalten ist.
  useEffect(() => {
    keepAwake(status === 'running' || status === 'paused');
    setKeepAlive(status === 'running' || status === 'paused');
  }, [status]);
  useEffect(
    () => () => {
      keepAwake(false);
      setKeepAlive(false);
    },
    [],
  );

  // US3-S2, Spec 009 FR-V02: Schnellauswahl schließt sich nach Ablauf von selbst.
  const quickUntil = edit && (edit.kind === 'scorer' || edit.kind === 'assist') ? edit.until : undefined;
  const pickerExpired = quickUntil !== undefined && now >= quickUntil;
  useEffect(() => {
    if (pickerExpired) setEdit(null);
  }, [pickerExpired]);

  if (game === undefined) return <main class="game" aria-busy="true" />;
  if (game === null || !clock) {
    return (
      <main class="page">
        <p class="t-text">Dieses Spiel gibt es nicht mehr.</p>
        <button type="button" class="btn btn--primary" onClick={() => navigate(parentPath ?? '/')}>
          {parentPath ? 'Zurück zu Live' : 'Zur Startseite'}
        </button>
      </main>
    );
  }

  /** Neuester Stand für Handler: schnelle Taps hintereinander dürfen sich nicht überschreiben. */
  const cur = (): Game => gameRef.current ?? game;
  const ownShort = shortTeamName(game.ownTeam);
  const s = score(game);
  const ha = homeAway(game.venue, s);
  const [homeSide, awaySide]: [Side, Side] = game.venue === 'home' ? ['own', 'opp'] : ['opp', 'own'];
  const teamName = (side: Side): string => (side === 'own' ? game.ownTeam : game.opponent);
  const buttonName = (side: Side): string => (side === 'own' ? ownShort : game.opponent);
  const colorOf = (side: Side): string => (side === 'own' ? game.ownColor : game.oppColor);
  const goalsOpen = status === 'running' || status === 'paused';
  const lastSection = clock.section >= totalSections(game.schema);
  const endLabel = lastSection ? 'Schlusspfiff' : 'Pausenpfiff';
  const overtime = clock.isOvertime && goalsOpen;

  const shootoutActive = !!game.shootout && !game.shootout.done;
  const headerLabel =
    status === 'finished'
      ? shootoutActive
        ? 'Elfmeterschießen'
        : 'Schlusspfiff'
      : status === 'break'
        ? game.schema.sections === 2 && clock.kickoffSection === 2
          ? 'Halbzeitpause'
          : 'Pause'
        : sectionLabel(clock.section, game.schema.sections);

  const onGoal = (side: Side): void => {
    // FR-021: Bei angehaltener Uhr erst fragen, ob die Uhr weiterlaufen soll.
    if (clockOf(cur(), Date.now()).status === 'paused') {
      setAsk({ kind: 'goalResume', side });
      return;
    }
    const t = Date.now();
    const r = addGoal(cur(), side, t);
    if (r.added && r.goal) {
      update(r.game);
      setUndo({ goalId: r.goal.id, until: t + UNDO_MS });
      // Spec 021 FR-W11: Das gezählte Tor schließt eine offene Schnellauswahl (ohne Torschützen bzw. Vorlage);
      // bei einem Feuerbach-Tor mit Kader gilt die Auswahl dem neuen Tor.
      setEdit(
        side === 'own' && activePlayers(players ?? []).length > 0
          ? { kind: 'scorer', goalId: r.goal.id, until: t + PICKER_MS }
          : null,
      );
    } else if (r.reason === 'double') {
      setHintUntil(t + HINT_MS);
    }
  };

  /** Spec 019 FR-A04, Spec 020 FR-E11: kurzer Hinweis im Meldeband. */
  const showMsg = (text: string): void => {
    setShareMsg(text);
    setShareUntil(Date.now() + SHARE_MSG_MS);
  };
  const showShareResult = (r: string): void =>
    showMsg(r === 'copied' ? 'Text in die Zwischenablage kopiert.' : r === 'failed' ? 'Teilen nicht möglich.' : '');

  /** FR-011: Ergebnis direkt nach dem Schlusspfiff teilen (Fallback Zwischenablage); Spec 017 FR-C20 merkt es. */
  const doShare = async (): Promise<void> => {
    setReshareAt(0);
    const r = await shareText(buildShareText(cur(), players ?? []));
    if (r === 'shared' || r === 'copied') update(markShared(cur(), Date.now()));
    showShareResult(r);
  };

  /** FR-042: Zwischenstand während des Spiels teilen (Fallback Zwischenablage). */
  const doShareInterim = async (): Promise<void> => {
    const r = await shareText(buildShareText(cur(), players ?? [], undefined, Date.now()));
    showShareResult(r);
  };

  const doKickoff = (): void => {
    setKeepAlive(true);
    unlockAudio();
    update(kickoff(cur(), Date.now()));
  };

  const confirmYes = (): void => {
    const t = Date.now();
    if (!ask) return;
    const g = cur();
    if (ask.kind === 'pause' && canAct(g, 'pause', t)) update(pauseClock(g, t));
    if (ask.kind === 'end' && canAct(g, 'end', t)) update(endSection(g, t));
    if (ask.kind === 'swap') update(swapVenue(g));
    if (ask.kind === 'goalResume' && canAct(g, 'resume', t)) {
      update(resumeClock(g, t));
      setAsk(null);
      onGoal(ask.side);
      return;
    }
    if (ask.kind === 'removeEvent') {
      update(removeEvent(g, ask.id));
      setEvSheet(null);
    }
    if (ask.kind === 'endShootout') update(endShootout(g));
    if (ask.kind === 'undoWhistle' && canUndoWhistle(g, t)) update(undoWhistle(g, t));
    setAsk(null);
  };

  const ASK_TEXT: Record<Ask['kind'], [string, string, string]> = {
    pause: ['Uhr wirklich anhalten?', 'Die Uhr steht, bis du auf „Uhr fortsetzen“ tippst.', 'Anhalten'],
    end: lastSection
      ? ['Schlusspfiff?', 'Das Spiel wird beendet und gespeichert.', 'Schlusspfiff']
      : ['Pausenpfiff?', `Die ${sectionLabel(clock.section, game.schema.sections)} endet.`, 'Pausenpfiff'],
    goalResume: [
      'Tor eintragen und Uhr fortsetzen?',
      'Die Uhr ist angehalten. Mit „Tor + weiter“ läuft sie wieder und das Tor wird gezählt.',
      'Tor + weiter',
    ],
    removeEvent: ['Eintrag entfernen?', 'Die Karte bzw. der Wechsel wird gelöscht.', 'Entfernen'],
    endShootout: [
      'Elfmeterschießen beenden?',
      'Der Stand im Elfmeterschießen wird als Ergebnis gespeichert.',
      'Beenden',
    ],
    swap: [
      'Heim und Gast tauschen?',
      'Die Mannschaften wechseln die Seite. Tore bleiben ihrer Mannschaft zugeordnet.',
      'Tauschen',
    ],
    undoWhistle: [
      `${whistleKind(game) ?? 'Pfiff'} zurücknehmen?`,
      'Die Uhr läuft weiter, als wäre nicht gepfiffen worden.',
      'Zurücknehmen',
    ],
  };

  const undoGoalObj = undo && now < undo.until ? game.goals.find((g) => g.id === undo.goalId) : undefined;
  const doUndo = (goalId: string): void => {
    update(undoGoal(cur(), goalId));
    setUndo(null);
    setEdit(null);
  };
  /** Torschützen- bzw. Vorlagen-Auswahl offen: ohne Rückgängig-Leiste (in der Schnellauswahl steht "Rückgängig"). */
  const pickerOpen = !!edit && (edit.kind === 'scorer' || edit.kind === 'assist') && !pickerExpired;
  /**
   * Spec 021 FR-W10: Schnellauswahl direkt nach dem Tor, angedockt über den Tor-Knöpfen; erst wenn der Teil geladen
   * ist (bis dahin bleibt der Spielbildschirm, wie er ist, R-W3). Im Elfmeterschießen gibt es keine Tor-Knöpfe:
   * dort erscheint sie als Blatt.
   */
  const docked = !!editor && pickerOpen && quickUntil !== undefined && !shootoutActive;
  const roster = players ?? [];
  const flashing = now < flashUntil;
  /** Spec 017 R-C1: Tor-Blätter und Auswahl (nachgeladen, Spec 021 R-W3). */
  const editorFor = (step: EditStep | null, dock = false) =>
    editor && (
      <editor.GoalEditor
        docked={dock}
        game={game}
        players={roster}
        settings={settings}
        step={step}
        onStep={setEdit}
        cur={cur}
        update={update}
        now={now}
        undoGoalId={undoGoalObj?.id}
        onUndo={doUndo}
      />
    );

  // Spec 023 FR-J22: Uhr korrigieren nur bei laufender oder angehaltener Uhr und wenn es Spielraum gibt.
  const restRng = goalsOpen ? restRange(game, now) : null;

  /** Spec 023 FR-J04, FR-J05: Einstieg übernehmen; "Rückgängig" stellt das Spiel davor wieder her (ohne Trikots). */
  const doJoin = (): void => {
    if (!late || !editor) return;
    const t = Date.now();
    const before = cur();
    const next = editor.joinGame(before, editor.lateInput(before, late), t);
    setLate(null);
    if (next === before) return;
    setKeepAlive(true);
    unlockAudio();
    update(next);
    setEntryUndo({ before, text: editor.lateSummary(before, late), until: t + UNDO_MS });
  };
  const entryUndoObj = entryUndo && now < entryUndo.until ? entryUndo : null;

  // Spec 003 FR-E09: Knopfzeile ab Anpfiff bis Schlusspfiff, wenn mindestens ein Schalter an ist.
  const allEvents = gameEvents(game);
  const marks = allEvents.filter(isMark);
  const minuteAt = (at: number): string => {
    const c = clockOf(game, at);
    return formatMinute(c.minute, c.stoppage);
  };
  // Spec 013 FR-K05: jede Spieler-Auswahl in der Reihenfolge aus den Einstellungen.
  const sort = settings?.rosterSort ?? 'name';
  const squadPl = squadPlayers(roster, game.squad, sort);
  const otherPl = otherPlayers(roster, game.squad, sort);
  const evUndoObj = evUndo && now < evUndo.until ? allEvents.find((e) => e.id === evUndo.id) : undefined;
  const evSel = evSheet ? allEvents.find((e) => e.id === evSheet) : undefined;
  const saveCard = (who: EventPerson): void => {
    const d = cardDraft;
    if (!d) return;
    const input = { side: d.side, card: d.card, who, comment: d.comment };
    setCardDraft(null);
    if (d.id) {
      update(updateCard(cur(), d.id, input));
      return;
    }
    const r = addCard(cur(), input, d.at);
    if (r) {
      update(r.game);
      setEvUndo({ id: r.event.id, until: Date.now() + UNDO_MS });
    }
  };
  const saveSub = (): void => {
    const d = subDraft;
    if (!d?.out || !d.inn) return;
    setSubDraft(null);
    if (d.id) {
      update(updateSub(cur(), d.id, d.out, d.inn));
      return;
    }
    const r = addSub(cur(), d.out, d.inn, d.at);
    if (r) {
      update(r.game);
      setEvUndo({ id: r.event.id, until: Date.now() + UNDO_MS });
    }
  };
  const eventsOpen = settings !== null && anyEventFeature(settings) && (goalsOpen || status === 'break');
  const markUndoObj = markUndo && now < markUndo.until ? marks.find((m) => m.id === markUndo.id) : undefined;
  const markSel = markSheet ? marks.find((m) => m.id === markSheet) : undefined;
  const markEditObj = markEdit ? marks.find((m) => m.id === markEdit.id) : undefined;
  const doMark = (): void => {
    const t = Date.now();
    const r = addMark(cur(), t);
    if (!r) return;
    update(r.game);
    setMarkUndo({ id: r.event.id, until: t + UNDO_MS });
  };

  // FR-007: Nach Hintergrund oder Neuladen ist der Ton auf iOS gesperrt; jede Berührung schaltet ihn wieder frei.
  const reArmAudio = (): void => {
    if (!audioReady()) unlockAudio();
  };
  const showAudioHint = (status === 'running' || status === 'paused') && !audioReady();

  // Spec 019 FR-A01 bis FR-A04: ein Meldeplatz, höchstens eine Meldung und ein Hinweis.
  const slot = messageSlot({
    goalUndo: !!undoGoalObj,
    pickerOpen,
    markUndo: !!markUndoObj,
    eventUndo: !!evUndoObj,
    reshare: reshareAt > 0,
    entryUndo: !!entryUndoObj,
    handedOver: now < handedUntil,
    shareResult: !!shareMsg && now < shareUntil,
    doubleTap: now < hintUntil,
  });
  const hints: Record<SlotHint, BandHint> = {
    handedOver: {
      testId: 'live-handed-over',
      // Spec 024 FR-E12: mit Namen, wenn der neue Stand ihn nennt; US4-S3: Tickern für Eltern ausgeschaltet.
      text: offNotice
        ? 'Die Trainer haben das Tickern für Eltern ausgeschaltet. Hier wird nur noch lokal erfasst.'
        : handedBy
          ? `${tickerLine(handedBy, { own: false, ended: false })?.tag ?? ''} tickert jetzt ${ownKey ?? teamShortLabel(game.ownTeam)}. Hier wird nur noch lokal erfasst.`
          : `${teamShortLabel(game.ownTeam)} überträgt jetzt ein anderes Handy. Hier wird nur noch lokal erfasst.`,
    },
    shareResult: { testId: 'share-result', text: shareMsg },
    doubleTap: { testId: 'double-tap-hint', text: 'Schon gezählt' },
  };
  const bandHint = slot.hint ? hints[slot.hint] : null;
  const undoAction = (testId: string, onClick: () => void): BandAction => ({
    label: 'Rückgängig',
    testId,
    undo: true,
    onClick,
  });
  /** Je Meldung Testkennung, Text und Knöpfe; null, wenn das zugehörige Objekt gerade fehlt. */
  const messages: Record<SlotMessage, () => { testId: string; text: string; actions: BandAction[] } | null> = {
    goal: () =>
      undoGoalObj
        ? {
            testId: 'undo-bar',
            text: `Tor ${undoGoalObj.side === 'own' ? ownShort : game.opponent} ${formatMinute(undoGoalObj.minute, undoGoalObj.stoppage)} erfasst`,
            actions: [undoAction('btn-undo', () => doUndo(undoGoalObj.id))],
          }
        : null,
    mark: () =>
      markUndoObj
        ? {
            testId: 'mark-toast',
            text: `Lesezeichen ${formatMinute(markUndoObj.minute, markUndoObj.stoppage)} gesetzt`,
            actions: [
              {
                label: 'Kommentar',
                testId: 'mark-comment',
                onClick: () => {
                  setMarkUndo(null);
                  setMarkEdit({ id: markUndoObj.id, value: markUndoObj.comment });
                },
              },
              undoAction('mark-undo', () => {
                update(removeEvent(cur(), markUndoObj.id));
                setMarkUndo(null);
              }),
            ],
          }
        : null,
    event: () =>
      evUndoObj
        ? {
            testId: 'event-toast',
            text: `${evUndoObj.kind === 'card' ? cardLabel(evUndoObj.card) : 'Wechsel'} ${formatMinute(evUndoObj.minute, evUndoObj.stoppage)} erfasst`,
            actions: [
              undoAction('event-undo', () => {
                update(removeEvent(cur(), evUndoObj.id));
                setEvUndo(null);
              }),
            ],
          }
        : null,
    entry: () =>
      entryUndoObj
        ? {
            testId: 'entry-undo-bar',
            text: entryUndoObj.text,
            actions: [
              undoAction('entry-undo', () => {
                const g = cur();
                update({ ...entryUndoObj.before, ownColor: g.ownColor, oppColor: g.oppColor });
                setEntryUndo(null);
              }),
            ],
          }
        : null,
    reshare: () => ({
      testId: 'reshare-bar',
      text: 'Korrigiert. Ergebnis neu teilen?',
      actions: [{ label: 'Teilen', testId: 'reshare-share', onClick: () => void doShare() }],
    }),
  };
  const msg = slot.message ? messages[slot.message]() : null;
  const band = msg ? (
    <MessageBand testId={msg.testId} text={msg.text} actions={msg.actions} hint={bandHint} />
  ) : bandHint ? (
    <MessageBand testId="message-band" hint={bandHint} />
  ) : null;

  return (
    <main
      class={docked ? 'game game--pick' : status === 'finished' && !shootoutActive ? 'game game--done' : 'game'}
      onPointerDown={reArmAudio}
    >
      <h1 class="visually-hidden">
        Spiel {teamName(homeSide)} gegen {teamName(awaySide)}
      </h1>
      <header class="game__header">
        <img
          class="game__wappen"
          src={`${base}brand/wappen.svg`}
          alt="Wappen der Sportvg Feuerbach"
          width={22}
          height={26}
        />
        <span class={overtime ? 'game__section game__section--overtime' : 'game__section'}>
          <span data-testid="section-label">{headerLabel}</span>
          {overtime && <span> · Nachspielzeit</span>}
        </span>
        {showAudioHint && (
          <button type="button" class="audio-hint" data-testid="audio-hint" onClick={unlockAudio}>
            Ton aus · tippen
          </button>
        )}
        <LivePill game={game} />
        {parentPath && (
          <button
            type="button"
            class="btn btn--secondary btn--small parent-back"
            data-testid="parent-back"
            onClick={() => navigate(parentPath)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" class="icon">
              <path d="M15 5l-7 7 7 7" />
            </svg>
            Zurück zu Live
          </button>
        )}
        <button
          type="button"
          class="icon-btn"
          aria-label="Weitere Aktionen"
          aria-haspopup="dialog"
          data-testid="btn-menu"
          onClick={() => setMenu(true)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" class="icon icon--filled">
            <circle cx="5" cy="12" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="19" cy="12" r="2" />
          </svg>
        </button>
      </header>
      {parentPath && (
        <p
          class={(game.liveHandedOver && game.live === false) || parentOff ? 'parent-as parent-as--off' : 'parent-as'}
          data-testid="parent-as"
        >
          {(game.liveHandedOver && game.live === false) || parentOff ? (
            'Nur noch lokal erfasst'
          ) : (
            <>
              <span class="live-pill__dot" aria-hidden="true" />
              Du tickerst als {settings?.tickerName ?? ''} · live
            </>
          )}
        </p>
      )}
      {/*
        Spec 021 FR-W10: alles zwischen Kopfzeile und Tor-Bereich in einer Fläche; die Schnellauswahl füllt sie genau
        (Flex statt fester Rechnung). Im Elfmeterschießen ohne eigene Fläche (Inhalt wie bisher direkt im Spiel).
      */}
      <div class={shootoutActive ? 'game__body game__body--flat' : 'game__body'}>
        {watch && <LiveOthers watch={watch} gameId={game.id} team={ownKey} now={now} />}

        <Scoreboard
          homeName={buttonName(homeSide)}
          awayName={buttonName(awaySide)}
          homeColor={colorOf(homeSide)}
          awayColor={colorOf(awaySide)}
          score={`${ha.home} : ${ha.away}`}
          onSwap={status === 'created' ? () => update(swapVenue(cur())) : undefined}
        />
        {shootoutActive && band && <div class="band-dock">{band}</div>}
        {shootoutActive ? (
          <ShootoutView
            game={game}
            players={roster}
            sort={sort}
            ownName={ownShort}
            dark={dark}
            onShot={(hit, who) => update(addShot(cur(), hit, who, Date.now()))}
            onUndo={() => update(undoShot(cur()))}
            onEnd={() => setAsk({ kind: 'endShootout' })}
          />
        ) : (
          <>
            {game.shootout?.done &&
              (() => {
                const st = shootoutState(game);
                const p = homeAway(game.venue, { own: st.own, opp: st.opp });
                return (
                  <p class="shootout-result" data-testid="shootout-result">
                    {p.home}:{p.away} i. E.
                  </p>
                );
              })()}

            <ClockDisplay clock={clock} flash={flashing} />

            <section class="controls">
              {(status === 'created' || status === 'break') && (
                <button
                  type="button"
                  // Spec 023 FR-J01: vor dem ersten Anpfiff neben "Spiel läuft schon" (iPhone SE ohne Scrollen).
                  class={notStarted(game) ? 'btn btn--primary' : 'btn btn--primary controls__wide'}
                  data-testid="btn-kickoff"
                  onClick={doKickoff}
                >
                  {status === 'created' || clock.kickoffSection === null
                    ? 'Anpfiff'
                    : `Anpfiff ${sectionLabel(clock.kickoffSection, game.schema.sections)}`}
                </button>
              )}
              {notStarted(game) && (
                <button type="button" class="btn btn--secondary" data-testid="btn-late" onClick={openLate}>
                  Spiel läuft schon
                </button>
              )}
              {status === 'running' && (
                <button
                  type="button"
                  class="btn btn--secondary"
                  data-testid="btn-pause"
                  onClick={() => setAsk({ kind: 'pause' })}
                >
                  Uhr anhalten
                </button>
              )}
              {status === 'paused' && (
                <button
                  type="button"
                  class="btn btn--secondary"
                  data-testid="btn-resume"
                  onClick={() => canAct(cur(), 'resume', Date.now()) && update(resumeClock(cur(), Date.now()))}
                >
                  Uhr fortsetzen
                </button>
              )}
              {goalsOpen && (
                <button
                  type="button"
                  class={overtime ? 'btn btn--primary' : 'btn btn--secondary'}
                  data-testid="btn-section-end"
                  onClick={() => setAsk({ kind: 'end' })}
                >
                  {endLabel}
                </button>
              )}
              {status === 'finished' && (
                <>
                  {!parentPath && (
                    <button
                      type="button"
                      class="btn btn--secondary"
                      onClick={() => navigate(`/spiel/${game.id}/details`)}
                    >
                      Spieldetails
                    </button>
                  )}
                  {/* Spec 021 FR-W01: eine Hauptaktion je Seite ("Nächstes Spiel"); teilen bleibt ein Tipp. */}
                  <button
                    type="button"
                    class="btn btn--secondary"
                    data-testid="btn-share"
                    onClick={() => void doShare()}
                  >
                    Ergebnis teilen
                  </button>
                </>
              )}
            </section>

            {eventsOpen && settings && (
              <section class="event-row" aria-label="Ereignisse erfassen" data-testid="event-row">
                {settings.features.cards && (
                  <button
                    type="button"
                    class="btn btn--quiet event-row__btn"
                    data-testid="btn-event-card"
                    onClick={() => {
                      setEventAt(Date.now());
                      setCardPick(true);
                    }}
                  >
                    <CardIcon size={18} />
                    Karte
                  </button>
                )}
                {settings.features.subs && (
                  <button
                    type="button"
                    class="btn btn--quiet event-row__btn"
                    data-testid="btn-event-sub"
                    onClick={() => setSubDraft({ id: null, at: Date.now(), out: null, inn: null, others: false })}
                  >
                    <SubIcon size={18} />
                    Wechsel
                  </button>
                )}
                {settings.features.marks && (
                  <button
                    type="button"
                    class="btn btn--quiet event-row__btn"
                    data-testid="btn-event-mark"
                    onClick={doMark}
                  >
                    <BookmarkIcon size={18} />
                    Lesezeichen
                  </button>
                )}
              </section>
            )}

            <GoalList
              game={game}

              players={roster}
              onOpen={(g) => setEdit({ kind: 'goal', goalId: g.id })}
              events={allEvents}
              onOpenEvent={(ev) => (ev.kind === 'mark' ? setMarkSheet(ev.id) : setEvSheet(ev.id))}
            />
          </>
        )}
        {docked && (
          // Spec 021 FR-W14: Auswahl über den Tor-Knöpfen, Meldungen darunter direkt über den Knöpfen.
          <div class="goal-dock">
            {editorFor(edit, true)}
            {band}
          </div>
        )}
      </div>
      {!shootoutActive && (
        <div class={status === 'finished' ? 'goal-zone goal-zone--done' : 'goal-zone'}>
          {!docked && band}
          {status === 'finished' ? (
            // Spec 021 FR-W01: nach dem Schlusspfiff "Nächstes Spiel" statt ausgegrauter Tor-Knöpfe.
            <div class="next-game">
              {parentPath ? (
                <button
                  type="button"
                  class="btn next-game__btn"
                  data-testid="parent-back-end"
                  onClick={() => navigate(parentPath)}
                >
                  Zurück zu Live
                </button>
              ) : (
                <button
                  type="button"
                  class="btn next-game__btn"
                  data-testid="btn-next-game"
                  onClick={() => navigate(`/neu/nach/${game.id}`)}
                >
                  Nächstes Spiel
                </button>
              )}
            </div>
          ) : (
            <section class="goal-buttons" aria-label="Tore erfassen">
              {[homeSide, awaySide].map((side) => (
                <GoalButton
                  key={side}
                  testId={side === 'own' ? 'btn-goal-own' : 'btn-goal-opp'}
                  team={buttonName(side)}
                  colorId={colorOf(side)}
                  dark={dark}
                  disabled={!goalsOpen}
                  onGoal={() => onGoal(side)}
                />
              ))}
            </section>
          )}
        </div>
      )}

      {flashing && <div class="signal-flash" data-testid="signal-flash" aria-hidden="true" />}

      {shareSheet && quick && settings && (
        <quick.ShareSheet
          settings={settings}
          game={cur()}
          onGameLive={goLive}
          onMsg={showMsg}
          onStart={() => setQuickSheet(true)}
          onText={() => void doShareInterim()}
          onClose={() => setShareSheet(false)}
        />
      )}
      {quickSheet && quick && settings && (
        <quick.LiveStartSheet
          settings={settings}
          game={cur()}
          onGameLive={goLive}
          onSettings={setSettings}
          onClose={() => setQuickSheet(false)}
        />
      )}

      {menu && (
        <Sheet title="Spiel" testId="game-menu" onClose={() => setMenu(false)}>
          {goalsOpen || status === 'break' ? (
            <button
              type="button"
              class="btn btn--secondary"
              data-testid="menu-share"
              onClick={() => {
                setMenu(false);
                // Spec 020 FR-E18: Blatt "Teilen"; ohne nachgeladenes Modul wie bisher der Zwischenstand.
                // Spec 024: Eltern teilen den Stand als Text (der Link für Eltern ist schon in der Gruppe).
                if (quick && !parentPath) setShareSheet(true);
                else void doShareInterim();
              }}
            >
              Teilen
            </button>
          ) : null}
          {canAddLateGoal(game, now) && (
            <button
              type="button"
              class="btn btn--secondary"
              data-testid="menu-add-goal"
              onClick={() => {
                setMenu(false);
                setEdit(addGoalStep(cur(), Date.now()));
              }}
            >
              Tor nachtragen
            </button>
          )}
          {canUndoWhistle(game, now) && (
            <button
              type="button"
              class="btn btn--secondary"
              data-testid="menu-undo-whistle"
              onClick={() => {
                setMenu(false);
                setAsk({ kind: 'undoWhistle' });
              }}
            >
              {whistleKind(game)} zurücknehmen
            </button>
          )}
          {restRng && (
            <button
              type="button"
              class="btn btn--secondary"
              data-testid="menu-fix-clock"
              onClick={() => {
                setMenu(false);
                setClockFix({ rest: restRng.current, start: restRng.current });
              }}
            >
              Uhr korrigieren
            </button>
          )}
          {status !== 'created' && (
            <button
              type="button"
              class="btn btn--secondary"
              data-testid="menu-swap-venue"
              onClick={() => {
                setMenu(false);
                setAsk({ kind: 'swap' });
              }}
            >
              Heim und Gast tauschen
            </button>
          )}
          <button
            type="button"
            class="btn btn--secondary"
            data-testid="menu-kits"
            onClick={() => {
              setMenu(false);
              setKitsOpen(true);
            }}
          >
            Trikots ändern
          </button>
          {!parentPath && (
            <button
              type="button"
              class="btn btn--secondary"
              data-testid="menu-details"
              onClick={() => navigate(`/spiel/${game.id}/details`)}
            >
              Spieldetails
            </button>
          )}
          {/* Spec 020 FR-E61: ganz unten; "Nicht live senden" in Gefahr-Farbe wie "Live beenden …". */}
          {liveStatus !== null && liveStatus !== 'handed' && !parentPath && (
            <button
              type="button"
              class={game.live === false ? 'btn btn--secondary' : 'btn btn--secondary live__action--danger'}
              data-testid="menu-live-toggle"
              onClick={() => {
                setMenu(false);
                update(setLive(game, game.live === false));
              }}
            >
              {game.live === false ? 'Live senden' : 'Nicht live senden'}
            </button>
          )}
        </Sheet>
      )}

      {cardPick && eventsOpen && (
        <Sheet
          title="Karte"
          subtitle={`Minute ${minuteAt(eventAt)}`}
          testId="card-pick-sheet"
          onClose={() => setCardPick(false)}
        >
          <div class="pick-grid pick-grid--2">
            {CARDS.map((c) => (
              <button
                type="button"
                key={c}
                class="pick"
                data-testid={`event-card-${c}`}
                onClick={() => {
                  setCardPick(false);
                  setCardDraft({
                    id: null,
                    at: eventAt,
                    card: c,
                    side: 'own',
                    oppText: '',
                    comment: '',
                    showNote: false,
                    others: false,
                  });
                }}
              >
                <CardGlyph card={c} size={24} />
                <span>{cardLabel(c)}</span>
              </button>
            ))}
          </div>
        </Sheet>
      )}

      {cardDraft && (
        <Sheet
          title={cardDraft.id ? 'Karte ändern' : 'Karte'}
          subtitle={`Minute ${minuteAt(cardDraft.at)}`}
          testId="card-sheet"
          onClose={() => setCardDraft(null)}
        >
          <span class="field__label t-label">ART</span>
          <div class="pick-grid pick-grid--4" role="group" aria-label="Art der Karte">
            {CARDS.map((c) => (
              <button
                type="button"
                key={c}
                class="pick pick--small"
                aria-pressed={cardDraft.card === c}
                data-testid={`card-kind-${c}`}
                onClick={() => setCardDraft({ ...cardDraft, card: c })}
              >
                <CardGlyph card={c} size={20} />
                <span>{cardLabel(c)}</span>
              </button>
            ))}
          </div>
          <span class="field__label t-label">MANNSCHAFT</span>
          <div class="segmented segmented--2" role="group" aria-label="Mannschaft">
            {(['own', 'opp'] as const).map((sd) => (
              <button
                type="button"
                key={sd}
                class="segmented__item"
                aria-pressed={cardDraft.side === sd}
                data-testid={`card-side-${sd}`}
                onClick={() => setCardDraft({ ...cardDraft, side: sd })}
              >
                {sd === 'own' ? ownShort : game.opponent}
              </button>
            ))}
          </div>
          <div class="sheet__row">
            <span class="field__label t-label">SPIELER</span>
            {!cardDraft.showNote && (
              <button
                type="button"
                class="link-btn"
                data-testid="card-note"
                onClick={() => setCardDraft({ ...cardDraft, showNote: true })}
              >
                Kommentar
              </button>
            )}
          </div>
          {cardDraft.showNote && (
            <input
              class="input"
              data-testid="input-card-comment"
              value={cardDraft.comment}
              maxLength={MARK_COMMENT_MAX}
              autocomplete="off"
              placeholder="Kommentar (freiwillig)"
              aria-label="Kommentar"
              onInput={(e) => setCardDraft({ ...cardDraft, comment: e.currentTarget.value })}
            />
          )}
          {cardDraft.side === 'own' ? (
            <>
              <div class="scorer__grid">
                {(cardDraft.others ? visiblePlayers(roster, sort) : squadPl).map((pl) => (
                  <button
                    type="button"
                    key={pl.id}
                    class="scorer__option"
                    data-testid={`card-player-${pl.id}`}
                    onClick={() => saveCard({ kind: 'player', playerId: pl.id })}
                  >
                    {pl.number !== null && <span class="scorer__number">{pl.number}</span>}
                    {pl.name}
                  </button>
                ))}
              </div>
              {!cardDraft.others && otherPl.length > 0 && (
                <button
                  type="button"
                  class="btn btn--quiet btn--small"
                  data-testid="card-others"
                  onClick={() => setCardDraft({ ...cardDraft, others: true })}
                >
                  Andere …
                </button>
              )}
            </>
          ) : (
            <>
              <input
                class="input"
                data-testid="input-card-opp"
                value={cardDraft.oppText}
                maxLength={30}
                autocomplete="off"
                placeholder="Name oder Nr., z. B. Nr. 9"
                aria-label="Spieler des Gegners"
                onInput={(e) => setCardDraft({ ...cardDraft, oppText: e.currentTarget.value })}
              />
              <button
                type="button"
                class="btn btn--primary"
                data-testid="btn-save-card"
                onClick={() => saveCard({ kind: 'text', text: cardDraft.oppText })}
              >
                Speichern
              </button>
            </>
          )}
          <button type="button" class="btn btn--secondary" data-testid="card-no-player" onClick={() => saveCard(null)}>
            Ohne Spieler speichern
          </button>
        </Sheet>
      )}

      {subDraft && (
        <Sheet
          title={subDraft.id ? 'Wechsel ändern' : 'Wechsel'}
          subtitle={`Minute ${minuteAt(subDraft.at)}`}
          testId="sub-sheet"
          onClose={() => setSubDraft(null)}
        >
          {(() => {
            const pool = subDraft.others ? visiblePlayers(roster, sort) : squadPl;
            const name = (id: string | null): string => roster.find((pl) => pl.id === id)?.name ?? '…';
            const ready = subDraft.out !== null && subDraft.inn !== null;
            return (
              <>
                <span class="field__label t-label">WER GEHT RAUS?</span>
                <div class="scorer__grid scorer__grid--5">
                  {pool.map((pl) => (
                    <button
                      type="button"
                      key={pl.id}
                      class="scorer__option"
                      aria-pressed={subDraft.out === pl.id}
                      data-testid={`sub-out-${pl.id}`}
                      onClick={() =>
                        setSubDraft({ ...subDraft, out: pl.id, inn: subDraft.inn === pl.id ? null : subDraft.inn })
                      }
                    >
                      {pl.number !== null && <span class="scorer__number">{pl.number}</span>}
                      {pl.name}
                    </button>
                  ))}
                </div>
                <span class="field__label t-label">WER KOMMT REIN?</span>
                <div class="scorer__grid scorer__grid--5">
                  {pool
                    .filter((pl) => pl.id !== subDraft.out)
                    .map((pl) => (
                      <button
                        type="button"
                        key={pl.id}
                        class="scorer__option"
                        aria-pressed={subDraft.inn === pl.id}
                        data-testid={`sub-in-${pl.id}`}
                        onClick={() => setSubDraft({ ...subDraft, inn: pl.id })}
                      >
                        {pl.number !== null && <span class="scorer__number">{pl.number}</span>}
                        {pl.name}
                      </button>
                    ))}
                </div>
                {!subDraft.others && otherPl.length > 0 && (
                  <button
                    type="button"
                    class="btn btn--quiet btn--small"
                    data-testid="sub-others"
                    onClick={() => setSubDraft({ ...subDraft, others: true })}
                  >
                    Andere …
                  </button>
                )}
                <div class="sub-result" role="status" data-testid="sub-result">
                  <SubIcon />
                  {`${minuteAt(subDraft.at)} ${name(subDraft.inn)} für ${name(subDraft.out)}`}
                </div>
                <button
                  type="button"
                  class="btn btn--primary"
                  data-testid="btn-save-sub"
                  disabled={!ready}
                  onClick={saveSub}
                >
                  Wechsel speichern
                </button>
              </>
            );
          })()}
        </Sheet>
      )}

      {evSel && evSel.kind !== 'mark' && !ask && (
        <Sheet
          title={`${formatMinute(evSel.minute, evSel.stoppage)} ${
            evSel.kind === 'card' ? cardText(game, evSel, roster) : subText(evSel, roster)
          }`}
          subtitle={`erfasst um ${formatTime(evSel.at)} Uhr${evSel.kind === 'card' && evSel.comment ? ` · ${evSel.comment}` : ''}`}
          testId="event-actions"
          onClose={() => setEvSheet(null)}
        >
          <button
            type="button"
            class="btn btn--primary"
            data-testid="event-edit"
            onClick={() => {
              setEvSheet(null);
              if (evSel.kind === 'card')
                setCardDraft({
                  id: evSel.id,
                  at: evSel.at,
                  card: evSel.card,
                  side: evSel.side,
                  oppText: evSel.who?.kind === 'text' ? evSel.who.text : '',
                  comment: evSel.comment,
                  showNote: evSel.comment !== '',
                  others: (() => {
                    const who = evSel.who;
                    return who?.kind === 'player' && !squadPl.some((pl) => pl.id === who.playerId);
                  })(),
                });
              else setSubDraft({ id: evSel.id, at: evSel.at, out: evSel.outId, inn: evSel.inId, others: true });
            }}
          >
            Ändern
          </button>
          <button
            type="button"
            class="btn btn--secondary"
            data-testid="event-delete"
            onClick={() => setAsk({ kind: 'removeEvent', id: evSel.id })}
          >
            {evSel.kind === 'card' ? 'Karte entfernen' : 'Wechsel entfernen'}
          </button>
        </Sheet>
      )}

      {markSel && !markEdit && (
        <Sheet
          title={`Lesezeichen ${formatMinute(markSel.minute, markSel.stoppage)}${markSel.comment ? `, ${markSel.comment}` : ''}`}
          subtitle={`gesetzt um ${formatTime(markSel.at)} Uhr · nur für dich`}
          testId="mark-actions"
          onClose={() => setMarkSheet(null)}
        >
          <button
            type="button"
            class="btn btn--primary"
            data-testid="mark-edit"
            onClick={() => {
              setMarkSheet(null);
              setMarkEdit({ id: markSel.id, value: markSel.comment });
            }}
          >
            Kommentar ändern
          </button>
          <button
            type="button"
            class="btn btn--secondary"
            data-testid="mark-delete"
            onClick={() => {
              update(removeEvent(cur(), markSel.id));
              setMarkSheet(null);
            }}
          >
            Lesezeichen löschen
          </button>
        </Sheet>
      )}

      {markEdit && markEditObj && (
        <Sheet
          title={`Lesezeichen ${formatMinute(markEditObj.minute, markEditObj.stoppage)}`}
          subtitle={`gesetzt um ${formatTime(markEditObj.at)} Uhr · nur für dich, nie im geteilten Text`}
          testId="mark-comment-sheet"
          onClose={() => setMarkEdit(null)}
        >
          <label class="field__label t-label" for="mark-comment-input">
            KOMMENTAR (FREIWILLIG)
          </label>
          <input
            id="mark-comment-input"
            class="input"
            data-testid="input-mark-comment"
            value={markEdit.value}
            maxLength={MARK_COMMENT_MAX}
            autocomplete="off"
            placeholder="z. B. Szene ansehen"
            onInput={(e) => setMarkEdit({ ...markEdit, value: e.currentTarget.value })}
          />
          <div class="chips" role="group" aria-label="Schnellwahl">
            {QUICK_COMMENTS.map((q) => (
              <button
                type="button"
                key={q}
                class="chip"
                aria-pressed={markEdit.value === q}
                data-testid={`mark-quick-${q}`}
                onClick={() => setMarkEdit({ ...markEdit, value: markEdit.value === q ? '' : q })}
              >
                {q}
              </button>
            ))}
          </div>
          <button
            type="button"
            class="btn btn--primary"
            data-testid="btn-save-mark"
            onClick={() => {
              update(setMarkComment(cur(), markEdit.id, markEdit.value));
              setMarkEdit(null);
            }}
          >
            Speichern
          </button>
        </Sheet>
      )}

      {(kitsOpen || (late && lateKits)) && (
        <KitsSheet
          game={game}
          dark={dark}
          onSave={(own, opp) => {
            applyKits(cur(), own, opp, update);
            setKitsOpen(false);
            setLateKits(false);
          }}
          onClose={() => {
            setKitsOpen(false);
            setLateKits(false);
          }}
        />
      )}

      {/* Wie bisher: das Tor-Blatt verschwindet hinter einer Rückfrage; die Schnellauswahl steht im Tor-Bereich. */}
      {editorFor(docked || (ask && edit?.kind === 'goal') ? null : edit)}

      {needsDrawDecision(game) && !extraOpen && !firstAsk && !ask && (
        <div class="overlay overlay--center">
          <div class="overlay__backdrop" />
          <div
            class="dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="draw-title"
            data-testid="draw-dialog"
          >
            <h2 id="draw-title" class="dialog__title">
              Unentschieden {ha.home}:{ha.away}
            </h2>
            <p class="dialog__text">Wie geht es weiter?</p>
            <button
              type="button"
              class="btn btn--primary"
              data-testid="draw-accept"
              onClick={() => update(settleDraw(cur()))}
            >
              Unentschieden
            </button>
            {canExtraTime(game) && (
              <button
                type="button"
                class="btn btn--secondary"
                data-testid="draw-extra"
                onClick={() => setExtraOpen(true)}
              >
                Verlängerung
              </button>
            )}
            <button
              type="button"
              class="btn btn--secondary"
              data-testid="draw-shootout"
              onClick={() => setFirstAsk(true)}
            >
              Elfmeterschießen
            </button>
          </div>
        </div>
      )}

      {extraOpen && (
        <Sheet
          title="Verlängerung"
          subtitle={`Es steht ${ha.home}:${ha.away}. Die Uhr zählt ab ${
            game.schema.sections * game.schema.sectionMinutes + 1
          }' weiter.`}
          testId="extra-sheet"
          onClose={() => setExtraOpen(false)}
        >
          <span class="field__label t-label">SPIELZEIT</span>
          <div class="schema">
            <span class="schema__times">2 ×</span>
            <div class="segmented segmented--inline" role="group" aria-label="Minuten je Hälfte">
              {[5, 10, 15].map((m) => (
                <button
                  type="button"
                  key={m}
                  class="segmented__item"
                  aria-pressed={extraMin === m}
                  data-testid={`extra-min-${m}`}
                  onClick={() => setExtraMin(m)}
                >
                  {m}
                </button>
              ))}
            </div>
            <span class="schema__unit">Minuten</span>
          </div>
          <button
            type="button"
            class="btn btn--primary"
            data-testid="btn-start-extra"
            onClick={() => {
              const t = Date.now();
              setKeepAlive(true);
              unlockAudio();
              update(kickoff(startExtraTime(cur(), extraMin, t), t));
              setExtraOpen(false);
            }}
          >
            Verlängerung anpfeifen
          </button>
        </Sheet>
      )}

      {firstAsk && (
        <div class="overlay overlay--center">
          <div class="overlay__backdrop" onClick={() => setFirstAsk(false)} />
          <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="first-title" data-testid="first-dialog">
            <h2 id="first-title" class="dialog__title">
              Wer schießt zuerst?
            </h2>
            {(['own', 'opp'] as const).map((sd) => (
              <button
                type="button"
                key={sd}
                class="btn btn--secondary"
                data-testid={`first-${sd}`}
                onClick={() => {
                  update(startShootout(cur(), sd));
                  setFirstAsk(false);
                }}
              >
                {sd === 'own' ? ownShort : game.opponent}
              </button>
            ))}
            <button type="button" class="btn btn--quiet" onClick={() => setFirstAsk(false)}>
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {clockFix !== null && restRng && editor && (
        <editor.ClockFixSheet
          game={game}
          clock={clock}
          range={restRng}
          fix={clockFix}
          onChange={setClockFix}
          onSave={() => {
            if (clockFix.rest !== clockFix.start) update(editor.setRest(cur(), clockFix.rest, Date.now()));
            setClockFix(null);
          }}
          onClose={() => setClockFix(null)}
        />
      )}

      {late && !lateKits && editor && (
        <editor.LateStartSheet
          game={game}
          draft={late}
          onChange={setLate}
          onKits={() => setLateKits(true)}
          onSave={doJoin}
          onClose={() => setLate(null)}
        />
      )}

      {ask && (
        <Confirm
          title={ASK_TEXT[ask.kind][0]}
          text={ASK_TEXT[ask.kind][1]}
          yesLabel={ASK_TEXT[ask.kind][2]}
          onYes={confirmYes}
          onNo={() => setAsk(null)}
        />
      )}
    </main>
  );
}
