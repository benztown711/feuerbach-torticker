# Feature Specification: Tickern übergeben und übernehmen

**Feature Branch**: `019-tickern-uebergeben` (Arbeitsbranch `claude/wizardly-dirac-h0yte9`)

**Created**: 2026-11-15

**Status**: Klärung im Chat erledigt (15. bis 17.11.2026). Review B erledigt (17.11.2026, "passt", mit den drei Kleinigkeiten aus der Nachprüfung). Mockup: https://claude.ai/artifact/XLcBMjA9Mi3WjtBGjbtJaL. Review A offen: Kurzfassung mit den Folgerungen F1 bis F6. Voraussetzung: Constitution 3.2.0 (Prinzip II, Kader einer Mannschaft auch für ein Handy mit gültigem Übergabe-Link, F5).

**Input**: Atti (15.11.2026): "es soll möglich sein, dass ein trainer (mit trainerlink) diesen einfach per wahtsapp weiterleitet, wenn er grad nicht kann. Wie könnte dies aussehen?" Ergänzt am 16.11.2026: Weitergeben auch aus einem laufenden Spiel heraus (früher gehen, Akku leer, das Parallelspiel verfolgen), im Spiel z. B. über die drei Punkte, eindeutig unterscheidbar von "teilen"; vor dem Spiel Schalter neben den Spielen, die zeigen, wer welches Spiel tickert, mit Pflichtnamen. Ergänzt am 17.11.2026: Übernahme-Regel mit Rückfrage und Hinweis für den Abgelösten (Clarifications).

## Ausgangslage

Stand 17.11.2026, nach Spec 018:

- **Trainer-Link**: ein Link für die Trainergruppe mit allen Rechten: alle Mannschaften senden, den Live-Spieltag verwalten, alle Links neu ausstellen, geteilte Kader mit Vornamen und Rückennummern lesen (Spec 006 FR-L02, FR-L19, Spec 016). Leitet ein Trainer ihn an Eltern weiter, gibt er alles dauerhaft aus der Hand; zurückholen geht nur mit "Alle Links neu ausstellen", danach müssen alle Trainer und Eltern neu koppeln.
- **Wer tickert**: Vormerken im Blatt des Planspiels mit "Ich tickere" und Bestätigung, Vorname optional ("Tickert: vergeben"), Rückfrage "Jonas tickert dieses Spiel. Trotzdem übernehmen?" (Spec 015 US6, FR-P25 bis FR-P27). Wer welches Spiel tickert, sieht man erst nach dem Antippen bzw. als Kennzeichen am Rand.
- **Laufendes Spiel übernehmen**: Startbildschirm "E2 übernehmen" mit der Rückfrage "E2 gegen TSV Musterstadt übernehmen?" und "Spiel übernehmen" (Spec 018 US2) oder beim Anlegen unter "Neues Spiel" (Spec 006 US6). Die Rückfragen nennen nicht, wer gerade tickert. Das abgebende Handy zeigt "E2 überträgt jetzt ein anderes Handy. Hier wird nur noch lokal erfasst." und kann lokal weiter erfassen (Spec 006 FR-L24).
- **Im Spiel**: Das "…"-Menü hat "Zwischenstand teilen" (Ergebnis mitteilen), aber nichts, um das Tickern abzugeben.

## Clarifications

### Session 2026-11-15 bis 2026-11-17 (Chat, Mockup, Design-Prüfung)

- Q: Den Trainer-Link selbst weiterleiten oder einen eigenen Link? → Eigener **Übergabe-Link** mit begrenzten Rechten. Der Trainer-Link gäbe alle Mannschaften, die Verwaltung und alle Kader dauerhaft weiter.
- Q: Wo im laufenden Spiel? → Im "…"-Menü als oberster Eintrag "Tickern übergeben" mit eigenem Symbol und Unterzeile, abgesetzt von "Zwischenstand teilen". "Teilen" steht nicht im Namen der Funktion, damit niemand sie mit dem Mitteilen des Ergebnisses verwechselt.
- Q: Begriffe? → Wer abgibt, tippt "Tickern übergeben". Wer übernimmt, sieht überall "Tickern übernehmen"; "Spiel übernehmen" und "Trotzdem übernehmen?" entfallen.
- Q: Vor dem Spiel? → Im Spielplan steht bei jedem Spiel ein Schalter "Ich tickere", darunter, wer tickert ("Du", der Name oder "frei"). Das Blatt des Spiels bietet "Tickern übergeben" für Eltern. Der Knopf "Ich tickere" im Blatt entfällt.
- Q: Name? → "Dein Name" ist Pflicht für alle, die tickern, Trainer wie Eltern. Die App fragt einmal und merkt ihn sich. "Tickert: vergeben" entfällt.
- Q: Übernahme-Regel? → Tickert niemand, übernimmt man direkt. Tickert schon jemand, sieht man das vorher und bestätigt "Ben tickert schon. Willst du das Tickern von Ben übernehmen?". Das gilt auch, wenn der Übergabe-Link in der Elterngruppe landet: Jeder darf übernehmen, die Gruppen sind vertrauenswürdig. Eine Warnung "nicht in die Gruppe" (Vorschlag der Design-Prüfung) ist verworfen.
- Q: Was sieht, wer abgelöst wird? → Den Hinweis "Franz hat das Tickern von dir übernommen." und danach nur noch das Dashboard. In seiner Historie steht das Spiel mit "übergeben an Franz".
- Q: Was dürfen Empfänger eines Übergabe-Links? → Nur dieses eine Spiel tickern, am Spieltag bis 24 Uhr. Für die Torschützen kommt der Kader dieser Mannschaft mit und wird nach Ablauf gelöscht. Weitergeben ist erlaubt. Sie sehen "Spiel", "Historie" und "Mehr"; unter "Mehr" fehlen "Kader" und alle Trainer-Funktionen, "Live-Spieltag" zeigt nur, was sie tickern.
- Design-Prüfung (Impeccable, Prüfung und Nachprüfung) übernommen: Rückmeldungen im Spiel als Leiste unter der Kopfzeile, nie über den Tor-Knöpfen oder offenen Blättern; kurzes Übergabe-Blatt; Schalter und Name als eine Tippfläche von mindestens 64 pt; gesperrter Schalter beim eigenen laufenden Spiel sichtbar (gestrichelt, Schloss); einmalige Hinweiskarte für Link-Empfänger unter der Torliste; Knopf "Übergabe-Link teilen".
- Review B (17.11.2026): Mockup Entwurf 2 "passt".

