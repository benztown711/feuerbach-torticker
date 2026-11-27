import { SOUND_IDS, signalSoundName, soundFile } from './signal-sound';
import type { SignalSound, SoundChoice, SoundEvent } from './types';

/**
 * Spec 025 FR-T03: Texte der Auswahl (Beschreibung je Ton, Ereignisse mit Hinweis). Eigene Datei, damit sie nur mit den
 * nachgeladenen Bildschirmen (Einstellungen, Eltern-Ansicht) kommt und nicht ins Hauptbundle (Bundle-Budget).
 */

const DESCRIPTION: Record<SignalSound, string> = {
  pfiff: 'Schiri-Pfeife mit Triller, kurz-kurz-lang. Am lautesten.',
  'langer-pfiff': 'Ein langer Pfiff wie beim Anpfiff.',
  doppelpfiff: 'Kurz, dann lang, wie zur Pause.',
  glocke: 'Rundenglocke, drei Schläge. Fast so laut wie der Pfiff.',
  gong: 'Aufsteigender Dreiklang. Leiser, gut für die Halle.',
  torhupe: 'Fanfare wie aus der Fankurve.',
  jubel: 'Zuschauer jubeln und klatschen.',
  'hupe-jubel': 'Fanfare, direkt danach Jubel.',
  kinderjubel: 'Kinder jubeln kurz.',
  raunen: 'Enttäuschtes „Ohh“ der Zuschauer.',
};

/** FR-K01, Spec 025 FR-T01: Reihenfolge, Name, Beschreibung und ggf. Datei für die Auswahl. */
export const SIGNAL_SOUNDS: readonly { id: SignalSound; name: string; description: string; file?: string }[] =
  SOUND_IDS.map((id) => ({ id, name: signalSoundName(id), description: DESCRIPTION[id], file: soundFile(id) }));

/** Spec 025 FR-T03: Name eines gewählten Tons, auch "Aus". */
export const soundChoiceName = (c: SoundChoice): string => (c === 'aus' ? 'Aus' : signalSoundName(c));

/** Spec 025 FR-T03: Ereignisse in der Reihenfolge der Einstellungen, mit Hinweis im Auswahlblatt. */
export const SOUND_EVENTS: readonly { id: SoundEvent; name: string; hint: string }[] = [
  { id: 'timeUp', name: 'Spielzeitende', hint: 'Bei 00:00 und zu jeder vollen Nachspielminute.' },
  { id: 'kickoff', name: 'Anpfiff', hint: 'Beim Anpfiff jeder Halbzeit bzw. jedes Abschnitts.' },
  { id: 'halftime', name: 'Pausenpfiff', hint: 'Wenn du den Pausenpfiff bestätigst.' },
  { id: 'fulltime', name: 'Schlusspfiff', hint: 'Wenn du den Schlusspfiff bestätigst.' },
  { id: 'goalOwn', name: 'Tor für uns', hint: 'Sofort beim Tippen auf den Tor-Knopf deiner Mannschaft.' },
  { id: 'goalOpp', name: 'Gegentor', hint: 'Sofort beim Tippen auf den Tor-Knopf des Gegners.' },
];
