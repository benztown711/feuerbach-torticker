import type { ComponentChildren } from 'preact';

interface Props {
  title: string;
  subtitle?: string;
  testId: string;
  onClose: () => void;
  children: ComponentChildren;
}

/** Aktionsblatt am unteren Rand (Menü "…", Tor-Aktionen). */
export function Sheet({ title, subtitle, testId, onClose, children }: Props) {
  return (
    <div class="overlay overlay--bottom">
      <div class="overlay__backdrop" onClick={onClose} />
      <div class="sheet" role="dialog" aria-modal="true" aria-labelledby={`${testId}-title`} data-testid={testId}>
        <h2 id={`${testId}-title`} class="sheet__title">
          {title}
        </h2>
        {subtitle && <p class="sheet__subtitle">{subtitle}</p>}
        {children}
        <button type="button" class="btn btn--quiet" onClick={onClose}>
          Schließen
        </button>
      </div>
    </div>
  );
}
