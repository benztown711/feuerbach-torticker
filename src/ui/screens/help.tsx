import { navigate } from '../router';

/** Hilfe (T086): Hinweise für den Einsatz am Spielfeldrand, vor allem auf dem iPhone. */
export function HelpScreen() {
  return (
    <main class="page">
      <header class="topbar">
        <button type="button" class="icon-btn" aria-label="Zurück zu Mehr" onClick={() => navigate('/mehr')}>
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" class="icon">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <h1 class="topbar__title t-zwischentitel">Hilfe</h1>
      </header>
      <div class="prose">
        <h2 class="t-label">VOM HOME-BILDSCHIRM STARTEN</h2>
        <p>
          Öffne den Torticker in Safari, tippe auf „Teilen“ und dann auf „Zum Home-Bildschirm“. Nur so bleiben deine
          Spiele dauerhaft auf dem iPhone gespeichert.
        </p>
        <h2 class="t-label">TON AM SPIELFELDRAND</h2>
        <p>
          Der Signalton bei Spielzeitende kommt auch bei eingeschaltetem Lautlos-Schalter. Die Lautstärke regelst du mit
          den Lautstärketasten, solange die App offen ist. Pfiff, Glocke oder Gong wählst du unter „Mehr“ →
          „Einstellungen“.
        </p>
        <p>
          Lass die App während des Spiels im Vordergrund. Der Bildschirm bleibt dann an. Im Hintergrund oder bei
          gesperrtem Bildschirm kann eine Web-App auf dem iPhone keinen Ton abspielen; die Uhr läuft aber richtig
          weiter.
        </p>
        <p>Steht oben „Ton aus · tippen“, tippe einmal irgendwo auf den Spielbildschirm.</p>
        <h2 class="t-label">SICHERUNG</h2>
        <p>
          Unter „Mehr“ → „Einstellungen“ → „Sichern“ speicherst du alle Spiele und den Kader als Datei, zum Beispiel in
          iCloud Drive. Bei einem neuen Handy stellst du sie dort mit „Wiederherstellen“ wieder her.
        </p>
        <h2 class="t-label">DATENSCHUTZ</h2>
        <p>Alle Daten bleiben auf deinem Handy. Sie verlassen es nur, wenn du selbst teilst oder sicherst.</p>
      </div>
    </main>
  );
}
