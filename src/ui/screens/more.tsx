/** "Mehr" (FR-037): seltener genutzte Bereiche gesammelt. */
export function MoreScreen() {
  const items = [
    { href: '#/kader', testId: 'more-roster', title: 'Kader', text: 'Spieler, Liste einfügen, Kader teilen' },
    {
      href: '#/einstellungen',
      testId: 'more-settings',
      title: 'Einstellungen',
      text: 'Darstellung, Mannschaftsnamen, Sicherung',
    },
    { href: '#/hilfe', testId: 'more-help', title: 'Hilfe', text: 'Tipps für das iPhone am Spielfeldrand' },
  ];
  return (
    <main class="page">
      <header class="topbar">
        <h1 class="topbar__title t-zwischentitel">Mehr</h1>
      </header>
      <ul class="menu-list card card--list" data-testid="more-menu">
        {items.map((i) => (
          <li key={i.href}>
            <a class="menu-list__item" href={i.href} data-testid={i.testId}>
              <span class="menu-list__text-group">
                <span class="menu-list__title">{i.title}</span>
                <span class="menu-list__text">{i.text}</span>
              </span>
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" class="icon menu-list__chevron">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
