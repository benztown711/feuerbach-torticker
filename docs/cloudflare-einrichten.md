# Cloudflare einrichten (einmalig, für Atti)

**Stand**: eingerichtet am 07.11.2026. Subdomain `sportvg-feuerbach.workers.dev`, der Dienst läuft unter `https://torticker-relay.sportvg-feuerbach.workers.dev`. Die Schritte unten braucht es erst wieder bei einem neuen Konto oder Token.

Für den eigenen Vermittlungsdienst des Live-Spieltags (Spec 007). Dauer etwa 10 Minuten. Alles bleibt im **Gratis-Plan**: kein Zahlungsmittel hinterlegen, keinen Bezahl-Plan buchen. Bei Überschreiten der Grenzen lehnt Cloudflare Anfragen ab, es entstehen keine Kosten (`specs/007-push-benachrichtigung/research.md` R-N1).

## 1. workers.dev-Subdomain

1. Im Cloudflare-Dashboard links **Workers & Pages** öffnen.
2. Gibt es noch keine Subdomain, fragt Cloudflare beim ersten Mal danach; einen kurzen Namen wählen, z. B. `atti`. Sonst steht sie in der Übersicht (`<name>.workers.dev`).
3. Die Subdomain an Claude schicken. Der Dienst ist danach unter `https://torticker-relay.<name>.workers.dev` erreichbar. Sie ist nicht geheim.

## 2. Account-ID

In **Workers & Pages** steht rechts **Account ID** (32 Zeichen). Kopieren.

## 3. API-Token mit genau einem Recht

1. Oben rechts auf das Personen-Symbol, **Profile** → **API Tokens** → **Create Token**.
2. Token name: `torticker-relay GitHub`.
3. Unter **Policies** auf **Start from scratch** (Custom) und dann **Start with an Account policy**.
4. Account: dein Konto. Permissions: **Workers Scripts** mit **Edit** (je nach Oberfläche „Write“). Sonst nichts.
5. IP-Filter leer lassen. Ablaufdatum (TTL) leer lassen (unbegrenzt) oder setzen; bei Ablauf schlägt nur das Ausliefern fehl, der Dienst läuft weiter.
6. **Continue to summary** bzw. **Create token**. Den Token **jetzt** kopieren, er wird nur einmal angezeigt.

Der Token lässt sich nicht auf einen einzelnen Worker beschränken: Er darf alle Worker des Kontos ändern. Er liegt nur in den GitHub-Secrets und wird nur beim Ausliefern benutzt.

## 4. Beides als Secrets im Repository

Auf GitHub im Repository `benztown711/feuerbach-torticker`: **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

| Name | Wert |
|---|---|
| `CLOUDFLARE_API_TOKEN` | der Token aus Schritt 3 |
| `CLOUDFLARE_ACCOUNT_ID` | die Account-ID aus Schritt 2 |

Reiter **Secrets**, Abschnitt **Repository secrets** (nicht Variables, nicht Environment secrets). Die Account-ID genau mit ihren 32 Zeichen eintragen, ohne Leerzeichen oder Zeilenumbruch, am besten über das Kopier-Symbol in Cloudflare; sonst bricht das Ausliefern mit „Invalid account ID“ ab.

Den Token nie in den Chat, in Issues oder in Dateien schreiben. Claude braucht ihn nicht; nur GitHub Actions liest ihn.

## 5. Erstes Ausliefern

Beim nächsten Merge auf `main` liefert der Workflow **Deploy** zuerst den Dienst aus (Job `relay`), danach die App. Sofort geht es unter **Actions** → **Deploy** → **Run workflow** (Branch `main`). Den Lauf prüfen: Job `relay` grün. Ohne Secrets überspringt der Job das Ausliefern mit einem Hinweis; schlägt er fehl, wird auch die App nicht neu ausgeliefert (die bisherige Version bleibt online).

## Wenn etwas schiefgeht

- **Token verloren oder in falsche Hände geraten**: in Cloudflare unter **API Tokens** den Token löschen (**Roll** oder **Delete**), einen neuen anlegen und das Secret ersetzen. Die App und der Dienst laufen dabei weiter.
- **Dienst abschalten**: in Cloudflare unter **Workers & Pages** den Worker `torticker-relay` löschen. Dann fehlt nur die Live-Anzeige; Erfassen, "Zwischenstand teilen" und "Ergebnis teilen" funktionieren weiter.
- **Nutzung prüfen**: **Workers & Pages** → `torticker-relay` → **Metrics** (Anfragen am Tag; Grenze 100.000).
