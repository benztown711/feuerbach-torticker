import { useEffect, useState } from 'preact/hooks';
import { backupFileName, buildBackup, mergeBackup, parseBackup } from '../../domain/export';
import { getColor } from '../../domain/jersey-colors';
import { blankTeam, removeTeam, upsertTeam, validateTeam } from '../../domain/teams';
import { shortTeamName } from '../../domain/team-name';
import type { EventFeatures, Settings, Team, Theme } from '../../domain/types';
import { getPlayers, getSettings, listGames, putGames, putPlayers, putSettings } from '../../platform/db';
import { shareFile } from '../../platform/share';
import { applyTheme, isStandalone } from '../../platform/storage';
import { Confirm } from '../components/confirm';
import { KitRow } from '../components/kit-row';
import { Sheet } from '../components/sheet';
import { useDarkTheme } from '../hooks';
import { navigate } from '../router';
import { APP_VERSION } from '../../version';

const THEMES: { id: Theme; label: string }[] = [
  { id: 'system', label: 'Wie iPhone' },
  { id: 'light', label: 'Hell' },
  { id: 'dark', label: 'Dunkel' },
];

/** Spec 003 FR-E02: Schalter "Im Spiel erfassen". */
const FEATURE_SWITCHES: { key: keyof EventFeatures; title: string; help: string }[] = [
  { key: 'cards', title: 'Karten', help: 'Gelb, Gelb-Rot, Rot und Zeitstrafe, mit Spieler.' },
  { key: 'subs', title: 'Wechsel', help: 'Wer für wen, nur eigene Mannschaft.' },
  {
    key: 'marks',
    title: 'Lesezeichen',
    help: 'Nur für dich, z. B. Szenen für die Veo-Kamera merken. Erscheinen nie im geteilten Text.',
  },
];

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

function KitMark({ id }: { id: string }) {
  const c = getColor(id, true);
  return (
    <span class="kit">
      <span class="kit-row__mark" style={{ background: c.value }} aria-hidden="true" />
      {c.name}
    </span>
  );
}

