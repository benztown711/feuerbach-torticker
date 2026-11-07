import { useEffect, useRef, useState } from 'preact/hooks';
import { createGame } from '../../domain/game';
import { teamShortLabel } from '../../domain/history';
import { defaultOppColor, getColor, rememberColors } from '../../domain/jersey-colors';
import { startPrivate } from '../../domain/live-snapshot';
import { isRetired, liveTeamFor, titleOf } from '../../domain/live-spieltag';
import { visiblePlayers } from '../../domain/roster';
import { defaultSettings } from '../../domain/settings';
import { signalSoundName } from '../../domain/signal-sound';
import { currentTeam, findTeam, ownColorFor, recordTeamUse, schemaFor, squadFor } from '../../domain/teams';
import { shortTeamName } from '../../domain/team-name';
import type { Settings, Team, Venue } from '../../domain/types';
import { validateNewGame } from '../../domain/validation';
import { getPlayers, getSettings, listGames, putGame, putSettings } from '../../platform/db';
import { onLiveSettings, onPlanChanged } from '../../platform/live-events';
import type { PlanChoice } from '../../platform/live-setup';
import type { LiveWatch, RunningGame } from '../../platform/live-watch';
import { setSignalSound, testSignal } from '../../platform/signal';
import { Confirm } from '../components/confirm';
import { KitRow } from '../components/kit-row';
import { useDarkTheme, usePlayers } from '../hooks';
import { navigate } from '../router';

const range = (from: number, to: number): number[] => Array.from({ length: to - from + 1 }, (_, i) => from + i);

/** Spec 006 FR-L22: so lange wartet "Weiter zum Anpfiff" höchstens auf den Live-Stand. */
const LIVE_WAIT_MS = 3_000;

/** Mithören, sobald es geladen ist und den ersten Stand kennt; zusammen höchstens `ms` (ohne Netz sofort). */
async function heardWithin(load: Promise<LiveWatch | null> | null, ms: number): Promise<LiveWatch | null> {
  if (!load) return null;
  const start = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const w = await Promise.race([load, new Promise<null>((res) => (timer = setTimeout(() => res(null), ms)))]);
  clearTimeout(timer);
  if (!w) return null;
  await w.ready(Math.max(0, ms - (Date.now() - start)));
  return w;
}

type Choices = { today: PlanChoice[]; later: PlanChoice[] };

/** Spec 015 US2: eine Zeile "Aus dem Spielplan" (heute mit Anstoß, später mit Datum). */
function PickRow({
  c,
  lead,
  selected,
  onPick,
}: {
  c: PlanChoice;
  lead: string;
  selected: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      class="plan__row"
      aria-pressed={selected}
      data-testid={`plan-pick-${c.entry.id}`}
      onClick={onPick}
    >
      <span class="plan__time">{lead}</span>
      <span class="plan__text">
        <strong class="plan__title">{c.title}</strong>
        <span class="plan__detail">{c.detail}</span>
      </span>
      {/* Spec 015 US6: wer das Spiel vorgemerkt hat ("du", Name, "vergeben"). */}
      <span class="plan__state">{c.claim || 'frei'}</span>
    </button>
  );
}

function Mark({ colorId }: { colorId: string }) {
  return <span class="team__mark" style={{ background: getColor(colorId, true).value }} aria-hidden="true" />;
}

/** "Neues Spiel" (FR-001, Spec 004): Mannschaft, Trikots, Spielzeit und Aufgebot kommen aus "Meine Mannschaften". */
/** US6-S6: Name des anderen Trainers, der das Planspiel vorgemerkt hat; null ohne fremde Vormerkung. */
const otherClaim = (c: PlanChoice | null): string | null =>
  !c || c.claim === '' || c.claim === 'du' ? null : c.claim === 'vergeben' ? 'Ein anderer Trainer' : c.claim;

