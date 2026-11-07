import { render } from 'preact';
import './styles/tokens.css';
import './styles/base.css';
import './styles/app.css';
import { App } from './ui/app';
import { getSettings, onGameWrite } from './platform/db';
import { startLiveSender } from './platform/live-sender';
import { onLiveSettings } from './platform/live-events';
import { setSignalSound } from './platform/signal';
import { applyTheme, requestPersistentStorage } from './platform/storage';
import { APP_MANIFEST, setManifest } from './platform/manifest-link';
import { parseHash } from './ui/router';
import type { Settings } from './domain/types';

// Spec 006 FR-L16: Safari liest nur den ersten Manifest-Verweis der Seite. Auf der Seite des Zuschauer-Links
// setzt ihn das Dashboard (Startadresse ist der Zuschauer-Link), auf der Seite des Trainer-Links die Seite selbst
// (research.md R-L20), sonst gilt sofort das Manifest der App.
const first = parseHash(window.location.hash);
if (first.name !== 'liveView' && !(first.name === 'leadLink' && first.kind === 'trainer')) setManifest(APP_MANIFEST);

// FR-018: gespeichertes Theme anwenden; FR-023: dauerhaften Speicher anfragen.
void getSettings().then((s) => {
  applyTheme(s.theme);
  // Spec 008 FR-K04: gewählten Signalton merken (erzeugt wird er beim ersten Abspielen).
  setSignalSound(s.signalSound);
  // Spec 006 FR-L05, FR-L06: nur gekoppelte Lead-Handys senden.
  void startLiveSender(s);
  // Spec 015 FR-P07: gekoppelte Trainer-Handys senden den Spielplan beim Öffnen erneut, falls nötig.
  if (s.live?.orgKey) refreshPlan();
  syncTrainer(s);
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void getSettings().then((s) => s.live?.orgKey && refreshPlan());
  void getSettings().then(syncTrainer);
});
// Spec 016 R-B6: gekoppelt, neu ausgestellt oder entkoppelt: Verbindung neu aufbauen bzw. beenden.
onLiveSettings(syncTrainer);
let squadSync = false;
/** Spec 016 R-B6: Trainer-Handys halten, solange die App sichtbar ist, die Verbindung für geteilte Kader. */
function syncTrainer(s: Settings): void {
  if (!s.live?.orgKey && !squadSync) return;
  squadSync = true;
  void import('./platform/squad-sync')
    .then((m) => m.syncTrainer(s, document.visibilityState === 'visible'))
    .catch(() => undefined);
}
function refreshPlan(): void {
  void import('./platform/live-setup').then((m) => m.refreshPlan()).catch(() => undefined);
}
// Spec 015 FR-P30 (R-P8): Endstand eines aus dem Plan angelegten Spiels ins Planspiel; nachgeladen nur, wenn
// sich der Endstand eines Spiels ändert (Schlusspfiff, Tor-Korrektur, zurückgenommener Schlusspfiff) und beim
// ersten Speichern eines Spiels nach dem Start (ein vorher zurückgenommener Schlusspfiff). Trainer-Handys haben
// `live-setup` zu dem Zeitpunkt ohnehin geladen (refreshPlan).
const finals = new Map<string, string>();
onGameWrite((c) => {
  if (c.kind !== 'put') return;
  const { id, finalScore } = c.game;
  const key = finalScore ? `${finalScore.own}:${finalScore.opp}` : '';
  const known = finals.get(id);
  finals.set(id, key);
  if (known === key) return;
  void getSettings()
    .then((s) => s.live?.orgKey && import('./platform/live-setup').then((m) => m.notePlanScore(id, finalScore)))
    .catch(() => undefined);
});
void requestPersistentStorage();

const root = document.getElementById('app');
if (root) render(<App />, root);
