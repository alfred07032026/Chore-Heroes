import { useCallback, useRef, useState } from 'react';

/**
 * Runs one async submit at a time. The ref (not state) blocks a second tap that lands in the
 * same render, so a double tap can't create two jobs, children or star adjustments.
 */
export function useSubmitGuard() {
  const running = useRef(false);
  const [busy, setBusy] = useState(false);
  const run = useCallback(async <T>(fn: () => Promise<T>): Promise<T | undefined> => {
    if (running.current) return undefined;
    running.current = true;
    setBusy(true);
    try {
      return await fn();
    } finally {
      running.current = false;
      setBusy(false);
    }
  }, []);
  return { busy, run };
}
