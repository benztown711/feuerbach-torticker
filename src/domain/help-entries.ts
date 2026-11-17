/**
 * Inhalte der Hilfe (Spec 010). Jeder Eintrag nennt seine Quellen (FR-H20); die Prüfung
 * `scripts/check-help.ts` stellt sicher, dass jede umgesetzte User Story abgedeckt ist (Constitution IX).
 */

export type HelpTopic =
  | 'start'
  | 'spiel'
  | 'ereignisse'
  | 'pokal'
  | 'teilen'
  | 'kader'
  | 'historie'
  | 'live'
  | 'einstellungen'
  | 'probleme'
  | 'datenschutz';

export interface HelpEntry {
  /** Adresse `#/hilfe/<id>`: Kleinbuchstaben, Ziffern, Bindestriche. */
  id: string;
  topic: HelpTopic;
  /** Frage. */
  title: string;
  /** Kurze Antwort, höchstens 600 Zeichen (FR-H09). */
  answer: string;
  /** Nummerierte Schritte mit den Bezeichnungen der App. */
  steps?: string[];
  /** Zusätzliche Alltagswörter für die Suche, nicht angezeigt (FR-H04). */
  keywords: string;
  /** "006 US3" oder "001 FR-036"; für Nutzer unsichtbar (FR-H20). */
  sources: string[];
  /** Auch in der Eltern-Hilfe (FR-H16). */
  parents?: boolean;
  /** Knopf "{label} öffnen" führt zu `#{path}` (FR-H10). */
  open?: { label: string; path: string };
  /** Bis zu drei verwandte Einträge (FR-H11). */
  related?: string[];
}

/** Reihenfolge der Themen laut FR-H08. */
export const HELP_TOPICS: { id: HelpTopic; name: string }[] = [
  { id: 'start', name: 'Erste Schritte' },
  { id: 'spiel', name: 'Spiel erfassen' },
  { id: 'ereignisse', name: 'Torschützen und Ereignisse' },
  { id: 'pokal', name: 'Pokal' },
  { id: 'teilen', name: 'Teilen' },
  { id: 'kader', name: 'Mannschaften und Kader' },
  { id: 'historie', name: 'Historie' },
  { id: 'live', name: 'Live-Spieltag' },
  { id: 'einstellungen', name: 'Einstellungen und Sicherung' },
  { id: 'probleme', name: 'Probleme lösen' },
  { id: 'datenschutz', name: 'Datenschutz' },
];

