import {
  addEntry,
  chunkEntries,
  deleteEntry,
  encodePayload,
  markSent,
  mergeEntries,
  needsRefresh,
  parsePayload,
  planFor,
  prunePlan,
  REFRESH_MS,
  setCancelled,
  todayKey,
  updateEntry,
  type PlanChange,
  type PlanInput,
} from '../domain/plan';
import { MAX_PLAN_SIGNED } from '../domain/live-validate';
import type { LiveSpieltag, PlanEntry, PlanStore } from '../domain/types';
import { getPlan, getSettings, putPlan } from './db';
import { sealMessage, signData } from './live-crypto';
import { planChanged } from './live-events';
import { publish } from './relay';

/**
 * Spec 015 US1: Spielplan laden, ändern, senden und von anderen Trainer-Handys übernehmen (plan.md, R-P1 bis
 * R-P4). Wird nachgeladen.
 */

export type PlanEdit =
  | { kind: 'add'; input: PlanInput }
  | { kind: 'update'; id: string; input: PlanInput }
  | { kind: 'cancel'; id: string; cancelled: boolean }
  | { kind: 'delete'; id: string };

let queue: Promise<unknown> = Promise.resolve();

/** Änderungen, Übernahmen und Senden nacheinander, damit nichts überschrieben wird. */
function serial<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

const newId = (): string => crypto.randomUUID().replace(/-/g, '').slice(0, 8);

/** Plan dieses Live-Spieltags, ohne alte Grabsteine (R-P3). */
export async function loadPlan(live: Pick<LiveSpieltag, 'topic' | 'orgPub'>): Promise<PlanStore> {
  return prunePlan(planFor(await getPlan(), live.topic, live.orgPub), todayKey(Date.now()));
}

async function save(store: PlanStore): Promise<PlanStore> {
  await putPlan(store);
  planChanged(store);
  return store;
}

function apply(store: PlanStore, edit: PlanEdit, now: number): PlanChange | null {
  switch (edit.kind) {
    case 'add':
      return addEntry(store, edit.input, newId(), now);
    case 'update':
      return updateEntry(store, edit.id, edit.input, now);
    case 'cancel':
      return setCancelled(store, edit.id, edit.cancelled, now);
    case 'delete':
      return deleteEntry(store, edit.id, now);
  }
}

/** Sendet Planspiele in Stücken; false, sobald ein Stück nicht ankommt. */
async function sendEntries(live: LiveSpieltag, entries: readonly PlanEntry[]): Promise<boolean> {
  if (!live.orgKey) return false;
  for (const chunk of chunkEntries(entries, MAX_PLAN_SIGNED)) {
    const plan = await signData(live.orgKey, encodePayload(chunk));
    const ok = await publish(live.topic, await sealMessage(live.viewKey, { plan })).catch(() => false);
    if (!ok) return false;
  }
  return true;
}

/** Sendet Unversandtes bzw. (`full`) den ganzen Plan; merkt sich den Erfolg. */
function flush(full: boolean): Promise<boolean> {
  return serial(async () => {
    const live = (await getSettings()).live;
    if (!live?.orgKey) return false;
    const store = await loadPlan(live);
    const ids = full ? store.entries.map((e) => e.id) : store.pending;
    const entries = store.entries.filter((e) => ids.includes(e.id));
    if (entries.length === 0) return true;
    if (!(await sendEntries(live, entries))) return false;
    await putPlan(markSent(await loadPlan(live), ids, Date.now()));
    return true;
  });
}

/** US1-S1 bis S3, S7: ändern, speichern und an die anderen Trainer-Handys senden. */
export async function changePlan(edit: PlanEdit): Promise<PlanStore> {
  const store = await serial(async () => {
    const live = (await getSettings()).live;
    if (!live?.orgKey) throw new Error('Nur Trainer-Handys mit Trainer-Link können den Spielplan ändern.');
    const r = apply(await loadPlan(live), edit, Date.now());
    if (!r) throw new Error('Dieses Spiel gibt es nicht mehr im Spielplan.');
    return save(r.store);
  });
  void flush(false);
  return store;
}

/** FR-P07: beim Öffnen Unversandtes senden; ist die letzte Meldung älter als 6 Stunden, den ganzen Plan. */
export async function refreshPlan(): Promise<void> {
  const live = (await getSettings()).live;
  if (!live?.orgKey) return;
  const store = await loadPlan(live);
  const now = Date.now();
  if (!needsRefresh(store, now, todayKey(now))) return;
  await flush(now - store.sentAt >= REFRESH_MS);
}

/** US1-S4: geprüfte Planspiele eines anderen Trainer-Handys übernehmen (je Planspiel die jüngere Änderung). */
export function adoptPlan(payload: string, view: { topic: string; orgPub: string }): Promise<void> {
  return serial(async () => {
    const entries = parsePayload(payload);
    if (!entries) return;
    const live = (await getSettings()).live;
    if (live?.topic !== view.topic || live.orgPub !== view.orgPub) return;
    const r = mergeEntries(await loadPlan(live), entries);
    if (r.changed.length > 0) await save(prunePlan(r.store, todayKey(Date.now())));
  }).catch(() => undefined);
}

/** Neu ausstellen: der Plan wandert auf den neuen Live-Spieltag und geht dort ganz hinaus (Spec, Edge Cases). */
export async function movePlan(old: Pick<LiveSpieltag, 'topic' | 'orgPub'>, next: LiveSpieltag): Promise<void> {
  await serial(async () => {
    const store = planFor(await getPlan(), old.topic, old.orgPub);
    if (store.entries.length === 0) return;
    await save({ ...store, topic: next.topic, orgPub: next.orgPub, sentAt: 0, pending: [] });
  });
  await flush(true);
}