### Folgerungen mit Empfehlung (in Review A zu bestätigen)

- **F1**: Startbildschirm (Spec 018 US2): Der Knopf heißt "E2: Tickern übernehmen" statt "E2 übernehmen", die Unterzeile beginnt mit dem Namen ("Tom tickert · E2 1:0 TSV Musterstadt · 12'"); die Rückfrage ist die gemeinsame aus FR-U05.
- **F2**: Ab dem Anpfiff gilt als "tickert" das Handy, das das Spiel sendet; die Vormerkung folgt jeder Übernahme. Vor dem Anpfiff gilt die Vormerkung.
- **F3**: Das abgelöste Handy erfasst nicht mehr weiter. Das ändert Spec 006 FR-L24 und den Randfall "Eigenes Spiel wurde übernommen" aus Spec 018: Statt "Spiel fortsetzen" bleibt nur das Zurückholen mit "Tickern übernehmen" und Rückfrage.
- **F4**: Der Name dessen, der tickert, geht verschlüsselt mit dem Live-Stand mit, damit Rückfragen und Startbildschirm ihn nennen können. Das Dashboard zeigt ihn nicht (wie Spec 015 US6-S7 für Vormerkungen).
- **F5**: Constitution Prinzip II wird ergänzt (MINOR, 3.2.0): Den Kader einer Mannschaft bekommt auch ein Handy mit gültigem Übergabe-Link, nur bis zum Ablauf.
- **F6**: Ein Handy, das mit einem anderen Live-Spieltag gekoppelt ist, kann einen Übergabe-Link nicht nutzen und sagt das. Trainer-Handys desselben Live-Spieltags behandeln den Link wie den Schalter, ohne Einschränkungen.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Wer tickert welches Spiel: Schalter im Spielplan (Priority: P1)

Im Spielplan steht bei jedem Spiel rechts ein Schalter "Ich tickere", darunter, wer tickert. Atti schaltet E2 ein; beim ersten Mal fragt die App nach seinem Namen. E1 tickert Jonas; schaltet Atti dort ein, fragt die App nach. E3 läuft gerade bei Tom; Atti übernimmt es mit Stand, Uhr und Toren.

**Why this priority**: Ersetzt das versteckte "Ich tickere" im Blatt, zeigt auf einen Blick, wer zuständig ist, und ist der Weg, auf dem Trainer ohne Link übernehmen.

