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
  addGoal,
  homeAway,
  removeGoal,
  restoreGoal,
  score,
  scorerLabel,
  setScorer,
  undoGoal,
} from '../../domain/goals';
import { getColor } from '../../domain/jersey-colors';
import { formatMinute } from '../../domain/minute';
import { formatTime } from '../../domain/format';
import { otherPlayers, squadPlayers, visiblePlayers } from '../../domain/roster';
import { shortTeamName } from '../../domain/team-name';
import type { Game, Goal, Scorer, Side } from '../../domain/types';
import { buildShareText } from '../../domain/share-text';
import { getGame, putGame } from '../../platform/db';
import { shareText } from '../../platform/share';
import { audioReady, playSignal, unlockAudio } from '../../platform/signal';
import { keepAwake } from '../../platform/wake-lock';
import { ClockDisplay } from '../components/clock-display';
import { Confirm } from '../components/confirm';
import { GoalButton } from '../components/goal-button';
import { GoalList } from '../components/goal-list';
import { ScorerPicker } from '../components/scorer-picker';
import { Sheet } from '../components/sheet';
import { useDarkTheme, useNow, usePlayers } from '../hooks';
import { navigate } from '../router';

const base = import.meta.env.BASE_URL;
const UNDO_MS = 10_000;
const FLASH_MS = 3_000;
const HINT_MS = 1_500;
/** US3-S2: Schnellauswahl schließt nach 8 s ohne Torschützen. */
const PICKER_MS = 8_000;

type Ask = { kind: 'pause' | 'end' | 'swap' } | { kind: 'remove'; goalId: string } | { kind: 'goalResume'; side: Side };

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
  }, [status]);
  useEffect(() => () => keepAwake(false), []);

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
  const lastSection = clock.section >= game.schema.sections;
  const endLabel = lastSection ? 'Schlusspfiff' : 'Pausenpfiff';
  const overtime = clock.isOvertime && goalsOpen;

  const headerLabel =
    status === 'finished'
      ? 'Schlusspfiff'
      : status === 'break'
        ? game.schema.sections === 2
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

  const doKickoff = (): void => {
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

  // FR-007: Nach Hintergrund oder Neuladen ist der Ton auf iOS gesperrt; jede Berührung schaltet ihn wieder frei.
  const reArmAudio = (): void => {
    if (!audioReady()) unlockAudio();
  };
  const showAudioHint = (status === 'running' || status === 'paused') && !audioReady();

  return (
    <main class="game" onPointerDown={reArmAudio}>
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
            {teamName(homeSide)}
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
            {teamName(awaySide)}
          </span>
          <TeamMark colorId={colorOf(awaySide)} />
        </div>
      </section>
      <div class="score" data-testid="score">
        {`${ha.home} : ${ha.away}`}
      </div>

      <ClockDisplay clock={clock} flash={flashing} />

      <section class="controls">
        {(status === 'created' || status === 'break') && (
          <button type="button" class="btn btn--primary controls__wide" data-testid="btn-kickoff" onClick={doKickoff}>
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

      <GoalList game={game} ownName={ownShort} players={roster} onOpen={(g) => setSheetGoal(g.id)} />

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
      {flashing && <div class="signal-flash" data-testid="signal-flash" aria-hidden="true" />}

      {menu && (
        <Sheet title="Spiel" testId="game-menu" onClose={() => setMenu(false)}>
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
            data-testid="menu-details"
            onClick={() => navigate(`/spiel/${game.id}/details`)}
          >
            Spieldetails
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
