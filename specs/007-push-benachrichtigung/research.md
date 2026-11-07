# Research: Eigener Dienst für den Live-Spieltag (Spec 007)

Nummern R-N1 ff. Grundlagen des Live-Spieltags (Verschlüsselung, Meldungsformat, Tageslogik) stehen in `specs/006-live-spieltag/research.md`. Weitere Entscheidungen (Schreibberechtigung, Kennungen, Protokoll) folgen mit `/speckit-plan` nach Review A.

## R-N1 Cloudflare Gratis-Plan (geprüft am 07.11.2026)

- **Quellen**: developers.cloudflare.com, Seiten "Durable Objects Pricing" (Stand 18.10.2026), "Durable Objects Limits" (07.11.2026), "Workers Limits" (29.10.2026), "Workers Pricing" (02.10.2026).
- **Grenzen im Gratis-Plan**: Workers 100.000 Anfragen am Tag, 10 ms CPU je Anfrage; Durable Objects 100.000 Anfragen am Tag (eine WebSocket-Verbindung kostet eine Anfrage, ausgehende Nachrichten sind frei, eingehende zählen 20:1), 13.000 GB-s Laufzeit am Tag (ruhende Objekte mit WebSocket-Hibernation kosten keine Laufzeit), SQLite: 5 Mio. gelesene und 100.000 geschriebene Zeilen am Tag, 5 GB Speicher je Konto. Tagesgrenzen gelten bis Mitternacht UTC.
- **Überschreiten**: "further operations of that type will fail with an error"; Workers antworten mit Fehler 1027. Eine Abrechnung gibt es nur im Bezahl-Plan (ab 5 USD im Monat); er wird nicht gebucht.
- **Offen für den Plan**: CPU-Budget eines Durable Objects im Gratis-Plan je Nachricht (10 ms oder 30 s; in einem Test messen), Grenze je Objekt (1 GB laut FAQ, 10 GB laut Tabelle; für uns ohne Belang), ob für den Gratis-Plan ein Zahlungsmittel hinterlegt sein muss (in den Seiten nicht genannt; Atti hat bereits ein Konto).
- **Mengengerüst** (Spieltag mit drei Mannschaften, 120 Zuschauer): Meldungen der Trainer-Handys rund 150 am Tag (Spec 006 R-L3) plus Spielplan und Konfiguration; Verbindungen der Zuschauer: 120 × rund 20 Neuverbindungen (iOS trennt im Hintergrund) = 2.400 Anfragen; zusammen unter 5.000 Anfragen und unter 1.000 geschriebenen Zeilen am Tag, also unter 5 % der Grenzen. Speicher: 3 Mannschaften × 10 Spiele × 4 KB plus Plan und Konfiguration, unter 1 MB je Live-Spieltag.
- **Folgerung**: Ein Durable Object je Live-Spieltag (Topic) mit SQLite-Speicher und WebSocket-Hibernation; Abfragen im Sekundentakt wären zu teuer (120 Zuschauer alle 5 s = über 2 Mio. Anfragen am Tag) und scheiden aus.

## R-N2 Aufbau: ein Worker, ein Durable Object je Live-Spieltag, WebSocket mit Hibernation

- **Decision**: Ein Cloudflare Worker `torticker-relay` nimmt Anfragen an und leitet sie an ein Durable Object (Klasse `Spieltag`, SQLite-Speicher) weiter. Je Live-Spieltag gibt es genau ein Objekt; sein Name ist `<topic>.<orgPub>` (beides steht schon im Zuschauer-Link, R-N4). Zuschauer und Trainer-Handys verbinden sich per WebSocket; das Objekt nimmt die Verbindungen mit der Hibernation-API an (`ctx.acceptWebSocket`), antwortet auf `ping` per `setWebSocketAutoResponse` ohne aufzuwachen und schickt neue Meldungen an alle offenen Verbindungen. Senden geht per `POST`.
- **Rationale**: Ruhende Objekte mit Hibernation kosten keine Laufzeit; ein Stream (Server-Sent Events) hielte das Objekt wach und verbrauchte allein mit einer Verbindung rund 10.800 der 13.000 GB-s am Tag (R-N1). Abfragen im Sekundentakt sprengen das Anfragekontingent. Ein Objekt je Live-Spieltag hält alle Meldungen eines Spieltags an einem Ort, ordnet Schreibvorgänge nacheinander und braucht keine Datenbank über alle Spieltage.
- **Alternatives**: Workers KV (1.000 Schreibvorgänge am Tag im Gratis-Plan, keine Live-Verbindung); D1 plus Abfragen (Anfragekontingent); Server-Sent Events aus dem Durable Object (Laufzeit, s. o.); weiter ntfy.sh plus eigener Speicher nur für den Abruf (zwei Dienste, widerspricht Q3 und Constitution II "genau ein Dienst").

