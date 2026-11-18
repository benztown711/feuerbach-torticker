# Research: Erster Start und Feinschliff (Spec 022)

## R-F1 "Später" gilt bis zum nächsten Kalendertag

- **Decision**: `localStorage["torticker-install-later"]` hält den Kalendertag (Ortszeit, `JJJJ-MM-TT` wie `todayKey` aus `src/domain/plan.ts`), an dem "Später" getippt wurde. Der Hinweis erscheint, solange dieser Wert nicht "heute" ist. `installHintDismissedAt` (Einstellungen, "Verstanden") schaltet ihn dauerhaft ab.
- **Rationale**: Ein "Spieltag" ist auf dem Handy nicht erkennbar (Spielplan und Vormerkung sind optional, Spiele werden frei angelegt). Ein Kalendertag ist vorhersehbar und lässt den Hinweis wiederkommen, solange das Risiko (Datenverlust ohne Installation) besteht. Browserspeicher statt `Settings`, weil der Wert nur ein Komfort dieses Browsers ist: keine Änderung am IndexedDB-Schema, nicht in der Sicherung, nicht im Live-Spieltag (Constitution II, III), keine Migration und kein Test für die Sicherung.
- **Alternatives considered**: Neues Feld `installHintLaterAt` in `Settings` (Schema, Sicherung, Import-Prüfung, Domänentests für nichts, was gesichert werden müsste); "bis zum nächsten Spieltag" (nicht erkennbar); dauerhaft wegklicken (Gefahr bleibt, die Einstellungen bieten den dauerhaften Weg).
- **Ohne Browserspeicher** (privates Surfen, blockiert): `try/catch`, der Hinweis gilt bis zum Neuladen ausgeblendet (Zustand in der Komponente).

## R-F2 Anleitung nach Gerät, kein Installieren-Dialog

- **Decision**: `installPlatform(userAgent, maxTouchPoints)` unterscheidet `ios` (iPhone, iPad, iPod und iPadOS als `MacIntel` mit Touch), `android` und `other`. `installSteps` liefert den Wortlaut aus FR-F02. Es gibt keinen Knopf "Installieren" über `beforeinstallprompt`.
- **Rationale**: Die App nutzt `beforeinstallprompt` nirgends; iOS kennt das Ereignis nicht, und der Hinweis soll auch dort gelten, wo die Installation nur über das Menü geht. Die Kurzanleitung deckt beide Zielgeräte der Constitution ab. Ein eigener Dialog wäre mehr Code im Hauptbundle (59,6 KB) und eine Pflege mehr (Constitution VI).
- **Wortlaut iOS**: "In Safari auf „Teilen“ tippen, dann „Zum Home-Bildschirm“." wie die Anleitung in den Einstellungen und der Hilfe (Spec 001 FR-023). Seit iOS 26 liegt "Teilen" in Safari hinter dem Menü; die Anleitung nennt trotzdem nur "Teilen", wie die vorhandene Hilfe, und die Hilfe nennt "Mehr" nicht, weil sich die Anordnung je Version ändert (Gerätetest in Review C).
- **Alternatives considered**: Bild- oder Video-Anleitung (Bundle, Offline-Pflege); Weiterleitung auf die Hilfe `installieren` (ein Tipp mehr, Hilfe ist nachgeladen).

## R-F3 Angehefteter Knopf und Gegner optional

- **Decision**: Der Knopf steht in einem Container am Ende des Formulars mit `position: sticky; bottom: calc(var(--nav-h) + env(safe-area-inset-bottom))`, `canvas`-Fläche und Linie oben (nur Tokens). Der Seitenrand `body { padding-bottom: nav-h + safe-area }` bleibt, der Container endet daher über der Navigationsleiste und deckt beim Scrollen an das Ende keinen Inhalt ab. Vor der Prüfung ersetzt die Seite einen leeren Gegner durch "Gegner" (`opponent.trim() || 'Gegner'`), die Domäne (`validateNewGame`, Spec 001 FR-001) bleibt unverändert; es gibt keine Fehlermeldung für einen leeren Gegner mehr, weil er nie leer ankommt.
- **Rationale**: Domänencode ändert sich nicht, Spec 001 und `validation`-Tests bleiben gültig; "Gegner" kommt schon heute als Anzeigename in der Vorschau vor (`oppLabel`). `position: sticky` (statt `fixed`) hält den Knopf im Dokumentfluss: kein Abdecken, kein Sprung bei offener Tastatur, kein zusätzliches Messen der Höhe.
- **Tastatur**: Auf Android (Chromium) verkleinert sich der Layout-Viewport, der Knopf rückt über die Tastatur. Auf iOS Safari bleibt der Layout-Viewport und die Tastatur legt sich darüber; der Knopf liegt dann unter der Tastatur, "Enter" im Feld startet das Spiel (Formularabschluss bestand schon). Das ist mit dem Gerätetest in Review C zu bestätigen.
- **Alternatives considered**: `position: fixed` mit gemessener Höhe als Seitenrand (Messung, Sprünge); Navigationsleiste ausblenden (andere Seiten haben sie, Konsistenz).

