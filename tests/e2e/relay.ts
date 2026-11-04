import type { BrowserContext, Route } from '@playwright/test';

/** Spec 006 R-L8: Nachbau von ntfy.sh für E2E-Tests (nur das, was die App nutzt). */

export const RELAY_ORIGIN = 'https://ntfy.sh';

export interface StoredMessage {
  id: string;
  /** Serverzeit in Sekunden. */
  time: number;
  message: string;
}

const CORS = { 'access-control-allow-origin': '*' };

export class FakeRelay {
  readonly topics = new Map<string, StoredMessage[]>();
  /** Netz weg: alle Anfragen scheitern. */
  fail = false;
  /** Zu viele Verbindungen am Anschluss: Stream-Anfragen bekommen 429, Abfragen (poll=1) gehen. */
  tooMany = false;
  /** Verschiebung der Serveruhr (ms), z. B. um eine falsch gehende Uhr zu prüfen. */
  offsetMs = 0;
  private seq = 0;

  now(): number {
    return Math.floor((Date.now() + this.offsetMs) / 1000);
  }

  messages(topic: string): StoredMessage[] {
    return this.topics.get(topic) ?? [];
  }

  /** Alle Meldungen aller Topics (für Tests mit nur einem Live-Spieltag). */
  all(): StoredMessage[] {
    return [...this.topics.values()].flat();
  }

  /** Legt eine Meldung direkt ab (z. B. eine gefälschte). */
  inject(topic: string, message: string): StoredMessage {
    const m = { id: `m${++this.seq}`, time: this.now(), message };
    this.topics.set(topic, [...this.messages(topic), m]);
    return m;
  }

  async attach(context: BrowserContext): Promise<void> {
    await context.route(`${RELAY_ORIGIN}/**`, (route) => this.handle(route));
  }

  private async handle(route: Route): Promise<void> {
    const req = route.request();
    if (this.fail) return route.abort('internetdisconnected');
    const url = new URL(req.url());
    const parts = url.pathname.split('/').filter(Boolean);
    const topic = parts[0] ?? '';
    if (req.method() === 'OPTIONS') {
      return route.fulfill({
        status: 204,
        headers: { ...CORS, 'access-control-allow-methods': 'GET, POST', 'access-control-allow-headers': '*' },
      });
    }
    if (req.method() === 'POST' && parts.length === 1) {
      const m = this.inject(topic, req.postData() ?? '');
      return route.fulfill({
        status: 200,
        headers: { ...CORS, 'content-type': 'application/json' },
        body: JSON.stringify({ ...m, event: 'message', topic }),
      });
    }
    if (req.method() === 'GET' && parts[1] === 'json') {
      const poll = url.searchParams.get('poll') === '1';
      if (this.tooMany && !poll) return route.fulfill({ status: 429, headers: CORS, body: '{"code":42901}' });
      const since = url.searchParams.get('since') ?? 'all';
      const list = this.messages(topic);
      const idx = list.findIndex((m) => m.id === since);
      const fresh = idx >= 0 ? list.slice(idx + 1) : list;
      const lines = [
        ...(poll ? [] : [{ id: `o${++this.seq}`, time: this.now(), event: 'open', topic }]),
        ...fresh.map((m) => ({ ...m, event: 'message', topic })),
      ];
      return route.fulfill({
        status: 200,
        headers: { ...CORS, 'content-type': 'application/x-ndjson' },
        body: lines.map((l) => JSON.stringify(l)).join('\n') + '\n',
      });
    }
    return route.fulfill({ status: 404, headers: CORS, body: '{}' });
  }
}
