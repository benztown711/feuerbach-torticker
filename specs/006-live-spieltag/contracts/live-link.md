# Vertrag: Zuschauer-, Trainer- und Lead-Link (Spec 006)

Beide Links zeigen auf die App; alle Daten stehen im Fragment und gehen nie an GitHub Pages oder ntfy.sh.

```text
https://benztown711.github.io/feuerbach-torticker/#/live/<Daten>
https://benztown711.github.io/feuerbach-torticker/#/trainer/<Daten>
https://benztown711.github.io/feuerbach-torticker/#/lead/<Daten>   (erste Version, wird nicht mehr erzeugt)
```

`<Daten>` = base64url (ohne `=`) eines UTF-8-JSON-Objekts. Unbekannte Felder werden ignoriert, fehlende oder falsch typisierte Pflichtfelder machen den Link ungültig ("Dieser Link ist unvollständig. Bitte den Link erneut kopieren.").

## Zuschauer-Link (FR-L02, FR-L16)

```json
{ "v": 1, "t": "<topic, 22 Zeichen [A-Za-z0-9_-]>", "k": "<viewKey, 43 Zeichen>", "o": "<orgPub, 87 Zeichen>", "n": "Unser Spieltag" }
```

`n` ist der Titel beim Erzeugen (Anzeige, bis eine signierte Konfiguration eintrifft). Länge des Links etwa 260 Zeichen.

## Trainer-Link (FR-L02, FR-L03, research.md R-L13)

```json
{
  "v": 1, "t": "…", "k": "…", "o": "…", "n": "Unser Spieltag",
  "q": { "d": "…", "x": "…", "y": "…" },
  "g": { "d": "<JSON LiveConfig>", "s": "<Signatur>" },
  "m": [["E1", "Sportvg Feuerbach E1", "rot", "schwarz"], ["E2", "Sportvg Feuerbach E2", "rot", "weiss"]]
}
```

- `q`: privater Organisator-Schlüssel als JWK-Teile (P-256).
- `g`: jüngste Konfiguration (Titel, Mannschaften), signiert vom Organisator.
- `m`: 1 bis 6 Mannschaften: Kurzlabel, Name (höchstens 40 Zeichen), Heim- und Auswärtstrikot (Palette).
- Beim Einfügen prüft die App die Signatur von `g` mit `o`, ob `q` zu `o` gehört und ob mindestens eine Mannschaft aus `m` in der Konfiguration steht; sonst "Dieser Trainer-Link ist nicht gültig." Es zählen nur Mannschaften, die in der Konfiguration stehen.
- Länge etwa 1.000 Zeichen (zwei Mannschaften).

## Lead-Link (erste Version, FR-L03)

Wird nicht mehr erzeugt; bereits verteilte Lead-Links bleiben gültig und lassen sich weiter einfügen.

```json
{
  "v": 1, "t": "…", "k": "…", "o": "…", "n": "Unser Spieltag",
  "c": { "d": "<JSON LeadCert>", "s": "<Signatur>" },
  "p": { "d": "…", "x": "…", "y": "…" },
  "g": { "d": "<JSON LiveConfig>", "s": "<Signatur>" }
}
```

- `c`: vom Organisator signiertes Lead-Zertifikat (Mannschaft, Kurzlabel, Trikots, öffentlicher Lead-Schlüssel).
- `p`: privater Lead-Schlüssel als JWK-Teile (P-256).
- `g`: jüngste Konfiguration (Titel, Mannschaften), signiert vom Organisator; das Lead-Handy hängt sie an seine Meldungen.
- Beim Einfügen prüft die App die Signatur von `c` mit `o`; ungültig → "Dieser Lead-Link ist nicht gültig."
- Länge etwa 1.100 Zeichen.

## Erkennen beim Einfügen

Das Eingabefeld akzeptiert den ganzen Link oder nur den Teil ab `#/live/`, `#/trainer/` bzw. `#/lead/`, auch mit Leerzeichen oder Zeilenumbrüchen davor und danach (WhatsApp hängt gelegentlich Text an).