## R-N3 Blinder Dienst: was er sieht und was nicht (FR-N05)

- **Decision**: Der Dienst speichert die verschlüsselte Meldung (`t1.…`, wie bisher) und dazu nur, was er zum Ordnen braucht:
  - `kind`: `game`, `cfg`, `plan`, `retire`.
  - `slot` (nur `game`): HMAC-SHA-256 mit einem aus dem Zuschauer-Schlüssel abgeleiteten Schlüssel über `team|gameId`, gekürzt auf 22 Zeichen base64url. Alle Handys, die dasselbe Spiel senden (Ersatzhandy, Spiel übernehmen), kommen auf denselben `slot`.
  - `group` (nur `game`): HMAC wie oben über `team`, für "die letzten 10 je Mannschaft".
  - `h` und `at` (Übergabezähler und Sendezeit, nur `game`), `iat` (nur `cfg`): Zahlen zum Ordnen, wie sie das Dashboard ohnehin nutzt; `gone` (nur `game`): `true` bei "Nicht live senden" und gelöschtem Spiel.
- **Rationale**: Ohne Zuschauer-Link lassen sich aus `slot` und `group` weder Mannschaft noch Spiel ableiten (HMAC mit geheimem Schlüssel); Zeitpunkte und Größen sah auch ntfy.sh (Spec 006 R-L11, bewusst offen). Der abgeleitete HMAC-Schlüssel (HKDF aus dem Zuschauer-Schlüssel, Kontext "torticker-relay-slot-v1") verhindert, dass der AES-Schlüssel selbst für zwei Zwecke dient.
- **Alternatives**: Klartext-Mannschaft und Spiel-ID (verrät Mannschaften und Spielanzahl); alles nur als Strom ohne Ordnung speichern (der Dienst könnte nicht "jüngster Stand je Spiel" und "letzte 10" halten, FR-N02).

## R-N4 Schreibschutz ohne Konto (FR-N06)

- **Decision**:
  - **Adresse**: Objektname = `<topic>.<orgPub>` aus dem Zuschauer-Link. Wer mit einem anderen Organisator-Schlüssel schreibt, landet in einem anderen Objekt, das niemand liest. Es gibt kein "erstes Registrieren", das ein Fremder vorwegnehmen könnte.
  - **Nachweis je Schreibvorgang**: Jede `POST`-Anfrage trägt eine Signatur (ECDSA P-256, wie R-L5) über `Objektname|kind|slot|group|h|at|iat|gone|SHA-256(Meldung)`. Für `cfg`, `plan` und `retire` signiert ein Trainer-Handy mit dem Organisator-Schlüssel; für `game` signiert das Handy mit seinem Lead-Schlüssel und legt das vom Organisator signierte Lead-Zertifikat bei (wie `c` in der Meldung). Der Dienst prüft Zertifikat und Signatur gegen `orgPub` aus dem Objektnamen; geprüfte Zertifikate merkt er sich (Hash), um Rechenzeit zu sparen.
  - **Ordnung**: Für einen `slot` übernimmt der Dienst nur Meldungen mit größerem `h` bzw. bei gleichem `h` größerem oder gleichem `at` (wie das Dashboard, FR-L23); ältere Wiederholungen ändern nichts. `cfg` nur mit größerem oder gleichem `iat`.
- **Rationale**: Mit dem Zuschauer-Link allein lässt sich weder ein Zertifikat noch eine Organisator-Signatur fälschen (Spec 006 R-L5). Die Signatur über den Hash bindet Ordnungsangaben und Meldung aneinander, sodass niemand eine echte Meldung unter falschem `slot` oder mit größerem `h` einschleusen kann.
- **Grenzen** (bewusst offen, wie R-L12): Ein Inhaber eines Lead- oder Trainer-Links kann `slot`s anderer Mannschaften berechnen und überschreiben (Dashboards verwerfen solche Meldungen, das Spiel fehlte dann aber für neue Zuschauer); Trainer gelten als vertrauenswürdig, Abhilfe "Alle Links neu ausstellen". Wer einen eigenen Organisator-Schlüssel erzeugt, kann ein eigenes Objekt füllen; Obergrenzen je Objekt (R-N5) und die Tagesgrenzen des Gratis-Plans begrenzen den Schaden auf "Dienst für heute aus" (FR-N10).
- **Alternatives**: Gemeinsames Schreib-Geheimnis im Trainer-Link (neuer Link nötig, widerspricht FR-N07); Registrieren des ersten Schreibers (vorwegnehmbar mit dem Zuschauer-Link); Konto je Trainer (Constitution II).

