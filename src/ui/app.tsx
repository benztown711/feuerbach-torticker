const base = import.meta.env.BASE_URL;

export function App() {
  return (
    <main class="start">
      <h1 class="start__bar t-kopfzeile">TORTICKER</h1>
      <img
        class="start__wappen"
        src={`${base}brand/wappen.svg`}
        alt="Wappen der Sportvg Feuerbach"
        width={84}
        height={100}
      />
      <p class="start__verein t-zwischentitel">Sportvg Feuerbach</p>
      <p class="start__hinweis t-text" data-testid="status-hint">
        In Arbeit: Hier entsteht der Ergebnis-Tracker für unsere Spiele.
      </p>
    </main>
  );
}
