import { useEffect, useState } from 'preact/hooks';
import { isDarkTheme } from '../platform/storage';

/** Aktuelle Zeit, alle `intervalMs` neu (Uhr wird daraus berechnet, nie hochgezählt). */
export function useNow(intervalMs = 250): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** Folgt dem aktiven Theme (System oder fest eingestellt). */
export function useDarkTheme(): boolean {
  const [dark, setDark] = useState(isDarkTheme);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setDark(isDarkTheme());
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return dark;
}
