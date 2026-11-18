import { useEffect, useState } from 'preact/hooks';

/**
 * Spec 021 R-W3: Tor-Blätter und Auswahl (`goal-editor.tsx`) liegen in einem nachgeladenen Teil. Spielbildschirm
 * und Spieldetails laden ihn beim Öffnen vor. Schlägt das Laden fehl (z. B. kein Netz und noch nicht im Speicher des
 * Service Workers), lädt der nächste Bedarf (neues Tor, Tipp auf eine Torzeile) ihn erneut.
 */
export type GoalEditorModule = typeof import('./goal-editor');

let loaded: GoalEditorModule | null = null;
let loading: Promise<GoalEditorModule> | null = null;
let failed = 0;

/**
 * Chromium und WebKit merken sich ein fehlgeschlagenes Modul je Adresse und laden es dann nicht neu. Nach einem
 * Fehler gilt deshalb dieselbe Datei mit eigener Adresse (die Vorlade-Verknüpfung des Builds nennt sie). Die
 * übrigen Teile, die sie braucht, lädt schon das Hauptbundle.
 */
function importEditor(): Promise<GoalEditorModule> {
  const href =
    failed > 0 ? document.querySelector<HTMLLinkElement>('link[rel="modulepreload"][href*="/goal-editor-"]')?.href : '';
  return href ? import(/* @vite-ignore */ `${href}?retry=${failed}`) : import('./goal-editor');
}

export function loadGoalEditor(): Promise<GoalEditorModule> {
  if (loaded) return Promise.resolve(loaded);
  loading ??= importEditor().then(
    (m) => (loaded = m),
    (e: unknown) => {
      loading = null;
      failed += 1;
      throw e;
    },
  );
  return loading;
}

/** Das Modul, sobald geladen; bis dahin null. `need` ändert sich bei jedem Bedarf und löst ein neues Laden aus. */
export function useGoalEditor(need: unknown): GoalEditorModule | null {
  const [mod, setMod] = useState(loaded);
  useEffect(() => {
    if (mod) return;
    let alive = true;
    loadGoalEditor().then(
      (m) => alive && setMod(m),
      () => undefined,
    );
    return () => {
      alive = false;
    };
  }, [need, mod]);
  return mod;
}
