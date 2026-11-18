/**
 * Spec 022 US1: Hinweis zur Installation auf dem Startbildschirm (FR-F01 bis FR-F04, research.md R-F1, R-F2).
 * Reine Entscheidungen; Erkennung der Installation (`isStandalone`) und Browserspeicher liegen in der Oberfläche.
 */

export type InstallPlatform = 'ios' | 'android' | 'other';

/**
 * iPhone, iPad und iPod sind iOS; iPadOS meldet sich im Desktop-Modus als Mac, hat aber Touch (ein Mac nicht).
 * Android steht im User-Agent; alles andere (Rechner) bekommt die allgemeine Anleitung.
 */
export function installPlatform(userAgent: string, touchPoints = 0): InstallPlatform {
  if (/iPhone|iPad|iPod/.test(userAgent)) return 'ios';
  if (/Macintosh/.test(userAgent) && touchPoints > 1) return 'ios';
  if (/Android/.test(userAgent)) return 'android';
  return 'other';
}

/** FR-F02: kurze Anleitung nach Gerät, Bezeichnungen wörtlich wie im Browser. */
export function installSteps(platform: InstallPlatform): string {
  if (platform === 'ios') return 'In Safari auf „Teilen“ tippen, dann „Zum Home-Bildschirm“.';
  if (platform === 'android') return 'Im Browser-Menü (drei Punkte) „App installieren“ wählen.';
  return 'Im Menü des Browsers „App installieren“ oder „Zum Home-Bildschirm“ wählen.';
}

export interface InstallHintState {
  /** Läuft die App vom Home-Bildschirm? (Spec 001 FR-023, `isStandalone`) */
  standalone: boolean;
  /** "Verstanden" in den Einstellungen (dauerhaft), sonst null. */
  dismissedAt: number | null;
  /** Kalendertag von "Später" (Ortszeit, `JJJJ-MM-TT`), sonst null. */
  laterDay: string | null;
  /** Heutiger Kalendertag im selben Format. */
  today: string;
}

/**
 * FR-F01, FR-F03, FR-F04: sichtbar im Browser, solange weder "Verstanden" noch heute "Später" getippt wurde.
 * Nur genau der Tag von "Später" zählt: Steht die Uhr danach zurück, bliebe der Hinweis sonst lange weg.
 */
export function showInstallHint(s: InstallHintState): boolean {
  return !s.standalone && s.dismissedAt === null && s.laterDay !== s.today;
}
