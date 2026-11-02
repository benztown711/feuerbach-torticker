import { test as base, expect } from '@playwright/test';

export interface Recorded {
  shares: { text?: string; title?: string; files?: number }[];
  sounds: number;
  vibrations: number;
  keepAlive: boolean;
}

/**
 * Gemeinsame E2E-Fixture:
 * - Netzwerk-Wächter: jeder Request außerhalb der eigenen Origin lässt den Test scheitern (Constitution III).
 * - Mocks für navigator.share, Audio-Wiedergabe (HTMLMediaElement.play) und navigator.vibrate mit Aufzeichnung (window.__rec).
 * - page.clock ist installiert, Tests können per page.clock.fastForward vorspulen.
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
    await page.clock.install();
    await page.addInitScript(() => {
      const rec = { shares: [] as unknown[], sounds: 0, vibrations: 0, blockAudio: false, keepAlive: false };
      (window as unknown as { __rec: typeof rec }).__rec = rec;
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: async (data: { text?: string; title?: string; files?: File[] }) => {
          rec.shares.push({ text: data.text, title: data.title, files: data.files?.length });
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