## R-N5 Speicher und Löschen im Objekt (FR-N02, FR-N12)

- **Decision**: Eine Tabelle `msg(seq, kind, slot, grp, h, at, iat, gone, first, body)`; `seq` steigt mit jedem angenommenen Schreibvorgang (für den Abruf "seit"), `first` ist die Serverzeit, zu der der `slot` zum ersten Mal kam.
  - `game`: je `slot` eine Zeile (ersetzen). Je `group` bleiben die 10 jüngsten nicht gelöschten Spiele nach `first`; ältere werden gelöscht. `gone`-Zeilen bleiben 30 Tage als Grabstein (damit verbundene und später verbindende Dashboards das Entfernen erfahren), zählen aber nicht zu den 10.
  - `cfg`: eine Zeile, die mit dem größten `iat`.
  - `plan`: die 50 jüngsten Plan-Meldungen (Plan-Meldungen sind Änderungen einzelner Planspiele, Spec 015 contracts/plan-message.md; Empfänger führen wie bisher je Planspiel zusammen, Trainer-Handys senden weiter nach FR-P07 erneut).
  - `retire`: löscht alle Zeilen außer sich selbst und nimmt danach nichts mehr an.
  - Obergrenzen: Meldung höchstens 4.000 Zeichen, höchstens 6 `group`s, insgesamt höchstens 200 Zeilen je Objekt; darüber lehnt der Dienst ab.
  - Bei jedem angenommenen Schreibvorgang setzt das Objekt einen Alarm auf jetzt plus 365 Tage; der Alarm löscht den ganzen Speicher.
- **Rationale**: Mengengerüst unter 1 MB je Live-Spieltag (R-N1); das Dashboard ordnet weiter selbst (FR-L14, FR-L23), der Dienst hält nur die richtige Auswahl vor.

## R-N6 Protokoll zwischen App und Dienst

- **Decision**: Basisadresse `https://torticker-relay.<Konto>.workers.dev` (Build-Variable `VITE_RELAY_ORIGIN`, für E2E die Adresse des Nachbaus). Objektpfad `/v1/<topic>/<orgPub>`.
  - `POST /v1/<topic>/<orgPub>`: JSON `{ kind, slot?, group?, h?, at?, iat?, gone?, body, sig, cert? }` → `200 {seq}` angenommen, `204` älter als der gespeicherte Stand (kein Fehler), `400` ungültig, `403` Signatur, `409` neu ausgestellt, `413` zu groß bzw. Obergrenze, `429`/`5xx` Dienst (wie ohne Netz).
  - `GET /v1/<topic>/<orgPub>/ws?since=<seq>` (WebSocket): Der Dienst schickt `{"t":"hello","time":<Sekunden>,"msgs":[{seq,time,body}…]}` mit allen Zeilen mit `seq` > `since` (ohne `since`: alles), danach je angenommenem Schreibvorgang `{"t":"msg","seq","time","body"}`. Der Client schickt alle 30 s `ping` (Antwort `pong` ohne Aufwachen) und baut die Verbindung bei Stille über 90 s, beim Zurückkehren in den Vordergrund und nach Abbruch mit `since` neu auf (Abstände 1, 2, 4 … 30 s wie bisher).
  - CORS: nur die Herkunft der App (`https://benztown711.github.io`); lokal für `wrangler dev` über `.dev.vars` erweiterbar. E2E-Tests nutzen den Nachbau.
- **Rationale**: Die Empfangsseite der App (`LiveReceiver`, `live-watch`) bleibt bei "Meldung mit Serverzeit kommt an"; nur `relay.ts` tauscht den Transport. `hello.time` ersetzt `open`/`keepalive` von ntfy für den Uhrenabgleich (R-L4). `since` hält Neuverbindungen klein.
- **Alternatives**: Senden über die WebSocket-Verbindung (Sender hat sonst keine Verbindung offen; eingehende Nachrichten zählen ebenfalls als Anfragen); Abruf per `GET` statt WebSocket (keine Live-Anzeige).

## R-N7 Tests

- **Decision**:
  - Gemeinsame, reine Logik in `src/domain/relay-protocol.ts` (Anfrage prüfen, signierter Text, Ordnung "neuer als", Auswahl "10 je Mannschaft", Grabstein-Ablauf): Vitest mit 100 % Branch-Coverage wie alle Domänen-Dateien. Der Worker importiert sie.
  - Worker und Durable Object in `relay/` mit `@cloudflare/vitest-plugin` (führt den Code in der echten Laufzeit `workerd` mit SQLite und WebSockets aus): Annehmen, Ablehnen, Ordnung, Broadcast, `since`, Alarm, `retire`, Obergrenzen. Eigener CI-Schritt.
  - E2E: `tests/e2e/relay.ts` wird zum Nachbau des neuen Dienstes (`context.route` für `POST`, `context.routeWebSocket` für die Verbindung, Playwright ≥ 1.48); die Testhelfer (`sendAs`, `liveStates`, `inject`) behalten ihre Schnittstelle. Der Netzwerk-Wächter lässt statt `ntfy.sh` die Adresse des Dienstes zu.
