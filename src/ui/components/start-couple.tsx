import { useEffect, useState } from 'preact/hooks';
import { findLink, viewerLinkPath } from '../../domain/live-link';
import type { Settings } from '../../domain/types';
import { verifyLink, type VerifiedLink } from '../../platform/live-setup';
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

/**
 * Spec 012 FR-S02, FR-S03 (nachgeladen, R-L7): wertet die Zwischenablage aus. Zuschauer-Link öffnet das
 * Dashboard, ein gültiger Trainer- oder Lead-Link führt direkt zur Kopplungsfrage, sonst das Einfügefeld.
 */
export function StartCouple({ text, settings, onDone, onClose, onError }: Props) {
  const [state, setState] = useState<'loading' | 'paste' | VerifiedLink>('loading');
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
      if (alive) setState(verified ?? 'paste');
    })();
    return () => {
      alive = false;
    };
  }, [text]);

  if (state === 'loading') return null;
  if (state === 'paste')
    return (
      <Sheet title="Trainer-Link einfügen" testId="start-paste-sheet" onClose={onClose}>
        <PasteLink onCancel={onClose} onLink={setState} />
      </Sheet>
    );
  return <CoupleFlow link={state} settings={settings} onDone={onDone} onCancel={onClose} onError={onError} />;
}
