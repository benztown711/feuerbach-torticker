import { useEffect, useRef, useState } from 'preact/hooks';
import { canAddLateGoal } from '../../domain/corrections';
import { formatTime } from '../../domain/format';
import { sectionLabel } from '../../domain/game';
import { shootoutState } from '../../domain/cup';
import { cardText, marksText, personLabel, subText } from '../../domain/events';
import { goalWho, homeAway, score } from '../../domain/goals';
import { formatMinute } from '../../domain/minute';
import { startedAt, teamShortLabel, timeline } from '../../domain/history';
import { buildShareText } from '../../domain/share-text';
import { shortTeamName } from '../../domain/team-name';
import type { ClockEvent, Game, Player, Settings } from '../../domain/types';
import { getGame, getPlayers, getSettings, putGame } from '../../platform/db';
import { trashGames } from '../../platform/trash';
import { shareText } from '../../platform/share';
import { Confirm } from '../components/confirm';
import { BookmarkIcon, CardGlyph, SubIcon } from '../components/event-icons';
import { addGoalStep, GoalEditor, type EditStep } from '../components/goal-editor';
import { SharePreview } from '../components/share-preview';
import { navigate } from '../router';

const eventText = (e: ClockEvent, game: Game): string => {
  const sec = sectionLabel(e.section, game.schema.sections);
  switch (e.type) {
    case 'kickoff':
      return `Anpfiff ${sec}`;
    case 'pause':
      return 'Uhr angehalten';
    case 'resume':
      return 'Uhr fortgesetzt';
    case 'sectionEnd':
      return `Pausenpfiff ${sec}`;
    case 'fullTime':
      return e.section > game.schema.sections
        ? 'Schlusspfiff n. V.'
        : game.schema.extraMinutes
          ? 'Ende der regulären Spielzeit'
          : 'Schlusspfiff';
    case 'extraTime':
      return `Verlängerung (2 × ${game.schema.extraMinutes ?? 0} Min)`;
    case 'reset':
      return `Uhr zurückgesetzt (${sec})`;
  }
};

const fmtDay = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

/**
 * Spieldetails (FR-022, FR-038, Mockup 8): Zeitleiste mit Uhrzeiten, Teilen, Löschen. Spec 017: Tore lassen sich
 * hier mit denselben Blättern wie im Spiel korrigieren, auch lange nach dem Schlusspfiff.
 */