## R-F4 Schalter "Ton bei Toren" in Rot

- **Decision**: Fläche im Zustand "an" `rot-tief` (wie der Hauptknopf außerhalb des Spiels, `design/README.md`), Schieber `on-rot`, Rahmen `ink` bleibt. Kontrastpaar `on-rot` auf `rot-tief` (4,5:1) steht schon in der Matrix und deckt den Schieber ab; hell und dunkel sind gleich, weil Markenflächen sich nicht ändern. Die Beschreibung des Paars nennt jetzt auch den Schalter. Übergang `transform` und `background` 0,15 s, bei `prefers-reduced-motion: reduce` keiner.
- **Rationale**: `vereinsrot` (`#eb1e25`) gegen Weiß erreicht weniger als 4,5:1; `rot-tief` ist das Token der Hauptknöpfe (Spec 011) und im Vereinsdesign für Weiß vorgesehen. Der Rahmen `ink` hebt die Fläche vom Grund ab (Nicht-Text-Kontrast 3:1).
- **Alternatives considered**: `vereinsrot` (schwächer auf Weiß); neues Token (Constitution VII).

## R-F5 "Trainer-Link teilen" im Blatt ohne Kader-Frage

- **Decision**: `shareTrainerLink(live)` (bestehend, `live-setup.ts`) direkt, ohne die Kader-Frage (`SquadShareSheet` liegt in `live.tsx`).
- **Rationale**: Die Frage "Kader mit den Trainern teilen?" ist ein eigenes Blatt in `live.tsx`; sie in das Blatt zu ziehen wäre ein Umbau (Spec 020 FR-E08 nennt den Weg nur als Hinweis). Es verlässt kein Kader das Handy, solange die Frage nicht beantwortet ist; sie erscheint beim nächsten "Trainer-Link teilen" unter „Für Trainer“ (Spec 016 FR-B02, `offer.some(!shared)`). Die Hilfe `trainer-kader` erklärt den Weg.
- **Alternatives considered**: Kader-Frage im Blatt (Umbau, zwei Blätter übereinander); Knopf nur als Sprung nach „Für Trainer“ (ein Tipp mehr, in Safari kann das Teilen danach nicht mehr aus derselben Berührung öffnen, vgl. Spec 020 R-E1).

## R-F6 "Für Trainer" als eine Fläche, "Link einfügen" bei den Trainer-Links

- **Decision**: Der geöffnete Bereich bekommt Rahmen und Fläche der Karten (`card`, `line`), schließt oben bündig an die Kopfzeile an (Kopfzeile ohne untere Rundung); die Abschnittskarten darin verlieren Rahmen und Fläche und werden durch eine Linie getrennt. "Link einfügen" zieht in die Karte "TRAINER" unter "Trainer-Link teilen" (beides sind Trainer-Links), auf dem Lead-Handy (ohne diese Karte) bleibt er der erste Knopf.
- **Rationale**: Ein Kasten in einem Kasten war der Befund; die Abschnitte bleiben gleich bezeichnet (Testkennungen bleiben).

## R-F7 Bundle-Budget

- **Decision**: Neuer Code liegt in nachgeladenen Chunks (`live-start.tsx` samt `install-hint.ts`) bzw. ersetzt vorhandenen (`new-game.tsx`). Nach jeder User Story `npm run budget`.
- **Rationale**: Hauptbundle 59,6 KB von 60 KB; `new-game.tsx` ist Teil des Hauptbundles, daher dort nur Ersetzungen.

## Gerätetest Spec 020 (T043)

Gerätetest 18.11.2026 durch Atti am iPhone: Live starten, Link teilen (Safari, direkt nach Neu starten), Eltern-Ansicht, Tor: bestanden. (Eintrag auch in `specs/020-live-einfach/research.md`.)