export function NewGameScreen({ plan }: { plan?: string } = {}) {
  const dark = useDarkTheme();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [teamId, setTeamId] = useState('');
  const [opponent, setOpponent] = useState('');
  const [venue, setVenue] = useState<Venue>('home');
  const [sections, setSections] = useState(2);
  const [minutes, setMinutes] = useState(25);
  const [ownColor, setOwnColor] = useState('rot');
  const [ownTouched, setOwnTouched] = useState(false);
  const [oppColor, setOppColor] = useState('schwarz');
  const [oppTouched, setOppTouched] = useState(false);
  const [pal, setPal] = useState<'own' | 'opp' | null>(null);
  const [busy, setBusy] = useState(false);
  const [liveOn, setLiveOn] = useState(true);
  /** Spec 006 US6: Live-Spieltag mithören, um ein schon übertragenes Spiel zu erkennen (nachgeladen). */
  const watch = useRef<LiveWatch | null>(null);
  /** Das Nachladen des Mithörens; null, solange das Handy nicht gekoppelt ist. */
  const watchLoad = useRef<Promise<LiveWatch | null> | null>(null);
  /** FR-L22: Wer während des Wartens auf den Live-Stand die Seite verlässt, legt kein Spiel an. */
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );
  const [running, setRunning] = useState<RunningGame | null>(null);
  /** Spec 015 US2: Planspiele zur Auswahl und das gewählte (nachgeladen über live-setup, R-P6). */
  const [choices, setChoices] = useState<Choices | null>(null);
  const [fromPlan, setFromPlan] = useState<PlanChoice | null>(null);
  const [showLater, setShowLater] = useState(false);
  /** US6-S6: Rückfrage, bevor ein von einem anderen Trainer vorgemerktes Spiel hier angelegt wird. */
  const [claimAsk, setClaimAsk] = useState(false);
  /** US6-S5: vom Startbildschirm ("Heute tickerst du") vorgegebenes Planspiel, einmal auswählen. */
  const autoPick = useRef(plan ?? null);
  const [players] = usePlayers();
  const [squad, setSquad] = useState<string[]>([]);

  const applyTeam = (s: Settings, t: Team): void => {
    setTeamId(t.id);
    setOwnTouched(false);
    const schema = schemaFor(t, s);
    setSections(schema.sections);
    setMinutes(schema.sectionMinutes);
  };

  /** Nur Planspiele von Mannschaften, für die dieses Handy sendet. */
  const teamOfChoice = (s: Settings, c: PlanChoice): Team | undefined =>
    s.teams.find((t) => liveTeamFor(t.name, s.live)?.key === c.entry.team);

  /** Spec 015 US2 FR-P10: Mannschaft, Gegner, Heim/Auswärts, Trikot und Spielzeit aus dem Planspiel. */
  const pickWith = (s: Settings, c: PlanChoice): void => {
    const t = teamOfChoice(s, c);
    if (!t) return;
    applyTeam(s, t);
    setOpponent(c.entry.opponent);
    setOppTouched(false);
    setVenue(c.entry.venue);
    setOwnTouched(false);
    if (c.entry.schema) {
      setSections(c.entry.schema.sections);
      setMinutes(c.entry.schema.sectionMinutes);
    }
    setFromPlan(c);
  };

  useEffect(() => {
    void getSettings().then((s) => {
      setSettings(s);
      applyTeam(s, currentTeam(s));
      // Spec 008 FR-K05: "Ton testen" spielt den gewählten Ton.
      setSignalSound(s.signalSound);
    });
  }, []);

  const team = settings ? findTeam(settings, teamId) : null;

  // Spec 006 US6 und US5: mithören, solange das Handy gekoppelt ist (nachgeladen). So erkennt es ein schon
  // übertragenes Spiel und übernimmt eine neue Mannschaftsliste eines anderen Trainer-Handys.
  useEffect(() => {
    const live = settings?.live;
    if (!live) return;
    let alive = true;
    watchLoad.current = import('../../platform/live-watch')
      .then((m) => {
        if (!alive) return null;
        watch.current = m.watchSpieltag(live);
        return watch.current;
      })
      .catch(() => null);
    return () => {
      alive = false;
      watch.current?.stop();
      watch.current = null;
      watchLoad.current = null;
    };
  }, [settings?.live?.topic]);
  // US5-S1: übernommene Mannschaften und geänderte Titel sofort zeigen.
  useEffect(() => onLiveSettings(setSettings), []);

  // Spec 015 US2 FR-P09: Planspiele heute und in den nächsten 14 Tagen, auch wenn ein anderes Handy sie ändert.
  useEffect(() => {
    const live = settings?.live;
    if (!live?.orgKey) {
      setChoices(null);
      setFromPlan(null);
      return;
    }
    let alive = true;
    const load = (): void =>
      void import('../../platform/live-setup')
        .then((m) => m.planChoices(live))
        .then((c) => {
          if (!alive) return;
          setChoices(c);
          // Inzwischen von einem anderen Handy angelegt, abgesagt oder gelöscht: Auswahl aufheben.
          setFromPlan((f) => (f && [...c.today, ...c.later].some((x) => x.entry.id === f.entry.id) ? f : null));
        })
        .catch(() => undefined);
    load();
    const off = onPlanChanged(load);
    return () => {
      alive = false;
      off();
    };
  }, [settings?.live?.topic, settings?.live?.orgPub, !!settings?.live?.orgKey]);

  // US6-S5: Planspiel aus "Heute tickerst du" auswählen, sobald die Auswahl geladen ist.
  useEffect(() => {
    if (!autoPick.current || !choices || !settings) return;
    const c = [...choices.today, ...choices.later].find((x) => x.entry.id === autoPick.current);
    autoPick.current = null;
    if (c) pickWith(settings, c);
  }, [choices, settings]);

  // FR-M03: eigenes Trikot folgt Heim/Auswärts, solange es nicht von Hand geändert wurde.
  useEffect(() => {
    if (team && !ownTouched) setOwnColor(ownColorFor(team, venue));
  }, [team?.id, team?.homeColor, team?.awayColor, venue, ownTouched]);

  // Spec 013 FR-K05: Aufgebot in der Reihenfolge aus den Einstellungen.
  const visible = visiblePlayers(players ?? [], settings?.rosterSort ?? 'name');
  const lastSquad = (team && settings ? squadFor(team, settings) : []).filter((id) => visible.some((p) => p.id === id));
  // FR-030, FR-M06: Aufgebot des letzten Spiels dieser Mannschaft ist vorausgewählt.
  const lastKey = lastSquad.join(',');
  useEffect(() => {
    setSquad(lastKey === '' ? [] : lastKey.split(','));
  }, [lastKey]);
  const toggle = (id: string): void => setSquad(squad.includes(id) ? squad.filter((x) => x !== id) : [...squad, id]);

  // FR-031, FR-M04: Gegnerfarbe folgt dem Gegnernamen, solange sie nicht von Hand gewählt wurde.
  useEffect(() => {
    if (!oppTouched) setOppColor(defaultOppColor(settings ?? defaultSettings(), opponent, ownColor));
  }, [opponent, ownColor, settings, oppTouched]);

  // Formular erst nach dem Laden der Einstellungen zeigen, sonst überschreiben die Vorgaben bereits Getipptes.
  if (!settings || !team) return <main class="page" aria-busy="true" />;

  const chosen = visible.filter((p) => squad.includes(p.id)).map((p) => p.id);
  const input = {
    ownTeam: team.name,
    opponent,
    venue,
    schema: { sections, sectionMinutes: minutes },
    ownColor,
    oppColor,
    squad: chosen,
  };
  const check = validateNewGame(input);
  const ownShort = shortTeamName(team.name);
  const liveTeam = liveTeamFor(team.name, settings.live);
  const keyOf = (t: Team): string | undefined => liveTeamFor(t.name, settings.live)?.key;
  const teamOf = (c: PlanChoice): Team | undefined => teamOfChoice(settings, c);
  const own = choices && {
    today: choices.today.filter((c) => teamOf(c)),
    later: choices.later.filter((c) => teamOf(c)),
  };
  const oppLabel = opponent.trim() || 'Gegner';
  const sides =
    venue === 'home'
      ? [
          { name: ownShort, color: ownColor },
          { name: oppLabel, color: oppColor },
        ]
      : [
          { name: oppLabel, color: oppColor },
          { name: ownShort, color: ownColor },
        ];
  const [home, away] = sides as [{ name: string; color: string }, { name: string; color: string }];

  const pick = (c: PlanChoice): void => pickWith(settings, c);

  const create = async (asPrivate = false, claimOk = false): Promise<void> => {
    if (!check.ok || busy) return;
    // US6-S6: ein anderer Trainer hat das Spiel vorgemerkt: erst nachfragen.
    if (!claimOk && otherClaim(fromPlan)) {
      setClaimAsk(true);
      return;
    }
    setBusy(true);
    // Spec 006 FR-L22: überträgt ein anderes Handy gerade ein Spiel dieser Mannschaft? Höchstens 3 s auf den
    // Live-Stand warten, falls das Handy ihn noch nicht geladen hat (US6-S6).
    const w = liveTeam && liveOn && !asPrivate ? await heardWithin(watchLoad.current, LIVE_WAIT_MS) : null;
    if (!mounted.current) return;
    if (liveTeam && w) {
      const ids = (await listGames()).map((g) => g.id);
      const other = w.running(liveTeam.key, ids);
      if (other) {
        setRunning(other);
        setBusy(false);
        return;
      }
    }
    const now = Date.now();
    const created = createGame(check.value, { id: globalThis.crypto.randomUUID(), now });
    // Spec 006 FR-L09: "Live aufs Dashboard" aus → das Spiel wird nicht gesendet.
    const game = liveTeam && (!liveOn || asPrivate) ? startPrivate(created) : created;
    await putGame(game);
    // Spec 015 FR-P11: Planspiel als "angelegt" vermerken (nachgeladen, im Hintergrund).
    if (fromPlan) {
      const planId = fromPlan.entry.id;
      void import('../../platform/live-setup').then((m) => m.linkPlanGame(planId, game.id)).catch(() => undefined);
    }
    await putSettings(
      rememberColors(recordTeamUse(settings, team.id, { schema: check.value.schema, squad: chosen, now }), check.value),
    );
    navigate(`/spiel/${game.id}`, true);
  };

  /** Spec 006 FR-L23: Spiel mit Stand, Spielzeit und Toren übernehmen. */
  const takeover = async (r: RunningGame): Promise<void> => {
    if (!watch.current || busy) return;
    setBusy(true);
    try {
      const game = watch.current.takeover(r.entry, team.name, await getPlayers(), () => globalThis.crypto.randomUUID());
      await putGame(game);
      navigate(`/spiel/${game.id}`, true);
    } catch {
      setBusy(false);
    }
  };

  return (
    <main class="page">
      <header class="topbar">
        <button type="button" class="icon-btn" aria-label="Zurück" onClick={() => navigate('/')}>
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" class="icon">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <h1 class="topbar__title t-zwischentitel">Neues Spiel</h1>
      </header>

      <form
        class="form"
        onSubmit={(e) => {
          e.preventDefault();
          void create();
        }}
      >
        {own && own.today.length + own.later.length > 0 && (
          <section class="card plan-pick" aria-labelledby="plan-pick-title" data-testid="plan-pick">
            <h2 id="plan-pick-title" class="t-label card__title">
              {own.today.length > 0 ? 'AUS DEM SPIELPLAN · HEUTE' : 'AUS DEM SPIELPLAN'}
            </h2>
            {own.today.length > 0 && (
              <div class="plan-pick__rows">
                {own.today.map((c) => (
                  <PickRow
                    key={c.entry.id}
                    c={c}
                    lead={c.entry.time ?? '–'}
                    selected={fromPlan?.entry.id === c.entry.id}
                    onPick={() => pick(c)}
                  />
                ))}
              </div>
            )}
            {own.later.length > 0 && (
              <button
                type="button"
                class="plan__head plan-pick__more"
                aria-expanded={showLater}
                data-testid="plan-pick-more"
                onClick={() => setShowLater(!showLater)}
              >
                <span class="plan__date">Weitere Spiele</span>
                <span class="plan__count">nächste 14 Tage</span>
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" class="icon plan__chev">
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
            {showLater && (
              <div class="plan-pick__rows">
                {own.later.map((c) => (
                  <PickRow
                    key={c.entry.id}
                    c={c}
                    lead={c.day}
                    selected={fromPlan?.entry.id === c.entry.id}
                    onPick={() => pick(c)}
                  />
                ))}
              </div>
            )}
            {fromPlan && (
              <p class="plan-pick__hint" data-testid="plan-pick-hint">
                Aus dem Spielplan: {fromPlan.when}
                {fromPlan.entry.competition ? ` · ${fromPlan.entry.competition}` : ''}. Änderungen gelten nur für dieses
                Spiel.
              </p>
            )}
          </section>
        )}
        {/* Spec 011 FR-G03: Mannschaft, Live, Gegner, Begegnung und Trikots auf einer Karte */}
        <section class="card" aria-labelledby="card-matchup-title" data-testid="card-matchup">
          <h2 id="card-matchup-title" class="t-label card__title">
            BEGEGNUNG
          </h2>
          {settings.teams.length > 1 && (
            <div class="field">
              <span class="field__label t-label" id="ng-team">
                MANNSCHAFT
              </span>
              <div class="chips" role="group" aria-labelledby="ng-team" data-testid="team-chips">
                {settings.teams.map((t, i) => (
                  <button
                    type="button"
                    key={t.id}
                    class="chip chip--wide"
                    aria-pressed={t.id === team.id}
                    data-testid={`team-chip-${i}`}
                    onClick={() => {
                      applyTeam(settings, t);
                      // Andere Mannschaft als im gewählten Planspiel: kein Spiel aus dem Plan mehr.
                      if (fromPlan && keyOf(t) !== fromPlan.entry.team) setFromPlan(null);
                    }}
                  >
                    {teamShortLabel(t.name)}
                  </button>
                ))}
              </div>
            </div>
          )}
          {liveTeam && settings.live && (
            <div class="switch-row" data-testid="new-live-row">
              <div class="switch-row__text">
                <span class="switch-row__title" id="ng-live">
                  Live aufs Dashboard
                </span>
                <p class="switch-row__help">
                  {liveOn
                    ? `Eltern sehen das Spiel in „${titleOf(settings.live)}“.`
                    : 'Wird nicht gesendet, z. B. Testspiel. Im Spiel über „…“ wieder einschaltbar.'}
                </p>
              </div>
              <button
                type="button"
                class="switch"
                role="switch"
                aria-checked={liveOn}
                aria-labelledby="ng-live"
                data-testid="new-live-switch"
                onClick={() => setLiveOn(!liveOn)}
              />
            </div>
          )}
          {settings.live && isRetired(settings.live) && (
            <p class="field__help" data-testid="new-live-retired">
              „{titleOf(settings.live)}“ wurde neu ausgestellt. Füge den neuen Trainer-Link unter „Mehr“ →
              „Live-Spieltag“ ein, um wieder live zu senden.
            </p>
          )}
          {settings.teams.length === 0 && (
            <p class="hint" data-testid="hint-teams">
              Deine Mannschaft und ihre Trikots legst du einmal in den{' '}
              <button type="button" class="link-btn" onClick={() => navigate('/einstellungen')}>
                Einstellungen
              </button>{' '}
              an.
            </p>
          )}

          <div class="field">
            <label class="field__label t-label" for="opponent">
              GEGNER
            </label>
            <input
              id="opponent"
              class="input"
              data-testid="input-opponent"
              value={opponent}
              maxLength={40}
              autocomplete="off"
              placeholder="z. B. TSV Musterstadt"
              onInput={(e) => setOpponent(e.currentTarget.value)}
            />
          </div>

          <div class="field">
            {/* Spec 004 FR-M05: wie die Kopfzeile im Spiel (FR-040) */}
            <div class="matchup-preview">
              <div class="matchup-preview__roles t-label" aria-hidden="true">
                <span>HEIM</span>
                <span>GAST</span>
              </div>
              <div class="teams teams--preview">
                <div class="team">
                  <Mark colorId={home.color} />
                  <span class="team__name" data-testid="matchup-home">
                    {home.name}
                  </span>
                </div>
                <button
                  type="button"
                  class="icon-btn teams__swap"
                  aria-label="Heim und Gast tauschen"
                  data-testid="btn-swap-venue"
                  onClick={() => setVenue(venue === 'home' ? 'away' : 'home')}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" class="icon">
                    <path d="M4 8h15M15 4l4 4-4 4M20 16H5M9 12l-4 4 4 4" />
                  </svg>
                </button>
                <div class="team team--away">
                  <span class="team__name" data-testid="matchup-away">
                    {away.name}
                  </span>
                  <Mark colorId={away.color} />
                </div>
              </div>
            </div>
          </div>

          <div class="field">
            <span class="field__label t-label">TRIKOTS</span>
            <div class="kit-list">
              <KitRow
                side="own"
                label={ownShort}
                value={ownColor}
                dark={dark}
                open={pal === 'own'}
                onToggle={() => setPal(pal === 'own' ? null : 'own')}
                onPick={(id) => {
                  setOwnTouched(true);
                  setOwnColor(id);
                  setPal(null);
                }}
              />
              <KitRow
                side="opp"
                label={oppLabel}
                value={oppColor}
                dark={dark}
                open={pal === 'opp'}
                onToggle={() => setPal(pal === 'opp' ? null : 'opp')}
                onPick={(id) => {
                  setOppTouched(true);
                  setOppColor(id);
                  setPal(null);
                }}
              />
            </div>
            <p class="field__help" data-testid="kit-source">
              {ownTouched
                ? 'Feuerbach-Trikot nur für dieses Spiel geändert.'
                : `Feuerbach-Trikot aus dem ${venue === 'home' ? 'Heimtrikot' : 'Auswärtstrikot'}.`}
            </p>
            {ownColor === oppColor && (
              <p class="hint" data-testid="color-clash-hint">
                Beide Mannschaften in derselben Farbe. Die Tor-Knöpfe unterscheiden sich dann nur über den Namen.
              </p>
            )}
          </div>
        </section>

        <section class="field card" aria-labelledby="card-schema-title" data-testid="card-schema">
          <h2 id="card-schema-title" class="t-label card__title">
            SPIELZEIT
          </h2>
          <div class="schema">
            <label class="visually-hidden" for="sections">
              Anzahl Abschnitte
            </label>
            <select
              id="sections"
              class="select"
              data-testid="schema-sections"
              value={String(sections)}
              onChange={(e) => setSections(Number(e.currentTarget.value))}
            >
              {range(1, 4).map((n) => (
                <option key={n} value={String(n)}>
                  {n}
                </option>
              ))}
            </select>
            <span class="schema__times" aria-hidden="true">
              ×
            </span>
            <label class="visually-hidden" for="minutes">
              Minuten pro Abschnitt
            </label>
            <select
              id="minutes"
              class="select"
              data-testid="schema-minutes"
              value={String(minutes)}
              onChange={(e) => setMinutes(Number(e.currentTarget.value))}
            >
              {range(1, 60).map((n) => (
                <option key={n} value={String(n)}>
                  {n}
                </option>
              ))}
            </select>
            <span class="schema__unit">Minuten</span>
          </div>
          <button
            type="button"
            class="btn btn--secondary signal-test"
            data-testid="btn-test-signal"
            onClick={testSignal}
          >
            Ton testen
          </button>
          <p class="t-klein signal-test__hint" data-testid="signal-test-hint">
            Signalton: {signalSoundName(settings.signalSound)}, änderbar unter „Mehr“ → „Einstellungen“. Lautstärke mit
            den Tasten am Handy einstellen, solange die App offen ist.
          </p>
        </section>

        <section class="field card" aria-label="Aufgebot" data-testid="card-squad">
          <div class="squad__head">
            <span class="t-label card__title squad__count" data-testid="squad-count">
              AUFGEBOT · {chosen.length} VON {visible.length}
            </span>
            {lastSquad.length > 0 && (
              <button
                type="button"
                class="btn btn--quiet btn--small"
                data-testid="squad-take-last"
                onClick={() => setSquad(lastSquad)}
              >
                Wie letztes Spiel
              </button>
            )}
          </div>
          {visible.length === 0 ? (
            <p class="hint">
              Noch kein Kader angelegt. Torschützen kannst du wählen, sobald der Kader steht.{' '}
              <button type="button" class="link-btn" onClick={() => navigate('/kader')}>
                Kader anlegen
              </button>
            </p>
          ) : (
            <>
              <div class="squad" data-testid="squad-picker" role="group" aria-label="Aufgebot">
                {visible.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    class="squad__option"
                    aria-pressed={squad.includes(p.id)}
                    data-testid={`squad-option-${p.id}`}
                    onClick={() => toggle(p.id)}
                  >
                    {p.number === null ? p.name : `${p.number} ${p.name}`}
                  </button>
                ))}
              </div>
              {chosen.length === 0 && (
                <p class="field__help">Ohne Auswahl steht in der Torschützen-Auswahl der ganze Kader.</p>
              )}
            </>
          )}
        </section>

        <button
          type="submit"
          class="btn btn--primary btn--large"
          data-testid="btn-create"
          disabled={!check.ok || busy}
          aria-busy={busy}
        >
          Weiter zum Anpfiff
        </button>
      </form>
      {running && (
        <div class="overlay overlay--bottom">
          <div class="overlay__backdrop" onClick={() => setRunning(null)} />
          <div
            class="sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="takeover-title"
            data-testid="takeover-dialog"
          >
            <h2 id="takeover-title" class="sheet__title">
              {teamShortLabel(team.name)} läuft schon live
            </h2>
            <p class="sheet__text">
              Das Spiel der {teamShortLabel(team.name)} überträgt bereits ein anderes Handy:{' '}
              <strong data-testid="takeover-summary">{running.summary}</strong>.
            </p>
            <p class="sheet__text sheet__text--muted">
              Beim Übernehmen kommen Gegner, Spielzeit und Tore mit; Karten, Wechsel und Lesezeichen bleiben auf dem
              anderen Handy. Danach sendet nur noch dieses Handy.
            </p>
            <button
              type="button"
              class="btn btn--primary"
              data-testid="takeover-yes"
              disabled={busy}
              onClick={() => void takeover(running)}
            >
              Spiel übernehmen
            </button>
            <button
              type="button"
              class="btn btn--secondary"
              data-testid="takeover-private"
              disabled={busy}
              onClick={() => {
                setRunning(null);
                void create(true, true);
              }}
            >
              Nur hier erfassen (nicht live)
            </button>
            <button type="button" class="btn btn--quiet" data-testid="takeover-cancel" onClick={() => setRunning(null)}>
              Abbrechen
            </button>
          </div>
        </div>
      )}
      {claimAsk && (
        <Confirm
          title={`${otherClaim(fromPlan) ?? 'Ein anderer Trainer'} tickert dieses Spiel. Trotzdem hier erfassen?`}
          text="Im Spielplan steht es danach als „angelegt“."
          yesLabel="Hier erfassen"
          onYes={() => {
            setClaimAsk(false);
            void create(false, true);
          }}
          onNo={() => setClaimAsk(false)}
        />
      )}
    </main>
  );
}
