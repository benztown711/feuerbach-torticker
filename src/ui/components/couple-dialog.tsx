import { joinList } from '../../domain/format';

interface Props {
  /** Trainer-Link: sendet für alle Mannschaften und darf verwalten; sonst Lead-Link einer Mannschaft. */
  trainer: boolean;
  /** Kurzformen der Mannschaften, z. B. ["Feuerbach E1", "Feuerbach E2"]. */
  teams: string[];
  title: string;
  replace: boolean;
  /** Mannschaften, die noch in "Meine Mannschaften" fehlen. */
  adds: string[];
  /** Titel des Live-Spieltags, für den dieses Gerät Trainer-Handy ist und der verloren ginge. */
  losesOrganizer: string | null;
  busy: boolean;
  onYes: () => void;
  onNo: () => void;
}

/** Spec 006 FR-L03: Rückfrage vor dem Koppeln mit Trainer- oder Lead-Link. */
export function CoupleDialog({ trainer, teams, title, replace, adds, losesOrganizer, busy, onYes, onNo }: Props) {
  const names = joinList(teams);
  return (
    <div class="overlay overlay--bottom">
      <div class="overlay__backdrop" onClick={onNo} />
      <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="couple-title" data-testid="couple-dialog">
        <h2 id="couple-title" class="sheet__title">
          Live senden für {names}?
        </h2>
        <p class="sheet__text">
          Dieses Handy sendet ab jetzt jedes Spiel von <strong>{names}</strong>, das es erfasst, automatisch an „{title}
          “. Eltern sehen Stand, Minute und Torschützen (Vornamen).
        </p>
        {trainer && (
          <p class="sheet__text sheet__text--muted">
            Wie alle Trainer-Handys darf es den Live-Spieltag auch verwalten und die Links weitergeben.
          </p>
        )}
        {trainer && (
          <p class="sheet__text" data-testid="couple-squads">
            Geteilte Kader kommen automatisch mit.
          </p>
        )}
        {adds.length > 0 && (
          <p class="sheet__text sheet__text--muted">
            {joinList(adds)} {adds.length > 1 ? 'werden' : 'wird'} zu „Meine Mannschaften“ hinzugefügt.
          </p>
        )}
        {replace && !losesOrganizer && (
          <p class="hint" data-testid="couple-replace">
            Dieses Handy ist schon mit einem anderen Live-Spieltag gekoppelt. Die alte Kopplung endet.
          </p>
        )}
        {losesOrganizer && (
          <p class="hint" data-testid="couple-replace">
            <strong>Achtung:</strong> Dieses Handy ist Trainer-Handy für „{losesOrganizer}“. Kopplung und Verwaltung
            dafür enden hier. Hat noch niemand den Trainer-Link dafür, teile ihn vorher, sonst kann niemand den
            Live-Spieltag mehr verwalten.
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
