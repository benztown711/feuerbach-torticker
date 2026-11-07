import { describe, expect, it } from 'vitest';
import { fromBase64Url, toBase64Url } from '../../src/domain/base64url';
import { signedText } from '../../src/domain/relay-protocol';
import {
  MAX_MESSAGE,
  bodyHash,
  groupOf,
  newSigningKey,
  newTopic,
  newViewKey,
  openMessage,
  sealMessage,
  sign,
  signData,
  signWrite,
  slotOf,
  sealSquad,
  squadSlot,
  unseal,
  unsealSquad,
  verify,
  verifySigned,
  seal,
} from '../../src/platform/live-crypto';

describe('006 FR-L11 Schlüssel und Signaturen (research.md R-L5)', () => {
  it('Topic hat 22 Zeichen base64url, Zuschauer-Schlüssel 32 Byte, beide zufällig', () => {
    const t = newTopic();
    expect(t).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(newTopic()).not.toBe(t);
    expect(fromBase64Url(newViewKey())).toHaveLength(32);
  });

  it('Signaturschlüssel: öffentlich roh 65 Byte, privat als JWK-Teile; Signatur 64 Byte', async () => {
    const k = await newSigningKey();
    expect(fromBase64Url(k.pub)).toHaveLength(65);
    expect(fromBase64Url(k.priv.d)).toHaveLength(32);
    const s = await sign(k.priv, 'Hallo');
    expect(fromBase64Url(s)).toHaveLength(64);
    expect(await verify(k.pub, 'Hallo', s)).toBe(true);
    expect(await verify(k.pub, 'Hallo!', s)).toBe(false);
    const other = await newSigningKey();
    expect(await verify(other.pub, 'Hallo', s)).toBe(false);
    expect(await verify('kaputt', 'Hallo', s)).toBe(false);
    expect(await verify(k.pub, 'Hallo', 'kaputt')).toBe(false);
  });

  it('signierte Daten: JSON-Text plus Signatur; verändert oder falscher Schlüssel → null', async () => {
    const org = await newSigningKey();
    const signed = await signData(org.priv, { title: 'Unser Spieltag', teams: ['E1'] });
    expect(JSON.parse(signed.d)).toEqual({ title: 'Unser Spieltag', teams: ['E1'] });
    expect(await verifySigned(org.pub, signed)).toEqual({ title: 'Unser Spieltag', teams: ['E1'] });
    expect(await verifySigned(org.pub, { ...signed, d: signed.d.replace('Unser', 'Euer') })).toBeNull();
    expect(await verifySigned((await newSigningKey()).pub, signed)).toBeNull();
    const notJson = { d: 'kein json', s: await sign(org.priv, 'kein json') };
    expect(await verifySigned(org.pub, notJson)).toBeNull();
  });
});

describe('006 FR-L11 Verschlüsselung (contracts/live-message.md)', () => {
  it('seal/unseal: Präfix t1., gepackt und verschlüsselt, falscher Schlüssel oder Fehler → null', async () => {
    const key = newViewKey();
    const text = JSON.stringify({ own: 'Feuerbach E1', who: 'Max' }).repeat(20);
    const sealed = await seal(key, text);
    expect(sealed.startsWith('t1.')).toBe(true);
    expect(sealed).not.toContain('Feuerbach');
    expect(sealed.length).toBeLessThan(text.length); // deflate packt Wiederholungen
    expect(await unseal(key, sealed)).toBe(text);
    expect(await unseal(newViewKey(), sealed)).toBeNull();
    expect(await unseal(key, 'x1.' + sealed.slice(3))).toBeNull();
    expect(await unseal(key, 't1.AAAA')).toBeNull();
    expect(await unseal(key, 't1.***')).toBeNull();
  });

  it('gleicher Text ergibt dank zufälligem IV jedes Mal eine andere Meldung', async () => {
    const key = newViewKey();
    expect(await seal(key, 'x')).not.toBe(await seal(key, 'x'));
  });
});