**Independent Test**: Trainer-Handy A (noch ohne Namen) und Trainer-Handy B ("Tom", tickert E3 live, 2:1, 18'). A öffnet den Spielplan, schaltet E2 ein und gibt "Atti" ein; B zeigt bei E2 "Atti". A schaltet E3 ein und bestätigt; A öffnet das E3-Spiel mit 2:1 und laufender Uhr, B zeigt "Atti hat das Tickern von dir übernommen."

**Acceptance Scenarios**:

1. **Given** ein Trainer-Handy, **When** "Mehr" → "Live-Spieltag" → "Spielplan" geöffnet wird, **Then** steht bei jedem kommenden, nicht abgesagten Spiel rechts ein Schalter, darunter "Du", der Name dessen, der tickert, oder "frei"; über den Spielen eines Tages steht der Spaltenkopf "Tickert". Abgesagte Spiele zeigen "abgesagt", vergangene den Endstand (Spec 015 FR-P01).
2. **Given** das Handy hat noch keinen Namen, **When** ein Schalter eingeschaltet wird, **Then** fragt die App "Wie heißt du?" mit dem Pflichtfeld "Dein Name" und "Weiter" (erst bedienbar mit Namen) sowie "Abbrechen" (Schalter bleibt aus). Danach fragt die App nicht mehr; ändern unter Einstellungen.
3. **Given** ein freies Spiel, **When** der Schalter eingeschaltet wird, **Then** ist er ohne weitere Rückfrage an, darunter steht "Du", und alle anderen Trainer-Handys zeigen dort den Namen, sobald sie den Plan empfangen.
4. **Given** Jonas tickert ein noch nicht angepfiffenes Spiel, **When** ein anderer Trainer dort den Schalter einschaltet, **Then** fragt die App "Jonas tickert schon. Willst du das Tickern von Jonas übernehmen?" mit "Jonas bekommt einen Hinweis.", "Ja, übernehmen" und "Abbrechen"; nach "Ja" ist der Schalter an, und Jonas bekommt den Hinweis aus US4-S2.
5. **Given** Tom tickert ein laufendes Spiel (angepfiffen, nicht beendet, live), **When** ein anderer Trainer dort den Schalter einschaltet, **Then** sagt die Rückfrage statt des Hinweis-Satzes "Läuft gerade: 2:1, 18. Minute. Stand, Uhr und Tore kommen mit."; nach "Ja, übernehmen" öffnet sich das Spiel wie Spec 006 US6-S2 mit der Leiste "Du tickerst jetzt. Stand, Uhr und Tore sind übernommen."
6. **Given** ein eigenes, noch nicht angepfiffenes Spiel, **When** der Schalter ausgeschaltet wird, **Then** ist das Spiel wieder "frei", und die Meldung "Du tickerst E2 – TSV Birkach nicht mehr." bietet "Rückgängig".
7. **Given** das eigene Spiel läuft, **Then** ist der Schalter an und sichtbar gesperrt (gestrichelt, Schloss); ein Tipp öffnet das Blatt des Spiels mit "Das Spiel läuft. Abgeben geht im Spiel über „…“ und „Tickern übergeben“." und "Zum Spiel".

---

### User Story 2 - Tickern übergeben im laufenden Spiel (Priority: P1)

Atti tickert E2 und muss früher gehen, der Akku wird knapp, oder er will das Parallelspiel verfolgen. Im Spiel tippt er auf "…", dann "Tickern übergeben" und "Übergabe-Link teilen", und schickt den Link per WhatsApp an Bens Papa. Bis jemand übernimmt, tickert Atti weiter.

**Why this priority**: Das ist der Anlass. Ohne diese Story bleibt nur, den Trainer-Link mit allen Rechten weiterzugeben.

**Independent Test**: Trainer-Handy A tickert E2 gegen TSV Birkach (1:0, 13'). "…", "Tickern übergeben", "Übergabe-Link teilen": Das Teilen-Menü öffnet mit dem Text aus S3. A zeigt die Leiste aus S4, erfasst ein Tor, und das Dashboard zeigt 2:0.

**Acceptance Scenarios**:

1. **Given** ein Handy tickert ein angelegtes oder laufendes, nicht beendetes, live gesendetes Spiel, **When** "…" getippt wird, **Then** steht als erster Eintrag "Tickern übergeben" mit Symbol und der Unterzeile "Jemand anderes tickert dieses Spiel weiter", durch eine Linie von den übrigen Einträgen ("Zwischenstand teilen" usw.) getrennt.
2. **When** "Tickern übergeben" getippt wird, **Then** öffnet das Blatt "Tickern übergeben" mit "E2 – TSV Birkach · 1:0 · 13. Minute", "Wer den Link öffnet, tickert dieses Spiel weiter. Stand, Uhr und Tore kommen mit.", "Gilt nur für dieses Spiel, heute bis 24 Uhr. Bis jemand übernimmt, tickerst du weiter.", dem Hauptknopf "Übergabe-Link teilen", der Zeile "Trainer brauchen keinen Link. Sie schalten im Spielplan bei diesem Spiel ein." und "Abbrechen".
3. **When** "Übergabe-Link teilen" getippt wird, **Then** öffnet das Teilen-Menü des Systems (Fallback: Zwischenablage) mit "Übernimmst du das Tickern? Feuerbach E2 – TSV Birkach, 1:0 (13.). Antippen und weitertickern:" und dem Link in der nächsten Zeile.
4. **Given** das Teilen ist erfolgt (nicht abgebrochen), **Then** zeigt das Spiel unter der Kopfzeile die Leiste "Übergabe-Link geteilt. Du tickerst weiter, bis jemand übernimmt." mit dem Knopf "Zurückziehen"; das Handy erfasst und sendet unverändert.
5. **When** "Zurückziehen" getippt wird, **Then** ist der Link ungültig (US3-S7), die Leiste meldet "Übergabe-Link zurückgezogen. Er funktioniert nicht mehr.", und das Handy tickert weiter.
6. **Given** das Spiel ist auf "Nicht live senden" gestellt oder beendet, **Then** fehlt "Tickern übergeben" im Menü.

---

### User Story 3 - Tickern übernehmen per Übergabe-Link (Priority: P1)

Bens Papa hat keinen Trainer-Link. Er tippt den Link in WhatsApp an, gibt seinen Namen ein, tippt "Tickern übernehmen" und bestätigt. Das Spiel läuft auf seinem Handy weiter, und bei einem Tor stehen die Kinder der E2 zur Auswahl.

**Why this priority**: Gegenstück zu US2; erst beides zusammen löst den Anlass.

**Independent Test**: Ein Handy ohne Torticker-Daten öffnet den Übergabe-Link aus US2 (1:0, 13'), gibt "Bens Papa" ein, tippt "Tickern übernehmen" und "Ja, übernehmen": Spielbildschirm mit 1:0 und laufender Uhr (höchstens 1 Minute Abweichung). Ein Tor für Feuerbach zeigt die Kinder der E2; das Dashboard zeigt eine Karte mit 2:0.

**Acceptance Scenarios**:

1. **Given** ein gültiger Übergabe-Link, **When** er angetippt wird (im Browser oder in der installierten App), **Then** zeigt die Seite "Tickern übernehmen" mit dem Spiel (Mannschaft, Gegner, Stand, Phase und Minute wie auf dem Dashboard), der Zeile "<Name> tickert gerade." bzw. "Noch tickert niemand.", dem Pflichtfeld "Dein Name" (vorbelegt, wenn das Handy schon einen Namen hat), "Die anderen sehen, wer tickert.", dem Knopf "Tickern übernehmen" (erst mit Namen bedienbar) und "Gilt nur für dieses Spiel, heute bis 24 Uhr. Für die Torschützen kommt der Kader der E2 mit."
2. **Given** Atti tickert, **When** "Tickern übernehmen" getippt wird, **Then** fragt die App "Atti tickert schon. Willst du das Tickern von Atti übernehmen?" mit "Läuft gerade: 1:0, 13. Minute. Stand, Uhr und Tore kommen mit.", "Ja, übernehmen" und "Abbrechen". Tickert niemand, entfällt die Rückfrage.
3. **When** "Ja, übernehmen" getippt wird, **Then** öffnet sich das Spiel wie Spec 006 US6-S2 (Gegner, Heim/Gast, Trikots, Spielzeit, laufende Uhr, Tore mit Torschützen, Elfmeterschießen) mit der Leiste "Du tickerst jetzt. Stand, Uhr und Tore sind übernommen."; ab dann sendet nur dieses Handy, und das Dashboard zeigt weiter eine Karte ohne Sprung.
4. **Given** das Handy übernimmt zum ersten Mal per Übergabe-Link, **Then** steht unter der Torliste einmal die Karte "So tickerst du" mit "Bei einem Tor den großen Knopf unten tippen. Vertippt? Direkt danach „Rückgängig“ in der Leiste oben." und "Verstanden".
5. **When** "Tor" für Feuerbach getippt wird, **Then** bietet die Torschützen-Auswahl die Kinder dieser Mannschaft (Kader der E2, Spec 015 US5, Spec 016); nach jedem Tor zeigt die Leiste z. B. "Tor für Feuerbach: Ben, 14'." mit "Rückgängig".
6. **Given** ein Handy tickert per Übergabe-Link, **Then** zeigt die Navigation "Spiel", "Historie" und "Mehr"; "Mehr" enthält "Live-Spieltag" (nur "Du tickerst E2 – TSV Birkach, heute bis 24 Uhr" und "Dashboard ansehen"), "Einstellungen" und "Hilfe", aber kein "Kader" und keine Trainer-Funktion.
7. **Given** der Link wurde zurückgezogen, ist abgelaufen (nach 24 Uhr am Spieltag), das Spiel ist beendet, abgesagt oder gelöscht, oder alle Links wurden neu ausgestellt, **When** er angetippt wird, **Then** zeigt die Seite den Grund ("Dieser Übergabe-Link wurde zurückgezogen.", "Dieser Übergabe-Link ist abgelaufen.", "Dieses Spiel ist beendet.", "Dieses Spiel wurde abgesagt.") mit "Frag <Absender> nach einem neuen Link." und "Spiele verfolgen".
8. **Given** der Link wurde weitergegeben (z. B. in die Elterngruppe) und Bens Papa tickert, **When** ein Dritter ihn öffnet und "Tickern übernehmen" tippt, **Then** steht dort "Bens Papa tickert gerade.", und die Rückfrage nennt "Bens Papa".
9. **Given** ein Handy tickert per Übergabe-Link, **Then** kann es über "…" → "Tickern übergeben" selbst einen Übergabe-Link für dieses Spiel teilen, mit denselben Grenzen.
10. **Given** 24 Uhr am Spieltag ist erreicht, **Then** sendet das Handy nichts mehr, der Kader der Mannschaft ist vom Handy gelöscht, und "Mehr" zeigt kein "Live-Spieltag" mehr; das Spiel bleibt in der Historie, "Spiele verfolgen" bleibt.

---

### User Story 4 - Abgelöst: Hinweis und Dashboard (Priority: P1)

Wer gerade tickert und abgelöst wird, ob über den Schalter, einen Übergabe-Link oder den Startbildschirm, sieht sofort "Franz hat das Tickern von dir übernommen." und danach nur noch das Dashboard. In der Historie steht das Spiel mit "übergeben an Franz".

**Why this priority**: Gehört zur Übernahme-Regel. Ohne den Hinweis merkt der Abgelöste nicht, dass seine Einträge nicht mehr zählen.

**Independent Test**: Trainer-Handy A tickert E2 (1:0). Trainer-Handy B ("Franz") übernimmt über den Startbildschirm. A zeigt innerhalb von 5 Sekunden das Dashboard mit "Franz hat das Tickern von dir übernommen."; A's Historie zeigt das Spiel mit "übergeben an Franz".

**Acceptance Scenarios**:

1. **Given** A zeigt das Spiel, **When** ein anderes Handy es übernimmt und A das erfährt, **Then** wechselt A zum Dashboard des Live-Spieltags mit dem Hinweis "Franz hat das Tickern von dir übernommen." und "Ab jetzt siehst du hier den Stand. Das Spiel steht in deiner Historie."; der Spielbildschirm dieses Spiels lässt sich nicht mehr öffnen.
2. **Given** A ist woanders in der App (Startbildschirm, Spielplan, Historie), **Then** zeigt A die Meldung "Franz hat das Tickern von dir übernommen. (E2 – TSV Birkach)" und im Spielplan den neuen Namen; "Spiel fortsetzen" für dieses Spiel entfällt.
3. **Then** steht das Spiel in A's Historie mit "übergeben an Franz" und dem Stand bei der Übergabe; empfängt A später den Endstand, ersetzt er diesen Stand.
4. **Given** A hatte bei der Übernahme kein Netz und hat noch etwas erfasst, **When** A wieder Netz hat, **Then** zeigt A den Hinweis aus S1 mit dem Zusatz "Was du danach noch eingetragen hast, zählt nicht."; das Dashboard hat diese Einträge nie gezeigt (Spec 006 FR-L23).
5. **Given** A will wieder tickern, **Then** geht das wie für jeden über den Schalter im Spielplan oder "E2: Tickern übernehmen" auf dem Startbildschirm, mit der Rückfrage, die den Namen des anderen nennt.

---

### User Story 5 - Vor dem Spiel übergeben (Priority: P2)

Atti hat E2 für Samstag vorgemerkt, kann aber nicht. Er tippt im Spielplan auf das Spiel, dann auf "Tickern übergeben", und schickt den Link an Bens Papa. Der öffnet ihn, gibt seinen Namen ein und tickert ab dann; im Spielplan steht "Bens Papa".

**Why this priority**: Häufiger planbar als die Übergabe im Spiel, aber seltener dringend; unter Trainern genügt der Schalter.

**Independent Test**: Trainer-Handy A, Planspiel "Sa 21.11. 12:00 E2 – TSV Birkach" (frei): Blatt, "Tickern übergeben", "Übergabe-Link teilen"; der Spielplan zeigt "Link offen". Ein Handy ohne Torticker-Daten öffnet den Link, gibt "Bens Papa" ein und tippt "Tickern übernehmen" (ohne Rückfrage); A zeigt im Spielplan "Bens Papa". Am 21.11. zeigt das neue Handy "Heute tickerst du: 12:00 E2 – TSV Birkach"; ein Tipp öffnet "Neues Spiel" mit Gegner, Anstoß, Heim/Auswärts und Spielzeit vorbelegt.

**Acceptance Scenarios**:

1. **When** im Spielplan ein Spiel angetippt wird (nicht der Schalter), **Then** öffnet das Blatt mit Datum, Anstoß, Spiel, Heim/Auswärts, Wettbewerb und Spielzeit, dem Zustand ("Noch niemand tickert dieses Spiel.", "Du tickerst dieses Spiel." bzw. "Jonas tickert dieses Spiel."), dem Knopf "Tickern übergeben" (Symbol, Unterzeile "Übergabe-Link, z. B. an Eltern"), "Planspiel bearbeiten" und "Schließen".
2. **When** "Tickern übergeben" getippt wird, **Then** öffnet das Blatt wie US2-S2 mit "Sa 21.11., 12:00 · E2 – TSV Birkach", "Wer den Link öffnet, tickert dieses Spiel. Gegner, Anstoß und Spielzeit sind vorbelegt." und "Gilt nur für dieses Spiel, am Spieltag bis 24 Uhr."
3. **When** "Übergabe-Link teilen" getippt wird, **Then** lautet der Teilen-Text "Kannst du am Sa 21.11. das Tickern übernehmen? Feuerbach E2 – TSV Birkach, 12:00. Antippen und loslegen:" mit dem Link in der nächsten Zeile.
4. **Given** das Spiel war frei, **Then** steht im Spielplan nach dem Teilen "Link offen", bis jemand übernimmt; war es das eigene, bleibt "Du".
5. **Given** der Empfänger übernimmt (US3), **Then** zeigen alle Trainer-Handys seinen Namen; sein Handy zeigt am Spieltag "Heute tickerst du" (Spec 015 FR-P28) und legt das Spiel mit Gegner, Anstoß, Heim/Auswärts und Spielzeit vorbelegt an.

---

### Edge Cases

- **Link in der Elterngruppe**: Jeder mit dem Link darf übernehmen, immer mit Rückfrage, die den Namen nennt; wer abgelöst wird, sieht den Namen des Neuen (US4).
- **Zwei übernehmen fast gleichzeitig**: Es gilt der Übergabezähler (Spec 006 FR-L23); wer unterliegt, sieht den Hinweis aus US4.
- **Abgebendes Handy ohne Netz** (Akku leer, Funkloch): Der Empfänger übernimmt den zuletzt gesendeten Stand; die Rückfrage nennt ab 5 Minuten ohne Meldung zusätzlich "letzte Meldung vor <n> Min" (wie Spec 018 FR-004). Was das abgebende Handy danach noch erfasst, zählt nicht (US4-S4).
- **Empfänger ohne Netz**: Die Seite des Übergabe-Links sagt "Keine Verbindung. Zum Übernehmen braucht das Handy Netz." und versucht es weiter; übernehmen braucht den aktuellen Stand.
- **Turnier mit mehreren Spielen einer Mannschaft am selben Tag** (Spec 002 FR-T05): Ein Übergabe-Link gilt für genau ein Spiel; für das nächste braucht es einen neuen Link, Trainer nehmen den Schalter oder den Startbildschirm.
- **Spiel nicht aus dem Spielplan angelegt**: Es steht nicht im Spielplan; übergeben geht im Spiel (US2), übernehmen für Trainer über den Startbildschirm (Spec 018).
- **Vormerkungen ohne Namen** aus der Zeit vor dieser Spec: Sie zeigen "vergeben", bis das vormerkende Handy einen Namen hat; es fragt beim nächsten Einschalten oder Übernehmen danach.
- **Trainer-Handy desselben Live-Spieltags öffnet einen Übergabe-Link**: Der Link wirkt wie der Schalter (Rückfrage, Übernahme); Kopplung und Rechte bleiben unverändert (F6).
- **Handy mit einem anderen Live-Spieltag gekoppelt**: Die Seite sagt "Dieses Handy gehört zu einem anderen Live-Spieltag. Übergabe-Links gehen nur auf Handys ohne diese Kopplung." (F6).
- **Handy kennt nur den Zuschauer-Link** dieses Live-Spieltags (Eltern): Der Übergabe-Link funktioniert; "Spiele verfolgen" bleibt.
- **Mitternacht während eines Spiels**: Um 24 Uhr am Spieltag endet die Berechtigung; das Handy sendet danach nichts mehr, das Spiel bleibt lokal erhalten.
- **Alle Links neu ausstellen** (Spec 006 US5): Macht auch alle Übergabe-Links ungültig; Handys, die per Übergabe-Link tickern, senden nichts mehr.
- **Zurückziehen nach der Übernahme**: geht nicht mehr, die Leiste ist weg; zurückholen geht wie in US4-S5.
- **Kindernamen**: Link und Teilen-Text enthalten keine Kindernamen; der Kader kommt verschlüsselt über den eigenen Dienst (Spec 016 FR-B03, FR-B05). Erfasste Torschützen bleiben in der Historie des Empfängers, wie bei jedem erfassten Spiel.
- **Korrigieren nach dem Schlusspfiff** (Spec 017): Das Handy, das zuletzt getickert hat, korrigiert; per Übergabe-Link nur bis zum Ablauf.

## Requirements *(mandatory)*

### Functional Requirements

**Wer tickert (US1)**

- **FR-U01**: Der Spielplan MUSS auf Trainer-Handys bei jedem kommenden, nicht abgesagten Planspiel einen Schalter "Ich tickere" zeigen, darunter "Du", den Namen dessen, der tickert, "frei" oder "Link offen" (US5-S4), mit dem Spaltenkopf "Tickert" je Tag. Schalter und Name bilden eine Tippfläche von mindestens 64 × 64 pt (Constitution I). Der Knopf "Ich tickere" im Blatt des Planspiels entfällt (ändert Spec 015 US6-S1, FR-P25).
- **FR-U02**: Einschalten eines freien Spiels MUSS ohne weitere Rückfrage vormerken (ändert die Bestätigung aus Spec 015 US6-S1). Ausschalten eines eigenen, nicht angepfiffenen Spiels MUSS es freigeben, mit "Rückgängig" für mindestens 5 Sekunden.
- **FR-U03**: Ab dem Anpfiff MUSS als "tickert" das Handy gelten, das das Spiel live sendet; jede Übernahme setzt die Vormerkung auf den Übernehmenden (F2). Läuft das eigene Spiel, MUSS der Schalter an und sichtbar gesperrt sein; ein Tipp öffnet das Blatt mit dem Hinweis aus US1-S7.
- **FR-U04**: "Dein Name" (1 bis 20 Zeichen) MUSS Pflicht sein, bevor ein Handy vormerkt oder übernimmt (ändert Spec 015 FR-P26 "optional"). Die App fragt einmal; in den Einstellungen heißt das Feld "Dein Name" (bisher "Dein Name für die Trainer"). Ein geänderter Name erscheint bei den eigenen Vormerkungen.

**Übernehmen (US1, US3, US4)**

- **FR-U05**: Jede Übernahme eines Spiels, das ein anderes Handy tickert, MUSS vorher fragen: "<Name> tickert schon. Willst du das Tickern von <Name> übernehmen?" mit "Ja, übernehmen" und "Abbrechen". Bei einem laufenden Spiel nennt die Rückfrage "Läuft gerade: <Stand>, <Minute>. Minute. Stand, Uhr und Tore kommen mit." (Phase statt Minute wie auf dem Dashboard; ab 5 Minuten ohne Meldung zusätzlich "letzte Meldung vor <n> Min"), sonst "<Name> bekommt einen Hinweis.". Tickert niemand, entfällt die Rückfrage. Das gilt für Schalter, Übergabe-Link und Startbildschirm (ersetzt Spec 018 US2-S2).
- **FR-U06**: Beim Anlegen unter "Neues Spiel" (Spec 006 US6-S1) MUSS die Frage den Namen nennen ("Tom tickert schon: TSV Musterstadt 1:0, 12'.") und der Knopf "Tickern übernehmen" heißen; "Nur hier erfassen (nicht live)" und "Abbrechen" bleiben.
- **FR-U07**: Der Startbildschirm (Spec 018 FR-004) MUSS den Knopf "<Mannschaft>: Tickern übernehmen" mit der Unterzeile "<Name> tickert · <bisherige Unterzeile>" zeigen (F1).
- **FR-U08**: Der Live-Stand MUSS den Namen dessen enthalten, der tickert, Ende-zu-Ende verschlüsselt wie Spec 006 FR-L11; das Dashboard zeigt ihn nicht (F4).

**Tickern übergeben (US2, US5)**

- **FR-U09**: Das "…"-Menü des Spiels MUSS, solange dieses Handy ein live gesendetes, nicht beendetes Spiel tickert, als ersten Eintrag "Tickern übergeben" mit Symbol und Unterzeile zeigen, durch eine Linie von den übrigen Einträgen getrennt. Das Blatt eines Planspiels MUSS "Tickern übergeben" ebenfalls anbieten (US5-S1).
- **FR-U10**: Das Blatt "Tickern übergeben" MUSS die Texte aus US2-S2 bzw. US5-S2 zeigen; "Übergabe-Link teilen" öffnet das Teilen-Menü des Systems (Fallback: Zwischenablage) mit dem Text aus US2-S3 bzw. US5-S3.
- **FR-U11**: Der Übergabe-Link MUSS so kurz sein, dass WhatsApp ihn ganz antippbar macht (höchstens rund 400 Zeichen, wie Spec 006 FR-L02); er enthält keine Kindernamen und keinen Organisator-Schlüssel.
- **FR-U12**: Nach erfolgreichem Teilen im Spiel MUSS die Leiste aus US2-S4 mit "Zurückziehen" erscheinen, bis jemand übernimmt oder der Link zurückgezogen ist; das Handy tickert unverändert weiter. "Zurückziehen" MUSS den Link ungültig machen.
- **FR-U13**: Rückmeldungen im Spiel (Übergabe, Übernahme, Tor mit "Rückgängig") MÜSSEN als Leiste unter der Kopfzeile erscheinen, nie über den Tor-Knöpfen oder offenen Blättern; Meldungen außerhalb des Spiels MÜSSEN schließen, sobald ein Blatt aufgeht.

**Übergabe-Link beim Empfänger (US3)**

- **FR-U14**: Ein Übergabe-Link MUSS genau ein Spiel bzw. Planspiel einer Mannschaft bezeichnen und bis 24 Uhr am Spieltag gelten. Er berechtigt nur dazu, dieses Spiel zu tickern: anlegen (Planspiel), erfassen, senden, bis zum Ablauf korrigieren und weitergeben. Er MUSS ungültig werden durch "Zurückziehen", Absagen oder Löschen des Planspiels und "Alle Links neu ausstellen"; ein beendetes Spiel lässt sich darüber nicht mehr übernehmen.
- **FR-U15**: Die Seite des Übergabe-Links MUSS den Inhalt aus US3-S1 zeigen und "Tickern übernehmen" erst mit gültigem Namen erlauben; ungültige Links MÜSSEN den Grund aus US3-S7 zeigen.
- **FR-U16**: Ein Handy mit Übergabe-Link MUSS für die Torschützen den Kader dieser Mannschaft bekommen (Ende-zu-Ende verschlüsselt über den eigenen Dienst, F5), ihn nur im Spiel und in der Torschützen-Auswahl zeigen und ihn nach Ablauf löschen; "Kader" und "Kader teilen" fehlen.
- **FR-U17**: "Mehr" MUSS auf einem Handy mit Übergabe-Link "Live-Spieltag" (nur Status und "Dashboard ansehen"), "Einstellungen" und "Hilfe" zeigen; Trainer-Funktionen (Links teilen, Mannschaften, Spielplan pflegen, neu ausstellen) fehlen.
- **FR-U18**: Beim ersten Übernehmen per Übergabe-Link MUSS einmal die Hinweiskarte aus US3-S4 unter der Torliste erscheinen.
- **FR-U19**: Nach Ablauf MUSS das Handy aufhören zu senden, den Kader löschen und "Live-Spieltag" unter "Mehr" ausblenden; erfasste Spiele bleiben in der Historie.

**Abgelöst (US4)**

- **FR-U20**: Erfährt ein Handy, dass sein Spiel übernommen wurde, MUSS es das Senden dafür beenden (wie Spec 006 FR-L24) und im Spiel zum Dashboard mit dem Hinweis aus US4-S1 wechseln bzw. außerhalb des Spiels die Meldung aus US4-S2 zeigen. Das Spiel lässt sich dort nicht mehr fortsetzen (ändert Spec 006 FR-L24 und den Randfall "Eigenes Spiel wurde übernommen" aus Spec 018, F3).
- **FR-U21**: Die Historie des abgelösten Handys MUSS das Spiel mit "übergeben an <Name>" und dem Stand bei der Übergabe zeigen und den Endstand übernehmen, sobald das Handy ihn empfängt. "Ergebnis teilen" bleibt möglich; korrigieren kann nur das Handy, das zuletzt getickert hat.
- **FR-U22**: Einträge, die das abgelöste Handy nach der Übernahme noch erfasst hat, MÜSSEN verworfen werden, und der Hinweis MUSS den Zusatz aus US4-S4 zeigen.

**Begriffe**

- **FR-U23**: Die App MUSS für das Abgeben "Tickern übergeben" und für das Übernehmen "Tickern übernehmen" verwenden; "Spiel übernehmen" (Spec 006 US6, Spec 018) und "Trotzdem übernehmen?" (Spec 015 US6-S3) entfallen. "Trotzdem hier erfassen?" beim Anlegen eines vorgemerkten Spiels (Spec 015 US6-S6) bleibt.

### Key Entities

- **Übergabe-Link**: bezeichnet Live-Spieltag, Mannschaft und Spiel bzw. Planspiel, Ablauf (24 Uhr am Spieltag) und Absender; trägt das Recht, genau dieses Spiel zu senden, und den Zugang zum Kader dieser Mannschaft; enthält keine Kindernamen und keinen Organisator-Schlüssel.
- **Wer tickert** (je Spiel): Name und Handy; vor dem Anpfiff aus der Vormerkung (Spec 015), danach aus dem Live-Stand mit Übergabezähler (Spec 006).
- **Dein Name** (je Handy): 1 bis 20 Zeichen, Pflicht vor Vormerken oder Übernehmen.
- **Übergabe in der Historie**: Spiel mit "übergeben an <Name>", Stand bei der Übergabe, später der Endstand.

## Hilfe *(mandatory)*

- **Neu**: "Wie gebe ich das Tickern ab, wenn ich gehen muss?" (`tickern-uebergeben`, Thema: Live-Spieltag, Quelle: 019 US2, 019 US5). Im Spiel "…", "Tickern übergeben", "Übergabe-Link teilen"; vorher im Spielplan das Spiel antippen; Trainer schalten einfach ein; bis jemand übernimmt, tickert man weiter; "Zurückziehen".
- **Neu**: "Ich habe einen Übergabe-Link bekommen. Wie tickere ich?" (`uebergabe-link`, Thema: Live-Spieltag, auch für Eltern, Quelle: 019 US3). Link antippen, "Dein Name", "Tickern übernehmen", "Ja, übernehmen"; Tor und Torschützen, "Rückgängig"; gilt nur für dieses Spiel bis 24 Uhr; weitergeben über "…".
- **Neu**: "Warum sehe ich nur noch das Dashboard?" (`abgeloest`, Thema: Live-Spieltag, Quelle: 019 US4). Jemand hat das Tickern übernommen; das Spiel steht mit "übergeben an …" in der Historie; zurückholen über den Schalter oder den Startbildschirm.
- **Geändert**: "Wie sage ich an, dass ich ein Spiel tickere?" (`spiel-vormerken`): Schalter im Spielplan statt "Ich tickere" im Blatt, "Dein Name" ist Pflicht, Rückfrage mit Namen, während des eigenen Spiels gesperrt (Quelle zusätzlich: 019 US1).
- **Geändert**: "Wie übernehme ich ein Spiel, das schon ein anderes Handy überträgt?" (`spiel-uebernehmen`): "E2: Tickern übernehmen", Rückfrage "… tickert schon. Willst du das Tickern von … übernehmen?", Schalter im Spielplan, Übergabe-Link; das andere Handy sieht danach nur noch das Dashboard (Quelle zusätzlich: 019 US1, 019 US4).
- **Geändert**: "Wie bekommen Trainerkollegen die Kader?" (`trainer-kader`): ergänzt um "Wer per Übergabe-Link tickert, bekommt nur den Kader dieser Mannschaft, für die Torschützen und bis 24 Uhr." (Quelle zusätzlich: 019 US3).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-U01**: Vom laufenden Spiel bis zum geteilten Übergabe-Link genügen 3 Tipps ("…", "Tickern übergeben", "Übergabe-Link teilen") plus die Auswahl im Teilen-Menü.
- **SC-U02**: Ein Empfänger ohne Torticker-Daten kommt vom Antippen des Links mit 3 Schritten (Name, "Tickern übernehmen", "Ja, übernehmen") und in unter 60 Sekunden zum Spielbildschirm; Stand und Tore stimmen, die Minute weicht höchstens 1 Minute ab.
- **SC-U03**: Zwischen Teilen und Übernahme geht kein Tor verloren: Das abgebende Handy sendet weiter, und das Dashboard zeigt durchgehend eine Karte ohne Sprung.
- **SC-U04**: Das abgelöste Handy zeigt den Hinweis bei Netz innerhalb von 5 Sekunden nach der Übernahme.
- **SC-U05**: Im Spielplan ist für jedes Spiel ohne Antippen erkennbar, wer es tickert; jede Schalter-Tippfläche ist mindestens 64 × 64 pt groß.
- **SC-U06**: Der Übergabe-Link ist in WhatsApp auf dem iPhone ganz antippbar und enthält keinen Kindernamen.
- **SC-U07**: Ein Handy mit Übergabe-Link kann keine Trainer-Funktion ausführen, kein anderes Spiel senden und keine Kaderliste weitergeben; nach 24 Uhr am Spieltag sendet es nichts mehr und hält keinen Kader mehr.

## Assumptions

- Übernahme, Umrechnung der Uhr und Übergabezähler stammen aus Spec 006 US6 (FR-L23). Diese Spec ändert, wer übernehmen darf (auch per Übergabe-Link), die Rückfrage und das Verhalten des abgelösten Handys.
- Spiel- und Kaderdaten gehen weiter nur über den eigenen Vermittlungsdienst, Ende-zu-Ende verschlüsselt (Constitution II, Netzwerk-Wächter). Ein Handy mit gültigem Übergabe-Link gilt dafür als aktive Live-Kopplung, begrenzt auf das eine Spiel.
- Trainergruppe und Elterngruppen sind vertrauenswürdig genug, dass jeder mit Übergabe-Link übernehmen darf (Atti, 17.11.2026); Rückfrage und Hinweis machen jede Übernahme sichtbar.
- "Heute tickerst du" (Spec 015 FR-P28) und "Spiele verfolgen" (Spec 018 US1) bleiben; "Heute tickerst du" erscheint auch auf einem Handy, das per Übergabe-Link ein Planspiel übernommen hat.
- Betroffene Specs bekommen bei der Umsetzung einen Nachtrag: Spec 006 (US6-S1 bis S3, FR-L24), Spec 015 (US6, FR-P25 bis FR-P27), Spec 016 (FR-B05, Kader auch für Übergabe-Links) und Spec 018 (US2-S1 bis S3, Randfall "Eigenes Spiel wurde übernommen").
- Neue Teile werden nachgeladen; das Hauptbundle bleibt im Budget (< 60 KB gzip).
- Fiktive Namen in Spec, Tests und Mockup: Atti, Tom, Jonas, Franz (Trainer), Bens Papa (Elternteil), Kinder Max, Ben, Tom, Leo, Paul, Maxi.

## Offene Fragen

Keine. Die Folgerungen F1 bis F6 werden in Review A bestätigt.
