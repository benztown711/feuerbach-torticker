import { test as base, expect, type Browser, type BrowserContext, type Page, type TestInfo } from '@playwright/test';
import { FakeRelay, RELAY_ORIGIN } from './relay';

/**
 * Wartet, bis alle Schreibvorgänge der App in IndexedDB abgeschlossen sind.
 *
 * Die App schreibt jede Änderung sofort, wartet aber nicht auf das Ende (FR-010). Lädt ein Test direkt
 * danach neu oder navigiert auf eine andere Seite, bricht der Browser die noch offene Transaktion ab.
 * Eine readwrite-Transaktion über alle Stores startet erst, wenn alle vorher erzeugten
 * readwrite-Transaktionen mit überlappendem Bereich fertig sind; ihr Abschluss bedeutet also: alles
 * davor ist gespeichert. Existiert die Datenbank noch nicht, wird sie hier nicht angelegt.
 */
export async function flushWrites(page: Page): Promise<void> {
  if (!page.url().startsWith('http')) return;
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('torticker');
        open.onupgradeneeded = () => open.transaction?.abort();
        open.onerror = () => (open.error?.name === 'AbortError' ? resolve() : reject(open.error));
        open.onsuccess = () => {
          const db = open.result;
          const stores = Array.from(db.objectStoreNames);
          if (stores.length === 0) {
            db.close();
            resolve();
            return;
          }
          const tx = db.transaction(stores, 'readwrite');
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
  );
}

/** page.goto und page.reload warten zuerst auf offene Schreibvorgänge. */
function wrapNavigation(page: Page): void {
  const goto = page.goto.bind(page);
  const reload = page.reload.bind(page);
  page.goto = async (...args: Parameters<Page['goto']>) => {
    await flushWrites(page);
    return goto(...args);
  };
  page.reload = async (...args: Parameters<Page['reload']>) => {
    await flushWrites(page);
    return reload(...args);
  };
}

/**
 * Kontext mit denselben Geräteeinstellungen wie das Projekt (Viewport, Touch, Sprache, Zeitzone).
 * Service Worker sind blockiert: WebKit leitet Anfragen, die über den Service Worker laufen, nicht durch
 * `context.route` (Playwright-Doku "Service Workers"), sie gingen sonst am Relay-Nachbau vorbei.
 */
async function newDeviceContext(browser: Browser, testInfo: TestInfo, baseURL?: string): Promise<BrowserContext> {
  const u = testInfo.project.use;
  return browser.newContext({
    baseURL,
    serviceWorkers: 'block',
    viewport: u.viewport,
    userAgent: u.userAgent,
    deviceScaleFactor: u.deviceScaleFactor,
    isMobile: u.isMobile,
    hasTouch: u.hasTouch,
    locale: u.locale,
    timezoneId: u.timezoneId,
  });
}

export interface Recorded {
  shares: { text?: string; title?: string; files?: number; fileName?: string; fileText?: string }[];
  clipboard?: string;
  /** Spec 012: Lesen der Zwischenablage abgelehnt (simuliert) und Anzahl der Leseversuche. */
  clipboardBlocked?: boolean;
  clipboardReads?: number;
  sounds: number;
  /** Spec 008: Ton (`data-sound`) des zuletzt hörbar gestarteten Signals. */
  lastSound?: string;
  vibrations: number;
  keepAlive: boolean;
}

/** Mocks für Teilen, Vibration und Audio sowie die Fake-Uhr (für jede Seite, auch weitere "Handys"). */
export async function installMocks(page: Page): Promise<void> {
  await page.clock.install();
  await page.addInitScript(() => {
    const rec = {
      shares: [] as unknown[],
      sounds: 0,
      lastSound: undefined as string | undefined,
      vibrations: 0,
      blockAudio: false,
      keepAlive: false,
    };
    (window as unknown as { __rec: typeof rec }).__rec = rec;
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (data: { text?: string; title?: string; files?: File[] }) => {
        const file = data.files?.[0];
        rec.shares.push({
          text: data.text,
          title: data.title,
          files: data.files?.length,
          fileName: file?.name,
          fileText: file ? await file.text() : undefined,
        });
      },
    });
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
    // Spec 006: Zwischenablage aufzeichnen ("Link kopieren"); Spec 012: lesen, `clipboardBlocked` simuliert Ablehnung.
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          (rec as { clipboard?: string }).clipboard = text;
        },
        readText: async () => {
          const r = rec as { clipboard?: string; clipboardBlocked?: boolean; clipboardReads?: number };
          r.clipboardReads = (r.clipboardReads ?? 0) + 1;
          if (r.clipboardBlocked) throw new DOMException('blocked', 'NotAllowedError');
          return r.clipboard ?? '';
        },
      },
    });
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      value: () => {
        rec.vibrations++;
        return true;
      },
    });
    // Signal läuft über ein Audio-Element (R-18). Hörbare Starts zählen; blockAudio simuliert die iOS-Sperre.
    HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
      if (rec.blockAudio) return Promise.reject(new DOMException('blocked', 'NotAllowedError'));
      if (!this.muted && !this.hasAttribute('data-keepalive')) {
        rec.sounds++;
        rec.lastSound = this.dataset.sound;
      }
      if (this.hasAttribute('data-keepalive')) rec.keepAlive = true;
      return Promise.resolve();
    };
    HTMLMediaElement.prototype.pause = function (this: HTMLMediaElement) {
      if (this.hasAttribute('data-keepalive')) rec.keepAlive = false;
    };
  });
}