describe('006 FR-L11 Umschlag: Prüfreihenfolge', () => {
  async function setup() {
    const org = await newSigningKey();
    const lead = await newSigningKey();
    const viewKey = newViewKey();
    const certValue = {
      key: 'E1',
      name: 'Sportvg Feuerbach E1',
      homeColor: 'rot',
      awayColor: 'schwarz',
      pub: lead.pub,
      iat: 1,
    };
    const cert = await signData(org.priv, certValue);
    const config = await signData(org.priv, { title: 'Unser Spieltag', teams: ['E1'], iat: 1 });
    return { org, lead, viewKey, cert, certValue, config, view: { viewKey, orgPub: org.pub } };
  }

  it('Live-Stand mit Zertifikat und Konfiguration wird geöffnet und geprüft', async () => {
    const s = await setup();
    const text = await sealMessage(s.viewKey, {
      content: '{"team":"E1"}',
      leadKey: s.lead.priv,
      cert: s.cert,
      config: s.config,
    });
    expect(text.length).toBeLessThan(MAX_MESSAGE);
    const opened = await openMessage(s.view, text);
    expect(opened).toEqual({
      content: { team: 'E1' },
      cert: s.certValue,
      config: { title: 'Unser Spieltag', teams: ['E1'], iat: 1 },
      // US5: signierte Konfiguration zum Weitergeben (Trainer-Handys übernehmen sie)
      signedConfig: s.config,
    });
  });

  it('Konfigurationsmeldung besteht nur aus g', async () => {
    const s = await setup();
    const text = await sealMessage(s.viewKey, { config: s.config });
    expect(await openMessage(s.view, text)).toEqual({
      content: null,
      cert: null,
      config: { title: 'Unser Spieltag', teams: ['E1'], iat: 1 },
      signedConfig: s.config,
    });
  });

  it('ungültiges g wird verworfen, der Live-Stand bleibt', async () => {
    const s = await setup();
    const fake = await signData(s.lead.priv, { title: 'Gefälscht', teams: ['E1'], iat: 9 });
    const text = await sealMessage(s.viewKey, {
      content: '{"team":"E1"}',
      leadKey: s.lead.priv,
      cert: s.cert,
      config: fake,
    });
    const opened = await openMessage(s.view, text);
    expect(opened).toMatchObject({ content: { team: 'E1' }, config: null });
    expect(opened?.signedConfig).toBeUndefined();
  });

  it('Live-Stand einer anderen Mannschaft als im Zertifikat (m.team ≠ c.key) wird verworfen', async () => {
    const s = await setup();
    const text = await sealMessage(s.viewKey, { content: '{"team":"E2"}', leadKey: s.lead.priv, cert: s.cert });
    expect(await openMessage(s.view, text)).toMatchObject({ content: null, cert: null });
    const noTeam = await sealMessage(s.viewKey, { content: '[1]', leadKey: s.lead.priv, cert: s.cert });
    expect(await openMessage(s.view, noTeam)).toMatchObject({ content: null, cert: null });
  });

  it('Zertifikat ohne gültigen Inhalt (vom Organisator signiert, aber unvollständig) → verworfen', async () => {
    const s = await setup();
    const partial = await signData(s.org.priv, { key: 'E1', pub: s.lead.pub });
    const text = await sealMessage(s.viewKey, { content: '{"team":"E1"}', leadKey: s.lead.priv, cert: partial });
    expect(await openMessage(s.view, text)).toMatchObject({ content: null });
  });

  it('Zertifikat nicht vom Organisator, falsche Signatur oder fehlendes Zertifikat → Live-Stand verworfen', async () => {
    const s = await setup();
    const forgedCert = await signData(s.lead.priv, { key: 'E1', pub: s.lead.pub });
    const a = await sealMessage(s.viewKey, { content: '{"team":"E1"}', leadKey: s.lead.priv, cert: forgedCert });
    expect(await openMessage(s.view, a)).toMatchObject({ content: null, cert: null });
    const other = await newSigningKey();
    const b = await sealMessage(s.viewKey, { content: '{"team":"E1"}', leadKey: other.priv, cert: s.cert });
    expect(await openMessage(s.view, b)).toMatchObject({ content: null });
    const c = await seal(
      s.viewKey,
      JSON.stringify({ m: '{"team":"E1"}', s: await sign(s.lead.priv, '{"team":"E1"}') }),
    );
    expect(await openMessage(s.view, c)).toMatchObject({ content: null });
    const badPub = await signData(s.org.priv, { key: 'E1', pub: 'kaputt' });
    const d = await sealMessage(s.viewKey, { content: '{"team":"E1"}', leadKey: s.lead.priv, cert: badPub });
    expect(await openMessage(s.view, d)).toMatchObject({ content: null });
  });

  it('kein JSON, falscher Aufbau, falscher Schlüssel oder kein JSON im Inhalt → null bzw. verworfen', async () => {
    const s = await setup();
    expect(await openMessage(s.view, await seal(s.viewKey, 'kein json'))).toBeNull();
    expect(await openMessage(s.view, await seal(s.viewKey, '[1,2]'))).toBeNull();
    expect(
      await openMessage({ ...s.view, viewKey: newViewKey() }, await sealMessage(s.viewKey, { config: s.config })),
    ).toBeNull();
    const notJson = await sealMessage(s.viewKey, { content: 'kein json', leadKey: s.lead.priv, cert: s.cert });
    expect(await openMessage(s.view, notJson)).toMatchObject({ content: null });
    const weird = await seal(s.viewKey, JSON.stringify({ m: 5, s: 'x', c: 'y', g: 7 }));
    expect(await openMessage(s.view, weird)).toEqual({ content: null, cert: null, config: null });
  });

  it('toBase64Url/fromBase64Url passen zu den Schlüsseln (Hilfsprüfung)', async () => {
    const k = await newSigningKey();
    expect(toBase64Url(fromBase64Url(k.pub))).toBe(k.pub);
  });
});

