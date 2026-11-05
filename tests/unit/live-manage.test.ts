import { describe, expect, it } from 'vitest';
import {
  addableTeams,
  addLiveTeam,
  adoptConfig,
  checkTitle,
  removeLiveTeam,
  renameSpieltag,
  reissueSpieltag,
  restoreLive,
} from '../../src/domain/live-manage';
import { configOf, createSpieltag, parseConfig, type LiveDeps } from '../../src/domain/live-spieltag';
import { defaultSettings } from '../../src/domain/settings';
import type { LiveConfig, LiveSpieltag, PrivateKeyParts, Settings, SignedData, Team } from '../../src/domain/types';

const T0 = Date.UTC(2026, 10, 7, 9, 0, 0);
const B43 = 'A'.repeat(42) + 'Q';
const pubOf = (n: number): string => `${'C'.repeat(84)}${String(n).padStart(2, '0')}A`;

const team = (id: string, name: string, homeColor = 'rot', awayColor = 'schwarz'): Team => ({
  id,
  name,
  homeColor,
  awayColor,
  lastSchema: null,
  lastSquad: [],
  lastUsedAt: 0,
});
const E1 = team('t1', 'Sportvg Feuerbach E1');
const E2 = team('t2', 'Sportvg Feuerbach E2', 'rot', 'weiss');
const E3 = team('t3', 'Sportvg Feuerbach E3', 'schwarz', 'weiss');
const D1 = team('t4', 'Sportvg Feuerbach D1');

/** Fortlaufende Nummer über alle Aufrufe, damit jede Erzeugung neue Schlüssel und Topics liefert. */
let n = 0;

/** Deterministische Schlüssel: "Signatur" = Schlüssel-ID; `now` lässt sich verstellen. */
function deps(now = T0): LiveDeps & { now: number } {
  return {
    now,
    newTopic: () => `topic${String(++n).padStart(17, '0')}`,
    newViewKey: () => B43,
    newSigningKey: async () => {
      n++;
      return { pub: pubOf(n % 100), priv: { d: `d${n}`, x: `x${n}`, y: `y${n}` } };
    },
    signData: async (priv: PrivateKeyParts, value: unknown): Promise<SignedData> => ({
      d: JSON.stringify(value),
      s: `sig-${priv.d}`,
    }),
    newId: () => `neu-${++n}`,
  };
}

const spieltag = (): Promise<LiveSpieltag> =>
  createSpieltag({ title: 'Unser Spieltag', teamIds: ['t1', 't2'] }, [E1, E2, E3], deps());
const cfg = (live: LiveSpieltag): LiveConfig => configOf(live.config)!;

