import { useEffect, useState } from 'preact/hooks';
import { findLink, viewerLinkPath } from '../../domain/live-link';
import { couplingKind, isRetired } from '../../domain/live-spieltag';
import type { Settings } from '../../domain/types';
import { linkOf, verifyLink, type VerifiedLink } from '../../platform/live-setup';
import { navigate } from '../router';
import { CoupleFlow } from './couple-flow';
import { PasteLink } from './paste-link';
import { Sheet } from './sheet';

interface Props {
  /** Inhalt der Zwischenablage, null wenn sie nicht lesbar war. */
  text: string | null;
  settings: Settings;
  onDone: (s: Settings) => void;
  onClose: () => void;
  onError: () => void;
}

const OLD_LINK = 'Das ist noch der alte Trainer-Link. Bitte den neuen aus der Trainergruppe einfügen.';
const BAD_LINK =
  'Der Link in der Zwischenablage ist nicht gültig. Bitte den ganzen Link aus der Trainergruppe kopieren.';

/** Wurde der Live-Spieltag neu ausgestellt, führt der alte Link nicht zurück in denselben Spieltag. */
const isOldLink = (settings: Settings, link: VerifiedLink): boolean =>
  !!settings.live && isRetired(settings.live) && couplingKind(settings, linkOf(link)) === 'same';

/**
 * Spec 012 FR-S02, FR-S03 (nachgeladen, R-L7): wertet die Zwischenablage aus. Zuschauer-Link öffnet das
 * Dashboard, ein gültiger Trainer- oder Lead-Link führt direkt zur Kopplungsfrage, sonst das Einfügefeld
 * (mit Hinweis, wenn der Link ungültig oder nach dem Neu-Ausstellen der alte ist).
 */
export function StartCouple({ text, settings, onDone, onClose, onError }: Props) {
  const [state, setState] = useState<'loading' | { paste: string } | VerifiedLink>('loading');
  const take = (link: VerifiedLink): void => setState(isOldLink(settings, link) ? { paste: OLD_LINK } : link);
  useEffect(() => {
    let alive = true;
    void (async () => {
      const link = findLink(text ?? '');
      if (link.kind === 'view') {
        onClose();
        navigate(viewerLinkPath(link.view));
        return;
      }
      const verified = link.kind === 'invalid' ? null : await verifyLink(link);
      if (!alive) return;
      if (verified) take(verified);
      // Sieht der Text nach einem Torticker-Link aus, ist aber keiner (abgeschnitten, kaputt): mit Hinweis.
      else setState({ paste: /#\/(?:live|lead|trainer)\//.test(text ?? '') ? BAD_LINK : '' });
    })();
    return () => {
      alive = false;
    };
  }, [text]);

  if (state === 'loading') return null;
  if ('paste' in state)
    return (
      <Sheet title="Trainer-Link einfügen" testId="start-paste-sheet" onClose={onClose}>
        <PasteLink key={state.paste} onCancel={onClose} onLink={take} initialError={state.paste} />
      </Sheet>
    );
  return <CoupleFlow link={state} settings={settings} onDone={onDone} onCancel={onClose} onError={onError} />;
}
