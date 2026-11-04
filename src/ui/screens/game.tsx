import { useEffect, useRef, useState } from 'preact/hooks';
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
import {
  addGoal,
  homeAway,
  removeGoal,
  restoreGoal,
  score,
  scorerLabel,
  setPenalty,
  setScorer,
  undoGoal,
} from '../../domain/goals';
import { getColor } from '../../domain/jersey-colors';
import { formatMinute } from '../../domain/minute';
import { formatTime } from '../../domain/format';
import { otherPlayers, squadPlayers, visiblePlayers } from '../../domain/roster';
import { shortTeamName } from '../../domain/team-name';
import { anyEventFeature } from '../../domain/settings';
import type { CardColor, EventPerson, Game, Goal, Scorer, Settings, Side } from '../../domain/types';
import { buildShareText } from '../../domain/share-text';
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
import { Confirm } from '../components/confirm';
import { GoalButton } from '../components/goal-button';
import { BookmarkIcon, CardGlyph, SubIcon } from '../components/event-icons';
import { GoalList } from '../components/goal-list';
import { LivePill, useLiveStatus } from '../components/live-pill';
import { ShootoutView } from '../components/shootout';
import { ScorerPicker } from '../components/scorer-picker';
import { Sheet } from '../components/sheet';
import { useDarkTheme, useNow, usePlayers } from '../hooks';
import { navigate } from '../router';
import { teamShortLabel } from '../../domain/history';
import { setLive } from '../../domain/live-snapshot';
import { sendingTeamFor } from '../../domain/live-spieltag';
import { handOver } from '../../domain/live-takeover';

const base = import.meta.env.BASE_URL;
const UNDO_MS = 10_000;
const FLASH_MS = 3_000;
const HINT_MS = 1_500;
/** US3-S2: Schnellauswahl schließt nach 8 s ohne Torschützen. */
const PICKER_MS = 8_000;
/** Spec 003 FR-E05: Schnellwahl für den Kommentar eines Lesezeichens. */
const QUICK_COMMENTS = ['Ansehen', 'Torchance', 'Abwehr', 'Standard'];

type Ask =
  | { kind: 'pause' | 'end' | 'swap' }
  | { kind: 'remove'; goalId: string }
  | { kind: 'goalResume'; side: Side }
  | { kind: 'removeEvent'; id: string }
  | { kind: 'endShootout' };

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

function TeamMark({ colorId }: { colorId: string }) {
  return <span class="team__mark" style={{ background: getColor(colorId, true).value }} aria-hidden="true" />;
}

