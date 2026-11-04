/**
 * Spec 009 FR-H16: Leiste der Eltern-Ansicht (Zuschauer-Link), gebaut wie die Leiste der App (FR-037):
 * "Spieltag" (Dashboard), "Teilen" (Zuschauer-Link, FR-H17) und "Hilfe" (nur Einträge für Eltern).
 */
export function ViewerNav({
  active,
  base,
  onShare,
}: {
  active: 'dash' | 'help';
  /** `/live/<Daten>` */
  base: string;
  onShare: () => void;
}) {
  const current = (tab: 'dash' | 'help') => (active === tab ? { 'aria-current': 'page' as const } : {});
  return (
    <nav class="nav" aria-label="Spieltag-Menü" data-testid="viewer-nav">
      <a class="nav__item" href={`#${base}`} data-testid="viewer-nav-dash" {...current('dash')}>
        <svg class="nav__icon" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 4h16v7H4zM4 14h16v6H4z" />
        </svg>
        <span>Spieltag</span>
      </a>
      <button type="button" class="nav__item nav__item--button" data-testid="viewer-nav-share" onClick={onShare}>
        <svg class="nav__icon" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3v12M8 7l4-4 4 4M6 11H4v10h16V11h-2" />
        </svg>
        <span>Teilen</span>
      </button>
      <a class="nav__item" href={`#${base}/hilfe`} data-testid="viewer-nav-help" {...current('help')}>
        <svg class="nav__icon" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.6v.6M12 17.5h.01" />
        </svg>
        <span>Hilfe</span>
      </a>
    </nav>
  );
}
