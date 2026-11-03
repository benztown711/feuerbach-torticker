import { useEffect, useState } from 'preact/hooks';
import { formatTime } from '../../domain/format';
import { sectionLabel } from '../../domain/game';
import { marksText } from '../../domain/events';
import { goalSuffix, homeAway, score, scorerLabel } from '../../domain/goals';
import { formatMinute } from '../../domain/minute';
import { startedAt, teamShortLabel, timeline } from '../../domain/history';
import { buildShareText } from '../../domain/share-text';
import { shortTeamName } from '../../domain/team-name';
import type { ClockEvent, Game, Player } from '../../domain/types';
import { deleteGame, getGame, getPlayers } from '../../platform/db';
import { shareText } from '../../platform/share';
import { Confirm } from '../components/confirm';
import { BookmarkIcon } from '../components/goal-list';
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
      return 'Schlusspfiff';
    case 'reset':
      return `Uhr zurückgesetzt (${sec})`;
  }
};

const fmtDay = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

/** Spieldetails (FR-022, FR-038, Mockup 8): Zeitleiste mit Uhrzeiten, Teilen, Löschen. */
export function GameDetailsScreen({ id }: { id: string }) {
  const [game, setGame] = useState<Game | null | undefined>(undefined);
  const [players, setPlayers] = useState<Player[]>([]);
  const [askDelete, setAskDelete] = useState(false);
  const [shareMsg, setShareMsg] = useState('');
  const [marksMsg, setMarksMsg] = useState('');
  useEffect(() => {
    void getGame(id).then((g) => setGame(g ?? null));
    void getPlayers().then(setPlayers);
  }, [id]);
  if (game === undefined) return <main class="page" aria-busy="true" />;
  if (game === null) {
    return (
      <main class="page">
        <p class="t-text details__gone">Dieses Spiel gibt es nicht mehr.</p>
      </main>
    );
  }

  const ha = homeAway(game.venue, score(game));
  const [home, away] = game.venue === 'home' ? [game.ownTeam, game.opponent] : [game.opponent, game.ownTeam];
  const finished = game.status === 'finished';
  const half = game.schema.sections > 1 && game.halfTimeScore ? homeAway(game.venue, game.halfTimeScore) : null;
  const fullTime = game.clockEvents.find((e) => e.type === 'fullTime');
  const text = buildShareText(game, players);
  const meta = [
    teamShortLabel(game.ownTeam),
    game.venue === 'home' ? 'heim' : 'auswärts',
    `${game.schema.sections} × ${game.schema.sectionMinutes} Min`,
    game.clockEvents.length > 0 ? `Anpfiff ${formatTime(startedAt(game), undefined, false)}` : 'noch nicht angepfiffen',
  ].join(' · ');
  const summary = [
    half ? `Halbzeit ${half.home}:${half.away}` : '',
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

      <section class="details__head" data-testid="details-score">
        <p class="details__meta">{meta}</p>
        <div class="details__line">
          <p class="details__match">
            {home} : {away}
          </p>
          <p class="details__score">{`${ha.home}:${ha.away}`}</p>
        </div>
        {summary && <p class="details__meta">{summary}</p>}
      </section>

      <ol class="details__list" data-testid="details-timeline" aria-label="Spielverlauf">
        {timeline(game).map((item, i) =>
          item.kind === 'mark' ? (
            <li key={item.mark.id} class="details__item details__item--private" data-testid={`mark-${item.mark.id}`}>
              <span class="details__minute">{formatMinute(item.mark.minute, item.mark.stoppage)}</span>
              <span class="details__score-cell">
                <BookmarkIcon />
              </span>
              <span class="details__what">
                {item.mark.comment || 'Lesezeichen'}{' '}
                <span class="goal-row__tag goal-row__tag--private">nur für dich</span>
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
            <li
              key={item.goal.id}
              class={item.removed ? 'details__item details__item--removed' : 'details__item'}
              data-testid={`goal-${item.goal.id}`}
            >
              <span class="details__minute">{item.label}</span>
              <span class="details__score-cell">{item.score}</span>
              <span class="details__what">
                {item.goal.scorer
                  ? `${scorerLabel(item.goal, players)}${item.goal.side === 'opp' ? ` (${game.opponent})` : ''}`
                  : item.goal.side === 'own'
                    ? shortTeamName(game.ownTeam)
                    : game.opponent}
                {goalSuffix(item.goal)}
              </span>
              <span class="details__time">{formatTime(item.at)}</span>
              {item.removed && <span class="goal-row__tag">entfernt</span>}
            </li>
          ),
        )}
      </ol>

      {marks && (
        <section class="details__share" aria-label="Lesezeichen">
          <span class="t-label field__label">LESEZEICHEN · NUR FÜR DICH</span>
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

      <section class="details__share" aria-label="Ergebnis teilen">
        <pre class="share-preview" data-testid="share-preview">
          {text}
        </pre>
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

      {askDelete && (
        <Confirm
          title="Spiel wirklich löschen?"
          text={`${home} : ${away} verschwindet aus der Historie. Das lässt sich nur über eine Sicherung zurückholen.`}
          yesLabel="Löschen"
          onNo={() => setAskDelete(false)}
          onYes={() => {
            setAskDelete(false);
            void deleteGame(game.id).then(() => navigate('/historie'));
          }}
        />
      )}
    </main>
  );
}