- **Rationale**: Die Sicherheitslogik liegt testbar in der Domäne; die Laufzeit-Eigenheiten (Hibernation, SQLite) prüft die echte Umgebung, ohne Cloudflare-Konto.
- **Neue Entwicklungs-Abhängigkeiten** (keine Laufzeit-Abhängigkeit der App): `wrangler` (bauen, lokal starten, ausliefern), `@cloudflare/vitest-plugin` (Tests in `workerd`, R-N11), `@cloudflare/workers-types` (Typen). Alle quelloffen und kostenlos; sie liegen in `relay/package.json`, damit das Hauptprojekt schlank bleibt.

## R-N8 Auslieferung und Reihenfolge (FR-N08, FR-N11)

- **Decision**: `deploy.yml` bekommt vor dem Pages-Job einen Job `relay`, der bei jedem Push auf `main` den Worker mit `cloudflare/wrangler-action` ausliefert (Secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, Token nur mit dem Recht "Workers Scripts: Edit"); der Pages-Job wartet darauf. Die Adresse des Dienstes ist nicht geheim und steht fest im Build (`VITE_RELAY_ORIGIN` in `vite.config.ts`, für E2E überschreibbar).
- **Erstes Mal** (Anleitung `docs/cloudflare-einrichten.md`): Atti legt Token und Konto-ID als Secrets an und nennt die `workers.dev`-Subdomain; ein vorbereitender PR liefert den Worker aus, bevor die App umstellt. Der harte Wechsel (App spricht nur noch mit dem Dienst) kommt in einem eigenen PR, an einem Werktag gemergt.
- **Rationale**: So kann die neue App-Version nie vor dem Dienst live sein.

## R-N9 Dashboard der Eltern aktualisiert sich selbst (FR-N09)

- **Decision**: Auf der Seite des Zuschauer-Links ruft die App bei `needRefresh` sofort `updateServiceWorker(true)` auf statt den Update-Hinweis zu zeigen; im Torticker bleibt der Hinweis (`src/ui/components/update-prompt.tsx`).
- **Rationale**: Dort gibt es keine Eingaben; nach dem harten Wechsel sehen Eltern ohne Zutun wieder Stände. Gilt ab dieser Version; wer die alte Version hat, bekommt einmal den Hinweis (Edge Case "Harter Wechsel").

## R-N10 "Letzte Spiele" im Dashboard (US3, FR-N13)

- **Decision**: Das Board behält je Mannschaft neben den Spielen des Spieltags die früheren Spiele (höchstens 10, wie der Dienst); `boardView` liefert zusätzlich `recent` (je Mannschaft, beendet bzw. von früheren Tagen, ohne die Spiele der Karten und "Heute außerdem", neuestes zuerst). Der Block liegt im nachgeladenen Dashboard; Auf- und Zuklappen ist nicht gemerkt (immer zu), der Filter unter `torticker-recent-filter` im `localStorage` (Fehler ignoriert).
- **Rationale**: Die Tageslogik der Karten (FR-L14, FR-L16, Spec 006 R-L21) bleibt unverändert; nur das Verwerfen älterer Tage in `prune` weicht "höchstens 10 je Mannschaft".

## R-N11 Umsetzung PR A (07.11.2026)

- **Testpaket umbenannt**: `@cloudflare/vitest-pool-workers` ist veraltet und heißt jetzt `@cloudflare/vitest-plugin` (Plugin `cloudflareTest`); es unterstützt Vitest 5 wie das Hauptprojekt. `relay/.npmrc` setzt `legacy-peer-deps`, weil npm 10.9 beim Auflösen der Peer-Abhängigkeiten von `wrangler`/`vitest` mit einem internen Fehler abbricht.
- **Typen**: `wrangler types --include-runtime=false` erzeugt `relay/worker-configuration.d.ts` (Bindings, `Env`); die Laufzeit-Typen kommen aus `@cloudflare/workers-types`. Nach Änderungen an `wrangler.toml` neu erzeugen.
- **Rechenzeit**: Die Worker-Tests messen in `workerd` nur Wanduhrzeit; eine ECDSA-Prüfung liegt deutlich unter einer Millisekunde, geprüfte Zertifikate werden gemerkt. Das CPU-Budget im Gratis-Plan bleibt im Gerätetest (D-8) zu beobachten.
