import { describe, expect, it } from 'vitest';
import { fromBase64Url, toBase64Url } from '../../src/domain/base64url';
import {
  MAX_MESSAGE,
  newSigningKey,
  newTopic,
  newViewKey,
  openMessage,
  sealMessage,
  sign,
  signData,
  unseal,
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
    });
  });

  it('Konfigurationsmeldung besteht nur aus g', async () => {
    const s = await setup();
    const text = await sealMessage(s.viewKey, { config: s.config });
    expect(await openMessage(s.view, text)).toEqual({
      content: null,
      cert: null,
      config: { title: 'Unser Spieltag', teams: ['E1'], iat: 1 },
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
    expect(await openMessage(s.view, text)).toMatchObject({ content: { team: 'E1' }, config: null });
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
