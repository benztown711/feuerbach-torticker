# Quickstart: Spiel korrigieren (Spec 017)

Automatisch: `npm run check` (Unit-Tests, Hilfe-Abdeckung) und `npx playwright test tests/e2e/spiel-korrigieren.spec.ts` (017 US1 bis US3). Im Cloud-Container `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium` setzen.

Gerätetest mit Atti (iPhone, installierte App, gekoppelt):

| Nr | Ablauf | Erwartung |
|---|---|---|
| K-1 | Beendetes Spiel teilen, App schließen, später Historie → Spiel → Tor antippen → "Torschütze ändern" | Spielverlauf und Teilen-Text zeigen den neuen Torschützen; Leiste "Korrigiert. Ergebnis neu teilen?"; "Teilen" öffnet WhatsApp mit dem neuen Text |
| K-2 | Spieldetails → "Tor nachtragen" | Endstand und Dashboard ("Letzte Spiele") zeigen das Tor |
| K-3 | Laufendes Spiel → "…" → "Trikots ändern" → Gegner Blau → "Übernehmen" | Tor-Knopf blau, Dashboard-Karte blau; nächstes "Neues Spiel" gegen diesen Gegner schlägt Blau vor |
