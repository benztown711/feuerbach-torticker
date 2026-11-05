import { useState } from 'preact/hooks';
import {
  couplingKind,
  isOrganizer,
  isRetired,
  knowsTeam,
  replacesOrganizer,
  titleOf,
} from '../../domain/live-spieltag';
import { shortTeamName } from '../../domain/team-name';
import type { Settings } from '../../domain/types';
import { coupleLink, linkOf, type VerifiedLink } from '../../platform/live-setup';
import { CoupleDialog } from './couple-dialog';

/**
 * Spec 012 FR-S06: Ist dieses Gerät schon mit genau diesem Live-Spieltag gekoppelt (Trainer-Link: als
 * Trainer-Handy, Lead-Link: für dessen Mannschaft) und nicht neu ausgestellt?
 */
export function isCoupledWith(settings: Settings, link: VerifiedLink): boolean {
  const live = settings.live;
  if (!live || isRetired(live) || couplingKind(settings, linkOf(link)) !== 'same') return false;
  return link.kind === 'trainer' ? isOrganizer(live) : live.teams.some((t) => t.key === link.cert.key && t.sends);
}

interface Props {
  link: VerifiedLink;
  settings: Settings;
  /** Nach dem Koppeln mit den neuen Einstellungen. */
  onDone: (s: Settings) => void;
  onCancel: () => void;
  /** Koppeln ist gescheitert (z. B. Speicher voll). */
  onError: () => void;
}

/** Spec 006 FR-L03, Spec 012 FR-S02: Kopplungsfrage zu einem geprüften Link und Koppeln nach "Ja". */
export function CoupleFlow({ link, settings, onDone, onCancel, onError }: Props) {
  const [busy, setBusy] = useState(false);
  const live = settings.live;
  return (
    <CoupleDialog
      trainer={link.kind === 'trainer'}
      teams={link.teams.map((t) => shortTeamName(t.name))}
      title={link.title}
      replace={couplingKind(settings, linkOf(link)) === 'replace'}
      adds={link.teams.filter((t) => !knowsTeam(settings, t.name)).map((t) => shortTeamName(t.name))}
      losesOrganizer={live && !isRetired(live) && replacesOrganizer(settings, linkOf(link)) ? titleOf(live) : null}
      busy={busy}
      onYes={() => {
        if (busy) return;
        setBusy(true);
        coupleLink(link).then(onDone, () => {
          setBusy(false);
          onError();
        });
      }}
      onNo={onCancel}
    />
  );
}
