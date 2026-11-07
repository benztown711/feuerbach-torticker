import type { LiveSnapshot } from '../domain/live-snapshot';
import type { GameWrite, RelayDraft } from '../domain/relay-protocol';
import type { LiveSpieltag, LiveTeamCred } from '../domain/types';
import { groupOf, signWrite, slotOf } from './live-crypto';
import { publish } from './relay';

/**
 * Spec 007 research.md R-N3, R-N4: Schreibanfragen an den eigenen Dienst bauen, signieren und senden. Ordnungsangaben
 * (`slot`, `group`, `h`, `at`, `gone`) kommen aus dem Live-Stand; `slot` und `group` sind HMAC-Kennungen, aus denen der
 * Dienst ohne Zuschauer-Link weder Mannschaft noch Spiel ablesen kann.
 */

type Target = Pick<LiveSpieltag, 'topic' | 'orgPub'>;
const nameOf = (t: Target): string => `${t.topic}.${t.orgPub}`;

/**
 * Live-Stand eines Spiels. Trainer-Handys signieren mit dem Organisator-Schlüssel und schicken kein Zertifikat, denn
 * es nennt Mannschaft und Trikotfarben im Klartext (FR-N05). Ein Handy mit Lead-Link (ohne Organisator-Schlüssel)
 * signiert mit dem Lead-Schlüssel und legt das Zertifikat bei.
 */
export async function gameWrite(
  live: Target & Pick<LiveSpieltag, 'viewKey' | 'orgKey'>,
  team: Pick<LiveTeamCred, 'leadKey' | 'cert'>,
  snap: LiveSnapshot,
  body: string,
): Promise<GameWrite> {
  const draft = {
    kind: 'game' as const,
    slot: await slotOf(live.viewKey, snap.team, snap.gameId),
    group: await groupOf(live.viewKey, snap.team),
    h: snap.h,
    at: snap.sentAt,
    gone: snap.state !== 'live',
    body,
  };
  if (live.orgKey) return { ...draft, sig: await signWrite(live.orgKey, nameOf(live), draft) };
  return { ...draft, sig: await signWrite(team.leadKey, nameOf(live), draft), cert: team.cert };
}

/** Sendet einen Live-Stand; true, wenn nichts mehr zu tun ist (relay.ts `publish`). */
export async function sendGame(
  live: Target & Pick<LiveSpieltag, 'viewKey' | 'orgKey'>,
  team: Pick<LiveTeamCred, 'leadKey' | 'cert'>,
  snap: LiveSnapshot,
  body: string,
): Promise<boolean> {
  return publish(live, await gameWrite(live, team, snap, body));
}

type OrgDraft = Exclude<RelayDraft, { kind: 'game' }>;

/**
 * Konfiguration, Plan-Meldung oder "neu ausgestellt", signiert mit dem Organisator-Schlüssel. Ohne ihn (Lead-Handy)
 * kann das Handy so etwas nicht senden: false.
 */
export async function sendOrg(live: Target & Pick<LiveSpieltag, 'orgKey'>, draft: OrgDraft): Promise<boolean> {
  if (!live.orgKey) return false;
  return publish(live, { ...draft, sig: await signWrite(live.orgKey, nameOf(live), draft) });
}