export function GameDetailsScreen({ id }: { id: string }) {
  const [game, setGame] = useState<Game | null | undefined>(undefined);
  const [players, setPlayers] = useState<Player[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [askDelete, setAskDelete] = useState(false);
  const [shareMsg, setShareMsg] = useState('');
  const [marksMsg, setMarksMsg] = useState('');
  /** Spec 017 R-C1: offenes Korrektur-Blatt. */
  const [edit, setEdit] = useState<EditStep | null>(null);
  const gameRef = useRef<Game | null>(null);
  useEffect(() => {
    void getGame(id).then((g) => {
      gameRef.current = g ?? null;
      setGame(g ?? null);
    });
    void getPlayers().then(setPlayers);
    void getSettings().then(setSettings);
  }, [id]);
  if (game === undefined) return <main class="page" aria-busy="true" />;
  if (game === null) {
    return (
      <main class="page">
        <p class="t-text details__gone">Dieses Spiel gibt es nicht mehr.</p>
      </main>
    );
  }

  /** Spec 017 FR-C05: jede Korrektur sofort speichern (der Live-Sender meldet sie wie jede Änderung). */
  const update = (g: Game): void => {
    gameRef.current = g;
    setGame(g);
    void putGame(g);
  };
  const cur = (): Game => gameRef.current ?? game;
  const now = Date.now();

  const ha = homeAway(game.venue, score(game));
  const [home, away] = game.venue === 'home' ? [game.ownTeam, game.opponent] : [game.opponent, game.ownTeam];
  const finished = game.status === 'finished';
  const half = game.schema.sections > 1 && game.halfTimeScore ? homeAway(game.venue, game.halfTimeScore) : null;
  const fullTime = [...game.clockEvents].reverse().find((e) => e.type === 'fullTime');
  const pens = game.shootout?.done ? shootoutState(game) : null;
  const pensHa = pens ? homeAway(game.venue, { own: pens.own, opp: pens.opp }) : null;
  const text = buildShareText(game, players);
  const meta = [
    teamShortLabel(game.ownTeam),
    game.venue === 'home' ? 'heim' : 'auswärts',
    `${game.schema.sections} × ${game.schema.sectionMinutes} Min`,
    game.clockEvents.length > 0 ? `Anpfiff ${formatTime(startedAt(game), undefined, false)}` : 'noch nicht angepfiffen',
  ].join(' · ');
  const summary = [
    half ? `Halbzeit ${half.home}:${half.away}` : '',
    game.schema.extraMinutes && fullTime && fullTime.section > game.schema.sections
      ? `n. V. ${ha.home}:${ha.away}`
      : '',
    pensHa ? `i. E. ${pensHa.home}:${pensHa.away}` : '',
    fullTime ? `Schlusspfiff ${formatTime(fullTime.at, undefined, false)}` : finished ? '' : 'Spiel läuft',
  ]
    .filter(Boolean)
    .join(' · ');

  /** Spec 003 FR-E08: Lesezeichen für die Videoauswertung (Zwischenablage bzw. Teilen-Menü). */
  const marks = marksText(game);
  const doCopyMarks = async (): Promise<void> => {
    const r = await shareText(marks);
    setMarksMsg(
      r === 'copied'
        ? 'Lesezeichen kopiert.'
        : r === 'shared'
          ? 'Lesezeichen geteilt.'
          : r === 'failed'
            ? 'Kopieren nicht möglich.'
            : '',
    );
  };

  const doShare = async (): Promise<void> => {
    const r = await shareText(text);
    setShareMsg(r === 'copied' ? 'Text in die Zwischenablage kopiert.' : r === 'failed' ? 'Teilen nicht möglich.' : '');
  };

  return (
    <main class="page">
      <header class="topbar">
        <button type="button" class="icon-btn" aria-label="Zurück zur Historie" onClick={() => navigate('/historie')}>
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" class="icon">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <h1 class="topbar__title t-zwischentitel">Spiel vom {fmtDay.format(startedAt(game))}</h1>
      </header>

      <section class="details__head card" data-testid="details-score">
        <p class="details__meta">{meta}</p>
        <div class="details__line">
          <p class="details__match">
            {home} : {away}
          </p>
          <p class="details__score">{`${ha.home}:${ha.away}`}</p>
        </div>
        {summary && <p class="details__meta">{summary}</p>}
      </section>

      <section class="card card--list" aria-labelledby="timeline-title" data-testid="card-timeline">
        <h2 id="timeline-title" class="t-label card__title">
          SPIELVERLAUF
        </h2>
        <ol class="details__list" data-testid="details-timeline" aria-label="Spielverlauf">
          {timeline(game).map((item, i) =>
            item.kind === 'ev' ? (
              <li
                key={item.ev.id}
                class={
                  item.ev.kind === 'mark'
                    ? 'details__item details__item--private'
                    : 'details__item details__item--extra'
                }
                data-testid={`${item.ev.kind === 'mark' ? 'mark' : 'event'}-${item.ev.id}`}
              >
                <span class="details__minute">{formatMinute(item.ev.minute, item.ev.stoppage)}</span>
                <span class="details__score-cell">
                  {item.ev.kind === 'mark' ? (
                    <BookmarkIcon />
                  ) : item.ev.kind === 'card' ? (
                    <CardGlyph card={item.ev.card} />
                  ) : (
                    <SubIcon />
                  )}
                </span>
                <span class="details__what">
                  {item.ev.kind === 'mark' ? (
                    <>
                      {item.ev.comment || 'Lesezeichen'}{' '}
                      <span class="goal-row__tag goal-row__tag--private">nur für dich</span>
                    </>
                  ) : item.ev.kind === 'card' ? (
                    `${cardText(game, item.ev, players)}${item.ev.comment ? ` · ${item.ev.comment}` : ''}`
                  ) : (
                    subText(item.ev, players)
                  )}
                </span>
                <span class="details__time">{formatTime(item.at)}</span>
              </li>
            ) : item.kind === 'event' ? (
              <li key={`e${i}`} class="details__item details__item--event">
                <span class="details__minute" />
                <span class="details__score-cell" />
                <span class="details__what">{eventText(item.event, game)}</span>
                <span class="details__time">{formatTime(item.at)}</span>
              </li>
            ) : (
              <li key={item.goal.id} data-testid={`goal-${item.goal.id}`}>
                {/* Spec 017 FR-C01: Tipp öffnet das Tor-Blatt wie im Spiel. */}
                <button
                  type="button"
                  class={
                    item.removed
                      ? 'details__item details__item--goal details__item--removed'
                      : 'details__item details__item--goal'
                  }
                  onClick={() => setEdit({ kind: 'goal', goalId: item.goal.id })}
                >
                  <span class="details__minute">{item.label}</span>
                  <span class="details__score-cell">{item.score}</span>
                  <span class="details__what">{goalWho(game, item.goal, players)}</span>
                  <span class="details__time">{formatTime(item.at)}</span>
                  {item.removed && <span class="goal-row__tag">entfernt</span>}
                  <svg class="details__chevron" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </li>
            ),
          )}
        </ol>
        {canAddLateGoal(game, now) && (
          <button
            type="button"
            class="btn btn--quiet details__add"
            data-testid="details-add-goal"
            onClick={() => setEdit(addGoalStep(cur(), Date.now()))}
          >
            Tor nachtragen
          </button>
        )}
      </section>

      {game.shootout && game.shootout.shots.length > 0 && (
        <section class="details__share card" aria-label="Elfmeterschießen" data-testid="details-shootout">
          <span class="t-label card__title">
            ELFMETERSCHIESSEN · {shootoutState(game).own}:{shootoutState(game).opp}
          </span>
          <div class="pen-detail">
            {(['own', 'opp'] as const).map((sd) => (
              <div key={sd}>
                <span class="pen-detail__head">{sd === 'own' ? shortTeamName(game.ownTeam) : game.opponent}</span>
                <div class="pen-chips">
                  {game
                    .shootout!.shots.filter((sh) => sh.side === sd)
                    .map((sh, i) => (
                      <span key={i} class={sh.hit ? 'pen-chip' : 'pen-chip is-miss'}>
                        {personLabel(sh.who, players)}
                        {sh.hit ? ' ✓' : ' ✗'}
                      </span>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {marks && (
        <section class="details__share card" aria-label="Lesezeichen">
          <span class="t-label card__title">LESEZEICHEN · NUR FÜR DICH</span>
          <pre class="share-preview" data-testid="marks-preview">
            {marks}
          </pre>
          <button
            type="button"
            class="btn btn--secondary"
            data-testid="btn-copy-marks"
            onClick={() => void doCopyMarks()}
          >
            Lesezeichen kopieren
          </button>
          <p class="settings__result" role="status" data-testid="marks-result">
            {marksMsg}
          </p>
        </section>
      )}

      <section class="details__share card" aria-labelledby="share-title" data-testid="card-share">
        <h2 id="share-title" class="t-label card__title">
          ERGEBNIS TEILEN
        </h2>
        <SharePreview text={text} />
        <div class="button-row">
          <button
            type="button"
            class="btn btn--secondary"
            data-testid="btn-delete-game"
            onClick={() => setAskDelete(true)}
          >
            Löschen …
          </button>
          {finished ? (
            <button type="button" class="btn btn--primary" data-testid="btn-share" onClick={() => void doShare()}>
              Ergebnis teilen
            </button>
          ) : (
            <button
              type="button"
              class="btn btn--primary"
              data-testid="btn-back-to-game"
              onClick={() => navigate(`/spiel/${game.id}`)}
            >
              Zum Spiel
            </button>
          )}
        </div>
        <p class="settings__result" role="status" data-testid="share-result">
          {shareMsg}
        </p>
      </section>

      <GoalEditor
        game={game}
        players={players}
        settings={settings}
        step={edit}
        onStep={setEdit}
        cur={cur}
        update={update}
        now={now}
      />

      {askDelete && (
        <Confirm
          title="Spiel wirklich löschen?"
          text={`${home} : ${away} verschwindet aus der Historie. Du kannst das gleich danach rückgängig machen, später nur über eine Sicherung.`}
          yesLabel="Löschen"
          onNo={() => setAskDelete(false)}
          onYes={() => {
            setAskDelete(false);
            // Spec 014 US3-S6: vormerken, die Historie zeigt "1 Spiel gelöscht" mit "Rückgängig".
            void trashGames([game.id]);
            navigate('/historie');
          }}
        />
      )}
    </main>
  );
}
