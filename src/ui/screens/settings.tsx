import { useEffect, useState } from 'preact/hooks';
import { backupFileName, buildBackup, mergeBackup, parseBackup } from '../../domain/export';
import { removeRecent } from '../../domain/team-name';
import type { Settings, Theme } from '../../domain/types';
import { getPlayers, getSettings, listGames, putGames, putPlayers, putSettings } from '../../platform/db';
import { shareFile } from '../../platform/share';
import { applyTheme, isStandalone } from '../../platform/storage';
import { navigate } from '../router';
import { APP_VERSION } from '../../version';

const THEMES: { id: Theme; label: string }[] = [
  { id: 'system', label: 'Wie iPhone' },
  { id: 'light', label: 'Hell' },
  { id: 'dark', label: 'Dunkel' },
];

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

/** Einstellungen: Darstellung (FR-018), Mannschaftsnamen (FR-014), Sicherung (FR-024), Installationshinweis (FR-023). */
export function SettingsScreen() {
  const [settings, setSettings] = useState<Settings | undefined>(undefined);
  const [exportMsg, setExportMsg] = useState('');
  const [importMsg, setImportMsg] = useState('');
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

        <section class="settings__section" aria-labelledby="s-teams">
          <h2 id="s-teams" class="t-label settings__heading">
            EIGENE MANNSCHAFTEN
          </h2>
          <ul class="team-list" data-testid="recent-own-teams">
            {settings.recentOwnTeams.map((name, i) => (
              <li key={name} class="team-list__item">
                <span class="team-list__name">{name}</span>
                <button
                  type="button"
                  class="icon-btn"
                  aria-label={`${name} entfernen`}
                  data-testid={`recent-own-team-remove-${i}`}
                  onClick={() => save({ ...settings, recentOwnTeams: removeRecent(settings.recentOwnTeams, name) })}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" class="icon">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </li>
            ))}
            {settings.recentOwnTeams.length === 0 && (
              <li class="team-list__item team-list__item--empty">Noch keine gespeichert.</li>
            )}
          </ul>
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
    </main>
  );
}