/** Spec 004 FR-M01: Mannschaft anlegen oder ändern (Name, Heim- und Auswärtstrikot), löschen mit Abfrage. */
function TeamSheet(props: {
  team: Team;
  isNew: boolean;
  onSave: (t: Team) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const dark = useDarkTheme();
  const [team, setTeam] = useState(props.team);
  const [pal, setPal] = useState<'home' | 'away' | null>(null);
  const [askDelete, setAskDelete] = useState(false);
  const check = validateTeam(team);
  const kit = (w: 'home' | 'away', label: string) => (
    <KitRow
      side={w}
      label={label}
      value={w === 'home' ? team.homeColor : team.awayColor}
      dark={dark}
      open={pal === w}
      onToggle={() => setPal(pal === w ? null : w)}
      onPick={(id) => {
        setTeam(w === 'home' ? { ...team, homeColor: id } : { ...team, awayColor: id });
        setPal(null);
      }}
    />
  );
  return (
    <>
      <Sheet title={props.isNew ? 'Neue Mannschaft' : 'Mannschaft'} testId="team-sheet" onClose={props.onClose}>
        <label class="field__label t-label" for="team-name">
          NAME
        </label>
        <input
          id="team-name"
          class="input"
          data-testid="input-team-name"
          value={team.name}
          maxLength={40}
          autocomplete="off"
          placeholder="z. B. Sportvg Feuerbach U11"
          onInput={(e) => setTeam({ ...team, name: e.currentTarget.value })}
        />
        <p class="field__help">{check.errors.name ?? `Im Spiel steht kurz „${shortTeamName(check.value.name)}“.`}</p>
        <div class="kit-list">
          {kit('home', 'Heimtrikot')}
          {kit('away', 'Auswärtstrikot')}
        </div>
        <div class="button-row">
          {props.isNew ? (
            <button type="button" class="btn btn--secondary" onClick={props.onClose}>
              Abbrechen
            </button>
          ) : (
            <button
              type="button"
              class="btn btn--secondary"
              data-testid="btn-delete-team"
              onClick={() => setAskDelete(true)}
            >
              Löschen …
            </button>
          )}
          <button
            type="button"
            class="btn btn--primary"
            data-testid="btn-save-team"
            disabled={!check.ok}
            onClick={() => props.onSave(check.value)}
          >
            Speichern
          </button>
        </div>
      </Sheet>
      {askDelete && (
        <Confirm
          title="Mannschaft löschen?"
          text={`„${props.team.name}“ verschwindet aus der Auswahl. Alte Spiele bleiben in der Historie.`}
          yesLabel="Löschen"
          onYes={props.onDelete}
          onNo={() => setAskDelete(false)}
        />
      )}
    </>
  );
}

/** Einstellungen: Meine Mannschaften (Spec 004), Darstellung (FR-018), Sicherung (FR-024), Installationshinweis (FR-023). */
export function SettingsScreen() {
  const [settings, setSettings] = useState<Settings | undefined>(undefined);
  const [exportMsg, setExportMsg] = useState('');
  const [importMsg, setImportMsg] = useState('');
  const [editTeam, setEditTeam] = useState<{ team: Team; isNew: boolean } | null>(null);
  useEffect(() => {
    void getSettings().then(setSettings);
  }, []);
  if (!settings) return <main class="page" aria-busy="true" />;

  const save = (next: Settings): void => {
    setSettings(next);
    void putSettings(next);
  };
  const showInstallHint = !isStandalone() && settings.installHintDismissedAt === null;

  const doExport = async (): Promise<void> => {
    const now = Date.now();
    const backup = buildBackup(await listGames(), await getPlayers(), now, APP_VERSION);
    const r = await shareFile(JSON.stringify(backup, null, 1), backupFileName(now));
    setExportMsg(
      r === 'shared'
        ? 'Sicherung bereitgestellt.'
        : r === 'downloaded'
          ? 'Sicherung heruntergeladen.'
          : r === 'cancelled'
            ? ''
            : 'Sicherung konnte nicht erstellt werden.',
    );
  };

  const doImport = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    const parsed = parseBackup(await file.text());
    if (!parsed.ok) {
      setImportMsg(parsed.error);
      return;
    }
    const merged = mergeBackup({ games: await listGames(), players: await getPlayers() }, parsed.backup);
    await putGames(merged.newGames);
    await putPlayers(merged.newPlayers);
    const skipped =
      merged.skippedGames > 0 ? `, ${plural(merged.skippedGames, 'Spiel', 'Spiele')} schon vorhanden` : '';
    setImportMsg(
      `Wiederhergestellt: ${plural(merged.newGames.length, 'Spiel', 'Spiele')}, ${plural(merged.newPlayers.length, 'Spieler', 'Spieler')}${skipped}.`,
    );
  };

  return (
    <main class="page">
      <header class="topbar">
        <button type="button" class="icon-btn" aria-label="Zurück zu Mehr" onClick={() => navigate('/mehr')}>
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" class="icon">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <h1 class="topbar__title t-zwischentitel">Einstellungen</h1>
      </header>
      <div class="settings">
        {showInstallHint && (
          <div class="notice" data-testid="install-hint">
            <p class="notice__text">
              <strong>Tipp:</strong> Öffne den Torticker vom Home-Bildschirm. Nur dann bleiben deine Spiele dauerhaft
              gespeichert. In Safari: Teilen → „Zum Home-Bildschirm“.
            </p>
            <button
              type="button"
              class="btn btn--secondary btn--small"
              data-testid="install-hint-dismiss"
              onClick={() => save({ ...settings, installHintDismissedAt: Date.now() })}
            >
              Verstanden
            </button>
          </div>
        )}

        <section class="settings__section" aria-labelledby="s-teams">
          <h2 id="s-teams" class="t-label settings__heading">
            MEINE MANNSCHAFTEN
          </h2>
          <ul class="team-list" data-testid="settings-teams">
            {settings.teams.map((t, i) => (
              <li key={t.id}>
                <button
                  type="button"
                  class="team-row"
                  data-testid={`team-row-${i}`}
                  onClick={() => setEditTeam({ team: t, isNew: false })}
                >
                  <span class="team-row__text">
                    <span class="team-row__name">{t.name}</span>
                    <span class="team-row__kits">
                      <span>
                        Heim <KitMark id={t.homeColor} />
                      </span>
                      <span>
                        Auswärts <KitMark id={t.awayColor} />
                      </span>
                    </span>
                  </span>
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" class="icon">
                    <path d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </li>
            ))}
            {settings.teams.length === 0 && (
              <li class="team-list__item team-list__item--empty">
                Noch keine angelegt. Bis dahin gilt „Sportvg Feuerbach“ in Rot.
              </li>
            )}
          </ul>
          <button
            type="button"
            class="btn btn--secondary add-btn"
            data-testid="btn-add-team"
            onClick={() => setEditTeam({ team: blankTeam(globalThis.crypto.randomUUID()), isNew: true })}
          >
            Mannschaft anlegen
          </button>
        </section>

        <section class="settings__section" aria-labelledby="s-capture">
          <h2 id="s-capture" class="t-label settings__heading">
            IM SPIEL ERFASSEN
          </h2>
          <ul class="switch-list">
            {FEATURE_SWITCHES.map((f) => (
              <li key={f.key} class="switch-row">
                <div class="switch-row__text">
                  <span class="switch-row__title" id={`sw-${f.key}`}>
                    {f.title}
                  </span>
                  <p class="switch-row__help">{f.help}</p>
                </div>
                <button
                  type="button"
                  class="switch"
                  role="switch"
                  aria-checked={settings.features[f.key]}
                  aria-labelledby={`sw-${f.key}`}
                  data-testid={`feature-${f.key}`}
                  onClick={() =>
                    save({ ...settings, features: { ...settings.features, [f.key]: !settings.features[f.key] } })
                  }
                />
              </li>
            ))}
          </ul>
        </section>

        <section class="settings__section" aria-labelledby="s-theme">
          <h2 id="s-theme" class="t-label settings__heading">
            DARSTELLUNG
          </h2>
          <div class="segmented" role="group" aria-labelledby="s-theme">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                class="segmented__item"
                aria-pressed={settings.theme === t.id}
                data-testid={`theme-${t.id}`}
                onClick={() => {
                  applyTheme(t.id);
                  save({ ...settings, theme: t.id });
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p class="field__help">In der Sonne ist „Hell“ am besten lesbar.</p>
        </section>

        <section class="settings__section" aria-labelledby="s-backup">
          <h2 id="s-backup" class="t-label settings__heading">
            SICHERUNG
          </h2>
          <div class="button-row">
            <button type="button" class="btn btn--primary" data-testid="btn-export" onClick={() => void doExport()}>
              Sichern
            </button>
            <label class="btn btn--secondary file-btn">
              Wiederherstellen
              <input
                type="file"
                accept="application/json,.json"
                class="visually-hidden"
                data-testid="input-import"
                onChange={(e) => {
                  const input = e.currentTarget;
                  void doImport(input.files?.[0]).then(() => (input.value = ''));
                }}
              />
            </label>
          </div>
          <p class="field__help">Alle Spiele und der Kader als Datei, z. B. in iCloud Drive.</p>
          <p class="settings__result" role="status" data-testid="import-result">
            {importMsg || exportMsg}
          </p>
        </section>
      </div>
      <p class="settings__footer">Feuerbach Torticker · kostenlos · keine Daten verlassen dein Handy</p>
      {editTeam && (
        <TeamSheet
          team={editTeam.team}
          isNew={editTeam.isNew}
          onClose={() => setEditTeam(null)}
          onSave={(t) => {
            save(upsertTeam(settings, t));
            setEditTeam(null);
          }}
          onDelete={() => {
            save(removeTeam(settings, editTeam.team.id));
            setEditTeam(null);
          }}
        />
      )}
    </main>
  );
}
