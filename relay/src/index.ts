import { objectName } from '../../src/domain/relay-protocol';
import { Spieltag, NAME_HEADER } from './spieltag';

/**
 * Spec 007 research.md R-N2, R-N6: Worker des eigenen Vermittlungsdienstes. Prüft Pfad und Herkunft und leitet
 * an das Durable Object des Live-Spieltags weiter (Name `<topic>.<orgPub>`, R-N4).
 */

export { Spieltag };

// `Env` (Bindings aus wrangler.toml) erzeugt `wrangler types` in worker-configuration.d.ts.

const PATH = /^\/v1\/([A-Za-z0-9_-]+)\/([A-Za-z0-9_-]+)(\/ws)?$/;

const allowed = (env: Env, origin: string | null): boolean =>
  origin !== null &&
  env.ALLOWED_ORIGINS.split(',')
    .map((o) => o.trim())
    .includes(origin);

function withCors(res: Response, origin: string): Response {
  // WebSocket-Antworten (101) bleiben unverändert.
  if (res.status === 101) return res;
  const out = new Response(res.body, res);
  out.headers.set('access-control-allow-origin', origin);
  out.headers.set('vary', 'Origin');
  return out;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    const match = PATH.exec(url.pathname);
    const name = match ? objectName(match[1], match[2]) : null;
    if (!match || !name) return new Response('Nicht gefunden', { status: 404 });
    if (!allowed(env, origin)) return new Response('Herkunft nicht erlaubt', { status: 403 });
    const from = origin as string;
    const ws = match[3] === '/ws';
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'access-control-allow-origin': from,
          'access-control-allow-methods': 'POST, GET, OPTIONS',
          'access-control-allow-headers': 'content-type',
          'access-control-max-age': '86400',
          vary: 'Origin',
        },
      });
    }
    if (ws ? request.method !== 'GET' : request.method !== 'POST')
      return withCors(new Response('Methode nicht erlaubt', { status: 405 }), from);
    if (ws && request.headers.get('Upgrade')?.toLowerCase() !== 'websocket')
      return withCors(new Response('WebSocket erwartet', { status: 426 }), from);
    const stub = env.SPIELTAG.get(env.SPIELTAG.idFromName(name));
    const forwarded = new Request(request);
    forwarded.headers.set(NAME_HEADER, name);
    return withCors(await stub.fetch(forwarded), from);
  },
} satisfies ExportedHandler<Env>;
