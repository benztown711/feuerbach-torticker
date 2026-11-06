import { render } from 'preact';
import './styles/tokens.css';
import './styles/base.css';
import './styles/app.css';
import { App } from './ui/app';
import { getSettings } from './platform/db';
import { startLiveSender } from './platform/live-sender';
import { setSignalSound } from './platform/signal';
import { applyTheme, requestPersistentStorage } from './platform/storage';
import { APP_MANIFEST, setManifest } from './platform/manifest-link';
import { parseHash } from './ui/router';

// Spec 006 FR-L16: Safari liest nur den ersten Manifest-Verweis der Seite. Auf der Seite des Zuschauer-Links
// setzt ihn das Dashboard (Startadresse ist der Zuschauer-Link), sonst gilt sofort das Manifest der App.
if (parseHash(window.location.hash).name !== 'liveView') setManifest(APP_MANIFEST);

// FR-018: gespeichertes Theme anwenden; FR-023: dauerhaften Speicher anfragen.
void getSettings().then((s) => {
  applyTheme(s.theme);
  // Spec 008 FR-K04: gewählten Signalton merken (erzeugt wird er beim ersten Abspielen).
  setSignalSound(s.signalSound);
  // Spec 006 FR-L05, FR-L06: nur gekoppelte Lead-Handys senden.
  void startLiveSender(s);
});
void requestPersistentStorage();

const root = document.getElementById('app');
if (root) render(<App />, root);