export const HELP_ENTRIES: HelpEntry[] = [
  // Erste Schritte
  {
    id: 'installieren',
    topic: 'start',
    title: 'Wie lege ich den Torticker auf den Home-Bildschirm?',
    answer: 'Nur vom Home-Bildschirm aus bleiben deine Spiele dauerhaft auf dem Handy gespeichert.',
    steps: [
      'iPhone: Link in Safari öffnen, auf „Teilen“ tippen, dann „Zum Home-Bildschirm“.',
      'Android: Link in Chrome öffnen, Menü, dann „App installieren“.',
    ],
    keywords: 'installieren app icon homescreen startbildschirm speichern safari chrome',
    sources: ['001 FR-023'],
    related: ['daten-weg', 'update'],
  },
  {
    id: 'navigation',
    topic: 'start',
    title: 'Wo finde ich was?',
    answer:
      'Unten stehen immer drei Einträge: „Spiel“ für das laufende oder ein neues Spiel, zum Übernehmen oder um die Spiele zu verfolgen, „Historie“ für alle bisherigen Spiele und „Mehr“ für Kader, Einstellungen, Live für Eltern und diese Hilfe. Läuft ein Spiel, zeigt „Spiel“ die Minute und führt direkt zurück. Wo du gerade bist, zeigt die rote Marke über dem Eintrag.',
    keywords: 'menü navigation leiste unten übersicht reiter wo bin ich',
    sources: ['001 FR-037', '011 US3', '018 US1', '020 US2'],
    related: ['neues-spiel', 'historie', 'hilfe-suche'],
  },
  {
    id: 'hilfe-suche',
    topic: 'start',
    title: 'Wie finde ich etwas in der Hilfe?',
    answer:
      'Tippe oben ins Suchfeld. Die Treffer erscheinen schon beim Tippen. Groß- und Kleinschreibung sind egal, ein Wortanfang genügt, und Alltagswörter wie „Backup“ oder „löschen“ funktionieren auch. Mit „Alle Themen anzeigen“ kommst du zurück zur Übersicht.',
    keywords: 'suchen suche finden hilfe',
    sources: ['010 US1'],
    related: ['hilfe-aktuell', 'navigation'],
  },
  {
    id: 'hilfe-aktuell',
    topic: 'start',
    title: 'Ist die Hilfe auf dem neuesten Stand?',
    answer:
      'Ja. Jede neue Funktion bringt ihren Hilfe-Eintrag mit, sonst wird sie nicht veröffentlicht. Ganz unten in der Hilfe steht die Version, die du gerade nutzt.',
    keywords: 'aktuell version neu stand veraltet',
    sources: ['010 US3', '010 FR-H13'],
    related: ['update', 'hilfe-suche'],
  },
  {
    id: 'update',
    topic: 'start',
    title: 'Was bedeutet „Neue Version verfügbar“?',
    answer:
      'Es gibt eine neuere Version der App. Tippe auf „Neu laden“, um sie zu nutzen, oder auf „Später“. Auf dem Spielbildschirm erscheint der Hinweis nicht, damit beim Erfassen nichts dazwischenkommt.',
    keywords: 'update aktualisieren neu laden version später',
    sources: ['001 FR-041'],
    related: ['installieren', 'hilfe-aktuell'],
  },

  // Spiel erfassen
  {
    id: 'neues-spiel',
    topic: 'spiel',
    title: 'Wie lege ich ein Spiel an?',
    answer:
      'Auf der Startseite tippst du auf „Neues Spiel“. Deine Mannschaft, Trikots, Spielzeit und Aufgebot sind schon vorbelegt; meist trägst du nur den Gegner ein. Steht das Spiel im Spielplan, tippst du es oben unter „Aus dem Spielplan“ an. Gegner, Heim/Gast und Trikots stehen zusammen auf der Karte „Begegnung“. Die Uhr startet erst mit „Anpfiff“.',
    steps: [
      '„Neues Spiel“ antippen.',
      'Gegner eintragen, bei Bedarf Spielzeit, Trikots und Aufgebot ändern.',
      '„Weiter zum Anpfiff“ antippen.',
      'Im Spielbildschirm auf „Anpfiff“ tippen.',
    ],
    keywords: 'anlegen starten beginnen gegner spielzeit minuten anpfiff',
    sources: ['001 US2', '004 US3', '011 US1', '011 US4', '015 US2'],
    open: { label: 'Neues Spiel', path: '/neu' },
    related: ['tor', 'aufgebot', 'spiel-aus-plan'],
  },
  {
    id: 'spiel-aus-plan',
    topic: 'spiel',
    title: 'Wie lege ich ein Spiel aus dem Spielplan an?',
    answer:
      'Unter „Neues Spiel“ stehen oben unter „Aus dem Spielplan“ die heutigen Spiele aller Mannschaften; „Weitere Spiele“ zeigt die nächsten 14 Tage. Ein Tipp füllt Mannschaft, Gegner, Heim oder Auswärts, Trikot und Spielzeit aus. Du kannst alles noch ändern, auch das Aufgebot; das gilt nur für dein Spiel, nicht für den Plan. Nach „Weiter zum Anpfiff“ steht das Spiel im Spielplan als „angelegt“. Fehlt ein Spiel, legst du es wie gewohnt von Hand an.',
    steps: [
      '„Neues Spiel“ öffnen.',
      'Unter „Aus dem Spielplan“ das Spiel antippen.',
      'Bei Bedarf Aufgebot oder Angaben ändern, dann „Weiter zum Anpfiff“.',
    ],
    keywords: 'spielplan plan vorbelegt auswählen picken heute weitere spiele angelegt lead',
    sources: ['015 US2'],
    open: { label: 'Neues Spiel', path: '/neu' },
    related: ['neues-spiel', 'spielplan', 'spielplan-fehlt'],
  },
  {
    id: 'spielbildschirm',
    topic: 'spiel',
    title: 'Was zeigt der Spielbildschirm?',
    answer:
      'Oben steht die Anzeigetafel: links und rechts die beiden Mannschaften mit ihrer Trikotfarbe, in der Mitte groß der Spielstand. Darunter die Uhr mit „Restzeit“ und die Knöpfe „Uhr anhalten“ und „Pausenpfiff“. Dann folgt die Torliste mit dem neuesten Tor oben; mehr Einträge scrollst du in der Liste, ein Tipp auf ein Tor öffnet zum Beispiel „Tor entfernen“ und „Minute ändern“. Unten sind die großen Tor-Knöpfe. Meldungen wie „Rückgängig“ erscheinen im dunklen Band direkt darüber.',
    keywords: 'übersicht anzeigetafel spielstand uhr torliste knöpfe aufbau band meldung',
    sources: ['019 US2', '019 US3'],
    related: ['tor', 'tor-entfernen', 'uhr-anhalten'],
  },
  {
    id: 'tor',
    topic: 'spiel',
    title: 'Wie erfasse ich ein Tor?',
    answer:
      'Ein Tipp auf den großen Knopf der Mannschaft, die getroffen hat. Die Minute wird automatisch festgehalten. Danach öffnet sich die Auswahl für den Torschützen; das geht auch später. Tippst du aus Versehen zweimal, zählt das Tor nur einmal, und im dunklen Band über den Tor-Knöpfen steht „Schon gezählt“.',
    keywords: 'tor zählen treffer knopf erfassen eintragen zweimal doppelt schon gezählt',
    sources: ['001 US1', '019 US1'],
    related: ['tor-entfernen', 'torschuetze', 'uhr-anhalten'],
  },
  {
    id: 'tor-entfernen',
    topic: 'spiel',
    title: 'Wie entferne ich ein Tor?',
    answer:
      'Direkt nach dem Tor erscheint 10 Sekunden lang ein dunkles Band direkt über den Tor-Knöpfen; tippe dort auf „Rückgängig“. Später tippst du das Tor in der Torliste oder in den Spieldetails an und wählst „Tor entfernen“. Es bleibt durchgestrichen in der Liste und lässt sich mit „Tor wiederherstellen“ zurückholen.',
    keywords: 'löschen falsch verklickt aberkennen zurücknehmen rückgängig wiederherstellen band',
    sources: ['001 US1', '017 US1', '019 US1'],
    related: ['tor', 'torschuetze'],
  },
  {
    id: 'tor-nachtragen',
    topic: 'spiel',
    title: 'Wie trage ich ein vergessenes Tor nach?',
    answer:
      'Tippe im Spiel auf „…“ und „Tor nachtragen“, oder später in den Spieldetails auf „Tor nachtragen“ unter dem Spielverlauf. Wähle die Mannschaft und die Minute und tippe auf „Eintragen“. Stand, Torliste, geteilter Text und Dashboard stimmen danach. Bei einem eigenen Tor fragt der Torticker anschließend nach dem Torschützen.',
    keywords: 'vergessen nachtragen nachträglich tor fehlt später schlusspfiff ergebnis falsch',
    sources: ['012 US2', '017 US1'],
    related: ['tor-minute', 'tor-entfernen'],
  },
  {
    id: 'tor-minute',
    topic: 'spiel',
    title: 'Wie ändere ich die Minute eines Tores?',
    answer:
      'Tippe in der Torliste oder in den Spieldetails auf das Tor und dann auf „Minute ändern“. Wähle die richtige Minute und tippe auf „Übernehmen“. Das Tor rutscht an die richtige Stelle, Torschütze und Vorlage bleiben.',
    keywords: 'minute falsch ändern korrigieren verschieben zeitpunkt',
    sources: ['012 US2', '017 US1'],
    related: ['tor-nachtragen', 'uhr-korrigieren'],
  },
  {
    id: 'pfiff-zuruecknehmen',
    topic: 'spiel',
    title: 'Wie nehme ich einen Pausen- oder Schlusspfiff zurück?',
    answer:
      'Zu früh „Pausenpfiff“ oder „Schlusspfiff“ getippt? Tippe auf „…“ und „Pausenpfiff zurücknehmen“ bzw. „Schlusspfiff zurücknehmen“. Die Uhr läuft weiter, als wäre nicht gepfiffen worden. Das geht bis 10 Minuten nach dem Pfiff, solange noch nicht wieder angepfiffen ist.',
    keywords: 'pfiff zurück versehentlich zu früh abgepfiffen halbzeit schlusspfiff rückgängig',
    sources: ['012 US3'],
    related: ['pausenpfiff', 'uhr-korrigieren'],
  },
  {
    id: 'uhr-korrigieren',
    topic: 'spiel',
    title: 'Was tue ich, wenn die Uhr falsch geht?',
    answer:
      'Anpfiff zu spät oder zu früh getippt? Tippe auf „…“ und „Uhr korrigieren“, stelle mit „+1 Min“ oder „−1 Min“ die richtige Spielminute ein und tippe auf „Übernehmen“. Restzeit, Pfiff, die Minuten der Tore dieser Halbzeit und das Dashboard folgen.',
    keywords: 'uhr falsch zu spät anpfiff vergessen minute stimmt nicht verstellen zeit korrigieren',
    sources: ['012 US4'],
    related: ['uhr-anhalten', 'tor-minute'],
  },
  {
    id: 'uhr-anhalten',
    topic: 'spiel',
    title: 'Wie halte ich die Uhr an?',
    answer:
      'Tippe auf „Uhr anhalten“ und bestätige. Mit „Uhr fortsetzen“ läuft sie weiter. Fällt ein Tor, während die Uhr steht, fragt die App „Tor eintragen und Uhr fortsetzen?“.',
    keywords: 'pause stoppen unterbrechung verletzung uhr fortsetzen anhalten',
    sources: ['001 US2'],
    related: ['pausenpfiff', 'nachspielzeit'],
  },
  {
    id: 'pausenpfiff',
    topic: 'spiel',
    title: 'Wie beende ich eine Halbzeit oder das Spiel?',
    answer:
      'Am Ende einer Halbzeit tippst du auf „Pausenpfiff“, am Ende des Spiels auf „Schlusspfiff“. Beides fragt einmal nach, damit nichts aus Versehen passiert. Danach steht das Spiel in der Historie.',
    keywords: 'halbzeit ende abpfiff beenden schlusspfiff pausenpfiff',
    sources: ['001 US2'],
    related: ['nachspielzeit', 'ergebnis-teilen'],
  },
  {
    id: 'nachspielzeit',
    topic: 'spiel',
    title: 'Was passiert, wenn die Spielzeit abgelaufen ist?',
    answer:
      'Du hörst den Signalton, und die Uhr läuft als Nachspielzeit in Rot weiter. Tore darin stehen zum Beispiel als „25+1’“ in der Liste. Jede volle Minute kommt erneut ein Signal, bis du „Pausenpfiff“ oder „Schlusspfiff“ tippst.',
    keywords: 'nachspielzeit rot überzogen signal abgelaufen',
    sources: ['001 US2'],
    related: ['kein-pfiff', 'pausenpfiff'],
  },
  {
    id: 'heim-gast',
    topic: 'spiel',
    title: 'Wie tausche ich Heim und Gast?',
    answer:
      'Im Spiel tippst du oben rechts auf „…“ und dann auf „Heim und Gast tauschen“. Beim Anlegen geht das mit dem Doppelpfeil zwischen den Mannschaften. Tore bleiben ihrer Mannschaft zugeordnet.',
    keywords: 'heim gast auswärts tauschen seite vertauscht',
    sources: ['001 FR-035'],
    related: ['neues-spiel'],
  },

  // Torschützen und Ereignisse
  {
    id: 'torschuetze',
    topic: 'ereignisse',
    title: 'Wie trage ich den Torschützen nach?',
    answer:
      'Nach jedem Tor öffnet sich die Auswahl mit deinem Aufgebot; tippe auf den Namen oder schließe sie. Später tippst du das Tor in der Torliste oder in den Spieldetails an und wählst „Torschütze ändern“. Beim Gegner trägst du Name oder Rückennummer ein, zum Beispiel „Nr. 9“.',
    keywords: 'torschütze schütze spieler name nachtragen wer',
    sources: ['001 US3', '017 US1'],
    related: ['tor', 'elfmeter', 'kader'],
  },
  {
    id: 'vorlage',
    topic: 'ereignisse',
    title: 'Wie erfasse ich, wer das Tor vorgelegt hat?',
    answer:
      'Schalte in den Einstellungen unter „Im Spiel erfassen“ die „Vorlagen“ ein. Wählst du nach einem Tor den Torschützen, fragt die App „Vorlage von?“: Tipp auf den Namen, „Ohne Vorlage“ oder einfach warten, nach 5 Sekunden schließt das Fenster. In Torliste und Spieldetails steht dann zum Beispiel „Max (Vorlage: Ben)“, nur mit Vornamen.',
    keywords: 'vorlage vorlagen assist vorgelegt pass zuspiel vorlagengeber',
    sources: ['009 US1', '009 US4'],
    open: { label: 'Einstellungen', path: '/einstellungen' },
    related: ['vorlage-aendern', 'torschuetze', 'vorlage-teilen'],
  },
  {
    id: 'vorlage-aendern',
    topic: 'ereignisse',
    title: 'Wie ändere oder entferne ich eine Vorlage?',
    answer:
      'Tippe das Tor in der Torliste oder in den Spieldetails an und wähle „Vorlage ändern“. Dort wählst du einen anderen Spieler oder „Ohne Vorlage“. Bei Gegentoren, Eigentoren und Elfmetern gibt es keine Vorlage.',
    keywords: 'vorlage ändern entfernen falsch assist korrigieren',
    sources: ['009 US2', '017 US1'],
    related: ['vorlage', 'tor-entfernen'],
  },
  {
    id: 'elfmeter',
    topic: 'ereignisse',
    title: 'Wie kennzeichne ich ein Tor als Elfmeter?',
    answer:
      'Tippe das Tor in der Torliste an und wähle „Elfmeter“. Im geteilten Text steht dann zum Beispiel „Ben (Elfmeter)“.',
    keywords: 'elfer strafstoß penalty kennzeichen',
    sources: ['003 US1'],
    related: ['torschuetze', 'elfmeterschiessen'],
  },
  {
    id: 'karten',
    topic: 'ereignisse',
    title: 'Wie erfasse ich eine gelbe oder rote Karte?',
    answer:
      'Schalte zuerst in den Einstellungen unter „Im Spiel erfassen“ die „Karten“ ein. Im Spiel tippst du dann auf „Karte“, wählst die Art (Gelb, Gelb-Rot, Rot oder Zeitstrafe), danach Mannschaft und Spieler.',
    keywords: 'gelb rot gelbrot zeitstrafe karte verwarnung platzverweis',
    sources: ['003 US3'],
    open: { label: 'Einstellungen', path: '/einstellungen' },
    related: ['wechsel', 'lesezeichen'],
  },
  {
    id: 'wechsel',
    topic: 'ereignisse',
    title: 'Wie erfasse ich einen Wechsel?',
    answer:
      'Schalte in den Einstellungen unter „Im Spiel erfassen“ die „Wechsel“ ein. Im Spiel tippst du auf „Wechsel“ und wählst direkt, wer rausgeht und wer reinkommt. Im geteilten Text steht dann zum Beispiel „Leo für Paul“.',
    keywords: 'auswechseln einwechseln wechsel spieler raus rein',
    sources: ['003 US4'],
    open: { label: 'Einstellungen', path: '/einstellungen' },
    related: ['karten'],
  },
  {
    id: 'lesezeichen',
    topic: 'ereignisse',
    title: 'Wofür sind Lesezeichen?',
    answer:
      'Mit einem Lesezeichen merkst du dir eine Szene samt Minute, zum Beispiel für die Videoauswertung mit der Veo-Kamera. Schalte sie in den Einstellungen unter „Im Spiel erfassen“ ein; im Spiel genügt ein Tipp auf „Lesezeichen“. Danach kannst du einen Kommentar ergänzen. Lesezeichen sind nur für dich und erscheinen nie im geteilten Text.',
    keywords: 'lesezeichen szene video veo kamera merken markieren',
    sources: ['003 US2'],
    open: { label: 'Einstellungen', path: '/einstellungen' },
    related: ['karten'],
  },

  // Pokal
  {
    id: 'verlaengerung',
    topic: 'pokal',
    title: 'Wie spiele ich eine Verlängerung?',
    answer:
      'Steht es beim Schlusspfiff unentschieden, fragt die App „Wie geht es weiter?“. Wähle „Verlängerung“ und stell die Minuten je Hälfte ein. Mit „Unentschieden“ bleibt es beim Ergebnis.',
    keywords: 'pokal verlängerung unentschieden',
    sources: ['003 US5'],
    related: ['elfmeterschiessen'],
  },
  {
    id: 'elfmeterschiessen',
    topic: 'pokal',
    title: 'Wie erfasse ich ein Elfmeterschießen?',
    answer:
      'Wähle bei „Wie geht es weiter?“ das „Elfmeterschießen“. Tippe für jeden Schuss auf „Treffer“ oder „Verschossen“; den Schützen kannst du dazu auswählen. „Rückgängig“ nimmt den letzten Schuss zurück.',
    keywords: 'elfmeterschießen pokal penalty schießen elfer',
    sources: ['003 US6'],
    related: ['verlaengerung', 'elfmeter'],
  },

  // Teilen
  {
    id: 'ergebnis-teilen',
    topic: 'teilen',
    title: 'Wie teile ich das Ergebnis in WhatsApp?',
    answer:
      'Öffne das Spiel in der Historie und tippe in den Spieldetails auf „Ergebnis teilen“. Der Text zeigt Ergebnis, Halbzeit, den Verlauf als Anzeigetafel und die Torschützen. Die Vorschau darüber zeigt, wie es im Chat aussieht. Korrigierst du danach etwas, das im Text steht, erinnert die Leiste „Korrigiert. Ergebnis neu teilen?“; „Teilen“ schickt den neuen Text.',
    keywords: 'whatsapp teilen senden schicken ergebnis elterngruppe text korrigiert neu teilen',
    sources: ['001 US4', '005 US1', '005 US5', '017 US3'],
    open: { label: 'Historie', path: '/historie' },
    related: ['zwischenstand', 'sternchen', 'spiel-korrigieren'],
  },
  {
    id: 'zwischenstand',
    topic: 'teilen',
    title: 'Wie teile ich den Zwischenstand während des Spiels?',
    answer:
      'Tippe im Spiel oben rechts auf „…“, dann auf „Teilen“ und „Stand als Text“. Der Text nennt Stand und Minute. Im selben Blatt teilt „Live-Link für Eltern“ den Link, mit dem die Eltern live zuschauen.',
    keywords: 'zwischenstand halbzeitstand whatsapp teilen während stand als text',
    sources: ['005 US4', '020 US2'],
    related: ['ergebnis-teilen', 'live-anlegen'],
  },
  {
    id: 'vorlage-teilen',
    topic: 'teilen',
    title: 'Wo erscheinen Vorlagen?',
    answer:
      'In der Torliste, in den Spieldetails, im geteilten Text und im Dashboard für Eltern steht die Vorlage beim Tor, zum Beispiel „Max (Vorlage: Ben)“. Die Zeile mit den Torschützen am Ende des Textes bleibt, wie sie ist.',
    keywords: 'vorlage teilen whatsapp dashboard text assist',
    sources: ['009 US3'],
    related: ['vorlage', 'ergebnis-teilen'],
  },
  {
    id: 'sternchen',
    topic: 'teilen',
    title: 'Warum stehen im geteilten Text Sternchen?',
    answer:
      'Der Text ist für WhatsApp gemacht. Dort werden Sternchen zu fetter Schrift und der Verlauf steht als Tabelle. Andere Apps wie iMessage zeigen die Zeichen so, wie sie sind.',
    keywords: 'sternchen formatierung imessage fett tabelle zeichen',
    sources: ['005 US1'],
    related: ['ergebnis-teilen'],
  },
  {
    id: 'pokal-teilen',
    topic: 'teilen',
    title: 'Was steht bei Karten, Wechseln und Elfmeterschießen im Text?',
    answer:
      'Karten und Wechsel stehen an ihrer Stelle im Verlauf, das Elfmeterschießen als Reihe aus Treffern und Fehlschüssen je Mannschaft. Lesezeichen erscheinen nie.',
    keywords: 'karten wechsel elfmeterschießen verlauf text pokal',
    sources: ['005 US2', '005 US3'],
    related: ['ergebnis-teilen', 'karten'],
  },

  // Mannschaften und Kader
  {
    id: 'mannschaft',
    topic: 'kader',
    title: 'Wie lege ich meine Mannschaft an?',
    answer:
      'In den Einstellungen tippst du unter „Meine Mannschaften“ auf „Mannschaft anlegen“. Trag den Namen ein, zum Beispiel „Sportvg Feuerbach E1“, und wähl Heimtrikot und Auswärtstrikot. Gibt es mehrere Kader, wählst du unter „Kader“, mit welchem die Mannschaft spielt; E1 und E2 können denselben haben. Beim nächsten Spiel steht alles schon da.',
    keywords: 'mannschaft team anlegen e1 e2 e3 name trikot jugend kader',
    sources: ['004 US1', '015 US5'],
    open: { label: 'Einstellungen', path: '/einstellungen' },
    related: ['trikots', 'neues-spiel'],
  },
  {
    id: 'trikots',
    topic: 'kader',
    title: 'Wie ändere ich die Trikotfarben für ein Spiel?',
    answer:
      'Beim Anlegen des Spiels stehen unter „Trikots“ die Farben deiner Mannschaft und des Gegners. Mit „Ändern“ wählst du eine andere Farbe nur für dieses Spiel. Später geht das im Spiel über „…“ und „Trikots ändern“ oder in den Spieldetails; erst „Übernehmen“ ändert die Farben. Eine neue Gegnerfarbe schlägt der Torticker beim nächsten Spiel gegen diesen Gegner vor.',
    keywords: 'trikot farbe leibchen auswärtstrikot heimtrikot falsche farbe gegner ändern',
    sources: ['004 US2', '017 US2'],
    open: { label: 'Neues Spiel', path: '/neu' },
    related: ['mannschaft', 'neues-spiel'],
  },
  {
    id: 'kader',
    topic: 'kader',
    title: 'Wie pflege ich den Kader?',
    answer:
      'Unter „Mehr“ und „Kader“ tippst du auf „Spieler hinzufügen“. Bitte nur Vornamen und auf Wunsch eine Rückennummer von 1 bis 99. Gibt es einen Vornamen doppelt, ergänzt die App eine Abkürzung wie „Max Mü.“. Hast du mehrere Kader, wählst du oben den Kader; ein Kind verschiebst du über „Ändern“ und die Auswahl „Kader“.',
    keywords: 'kader spieler hinzufügen namen rückennummer mannschaft verschieben',
    sources: ['001 US5', '015 US5'],
    open: { label: 'Kader', path: '/kader' },
    related: ['kader-mehrere', 'kader-liste', 'aufgebot'],
  },
  {
    id: 'kader-mehrere',
    topic: 'kader',
    title: 'Wie lege ich einen zweiten Kader an, z. B. für die E3?',
    answer:
      'Unter „Mehr“ und „Kader“ tippst du auf „Kader hinzufügen“ und gibst einen Namen ein, zum Beispiel „E3“. Der bisherige Kader heißt „Kader“; über „Kader umbenennen“ machst du daraus zum Beispiel „E1/E2“. Oben schaltest du zwischen den Kadern um. Ein Kind gehört zu genau einem Kader: über „Ändern“ und die Auswahl „Kader“ verschiebst du es. In den Einstellungen wählst du unter „Meine Mannschaften“ für jede Mannschaft ihren Kader. Im Aufgebot stehen dann die Kinder dieses Kaders, Aushilfen aus anderen Kadern unter „Weitere Kinder“. „Kader löschen“ geht nur bei einem leeren Kader. Höchstens 6 Kader.',
    keywords: 'zweiter kader mehrere kader e1 e2 e3 aufteilen verschieben aushilfe umbenennen löschen',
    sources: ['015 US5'],
    open: { label: 'Kader', path: '/kader' },
    related: ['kader', 'mannschaft', 'aufgebot'],
  },
  {
    id: 'kader-sortierung',
    topic: 'kader',
    title: 'Wie sortiere ich den Kader?',
    answer:
      'In den Einstellungen wählst du unter „Kader“ bei „Sortieren nach“ zwischen „Vorname“ und „Rückennummer“. Vorgabe ist „Vorname“. Die Reihenfolge gilt für die Kaderliste, das Aufgebot, „Kader teilen“ und alle Spieler-Auswahlen im Spiel: Torschütze, Vorlage, Karte, Wechsel und Elfmeterschießen. Bei „Rückennummer“ stehen Spieler ohne Nummer am Ende.',
    keywords: 'sortieren sortierung reihenfolge alphabetisch vorname rückennummer nummer kader torschütze',
    sources: ['013 US1'],
    open: { label: 'Einstellungen', path: '/einstellungen' },
    related: ['kader', 'torschuetze'],
  },
  {
    id: 'kader-liste',
    topic: 'kader',
    title: 'Wie übernehme ich eine Spielerliste aus WhatsApp?',
    answer:
      'Kopiere die Liste in WhatsApp. Unter „Kader“ tippst du auf „Liste einfügen“ und setzt sie ein; „Link einfügen“ auf dem Startbildschirm erkennt sie auch. Die App erkennt Namen und Nummern und zeigt vor dem Übernehmen, was ihr auffällt. „Kader teilen“ schickt den Kader an Kollegen; Kürzel wie „Max Mü.“ bleiben erhalten. Steht in der ersten Zeile ein Kadername wie „Kader E3:“, kommen die Kinder in diesen Kader; fehlt er, legt die App ihn an. Trainer mit Trainer-Link brauchen das nicht: Geteilte Kader kommen von selbst an.',
    keywords:
      'liste einfügen import whatsapp kopieren kader teilen kollegen kürzel abkürzung kadername e3 link einfügen',
    sources: ['001 US7', '015 FR-P23', '016 US4'],
    open: { label: 'Kader', path: '/kader' },
    related: ['kader', 'kader-mehrere'],
  },
  {
    id: 'aufgebot',
    topic: 'kader',
    title: 'Wie wähle ich das Aufgebot für ein Spiel?',
    answer:
      'Beim Anlegen des Spiels tippst du unter „Aufgebot“ die Spieler an, die heute dabei sind. Ohne Auswahl steht in der Torschützen-Auswahl der ganze Kader. Mit mehreren Kadern stehen im Aufgebot die Kinder des Kaders deiner Mannschaft; Aushilfen aus anderen Kadern findest du unter „Weitere Kinder“. Ohne Auswahl gilt dann der Kader der Mannschaft.',
    keywords: 'aufgebot heute dabei spieler auswahl weitere kinder aushilfe',
    sources: ['001 US5', '015 US5'],
    open: { label: 'Neues Spiel', path: '/neu' },
    related: ['kader', 'kader-mehrere', 'torschuetze'],
  },

  // Historie
  {
    id: 'historie',
    topic: 'historie',
    title: 'Wo finde ich frühere Spiele?',
    answer:
      'Unter „Historie“ stehen alle Spiele nach Monaten, neueste zuerst, mit dem Ergebnis aus Feuerbach-Sicht: S, U oder N für Sieg, Unentschieden oder Niederlage. Oben filterst du nach Mannschaft. Ein Tipp öffnet die Spieldetails; dort kannst du das Spiel auch korrigieren.',
    keywords: 'historie alte spiele früher ergebnisse filter sieg niederlage monat',
    sources: ['001 US6', '011 US1', '014 US1', '017 US1'],
    open: { label: 'Historie', path: '/historie' },
    related: ['spiel-korrigieren', 'spiel-loeschen', 'ergebnis-teilen'],
  },
  {
    id: 'spiel-korrigieren',
    topic: 'historie',
    title: 'Wie korrigiere ich ein Spiel nach dem Schlusspfiff?',
    answer:
      'Öffne das Spiel unter „Historie“. In den Spieldetails tippst du im Spielverlauf auf ein Tor und änderst wie im Spiel Torschütze, Vorlage oder Minute oder wählst „Tor entfernen“. Ein vergessenes Tor trägst du mit „Tor nachtragen“ nach, die Farben änderst du mit „Trikots ändern“. Das geht ohne Frist; Stand, Teilen-Text und Dashboard folgen, und war das Ergebnis schon geteilt, erinnert die Leiste „Korrigiert. Ergebnis neu teilen?“. Korrigieren kann nur das Handy, das das Spiel erfasst hat.',
    keywords: 'korrigieren korrektur nachträglich ändern falsch später historie spieldetails torschütze minute vorlage',
    sources: ['017 US1', '017 US2', '017 US3'],
    open: { label: 'Historie', path: '/historie' },
    related: ['torschuetze', 'tor-minute', 'trikots'],
  },
  {
    id: 'spiel-loeschen',
    topic: 'historie',
    title: 'Wie lösche ich ein Spiel?',
    answer:
      'Öffne das Spiel in der Historie und tippe in den Spieldetails auf „Löschen …“. Die App fragt einmal nach. Danach steht unten in der Historie 10 Sekunden lang „Rückgängig“; ein Tipp darauf holt das Spiel unverändert zurück. Später geht das nur noch aus einer Sicherung. Mehrere Spiele auf einmal löschst du mit „Auswählen“.',
    keywords: 'löschen entfernen spiel testspiel rückgängig versehentlich gelöscht zurückholen wiederherstellen',
    sources: ['001 US6', '014 US3'],
    open: { label: 'Historie', path: '/historie' },
    related: ['spiele-loeschen-mehrere', 'sichern', 'historie'],
  },
  {
    id: 'spiele-loeschen-mehrere',
    topic: 'historie',
    title: 'Wie lösche ich mehrere Spiele auf einmal?',
    answer:
      'In der Historie oben rechts „Auswählen“ tippen und die Spiele antippen, die weg sollen. „Alle auswählen“ nimmt alle beendeten Spiele, die gerade zu sehen sind; mit dem Filter „E2“ also nur die der E2. Laufende Spiele lassen sich nicht auswählen, die löschst du in den Spieldetails. Nach dem Löschen steht 10 Sekunden lang „Rückgängig“ da.',
    steps: [
      'In der Historie „Auswählen“ tippen.',
      'Spiele antippen oder „Alle auswählen“ tippen.',
      '„Löschen (3)“ tippen und mit „Löschen“ bestätigen.',
      'Versehen? Gleich danach „Rückgängig“ tippen.',
    ],
    keywords:
      'mehrere alle spiele löschen auswählen markieren aufräumen testspiele saison leeren mehrfachauswahl häkchen',
    sources: ['014 US1', '014 US2'],
    open: { label: 'Historie', path: '/historie' },
    related: ['spiel-loeschen', 'historie', 'sichern'],
  },

  // Live-Spieltag
  {
    id: 'eltern-zuschauen',
    topic: 'live',
    title: 'Wie lasse ich Eltern live zuschauen?',
    answer:
      'Tippe auf dem Startbildschirm oder im Spiel unter „…“ auf „Eltern live zuschauen lassen“. Gibt es schon einen Live-Spieltag, öffnet sich gleich das Teilen-Menü mit dem Link für die Eltern, und das Spiel geht live. Sonst tippst du auf „Neu starten“ (mit der Mannschaft des Spiels, ohne Spiel mit deinen Mannschaften) oder, wenn ein anderer Trainer schon einen Link hat, auf „Link einfügen“. Ohne eigene Mannschaft legst du sie zuerst in den Einstellungen an. Den Link schickst du an die Elterngruppe; er gilt die ganze Saison.',
    keywords: 'eltern zuschauen live link elterngruppe schicken senden schnell neu starten mitschauen verfolgen',
    sources: ['020 US1'],
    open: { label: 'Live für Eltern', path: '/live-spieltag' },
    related: ['live-anlegen', 'live-senden', 'trainer-link'],
  },
  {
    id: 'live-anlegen',
    topic: 'live',
    title: 'Wie richte ich einen Live-Spieltag ein?',
    answer:
      'Das macht nur einer, einmal für alle Mannschaften. Am schnellsten: „Eltern live zuschauen lassen“, dann „Neu starten“. Titel und Mannschaften wählst du selbst unter „Mehr“, „Live für Eltern“ und „Für Trainer“ mit „Live-Spieltag anlegen“, bis zu sechs. Den Link für Eltern teilst du in der Elterngruppe; er gilt die ganze Saison. Den Trainer-Link bekommen die anderen Trainer; beim ersten Teilen fragt die App „Kader mit den Trainern teilen?“. Gibt es schon einen Live-Spieltag, tippst du auf „Trainer-Link einfügen“.',
    keywords: 'live dashboard eltern zuschauer link spieltag einrichten anlegen kader teilen neu starten',
    sources: ['006 US1', '012 US1', '016 US1', '020 US1'],
    open: { label: 'Live für Eltern', path: '/live-spieltag' },
    related: ['eltern-zuschauen', 'trainer-link', 'live-senden'],
  },
  {
    id: 'trainer-link',
    topic: 'live',
    title: 'Wie kopple ich das Handy eines Trainers?',
    answer:
      'Der Trainer tippt in der Trainergruppe auf den Trainer-Link. Für den Spielfeldrand tippt er auf der Seite unten auf „Teilen“ und „Zum Home-Bildschirm“; das neue Symbol öffnet den Trainer-Link, dort „Koppeln und loslegen“. Ohne Symbol geht „Koppeln und loslegen“ auch gleich im Browser. Hat er den Torticker schon auf dem Home-Bildschirm, kopiert er den Link und tippt dort auf dem Startbildschirm auf „Link einfügen“. Danach steht auf dem Startbildschirm „Spiele verfolgen“ mit dem Titel des Live-Spieltags, und sein Handy sendet die Spiele, die es erfasst. Geteilte Kader kommen automatisch mit.',
    keywords:
      'trainer link koppeln kollege handy einfügen zwischenablage startknopf home-bildschirm symbol whatsapp link einfügen',
    sources: ['006 US1', '012 US1', '016 US2', '016 US4', '018 US1'],
    open: { label: 'Live für Eltern', path: '/live-spieltag' },
    related: ['live-anlegen', 'trainer-kader', 'live-senden'],
  },
  {
    id: 'trainer-kader',
    topic: 'live',
    title: 'Wie bekommen Trainerkollegen die Kader?',
    answer:
      'Beim ersten Tippen auf „Trainer-Link teilen“ fragt die App „Kader mit den Trainern teilen?“; die Kader sind angekreuzt, „Teilen“ teilt sie. Unter „Kader“ zeigt der Schalter „Mit Trainern geteilt“, ob der angezeigte Kader geteilt ist. Wer den Trainer-Link einfügt, bekommt die geteilten Kader automatisch, auch wer schon gekoppelt ist. Ein neues Kind, eine neue Rückennummer oder ein gelöschtes Kind ist in wenigen Sekunden auf allen Trainer-Handys, ohne erneutes Einfügen. Auch der Kader einer Mannschaft gilt für alle. Eltern sehen die Kader nicht.',
    keywords: 'kader teilen trainer kollegen geteilt abgleich automatisch mit trainern geteilt schalter neues kind',
    sources: ['016 US1', '016 US2', '016 US3'],
    open: { label: 'Kader', path: '/kader' },
    related: ['trainer-link', 'kader-liste'],
  },
  {
    id: 'live-senden',
    topic: 'live',
    title: 'Woran sehe ich, dass mein Spiel live gesendet wird?',
    answer:
      'Oben im Spiel steht „Live“. Ohne Netz steht dort „Wartet auf Netz“; Tore zählen trotzdem sofort und werden nachgeschickt. Soll ein Spiel nicht gesendet werden, zum Beispiel ein Testspiel, tippst du auf „…“ und „Nicht live senden“. „Eltern live zuschauen lassen“ schaltet ein Spiel, das auf „Nicht live senden“ steht, wieder ein.',
    keywords: 'live senden netz funkloch wartet nicht live testspiel',
    sources: ['006 US2', '020 US1'],
    related: ['live-anlegen', 'trainer-link'],
  },
  {
    id: 'spiel-vorabend',
    topic: 'live',
    title: 'Kann ich das Spiel schon am Vorabend anlegen?',
    answer:
      'Ja. Das angelegte Spiel geht gleich an den Dienst des Live-Spieltags, und der hebt es auf. Alle Eltern sehen es mit „noch nicht angepfiffen“, auch wer den Zuschauer-Link erst am Spieltag öffnet. Den Torticker musst du dafür am Spieltag nicht vorher öffnen.',
    keywords: 'vorabend vorher anlegen vorbereiten abend früher fehlt nicht sichtbar eltern sehen nicht nur ein spiel',
    sources: ['006 US2', '007 US1'],
    related: ['live-senden', 'eltern-dashboard'],
  },
  {
    id: 'andere-spiele',
    topic: 'live',
    title: 'Wie sehe ich während des Spiels, wie es bei den anderen steht?',
    answer:
      "Ist dein Handy mit einem Live-Spieltag gekoppelt, steht im Spiel unter der Kopfzeile eine Zeile wie „E2 2:1 · 31'“ mit den heutigen Spielen der anderen Mannschaften. Fällt dort ein Tor, leuchtet die Zeile kurz auf, ohne Ton. Ein Tipp auf die Zeile oder auf „Live“ öffnet das Dashboard; mit „Spiel“ unten kommst du zurück, die Uhr läuft weiter.",
    keywords: 'andere spiele mannschaften stand zwischenstand parallel gleichzeitig nebenan platz dashboard',
    sources: ['006 US4'],
    related: ['live-senden', 'eltern-dashboard'],
  },
  {
    id: 'spiele-verfolgen',
    topic: 'live',
    title: 'Wie verfolge ich die Spiele, wenn ein anderer Trainer tickert?',
    answer:
      'Auf dem Startbildschirm „Spiele verfolgen“ antippen. Du siehst das Dashboard wie die Eltern: laufende Spiele mit Stand und Minute, die nächsten Spiele und „Letzte Spiele“. Mit „Spiel“ unten kommst du zurück. Links teilen, Mannschaften und Spielplan verwaltest du weiter unter „Mehr“, „Live für Eltern“ und „Für Trainer“.',
    keywords:
      'zusehen zuschauen verfolgen ergebnisse dashboard spielstand nicht tickern kollege trainer startbildschirm',
    sources: ['018 US1'],
    related: ['spiel-uebernehmen', 'andere-spiele', 'eltern-dashboard'],
  },
  {
    id: 'spiel-uebernehmen',
    topic: 'live',
    title: 'Wie übernehme ich ein Spiel, das schon ein anderes Handy überträgt?',
    answer:
      'Tickert ein anderes Handy gerade ein Spiel, steht auf dem Startbildschirm etwa „E2 übernehmen“ mit Stand und Minute, auch bei leerem Akku des anderen Handys. Antippen und „Spiel übernehmen“ bestätigen: Gegner, Uhr und Tore kommen mit, ab dann sendest nur du. Legst du unter „Neues Spiel“ ein Spiel derselben Mannschaft an, fragt die App ebenfalls nach; „Nur hier erfassen (nicht live)“ zählt nur für dich mit.',
    keywords: 'übernehmen übergabe doppelt zwei handys trainer wechseln gehen früher warten langsam empfang',
    sources: ['006 US6', '018 US2'],
    related: ['live-senden', 'trainer-link', 'spiele-verfolgen'],
  },
  {
    id: 'live-verwalten',
    topic: 'live',
    title: 'Wie ändere ich Titel oder Mannschaften des Live-Spieltags?',
    answer:
      'Unter „Mehr“, „Live für Eltern“ und „Für Trainer“ tippst du auf „Titel ändern“ oder „Mannschaft hinzufügen“; mit „Entfernen“ nimmst du eine Mannschaft heraus. Link für Eltern und Trainer-Link bleiben gleich. Die anderen Trainer-Handys übernehmen die Änderung, sobald sie das nächste Mal Stände empfangen. Ändern zwei Trainer gleichzeitig, gilt die jüngste Änderung. Die Spiele der Saison trägst du unter „Spielplan“ ein.',
    keywords: 'titel ändern umbenennen mannschaft hinzufügen entfernen e3 neue mannschaft verwalten',
    sources: ['006 US5', '015 US1'],
    open: { label: 'Live für Eltern', path: '/live-spieltag' },
    related: ['live-anlegen', 'links-neu', 'spielplan'],
  },
  {
    id: 'spielplan',
    topic: 'live',
    title: 'Wie trage ich den Spielplan ein?',
    answer:
      'Unter „Mehr“, „Live für Eltern“, „Für Trainer“ und „Spielplan“ tippst du auf „Spiel hinzufügen“. Wähle Mannschaft, Datum, Anstoß, Gegner, Heim oder Auswärts, Wettbewerb und Spielzeit; Pflichtfelder sind mit * markiert; Anstoß, Gegner und Wettbewerb dürfen leer bleiben. Alle Trainer-Handys mit Trainer-Link bekommen den Plan automatisch und dürfen ihn ändern. Fällt ein Spiel aus, tippst du es an und wählst „Abgesagt“. Vergangene Spiele stehen unten unter „Vergangene Spiele“.',
    steps: [
      '„Mehr“, „Live für Eltern“, „Für Trainer“, „Spielplan“ öffnen.',
      '„Spiel hinzufügen“ tippen und die Angaben eintragen.',
      '„Speichern“ tippen. Zum Ändern, Absagen oder Löschen das Spiel antippen.',
    ],
    keywords:
      'spielplan spiele saison termine plan gegner datum anstoß uhrzeit heim auswärts wettbewerb abgesagt absage leistungsliga kreisstaffel',
    sources: ['015 US1'],
    open: { label: 'Live für Eltern', path: '/live-spieltag' },
    related: ['spielplan-liste', 'live-verwalten', 'live-anlegen'],
  },
  {
    id: 'spiel-vormerken',
    topic: 'live',
    title: 'Wie sage ich an, dass ich ein Spiel tickere?',
    answer:
      'Tippe im „Spielplan“ auf das Spiel und wähle „Ich tickere“. Nach der Bestätigung sehen alle Trainer-Handys „Tickert:“ mit deinem Vornamen; beim ersten Mal fragt die App danach (ändern in den Einstellungen), ohne Namen steht „vergeben“. Am Spieltag steht das Spiel oben auf deinem Startbildschirm unter „Heute tickerst du“: ein Tipp, dann „Weiter zum Anpfiff“. Will ein anderer Trainer übernehmen, fragt die App nach. „Nicht mehr tickern“ gibt das Spiel frei.',
    steps: [
      '„Mehr“, „Live für Eltern“, „Für Trainer“, „Spielplan“ öffnen.',
      'Das Spiel antippen und „Ich tickere“ wählen.',
      '„Ja, ich tickere“ tippen.',
    ],
    keywords:
      'vormerken tickern lead handy wer tickert übernehmen zuständig ankündigen reservieren startbildschirm heute tickerst du name vergeben',
    sources: ['015 US6'],
    open: { label: 'Live für Eltern', path: '/live-spieltag' },
    related: ['spielplan', 'spiel-aus-plan'],
  },
  {
    id: 'spielplan-liste',
    topic: 'live',
    title: 'Wie füge ich den ganzen Spielplan auf einmal ein?',
    answer:
      'Unter „Spielplan“ tippst du auf „Liste einfügen“ und setzt eine Liste ein, eine Zeile je Spiel, z. B. „So 15.11. 10:00 E1 auswärts SV Beispielhausen (Leistungsliga, 3×25)“. Anstoß, Wettbewerb und Spielzeit dürfen fehlen; „?“ heißt Gegner offen. Die Vorschau zeigt, was erkannt wurde; fehlerhafte Zeilen bleiben draußen. Steht ein Spiel schon im Plan (gleiche Mannschaft, gleicher Tag, gleicher Gegner), wird es aktualisiert; ein Spiel mit „?“ bekommt so seinen Gegner. „Spielplan teilen“ gibt dieselbe Liste aus, z. B. für die Elterngruppe.',
    steps: [
      '„Mehr“, „Live für Eltern“, „Für Trainer“, „Spielplan“ öffnen.',
      '„Liste einfügen“ tippen, die Liste einsetzen und „Weiter“ tippen.',
      'Vorschau prüfen, dann „Spiele übernehmen“ tippen.',
    ],
    keywords:
      'liste einfügen kopieren einsetzen whatsapp text fussball.de import mehrere spiele saison hinrunde teilen elterngruppe',
    sources: ['015 US4'],
    open: { label: 'Live für Eltern', path: '/live-spieltag' },
    related: ['spielplan', 'spielplan-fehlt'],
  },
  {
    id: 'spielplan-fehlt',
    topic: 'live',
    title: 'Warum fehlt ein Spiel im Spielplan?',
    answer:
      'Der Spielplan kommt über den Dienst des Live-Spieltags. Er hebt die Änderungen auf, und jedes Trainer-Handy holt sie beim Öffnen, auch nach Tagen. Fehlt trotzdem ein Spiel, hat das Handy, auf dem es eingetragen wurde, vermutlich noch kein Netz gehabt: Dort einmal den Torticker mit Netz öffnen. Schneller geht es mit „Spielplan teilen“ auf einem Handy mit vollständigem Plan und „Liste einfügen“ auf deinem. Zur Not legst du das Spiel unter „Neues Spiel“ von Hand an.',
    keywords: 'fehlt nicht da verschwunden leer abgleich synchron aktualisieren anderes handy',
    sources: ['015 FR-P07', '007 US2'],
    open: { label: 'Live für Eltern', path: '/live-spieltag' },
    related: ['spielplan-liste', 'spielplan', 'spiel-aus-plan'],
  },
  {
    id: 'links-neu',
    topic: 'live',
    title: 'Was tue ich, wenn ein Link in falsche Hände geraten ist?',
    answer:
      'Tippe unter „Mehr“, „Live für Eltern“ und „Für Trainer“ auf „Alle Links neu ausstellen …“. Schick den neuen Link für Eltern an die Elterngruppe und den neuen Trainer-Link an eure Trainergruppe. Handys mit dem alten Trainer-Link senden nichts mehr und bitten um den neuen; wer den alten Link für Eltern öffnet, sieht einen Hinweis. Das gilt auch, wenn jemand die Trainergruppe verlässt.',
    keywords: 'link falsch weitergeleitet geleakt sicherheit neu ausstellen trainer verlässt gruppe',
    sources: ['006 US5'],
    open: { label: 'Live für Eltern', path: '/live-spieltag' },
    related: ['live-verwalten', 'trainer-link'],
  },
  {
    id: 'kopplung-beenden',
    topic: 'live',
    title: 'Wie höre ich auf, live zu senden?',
    answer:
      'Unter „Mehr“, „Live für Eltern“ und „Für Trainer“ tippst du auf „Live beenden …“. Dein Handy sendet dann nichts mehr; deine Spiele bleiben in der Historie. Die anderen Trainer-Handys und das Dashboard laufen weiter. Einzelne Spiele nimmst du im Spiel über „…“ und „Nicht live senden“ aus.',
    keywords: 'kopplung beenden live beenden aufhören live senden abmelden ausschalten handy',
    sources: ['006 US5', '020 US2'],
    open: { label: 'Live für Eltern', path: '/live-spieltag' },
    related: ['live-senden', 'trainer-link'],
  },
  {
    id: 'eltern-dashboard',
    topic: 'live',
    title: 'Wie verfolge ich die Spiele als Elternteil?',
    answer:
      'Öffne den Link aus der Elterngruppe. Je Mannschaft siehst du eine Karte: das laufende Spiel mit Stand und Minute, sonst das heutige oder nächste Spiel mit Anstoß bzw. das letzte Ergebnis mit „Nächstes Spiel“ darunter; die Seite aktualisiert sich von selbst. Ein laufendes Spiel zeigt, wann es zuletzt aktualisiert wurde. Tippe auf ein Spiel für Tore und Details. Darunter steht der „Spielplan“ ab morgen, nach Datum zum Aufklappen, und „Vergangene Spiele“ mit Endstand. Ganz unten stehen „Letzte Spiele“ mit früheren Ergebnissen. Steht „heute noch kein Spiel“, hat der Trainer noch nichts gesendet.',
    keywords:
      'eltern zuschauen verfolgen dashboard link spieltag live kein spiel nächstes spiel anstoß uhrzeit spielplan termine vergangene ergebnisse letzte spiele',
    sources: ['006 US3', '012 US5', '015 US3', '015 US7', '007 US3', '020 US4'],
    parents: true,
    related: ['eltern-home', 'letzte-spiele', 'keine-verbindung'],
  },
  {
    id: 'letzte-spiele',
    topic: 'live',
    title: 'Wo sehe ich frühere Ergebnisse?',
    answer:
      'Ganz unten auf dem Dashboard tippst du auf „Letzte Spiele“. Dort stehen je Mannschaft bis zu 10 frühere Spiele, neuestes zuerst, mit Datum, Ergebnis und Gegner. Mit „Alle“, „E1“, „E2“ oder „E3“ wählst du die Mannschaft; dein Handy merkt sich die Auswahl. Spiele von heute stehen oben in den Karten, nicht noch einmal unten.',
    keywords: 'frühere ergebnisse letzte spiele vergangene spiele ergebnis woche saison verpasst filter mannschaft',
    sources: ['007 US3'],
    parents: true,
    related: ['eltern-dashboard'],
  },
  {
    id: 'eltern-home',
    topic: 'live',
    title: 'Wie lege ich den Spieltag auf den Home-Bildschirm?',
    answer:
      'Der Zuschauer-Link gilt die ganze Saison. Lege ihn auf den Home-Bildschirm, dann bist du mit einem Tipp dabei. Zeigt ein älteres Symbol „Neues Spiel“ statt des Spieltags, lösche es und lege den Link neu ab.',
    steps: [
      'iPhone: Link in Safari öffnen, auf „Teilen“ tippen, dann „Zum Home-Bildschirm“.',
      'Android: Link in Chrome öffnen, Menü, dann „Zum Startbildschirm hinzufügen“.',
    ],
    keywords: 'home bildschirm startbildschirm speichern lesezeichen saison',
    sources: ['006 US3'],
    parents: true,
    related: ['eltern-dashboard', 'eltern-teilen'],
  },
  {
    id: 'eltern-teilen',
    topic: 'live',
    title: 'Wie teile ich den Spieltag mit Familie und Freunden?',
    answer:
      'Tippe unten auf „Teilen“ und wähle zum Beispiel WhatsApp. Der Link gilt die ganze Saison und zeigt nur Spielstände und Torschützen mit Vornamen. Gib ihn nur an Menschen weiter, die die Kinder kennen.',
    keywords: 'teilen weiterleiten oma opa großeltern familie freunde link schicken',
    sources: ['010 US2'],
    parents: true,
    related: ['eltern-dashboard', 'datenschutz'],
  },
  {
    id: 'keine-verbindung',
    topic: 'live',
    title: 'Was bedeutet „Keine Verbindung“?',
    answer:
      'Dein Handy hat gerade kein Netz. Du siehst den letzten bekannten Stand. Sobald das Netz zurück ist, aktualisiert sich die Seite von selbst; du musst nichts tun. Sonst steht oben „Aktualisiert sich automatisch“.',
    keywords: 'keine verbindung netz offline alt stand aktualisieren automatisch',
    sources: ['006 US3', '020 US4'],
    parents: true,
    related: ['eltern-dashboard', 'keine-meldung'],
  },
  {
    id: 'tor-hinweis',
    topic: 'live',
    title: 'Merke ich, wenn ein Tor fällt?',
    answer:
      'Ja, solange die Seite offen ist: Im Tab steht kurz „Tor! …“ mit dem Stand, ein Screenreader sagt das Tor an, und Android-Handys vibrieren kurz (das iPhone nicht). Mit dem Schalter „Ton bei Toren“ spielt zusätzlich der Signalton; er ist aus, bis du ihn einschaltest. Steht darunter „Ton aus · tippen“, tippe darauf, auf den Schalter oder irgendwo auf die Seite; der Schalter bleibt an. Ist die Seite zu oder verdeckt (anderer Tab, Handy gesperrt), gibt es keine Benachrichtigung.',
    keywords:
      'tor ton vibrieren benachrichtigung push hinweis tab titel schalter ton bei toren voiceover screenreader pfiff',
    sources: ['020 US3'],
    parents: true,
    related: ['eltern-dashboard', 'keine-meldung'],
  },
  {
    id: 'keine-meldung',
    topic: 'live',
    title: 'Was bedeutet „keine Meldung vom Spielfeld“?',
    answer:
      '„vor 2 Min aktualisiert“ zeigt, wie frisch der Stand ist. Steht dort „Seit 7 Min keine Meldung vom Spielfeld“, hat das Handy am Spielfeld nichts gesendet (Funkloch, leerer Akku, App zu). Die Minute läuft weiter, der Stand kann aber veraltet sein. In der Halbzeit und nach dem Spiel gibt es keine Warnung.',
    keywords: 'keine meldung spielfeld veraltet aktualisiert funkloch akku alt stand warnung minuten frisch',
    sources: ['020 US4'],
    parents: true,
    related: ['keine-verbindung', 'eltern-dashboard'],
  },
  {
    id: 'selbst-trainieren',
    topic: 'live',
    title: 'Ich trainiere selbst. Wo finde ich den Torticker?',
    answer:
      'Tippe auf „Torticker öffnen“. Auf dem Startbildschirm findest du „Neues Spiel“ oder „Link einfügen“ für einen Trainer-Link. Für den Spielfeldrand legst du den Torticker von dort auf den Home-Bildschirm.',
    keywords: 'trainer selbst trainieren torticker öffnen app startbildschirm neues spiel eltern coach',
    sources: ['020 US5'],
    parents: true,
    open: { label: 'Torticker', path: '/' },
    related: ['eltern-home'],
  },

  // Einstellungen und Sicherung
  {
    id: 'darstellung',
    topic: 'einstellungen',
    title: 'Wie stelle ich hell oder dunkel ein?',
    answer:
      'In den Einstellungen wählst du unter „Darstellung“ zwischen „Wie iPhone“, „Hell“ und „Dunkel“. In der Sonne ist „Hell“ am besten lesbar. Im dunklen Theme liegen die Abschnitte als dunkelgraue Karten auf fast schwarzem Grund.',
    keywords: 'dunkel hell dark mode sonne lesbar darstellung nachtmodus',
    sources: ['001 FR-018', '011 US2'],
    open: { label: 'Einstellungen', path: '/einstellungen' },
    related: ['kein-pfiff'],
  },
  {
    id: 'signalton',
    topic: 'einstellungen',
    title: 'Wie wähle ich den Signalton?',
    answer:
      'In den Einstellungen wählst du unter „Signalton“ zwischen Pfiff, Glocke und Gong; beim Antippen hörst du ihn sofort. Der Pfiff ist am lautesten, der Gong passt gut in die Halle. Der Ton kommt bei Spielzeitende und zu jeder vollen Nachspielminute. „Ton testen“ beim Anlegen des Spiels spielt ihn ebenfalls.',
    keywords: 'signalton ton pfiff glocke gong klang pfeife halle ändern',
    sources: ['008 US1'],
    open: { label: 'Einstellungen', path: '/einstellungen' },
    related: ['kein-pfiff', 'nachspielzeit'],
  },
  {
    id: 'sichern',
    topic: 'einstellungen',
    title: 'Wie sichere ich meine Spiele?',
    answer:
      'In den Einstellungen tippst du auf „Sichern“. Die App erstellt eine Datei mit allen Spielen und dem Kader, die du zum Beispiel in iCloud Drive ablegst.',
    keywords: 'backup sichern sicherung datei icloud export',
    sources: ['001 FR-024'],
    open: { label: 'Einstellungen', path: '/einstellungen' },
    related: ['wiederherstellen', 'daten-weg'],
  },
  {
    id: 'wiederherstellen',
    topic: 'einstellungen',
    title: 'Wie übertrage ich meine Spiele auf ein neues Handy?',
    answer:
      'Sichere auf dem alten Handy mit „Sichern“. Auf dem neuen Handy tippst du in den Einstellungen auf „Wiederherstellen“ und wählst die Datei. Spiele, die schon da sind, werden nicht doppelt angelegt.',
    keywords: 'neues handy übertragen wiederherstellen import backup umzug',
    sources: ['001 FR-024'],
    open: { label: 'Einstellungen', path: '/einstellungen' },
    related: ['sichern'],
  },

  // Probleme lösen
  {
    id: 'kein-pfiff',
    topic: 'probleme',
    title: 'Warum höre ich keinen Pfiff?',
    answer:
      'Eine Web-App kann nur Ton abspielen, solange sie im Vordergrund ist und der Bildschirm an ist. Lass den Torticker während des Spiels offen. Der Signalton kommt auch bei eingeschaltetem Lautlos-Schalter; die Lautstärke regelst du mit den Lautstärketasten. Steht oben „Ton aus · tippen“, tippe einmal irgendwo auf den Spielbildschirm. Mit „Ton testen“ beim Anlegen des Spiels prüfst du den Ton vorher.',
    keywords: 'pfiff ton signal pfeife leise lautlos lautstärke laut hören',
    sources: ['001 FR-036', '001 FR-039'],
    related: ['signalton', 'bildschirm', 'nachspielzeit'],
  },
  {
    id: 'bildschirm',
    topic: 'probleme',
    title: 'Geht der Bildschirm während des Spiels aus?',
    answer:
      'Nein, solange die Uhr läuft und die App im Vordergrund ist, bleibt der Bildschirm an. Die Uhr läuft auch richtig weiter, wenn das Handy kurz gesperrt war.',
    keywords: 'bildschirm aus sperre gesperrt auto-sperre wach',
    sources: ['001 FR-013'],
    related: ['kein-pfiff'],
  },
  {
    id: 'daten-weg',
    topic: 'probleme',
    title: 'Warum sind meine Spiele weg?',
    answer:
      'Safari löscht Daten von Webseiten, die eine Weile nicht geöffnet wurden. Das passiert nicht, wenn du den Torticker vom Home-Bildschirm startest. Hast du eine Sicherung, holst du die Spiele mit „Wiederherstellen“ zurück. Ist das Handy nicht mehr live gekoppelt, tippst du den Trainer-Link einfach noch einmal an.',
    keywords: 'weg verschwunden verloren gelöscht leer daten spiele kopplung',
    sources: ['001 FR-023', '012 US1'],
    related: ['installieren', 'wiederherstellen'],
  },

  // Datenschutz
  {
    id: 'datenschutz',
    topic: 'datenschutz',
    title: 'Welche Daten verlassen mein Handy?',
    answer:
      'Keine, solange du nichts teilst. Daten gehen nur weg, wenn du selbst teilst oder sicherst oder ein Live-Spieltag läuft. Dann gehen Mannschaften, Spielplan und Spielstände verschlüsselt an einen eigenen Dienst des Vereins bei Cloudflare (Gratis-Plan, ohne Konto). Er kann nichts davon lesen, hebt je Mannschaft die letzten 10 Spiele auf und löscht alles nach einem Jahr ohne Meldung oder beim Neu-Ausstellen der Links. Kader, Karten und Lesezeichen bleiben auf dem Handy, außer Trainer teilen Kader: Die lesen nur Handys mit Trainer-Link, Eltern nicht.',
    keywords:
      'datenschutz daten privat verschlüsselt server tracking cloudflare dienst speichern löschen kader trainer',
    sources: ['006 US2', '007 FR-N05', '007 FR-N12', '016 FR-B05'],
    parents: true,
    related: ['eltern-teilen'],
  },
  {
    id: 'namen',
    topic: 'datenschutz',
    title: 'Welche Namen darf ich eintragen?',
    answer:
      'Im Kinder- und Jugendfußball bitte nur Vornamen, Kürzel oder Rückennummern, zum Beispiel „Max“ oder „Nr. 7“. Gibt es einen Vornamen doppelt, kürzt die App den Nachnamen ab.',
    keywords: 'namen nachname kinder vorname datenschutz',
    sources: ['001 US5'],
    related: ['datenschutz', 'kader'],
  },
];
