export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed';

/**
 * Teilen über das System-Teilen-Menü (Web Share API), Fallback Zwischenablage (FR-011, FR-028).
 * Daten verlassen das Gerät nur durch diese bewusste Aktion (Constitution II).
 */
export async function shareText(text: string, title?: string): Promise<ShareResult> {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share(title ? { title, text } : { text });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}
