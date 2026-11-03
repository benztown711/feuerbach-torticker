import { test as base, expect, type Page } from '@playwright/test';

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

export interface Recorded {
  shares: { text?: string; title?: string; files?: number; fileName?: string; fileText?: string }[];
  sounds: number;
  vibrations: number;
  keepAlive: boolean;
}

/**
 * Gemeinsame E2E-Fixture:
 * - Netzwerk-Wächter: jeder Request außerhalb der eigenen Origin lässt den Test scheitern (Constitution III).
 * - Mocks für navigator.share, Audio-Wiedergabe (HTMLMediaElement.play) und navigator.vibrate mit Aufzeichnung (window.__rec).
 * - page.clock ist installiert, Tests können per page.clock.fastForward vorspulen.
 * - page.goto und page.reload warten zuerst auf offene Schreibvorgänge (flushWrites), damit ein Test
 *   nichts prüft, was der Browser beim Neuladen verworfen hat.
 */
export const test = base.extend<{ foreignRequests: string[]; recorded: () => Promise<Recorded> }>({
  foreignRequests: [
    async ({ page, baseURL }, use) => {
      const origin = new URL(baseURL ?? 'http://localhost').origin;
      const foreign: string[] = [];
      page.on('request', (req) => {
        const url = req.url();
        if (url.startsWith('data:') || url.startsWith('blob:')) return;
        if (new URL(url).origin !== origin) foreign.push(url);
      });
      await use(foreign);
      expect(foreign, 'Requests an Drittanbieter (Constitution III)').toEqual([]);
    },
    { auto: true },
  ],
  page: async ({ page }, use) => {
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
    await page.clock.install();
    await page.addInitScript(() => {
      const rec = { shares: [] as unknown[], sounds: 0, vibrations: 0, blockAudio: false, keepAlive: false };
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
        if (!this.muted && !this.hasAttribute('data-keepalive')) rec.sounds++;
        if (this.hasAttribute('data-keepalive')) rec.keepAlive = true;
        return Promise.resolve();
      };
      HTMLMediaElement.prototype.pause = function (this: HTMLMediaElement) {
        if (this.hasAttribute('data-keepalive')) rec.keepAlive = false;
      };
    });
    await use(page);
  },
  recorded: async ({ page }, use) => {
    await use(() => page.evaluate(() => (window as unknown as { __rec: Recorded }).__rec));
  },
});

export { expect };
