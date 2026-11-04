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
    {
      href: '#/live-spieltag',
      testId: 'more-live',
      title: 'Live-Spieltag',
      text: 'Dashboard für Eltern, Lead-Handys',
    },
    { href: '#/hilfe', testId: 'more-help', title: 'Hilfe', text: 'Tipps für das iPhone am Spielfeldrand' },
  ];
  return (
    <main class="page">
      <header class="topbar">
        <h1 class="topbar__title t-zwischentitel">Mehr</h1>
      </header>
      <ul class="menu-list">
        {items.map((i) => (
          <li key={i.href}>
            <a class="menu-list__item" href={i.href} data-testid={i.testId}>
              <span class="menu-list__title">{i.title}</span>
              <span class="menu-list__text">{i.text}</span>
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