/** Netzwerk-Wächter: jeder Request außerhalb der eigenen Origin (und der erlaubten) wird gesammelt. */
export function guardRequests(page: Page, origin: string, foreign: string[], allowed: Set<string>): void {
  page.on('request', (req) => {
    const url = req.url();
    if (url.startsWith('data:') || url.startsWith('blob:')) return;
    const o = new URL(url).origin;
    if (o !== origin && !allowed.has(o)) foreign.push(url);
  });
}

/**
 * Gemeinsame E2E-Fixture:
 * - Netzwerk-Wächter: jeder Request außerhalb der eigenen Origin lässt den Test scheitern (Constitution III).
 * - Mocks für navigator.share, Audio-Wiedergabe (HTMLMediaElement.play) und navigator.vibrate mit Aufzeichnung (window.__rec).
 * - page.clock ist installiert, Tests können per page.clock.fastForward vorspulen.
 * - page.goto und page.reload warten zuerst auf offene Schreibvorgänge (flushWrites), damit ein Test
 *   nichts prüft, was der Browser beim Neuladen verworfen hat.
 */
export const test = base.extend<{
  foreignRequests: string[];
  allowedOrigins: Set<string>;
  recorded: () => Promise<Recorded>;
  relay: FakeRelay;
  newDevice: () => Promise<Page>;
}>({
  // eslint-disable-next-line no-empty-pattern -- Playwright verlangt das Objektmuster für Fixtures ohne Abhängigkeit
  allowedOrigins: async ({}, use) => {
    await use(new Set<string>());
  },
  foreignRequests: [
    async ({ page, baseURL, allowedOrigins }, use) => {
      const origin = new URL(baseURL ?? 'http://localhost').origin;
      const foreign: string[] = [];
      guardRequests(page, origin, foreign, allowedOrigins);
      await use(foreign);
      expect(foreign, 'Requests an Drittanbieter (Constitution III)').toEqual([]);
    },
    { auto: true },
  ],
  /**
   * Spec 006 R-L8: Nachbau von ntfy.sh; nur Tests mit dieser Fixture dürfen ntfy.sh erreichen.
   * Verlangt `test.use({ serviceWorkers: 'block' })`, sonst umgehen Anfragen in WebKit den Nachbau.
   */
  relay: async ({ context, allowedOrigins, serviceWorkers }, use) => {
    if (serviceWorkers !== 'block') throw new Error("Fixture relay braucht test.use({ serviceWorkers: 'block' })");
    const relay = new FakeRelay();
    allowedOrigins.add(RELAY_ORIGIN);
    await relay.attach(context);
    await use(relay);
  },
  /** Weiteres "Handy": eigener Browser-Kontext (eigene Daten) mit denselben Mocks, Wächter und Relay. */
  newDevice: async ({ browser, baseURL, allowedOrigins, relay }, use, testInfo) => {
    const contexts: BrowserContext[] = [];
    const foreign: string[] = [];
    const origin = new URL(baseURL ?? 'http://localhost').origin;
    await use(async () => {
      const context = await newDeviceContext(browser, testInfo, baseURL);
      contexts.push(context);
      await relay.attach(context);
      const page = await context.newPage();
      guardRequests(page, origin, foreign, allowedOrigins);
      await installMocks(page);
      wrapNavigation(page);
      return page;
    });
    for (const c of contexts) await c.close();
    expect(foreign, 'Requests an Drittanbieter (Constitution III)').toEqual([]);
  },
  page: async ({ page }, use) => {
    wrapNavigation(page);
    await installMocks(page);
    await use(page);
  },
  recorded: async ({ page }, use) => {
    await use(() => page.evaluate(() => (window as unknown as { __rec: Recorded }).__rec));
  },
});

export { expect };
