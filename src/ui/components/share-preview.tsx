import { shareBlocks } from '../../domain/share-text';

/** Spec 005 FR-S07: Vorschau des Teilen-Texts wie in WhatsApp (fett, Tabelle in Festbreitenschrift). */
export function SharePreview({ text }: { text: string }) {
  return (
    <div class="share-preview" data-testid="share-preview">
      {shareBlocks(text).map((b, i) =>
        b.kind === 'mono' ? (
          <pre key={i} class="share-preview__mono">
            {b.lines.join('\n')}
          </pre>
        ) : b.bold ? (
          <strong key={i} class="share-preview__line">
            {b.text}
          </strong>
        ) : (
          <span key={i} class="share-preview__line">
            {b.text || ' '}
          </span>
        ),
      )}
    </div>
  );
}