describe('015 Plan-Meldung (contracts/plan-message.md)', () => {
  it('p wird mit dem Organisator-Schlüssel geprüft; falsche Signatur oder zu lang → ohne Plan', async () => {
    const org = await newSigningKey();
    const view = { viewKey: newViewKey(), orgPub: org.pub };
    const payload = { v: 1, e: [{ i: 'a1', k: 'E1', d: '2026-11-14', u: 1, h: 1 }] };
    const plan = await signData(org.priv, payload);
    const opened = await openMessage(view, await sealMessage(view.viewKey, { plan }));
    expect(opened).toEqual({ content: null, cert: null, config: null, plan: plan.d });

    const fake = await signData((await newSigningKey()).priv, payload);
    expect((await openMessage(view, await sealMessage(view.viewKey, { plan: fake })))?.plan).toBeUndefined();

    const long = await signData(org.priv, { v: 1, e: [], pad: 'x'.repeat(3000) });
    expect((await openMessage(view, await sealMessage(view.viewKey, { plan: long })))?.plan).toBeUndefined();
  });
});

describe('007 R-N3 R-N4 Kennungen und Schreibnachweis für den eigenen Dienst', () => {
  it('slot und group: 22 Zeichen, gleich für dieselbe Mannschaft und Spiel-ID, verschieden sonst', async () => {
    const viewKey = newViewKey();
    const a = await slotOf(viewKey, 'E1', 'spiel-1');
    expect(a).toMatch(/^[A-Za-z0-9_-]{22}$/);
    // Zweites Handy (Ersatzhandy, Spiel übernehmen): gleicher Schlüssel, gleiche Kennung.
    expect(await slotOf(viewKey, 'E1', 'spiel-1')).toBe(a);
    expect(await slotOf(viewKey, 'E2', 'spiel-1')).not.toBe(a);
    expect(await slotOf(viewKey, 'E1', 'spiel-2')).not.toBe(a);
    expect(await slotOf(newViewKey(), 'E1', 'spiel-1')).not.toBe(a);
    const g = await groupOf(viewKey, 'E1');
    expect(g).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(await groupOf(viewKey, 'E1')).toBe(g);
    expect(await groupOf(viewKey, 'E2')).not.toBe(g);
    // Mannschaft und Spiel-ID lassen sich nicht trennen ("E1|x" ≠ "E1|" + "x" anders zerlegt).
    expect(await slotOf(viewKey, 'E1|a', 'b')).not.toBe(await slotOf(viewKey, 'E1', 'a|b'));
  });

  it('Schreibnachweis: signiert den Vertragstext mit dem Hash der Meldung, prüfbar mit dem öffentlichen Schlüssel', async () => {
    const org = await newSigningKey();
    const name = `${newTopic()}.${org.pub}`;
    const body = await seal(newViewKey(), 'Inhalt');
    const write = { kind: 'cfg' as const, iat: 1_794_038_000_000, body };
    const sig = await signWrite(org.priv, name, write);
    const hash = await bodyHash(body);
    expect(hash).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const text = signedText(name, { ...write, sig }, hash);
    expect(await verify(org.pub, text, sig)).toBe(true);
    expect(await verify(org.pub, signedText(name, { ...write, iat: write.iat + 1, sig }, hash), sig)).toBe(false);
    expect(await verify(org.pub, signedText(`${name}x`, { ...write, sig }, hash), sig)).toBe(false);
  });
});

describe('016 R-B2 Kader-Schlüssel nur für Trainer-Handys', () => {
  it('aus dem privaten Organisator-Schlüssel: zwei Trainer-Handys lesen, Zuschauer-Schlüssel und fremde nicht', async () => {
    const org = await newSigningKey();
    const copy = { ...org.priv };
    const text = JSON.stringify({ n: 'E3', k: [['a', 'Paul', 4, 0, 1]] });
    const sealed = await sealSquad(org.priv, text);
    expect(sealed.startsWith('t1.')).toBe(true);
    expect(sealed).not.toContain('Paul');
    expect(await unsealSquad(copy, sealed)).toBe(text);
    expect(await unsealSquad((await newSigningKey()).priv, sealed)).toBeNull();
    // Mit dem Zuschauer-Schlüssel (oder dessen Format) lässt sich die Meldung nicht öffnen.
    expect(await unseal(newViewKey(), sealed)).toBeNull();
    expect(await unsealSquad(org.priv, await seal(newViewKey(), text))).toBeNull();
    expect(await unsealSquad({ ...org.priv, d: 'kaputt*' }, sealed)).toBeNull();
  });

  it('slot eines Kaders: 22 Zeichen, gleich für dieselbe Kennung, verschieden von Spielen', async () => {
    const view = newViewKey();
    const a = await squadSlot(view, 'abc');
    expect(a).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(await squadSlot(view, 'abc')).toBe(a);
    expect(await squadSlot(view, 'abd')).not.toBe(a);
    expect(await slotOf(view, 'squad', 'abc')).not.toBe(a);
  });
});