describe('006 US5 FR-L19 Titel und Mannschaften ändern', () => {
  it('Konfiguration nennt Mannschaften mit Namen und Trikots, damit andere Trainer-Handys sie übernehmen', async () => {
    const live = await spieltag();
    expect(cfg(live).m).toEqual([
      ['E1', 'Sportvg Feuerbach E1', 'rot', 'schwarz'],
      ['E2', 'Sportvg Feuerbach E2', 'rot', 'weiss'],
    ]);
  });

  it('US5-S4 Titel ändern: neue Konfiguration mit größerem iat, auch wenn die Uhr nachgeht', async () => {
    const live = await spieltag();
    const renamed = await renameSpieltag(live, '  Unser Spieltag   E1 & E2 ', deps(T0 + 60_000));
    expect(cfg(renamed)).toMatchObject({ title: 'Unser Spieltag E1 & E2', teams: ['E1', 'E2'], iat: T0 + 60_000 });
    expect(renamed.config.s).toBe(`sig-${live.orgKey!.d}`);
    expect([renamed.topic, renamed.viewKey, renamed.teams]).toEqual([live.topic, live.viewKey, live.teams]);
    const late = await renameSpieltag(renamed, 'Spieltag', deps(T0 - 3_600_000));
    expect(cfg(late).iat).toBe(T0 + 60_001);
    await expect(renameSpieltag(live, '   ', deps())).rejects.toThrow('Bitte einen Titel eintragen.');
    // unlesbare gespeicherte Konfiguration: Uhrzeit dieses Handys
    const broken = { ...live, config: { d: '{kaputt', s: 'x' } };
    expect(cfg(await renameSpieltag(broken, 'Neu', deps(T0 + 7))).iat).toBe(T0 + 7);
  });

  it('Titel prüfen: leer, zu lang, Leerzeichen zusammengezogen', () => {
    expect(checkTitle(' A  B ')).toEqual({ ok: true, title: 'A B' });
    expect(checkTitle('')).toEqual({ ok: false, title: '', error: 'Bitte einen Titel eintragen.' });
    expect(checkTitle('x'.repeat(41)).error).toBe('Höchstens 40 Zeichen.');
  });

  it('US5-S1 hinzufügbar: Mannschaften aus "Meine Mannschaften", die fehlen, mit freiem Kurzlabel', async () => {
    const live = await spieltag();
    expect(addableTeams(live, [E1, E2, E3, D1, team('t8', ' sportvg feuerbach e2 ')]).map((o) => o.key)).toEqual([
      'E3',
      'D1',
    ]);
    // gleiches Kurzlabel wie eine vorhandene Mannschaft: eindeutig machen
    expect(addableTeams(live, [team('t9', 'Feuerbach E1'), team('t10', 'Sportvg E1')]).map((o) => o.key)).toEqual([
      'E1 (2)',
      'E1 (3)',
    ]);
  });

  it('US5-S1 Mannschaft hinzufügen: Zertifikat mit Organisator-Schlüssel, Links bleiben gleich', async () => {
    const live = await spieltag();
    const [opt] = addableTeams(live, [E3]);
    const next = await addLiveTeam(live, opt!, deps(T0 + 1000));
    expect(cfg(next).teams).toEqual(['E1', 'E2', 'E3']);
    expect(cfg(next).m?.[2]).toEqual(['E3', 'Sportvg Feuerbach E3', 'schwarz', 'weiss']);
    const e3 = next.teams[2]!;
    expect([e3.key, e3.name, e3.homeColor, e3.awayColor, e3.sends]).toEqual([
      'E3',
      'Sportvg Feuerbach E3',
      'schwarz',
      'weiss',
      true,
    ]);
    expect(e3.cert.s).toBe(`sig-${live.orgKey!.d}`);
    expect(JSON.parse(e3.cert.d)).toMatchObject({ key: 'E3', name: 'Sportvg Feuerbach E3', iat: T0 + 1000 });
    expect([next.topic, next.viewKey, next.orgPub]).toEqual([live.topic, live.viewKey, live.orgPub]);
    // Kurzlabel schon vergeben
    await expect(addLiveTeam(next, opt!, deps())).rejects.toThrow('E3 ist schon dabei.');
  });

  it('höchstens sechs Mannschaften', async () => {
    let live = await spieltag();
    const more = [3, 4, 5, 6, 7].map((i) => team(`t${i}`, `Sportvg Feuerbach F${i}`));
    for (const t of more.slice(0, 4)) live = await addLiveTeam(live, addableTeams(live, [t])[0]!, deps());
    expect(live.teams).toHaveLength(6);
    expect(addableTeams(live, more)).toEqual([]);
    await expect(addLiveTeam(live, { key: 'F7', team: more[4]! }, deps())).rejects.toThrow('Höchstens 6 Mannschaften.');
  });

  it('Mannschaft entfernen: fällt aus Konfiguration und Zertifikaten, die letzte bleibt', async () => {
    const live = await spieltag();
    const next = await removeLiveTeam(live, 'E1', deps(T0 + 1000));
    expect(cfg(next).teams).toEqual(['E2']);
    expect(next.teams.map((t) => t.key)).toEqual(['E2']);
    await expect(removeLiveTeam(next, 'E2', deps())).rejects.toThrow('Mindestens eine Mannschaft bleibt.');
    await expect(removeLiveTeam(live, 'E9', deps())).rejects.toThrow('E9 ist nicht dabei.');
  });

  it('nur mit Organisator-Schlüssel (Lead-Handy der ersten Version darf nicht verwalten)', async () => {
    const live = await spieltag();
    const lead: LiveSpieltag = { ...live, orgKey: undefined };
    const msg = 'Nur ein Trainer-Handy kann den Live-Spieltag verwalten.';
    await expect(renameSpieltag(lead, 'Neu', deps())).rejects.toThrow(msg);
    await expect(reissueSpieltag(lead, deps())).rejects.toThrow(msg);
  });
});

describe('006 US5-S3 FR-L19 alle Links neu ausstellen', () => {
  it('neues Topic, neue Schlüssel und Zertifikate; Titel, Mannschaften und Anlegezeit bleiben', async () => {
    const live = await renameSpieltag(await spieltag(), 'Saison 26/27', deps(T0 + 5));
    const next = await reissueSpieltag(live, deps(T0 + 9_000));
    expect(next.topic).not.toBe(live.topic);
    expect(next.orgPub).not.toBe(live.orgPub);
    expect(next.orgKey).not.toEqual(live.orgKey);
    expect(cfg(next)).toEqual({ ...cfg(live), iat: T0 + 9_000 });
    expect(next.config.s).toBe(`sig-${next.orgKey!.d}`);
    expect(next.teams.map((t) => [t.key, t.cert.s, t.leadKey === live.teams[0]!.leadKey])).toEqual([
      ['E1', `sig-${next.orgKey!.d}`, false],
      ['E2', `sig-${next.orgKey!.d}`, false],
    ]);
    expect(next.createdAt).toBe(live.createdAt);
  });
});