export function GameScreen({ id }: { id: string }) {
  const now = useNow(250);
  const dark = useDarkTheme();
  const [game, setGame] = useState<Game | null | undefined>(undefined);
  const [ask, setAsk] = useState<Ask | null>(null);
  const [menu, setMenu] = useState(false);
  const [sheetGoal, setSheetGoal] = useState<string | null>(null);
  const [undo, setUndo] = useState<{ goalId: string; until: number } | null>(null);
  const [flashUntil, setFlashUntil] = useState(0);
  const [hintUntil, setHintUntil] = useState(0);
  const [players] = usePlayers();
  const [shareMsg, setShareMsg] = useState('');
  /** Torschützen-Auswahl: `until` gesetzt = direkt nach dem Tor (mit Auto-Schließen), null = Nachtragen. */
  const [picker, setPicker] = useState<{ goalId: string; until: number | null } | null>(null);
  const [textEdit, setTextEdit] = useState<{ goalId: string; value: string } | null>(null);
  const gameRef = useRef<Game | null>(null);
  // Spec 003: Ereignisse (Teil 1: Lesezeichen)
  const [settings, setSettings] = useState<Settings | null>(null);
  const [eventSheet, setEventSheet] = useState(false);
  const [markUndo, setMarkUndo] = useState<{ id: string; until: number } | null>(null);
  const [markSheet, setMarkSheet] = useState<string | null>(null);
  const [markEdit, setMarkEdit] = useState<{ id: string; value: string } | null>(null);
  const [eventAt, setEventAt] = useState(0);
  const [cardDraft, setCardDraft] = useState<CardDraft | null>(null);
  const [subDraft, setSubDraft] = useState<SubDraft | null>(null);
  const [evUndo, setEvUndo] = useState<{ id: string; until: number } | null>(null);
  const [evSheet, setEvSheet] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  // Spec 003 FR-P01 bis FR-P03: Pokal
  const [extraOpen, setExtraOpen] = useState(false);
  const [extraMin, setExtraMin] = useState(10);
  const [firstAsk, setFirstAsk] = useState(false);

  useEffect(() => {
    void getSettings().then(setSettings);
  }, []);

  useEffect(() => {
    void getGame(id).then((g) => {
      gameRef.current = g ?? null;
      setGame(g ?? null);
    });
  }, [id]);

  /** FR-010: jede Änderung sofort speichern. */
  const update = (g: Game): void => {
    gameRef.current = g;
    setGame(g);
    void putGame(g);
  };

  // Spec 006 FR-L09: Menüeintrag nur, wenn dieses Gerät für die Mannschaft sendet (reagiert auf Start des Senders).
  const liveStatus = useLiveStatus(game);

  // Spec 006 FR-L24: merkt, wenn ein anderes Handy dieses Spiel übernimmt (nachgeladen, nur bei Live-Spielen).
  const [handedUntil, setHandedUntil] = useState(0);
  const liveKey = game && settings?.live ? (sendingTeamFor(game, settings.live)?.key ?? null) : null;
  useEffect(() => {
    const live = settings?.live;
    if (!liveKey || !live) return;
    let stop = (): void => undefined;
    let alive = true;
    import('../../platform/live-watch')
      .then((m) => {
        if (!alive) return;
        stop = m.watchTakeover(
          live,
          liveKey,
          () => gameRef.current,
          () => {
            const g = gameRef.current;
            if (g) update(handOver(g));
            setHandedUntil(Date.now() + 10_000);
          },
        );
      })
      .catch(() => undefined);
    return () => {
      alive = false;
      stop();
    };
    // Nur bei anderem Spiel, Live-Spieltag oder anderer Mannschaft neu verbinden.
  }, [id, liveKey, settings?.live?.topic]);
  const clock = game ? clockOf(game, now) : null;
  const status = clock?.status;

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

  const pickerExpired = picker?.until != null && now >= picker.until;
  useEffect(() => {
    if (pickerExpired) setPicker(null);
  }, [pickerExpired]);

  if (game === undefined) return <main class="game" aria-busy="true" />;
  if (game === null || !clock) {
    return (
      <main class="page">
        <p class="t-text">Dieses Spiel gibt es nicht mehr.</p>
        <button type="button" class="btn btn--primary" onClick={() => navigate('/')}>
          Zur Startseite
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
      if (side === 'own' && visiblePlayers(players ?? []).length > 0)
        setPicker({ goalId: r.goal.id, until: t + PICKER_MS });
    } else if (r.reason === 'double') {
      setHintUntil(t + HINT_MS);
    }
  };

  /** FR-011: Ergebnis direkt nach dem Schlusspfiff teilen (Fallback Zwischenablage). */
  const doShare = async (): Promise<void> => {
    const r = await shareText(buildShareText(cur(), players ?? []));
    setShareMsg(r === 'copied' ? 'Text in die Zwischenablage kopiert.' : r === 'failed' ? 'Teilen nicht möglich.' : '');
  };

  /** FR-042: Zwischenstand während des Spiels teilen (Fallback Zwischenablage). */
  const doShareInterim = async (): Promise<void> => {
    const r = await shareText(buildShareText(cur(), players ?? [], undefined, Date.now()));
    setShareMsg(r === 'copied' ? 'Text in die Zwischenablage kopiert.' : r === 'failed' ? 'Teilen nicht möglich.' : '');
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
    if (ask.kind === 'remove') {
      update(removeGoal(g, ask.goalId, t));
      setSheetGoal(null);
    }
    if (ask.kind === 'removeEvent') {
      update(removeEvent(g, ask.id));
      setEvSheet(null);
    }
    if (ask.kind === 'endShootout') update(endShootout(g));
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
    remove: [
      'Tor wirklich entfernen?',
      'Es zählt nicht mehr, bleibt durchgestrichen in der Liste und lässt sich wiederherstellen.',
      'Entfernen',
    ],
  };

  const undoGoalObj = undo && now < undo.until ? game.goals.find((g) => g.id === undo.goalId) : undefined;
  const doUndo = (goalId: string): void => {
    update(undoGoal(cur(), goalId));
    setUndo(null);
    setPicker(null);
  };
  const pickScorer = (goalId: string, scorer: Scorer): void => {
    update(setScorer(cur(), goalId, scorer));
    setPicker(null);
  };
  const pickerGoal = picker && !pickerExpired ? game.goals.find((g) => g.id === picker.goalId) : undefined;
  const roster = players ?? [];
  const selected: Goal | undefined = sheetGoal ? game.goals.find((g) => g.id === sheetGoal) : undefined;
  const flashing = now < flashUntil;

  // Spec 003 FR-E09: Knopf "Ereignis" ab Anpfiff bis Schlusspfiff, wenn mindestens ein Schalter an ist.
  const allEvents = gameEvents(game);
  const marks = allEvents.filter(isMark);
  const minuteAt = (at: number): string => {
    const c = clockOf(game, at);
    return formatMinute(c.minute, c.stoppage);
  };
  const squadPl = squadPlayers(roster, game.squad);
  const otherPl = otherPlayers(roster, game.squad);
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
    setEventSheet(false);
    if (!r) return;
    update(r.game);
    setMarkUndo({ id: r.event.id, until: t + UNDO_MS });
  };

  // FR-007: Nach Hintergrund oder Neuladen ist der Ton auf iOS gesperrt; jede Berührung schaltet ihn wieder frei.
  const reArmAudio = (): void => {
    if (!audioReady()) unlockAudio();
  };
  const showAudioHint = (status === 'running' || status === 'paused') && !audioReady();

  return (
    <main class={expanded ? 'game game--expanded' : 'game'} onPointerDown={reArmAudio}>
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

      <section class="teams" aria-label="Spielstand">
        <div class="team">
          <TeamMark colorId={colorOf(homeSide)} />
          <span class="team__name" data-testid="team-home">
            {buttonName(homeSide)}
          </span>
        </div>
        {status === 'created' ? (
          <button
            type="button"
            class="icon-btn teams__swap"
            aria-label="Heim und Gast tauschen"
            data-testid="btn-swap-venue"
            onClick={() => update(swapVenue(cur()))}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" class="icon">
              <path d="M4 8h15M15 4l4 4-4 4M20 16H5M9 12l-4 4 4 4" />
            </svg>
          </button>
        ) : (
          <span class="teams__gap" />
        )}
        <div class="team team--away">
          <span class="team__name" data-testid="team-away">
            {buttonName(awaySide)}
          </span>
          <TeamMark colorId={colorOf(awaySide)} />
        </div>
      </section>
      {shootoutActive ? (
        <ShootoutView
          game={game}
          players={roster}
          ownName={ownShort}
          dark={dark}
          onShot={(hit, who) => update(addShot(cur(), hit, who, Date.now()))}
          onUndo={() => update(undoShot(cur()))}
          onEnd={() => setAsk({ kind: 'endShootout' })}
        />
      ) : (
        <>
          <div class="score" data-testid="score">
            {`${ha.home} : ${ha.away}`}
          </div>
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
                class="btn btn--primary controls__wide"
                data-testid="btn-kickoff"
                onClick={doKickoff}
              >
                {status === 'created' || clock.kickoffSection === null
                  ? 'Anpfiff'
                  : `Anpfiff ${sectionLabel(clock.kickoffSection, game.schema.sections)}`}
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
                <button type="button" class="btn btn--secondary" onClick={() => navigate(`/spiel/${game.id}/details`)}>
                  Spieldetails
                </button>
                <button type="button" class="btn btn--primary" data-testid="btn-share" onClick={() => void doShare()}>
                  Ergebnis teilen
                </button>
              </>
            )}
          </section>

          {eventsOpen && (
            <section class="event-add" aria-label="Ereignisse">
              <button
                type="button"
                class="btn btn--quiet event-add__btn"
                data-testid="btn-event"
                onClick={() => {
                  setEventAt(Date.now());
                  setEventSheet(true);
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" class="icon">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Ereignis
              </button>
            </section>
          )}

          {(game.goals.length > 0 || allEvents.length > 0) && (
            <button
              type="button"
              class="list-grip"
              data-testid="list-grip"
              aria-expanded={expanded}
              aria-label={expanded ? 'Liste einklappen' : 'Liste aufklappen'}
              onClick={() => setExpanded(!expanded)}
            />
          )}
          <GoalList
            game={game}
            ownName={ownShort}
            players={roster}
            onOpen={(g) => setSheetGoal(g.id)}
            events={allEvents}
            onOpenEvent={(ev) => (ev.kind === 'mark' ? setMarkSheet(ev.id) : setEvSheet(ev.id))}
          />

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
        </>
      )}

      {markUndoObj && !undoGoalObj && (
        <div class="undo-bar" data-testid="mark-toast" role="status">
          <span class="undo-bar__text">
            Lesezeichen {formatMinute(markUndoObj.minute, markUndoObj.stoppage)} gesetzt
          </span>
          <button
            type="button"
            class="btn btn--secondary btn--small"
            data-testid="mark-comment"
            onClick={() => {
              setMarkUndo(null);
              setMarkEdit({ id: markUndoObj.id, value: markUndoObj.comment });
            }}
          >
            Kommentar
          </button>
          <button
            type="button"
            class="btn btn--secondary btn--small"
            data-testid="mark-undo"
            onClick={() => {
              update(removeEvent(cur(), markUndoObj.id));
              setMarkUndo(null);
            }}
          >
            Rückgängig
          </button>
        </div>
      )}
      {evUndoObj && !undoGoalObj && !markUndoObj && (
        <div class="undo-bar" data-testid="event-toast" role="status">
          <span class="undo-bar__text">
            {evUndoObj.kind === 'card' ? cardLabel(evUndoObj.card) : 'Wechsel'}{' '}
            {formatMinute(evUndoObj.minute, evUndoObj.stoppage)} erfasst
          </span>
          <button
            type="button"
            class="btn btn--secondary btn--small"
            data-testid="event-undo"
            onClick={() => {
              update(removeEvent(cur(), evUndoObj.id));
              setEvUndo(null);
            }}
          >
            Rückgängig
          </button>
        </div>
      )}
      {undoGoalObj && !pickerGoal && (
        <div class="undo-bar" data-testid="undo-bar" role="status">
          <span class="undo-bar__text">
            Tor {undoGoalObj.side === 'own' ? ownShort : game.opponent}{' '}
            {formatMinute(undoGoalObj.minute, undoGoalObj.stoppage)} erfasst
          </span>
          <button
            type="button"
            class="btn btn--secondary btn--small"
            data-testid="btn-undo"
            onClick={() => doUndo(undoGoalObj.id)}
          >
            Rückgängig
          </button>
        </div>
      )}
      {shareMsg && (
        <div class="toast" data-testid="share-result" role="status">
          {shareMsg}
        </div>
      )}
      {now < hintUntil && (
        <div class="toast" data-testid="double-tap-hint" role="status">
          Schon gezählt
        </div>
      )}
      {now < handedUntil && (
        <div class="toast" data-testid="live-handed-over" role="status">
          {teamShortLabel(game.ownTeam)} überträgt jetzt ein anderes Handy. Hier wird nur noch lokal erfasst.
        </div>
      )}
      {flashing && <div class="signal-flash" data-testid="signal-flash" aria-hidden="true" />}

      {menu && (
        <Sheet title="Spiel" testId="game-menu" onClose={() => setMenu(false)}>
          {goalsOpen || status === 'break' ? (
            <button
              type="button"
              class="btn btn--secondary"
              data-testid="menu-share-interim"
              onClick={() => {
                setMenu(false);
                void doShareInterim();
              }}
            >
              Zwischenstand teilen
            </button>
          ) : null}
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
          {liveStatus !== null && liveStatus !== 'handed' && (
            <button
              type="button"
              class="btn btn--secondary"
              data-testid="menu-live-toggle"
              onClick={() => {
                setMenu(false);
                update(setLive(game, game.live === false));
              }}
            >
              {game.live === false ? 'Live senden' : 'Nicht live senden'}
            </button>
          )}
          <button
            type="button"
            class="btn btn--secondary"
            data-testid="menu-details"
            onClick={() => navigate(`/spiel/${game.id}/details`)}
          >
            Spieldetails
          </button>
        </Sheet>
      )}

      {eventSheet && settings && (
        <Sheet
          title="Ereignis"
          subtitle={`Minute ${formatMinute(clock.minute, clock.stoppage)}`}
          testId="event-sheet"
          onClose={() => setEventSheet(false)}
        >
          <div class="pick-grid">
            {settings.features.marks && (
              <button type="button" class="pick" data-testid="event-mark" onClick={doMark}>
                <BookmarkIcon size={24} />
                <span>Lesezeichen</span>
              </button>
            )}
            {settings.features.cards &&
              CARDS.map((c) => (
                <button
                  type="button"
                  key={c}
                  class="pick"
                  data-testid={`event-card-${c}`}
                  onClick={() => {
                    setEventSheet(false);
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
            {settings.features.subs && (
              <button
                type="button"
                class="pick"
                data-testid="event-sub"
                onClick={() => {
                  setEventSheet(false);
                  setSubDraft({ id: null, at: eventAt, out: null, inn: null, others: false });
                }}
              >
                <SubIcon size={24} />
                <span>Wechsel</span>
              </button>
            )}
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
                {(cardDraft.others ? visiblePlayers(roster) : squadPl).map((pl) => (
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
            const pool = subDraft.others ? visiblePlayers(roster) : squadPl;
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

      {selected && !ask && (
        <Sheet
          title={`${formatMinute(selected.minute, selected.stoppage)} ${selected.side === 'own' ? ownShort : game.opponent}${
            selected.scorer ? `, ${scorerLabel(selected, roster)}` : ''
          }`}
          subtitle={`erfasst um ${formatTime(selected.at)} Uhr${selected.deletedAt !== null ? ' · entfernt' : ''}`}
          testId="goal-actions"
          onClose={() => setSheetGoal(null)}
        >
          {selected.deletedAt === null && (
            <div class="chips" role="group" aria-label="Kennzeichen">
              <button
                type="button"
                class="chip"
                aria-pressed={!!selected.penalty}
                data-testid="goal-penalty"
                onClick={() => update(setPenalty(cur(), selected.id, !selected.penalty))}
              >
                Elfmeter
              </button>
            </div>
          )}
          {selected.deletedAt === null ? (
            <button
              type="button"
              class="btn btn--primary"
              data-testid="goal-remove"
              onClick={() => setAsk({ kind: 'remove', goalId: selected.id })}
            >
              Tor entfernen
            </button>
          ) : (
            <button
              type="button"
              class="btn btn--primary"
              data-testid="goal-restore"
              onClick={() => {
                update(restoreGoal(cur(), selected.id));
                setSheetGoal(null);
              }}
            >
              Tor wiederherstellen
            </button>
          )}
          <button
            type="button"
            class="btn btn--secondary"
            data-testid="goal-edit-scorer"
            onClick={() => {
              setSheetGoal(null);
              if (selected.side === 'own') setPicker({ goalId: selected.id, until: null });
              else
                setTextEdit({
                  goalId: selected.id,
                  value: selected.scorer?.kind === 'text' ? selected.scorer.text : '',
                });
            }}
          >
            Torschütze ändern
          </button>
        </Sheet>
      )}

      {pickerGoal && (
        <ScorerPicker
          subtitle={`Tor in Minute ${formatMinute(pickerGoal.minute, pickerGoal.stoppage)}`}
          squad={squadPlayers(roster, game.squad)}
          others={otherPlayers(roster, game.squad)}
          onPick={(scorer) => pickScorer(pickerGoal.id, scorer)}
          onClose={() => setPicker(null)}
          {...(picker?.until != null
            ? {
                // `now` läuft im 250-ms-Takt bis zu einem Takt nach: nie mehr als 8 s anzeigen.
                countdown: Math.min(PICKER_MS / 1000, Math.max(1, Math.ceil((picker.until - now) / 1000))),
                ...(undoGoalObj?.id === pickerGoal.id ? { onUndo: () => doUndo(pickerGoal.id) } : {}),
              }
            : {})}
        />
      )}

      {textEdit && (
        <Sheet title="Torschütze Gegner" testId="scorer-text" onClose={() => setTextEdit(null)}>
          <form
            class="scorer-text"
            onSubmit={(e) => {
              e.preventDefault();
              update(setScorer(cur(), textEdit.goalId, { kind: 'text', text: textEdit.value }));
              setTextEdit(null);
            }}
          >
            <label class="visually-hidden" for="scorer-text-input">
              Torschütze des Gegners
            </label>
            <input
              id="scorer-text-input"
              class="input"
              data-testid="scorer-text-input"
              value={textEdit.value}
              maxLength={30}
              autocomplete="off"
              placeholder="Name oder Rückennummer"
              onInput={(e) => setTextEdit({ ...textEdit, value: e.currentTarget.value })}
            />
            <div class="button-row">
              <button
                type="button"
                class="btn btn--secondary"
                data-testid="scorer-text-clear"
                onClick={() => {
                  update(setScorer(cur(), textEdit.goalId, null));
                  setTextEdit(null);
                }}
              >
                Ohne Torschütze
              </button>
              <button type="submit" class="btn btn--primary" data-testid="scorer-text-save">
                Speichern
              </button>
            </div>
          </form>
        </Sheet>
      )}

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
