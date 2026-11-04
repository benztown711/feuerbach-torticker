import { shortTeamName } from '../../domain/team-name';
import type { LeadCert } from '../../domain/types';

interface Props {
  cert: LeadCert;
  title: string;
  replace: boolean;
  /** Mannschaft fehlt noch in "Meine Mannschaften". */
  addsTeam: boolean;
  /** Titel des Live-Spieltags, den dieses Gerät organisiert und der verloren ginge. */
  losesOrganizer: string | null;
  busy: boolean;
  onYes: () => void;
  onNo: () => void;
}

/** Spec 006 FR-L03: Rückfrage vor dem Koppeln als Lead-Handy. */
export function CoupleDialog({ cert, title, replace, addsTeam, losesOrganizer, busy, onYes, onNo }: Props) {
  const team = shortTeamName(cert.name);
  return (
    <div class="overlay overlay--bottom">
      <div class="overlay__backdrop" onClick={onNo} />
      <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="couple-title" data-testid="couple-dialog">
        <h2 id="couple-title" class="sheet__title">
          Live senden für {team}?
        </h2>
        <p class="sheet__text">
          Dieses Handy sendet ab jetzt alle Spiele von <strong>{team}</strong> automatisch an „{title}“. Eltern sehen
          Stand, Minute und Torschützen (Vornamen).
        </p>
        {addsTeam && <p class="sheet__text sheet__text--muted">{team} wird zu „Meine Mannschaften“ hinzugefügt.</p>}
        {replace && !losesOrganizer && (
          <p class="hint" data-testid="couple-replace">
            Dieses Handy ist schon mit einem anderen Live-Spieltag gekoppelt. Die alte Kopplung endet.
          </p>
        )}
        {losesOrganizer && (
          <p class="hint" data-testid="couple-replace">
            <strong>Achtung:</strong> Du organisierst „{losesOrganizer}“. Diese Rolle und alle Lead-Links dafür gehen
            auf diesem Handy verloren.
          </p>
        )}
        <button type="button" class="btn btn--primary" data-testid="couple-yes" disabled={busy} onClick={onYes}>
          Ja, live senden
        </button>
        <button type="button" class="btn btn--secondary" data-testid="couple-no" onClick={onNo}>
          Abbrechen
        </button>
      </div>
    </div>
  );
}
