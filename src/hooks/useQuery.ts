import { useCallback, useEffect, useEffectEvent, useState } from 'react';

import type { Db } from '@/db/types';
import { useAppStore } from '@/state/appStore';

export interface QueryState<T> {
  data: T | undefined;
  error: Error | null;
  /** True until the first result arrives. Later refreshes keep showing the previous data. */
  loading: boolean;
  reload: () => void;
}

/**
 * Runs an async DB read and re-runs it whenever data changes (dataVersion) or deps change.
 * Responses that arrive after a newer request started are dropped.
 */
export function useQuery<T>(fn: (db: Db) => Promise<T>, deps: unknown[]): QueryState<T> {
  const db = useAppStore((s) => s.db);
  const version = useAppStore((s) => s.dataVersion);
  const [state, setState] = useState<{ data: T | undefined; error: Error | null; done: boolean }>({
    data: undefined,
    error: null,
    done: false,
  });
  const [nonce, setNonce] = useState(0);
  const run = useEffectEvent((d: Db) => fn(d));

  useEffect(() => {
    if (!db) return;
    let current = true;
    run(db).then(
      (data) => {
        if (current) setState({ data, error: null, done: true });
      },
      (error: unknown) => {
        if (current)
          setState((s) => ({
            ...s,
            error: error instanceof Error ? error : new Error(String(error)),
            done: true,
          }));
      },
    );
    return () => {
      current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, version, nonce, ...deps]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data: state.data, error: state.error, loading: !state.done, reload };
}