describe('006 US5-S1 jüngere Konfiguration von einem anderen Trainer-Handy übernehmen', () => {
  const settingsWith = (live: LiveSpieltag): Settings => ({ ...defaultSettings(), teams: [E1, E2], live });

  it('neue Mannschaft mit eigenem Zertifikat und in "Meine Mannschaften", entfernte fällt weg', async () => {
    const live = await spieltag();
    const elsewhere = await removeLiveTeam(
      await addLiveTeam(live, { key: 'E3', team: E3 }, deps(T0 + 1)),
      'E1',
      deps(T0 + 2),
    );
    const s = (await adoptConfig(settingsWith(live), elsewhere.config, deps(T0 + 3)))!;
    expect(s.live!.config).toEqual(elsewhere.config);
    expect(s.live!.teams.map((t) => t.key)).toEqual(['E2', 'E3']);
    const e3 = s.live!.teams[1]!;
    expect(e3.cert.s).toBe(`sig-${live.orgKey!.d}`);
    expect(e3.leadKey).not.toEqual(elsewhere.teams[1]!.leadKey);
    expect(s.teams.map((t) => t.name)).toEqual([E1.name, E2.name, E3.name]);
    expect(s.teams[2]).toMatchObject({ homeColor: 'schwarz', awayColor: 'weiss' });
    // Topic, Schlüssel und Anlegezeit bleiben
    expect([s.live!.topic, s.live!.orgKey, s.live!.createdAt]).toEqual([live.topic, live.orgKey, live.createdAt]);
  });

  it('ältere oder gleiche Konfiguration ändert nichts; ohne Live-Spieltag nichts', async () => {
    const live = await renameSpieltag(await spieltag(), 'Neu', deps(T0 + 10));
    const older = await renameSpieltag(await spieltag(), 'Alt', deps(T0 + 5));
    expect(await adoptConfig(settingsWith(live), older.config, deps())).toBeNull();
    expect(await adoptConfig(settingsWith(live), live.config, deps())).toBeNull();
    expect(await adoptConfig(defaultSettings(), live.config, deps())).toBeNull();
    expect(await adoptConfig(settingsWith(live), { d: '{kaputt', s: 'x' }, deps())).toBeNull();
  });

  it('nur Titel geändert: Zertifikate bleiben; ohne Angaben zur Mannschaft wird sie nicht übernommen', async () => {
    const live = await spieltag();
    const renamed = await renameSpieltag(live, 'Neu', deps(T0 + 1));
    const s = (await adoptConfig(settingsWith(live), renamed.config, deps()))!;
    expect(s.live!.teams).toEqual(live.teams);
    // Konfiguration ohne "m" (ältere App): unbekannte Mannschaft bleibt außen vor
    const bare = { title: 'X', teams: ['E1', 'E3'], iat: T0 + 2 };
    const t = (await adoptConfig(settingsWith(live), { d: JSON.stringify(bare), s: 's' }, deps()))!;
    expect(t.live!.teams.map((c) => c.key)).toEqual(['E1']);
  });

  it('Lead-Handy der ersten Version (ohne Organisator-Schlüssel) übernimmt Titel und Entfernen, aber keine neuen', async () => {
    const live = await spieltag();
    const lead: LiveSpieltag = { ...live, orgKey: undefined, teams: live.teams.filter((t) => t.key === 'E2') };
    const added = await addLiveTeam(live, { key: 'E3', team: E3 }, deps(T0 + 1));
    const s = (await adoptConfig(settingsWith(lead), added.config, deps()))!;
    expect(s.live!.teams.map((t) => t.key)).toEqual(['E2']);
    const removed = await removeLiveTeam(added, 'E2', deps(T0 + 2));
    expect((await adoptConfig(settingsWith(lead), removed.config, deps()))!.live!.teams).toEqual([]);
  });
});

describe('006 Konfiguration mit Mannschaftsangaben prüfen', () => {
  const base = { title: 'T', teams: ['E1'], iat: T0 };
  it('"m" ist optional; vorhanden muss es gültig sein', () => {
    expect(parseConfig(base)).toEqual(base);
    expect(parseConfig({ ...base, m: [['E1', 'Sportvg Feuerbach E1', 'rot', 'weiss']] })?.m).toHaveLength(1);
    for (const m of [
      'x',
      [['E1', 'Name', 'rot']],
      [['E1', 'Name', 'pink', 'weiss']],
      [['E1', 'Name', 'rot', 'pink']],
      [['', 'Name', 'rot', 'weiss']],
      [['E1', '', 'rot', 'weiss']],
      ['E1'],
      Array.from({ length: 7 }, (_, i) => [`E${i}`, 'N', 'rot', 'weiss']),
    ]) {
      expect(parseConfig({ ...base, m })).toBeNull();
    }
  });
});

describe('006 FR-L21 Live-Spieltag aus der Sicherung', () => {
  it('nur ohne eigenen Live-Spieltag; Mannschaften kommen in "Meine Mannschaften"', async () => {
    const live = await spieltag();
    const empty: Settings = { ...defaultSettings(), teams: [E1] };
    const r = restoreLive(empty, live, () => 'neu-id');
    expect(r.restored).toBe(true);
    expect(r.settings.live).toEqual(live);
    expect(r.settings.teams.map((t) => [t.id, t.name])).toEqual([
      ['t1', E1.name],
      ['neu-id', E2.name],
    ]);
    const other = await reissueSpieltag(live, deps());
    const kept = restoreLive({ ...empty, live: other }, live, () => 'x');
    expect(kept).toEqual({ settings: { ...empty, live: other }, restored: false });
  });
});
