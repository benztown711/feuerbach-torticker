# Cloudflare einrichten (einmalig, für Atti)

Für den eigenen Vermittlungsdienst des Live-Spieltags (Spec 007). Dauer etwa 10 Minuten. Alles bleibt im **Gratis-Plan**: kein Zahlungsmittel hinterlegen, keinen Bezahl-Plan buchen. Bei Überschreiten der Grenzen lehnt Cloudflare Anfragen ab, es entstehen keine Kosten (`specs/007-push-benachrichtigung/research.md` R-N1).

## 1. workers.dev-Subdomain

1. Im Cloudflare-Dashboard links **Workers & Pages** öffnen.
2. Gibt es noch keine Subdomain, fragt Cloudflare beim ersten Mal danach; einen kurzen Namen wählen, z. B. `atti`. Sonst steht sie in der Übersicht (`<name>.workers.dev`).
3. Die Subdomain an Claude schicken. Der Dienst ist danach unter `https://torticker-relay.<name>.workers.dev` erreichbar. Sie ist nicht geheim.

## 2. Account-ID

In **Workers & Pages** steht rechts **Account ID** (32 Zeichen). Kopieren.

## 3. API-Token mit genau einem Recht

1. Oben rechts auf das Profil, **My Profile** → **API Tokens** → **Create Token**.
2. **Create Custom Token** wählen.
3. Name: `torticker-relay GitHub`.
4. Permissions: **Account** → **Workers Scripts** → **Edit**. Sonst nichts.
5. Account Resources: **Include** → dein Konto.
6. Optional: **TTL** leer lassen (unbegrenzt) oder ein Ablaufdatum setzen; bei Ablauf schlägt nur das Ausliefern fehl, der Dienst läuft weiter.
7. **Continue to summary** → **Create Token**. Den Token **jetzt** kopieren, er wird nur einmal angezeigt.

## 4. Beides als Secrets im Repository

Auf GitHub im Repository `benztown711/feuerbach-torticker`: **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

| Name | Wert |
|---|---|
| `CLOUDFLARE_API_TOKEN` | der Token aus Schritt 3 |
| `CLOUDFLARE_ACCOUNT_ID` | die Account-ID aus Schritt 2 |

Den Token nie in den Chat, in Issues oder in Dateien schreiben. Claude braucht ihn nicht; nur GitHub Actions liest ihn.

## 5. Erstes Ausliefern

Beim nächsten Merge auf `main` liefert der Workflow **Deploy** zuerst den Dienst aus (Job `relay`), danach die App. Den Lauf unter **Actions** → **Deploy** prüfen: Job `relay` grün. Ohne Secrets überspringt der Job das Ausliefern mit einem Hinweis.

## Wenn etwas schiefgeht

- **Token verloren oder in falsche Hände geraten**: in Cloudflare unter **API Tokens** den Token löschen (**Roll** oder **Delete**), einen neuen anlegen und das Secret ersetzen. Die App und der Dienst laufen dabei weiter.
- **Dienst abschalten**: in Cloudflare unter **Workers & Pages** den Worker `torticker-relay` löschen. Dann fehlt nur die Live-Anzeige; Erfassen, "Zwischenstand teilen" und "Ergebnis teilen" funktionieren weiter.
- **Nutzung prüfen**: **Workers & Pages** → `torticker-relay` → **Metrics** (Anfragen am Tag; Grenze 100.000).
