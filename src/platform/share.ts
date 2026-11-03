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

export type FileShareResult = 'shared' | 'downloaded' | 'cancelled' | 'failed';

/**
 * Datei über das Teilen-Menü bereitstellen (FR-024, z. B. in iCloud Drive sichern),
 * Fallback: Download.
 */
export async function shareFile(
  content: string,
  fileName: string,
  type = 'application/json',
): Promise<FileShareResult> {
  const file = new File([content], fileName, { type });
  if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: fileName });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
    }
  }
  try {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return 'downloaded';
  } catch {
    return 'failed';
  }
}
