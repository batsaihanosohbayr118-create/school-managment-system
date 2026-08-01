import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@shared/api-error";
import { readCache, writeCache } from "./api-cache";

/**
 * Fetches once on mount and exposes a stable `refetch` for pull-to-refresh.
 * `fetcher` must be a stable reference (e.g. `api.timetable`, not an inline
 * arrow function) or this re-fetches on every render.
 *
 * `cacheKey` persists the last successful response to AsyncStorage. On mount
 * it's shown immediately (no spinner) while a fresh fetch runs in the
 * background, so reopening a screen offline still shows the last-known data
 * instead of a blank error screen — see shared/api-error.ts's "offline" kind.
 */
export function useApiData<T>(cacheKey: string, fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  // Guards the cache-read below from clobbering a fetch that already won the race.
  const gotFreshData = useRef(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await fetcher();
      gotFreshData.current = true;
      setData(result);
      setLoading(false);
      writeCache(cacheKey, result);
    } catch (err) {
      setLoading(false);
      setError(err instanceof ApiError ? err : new ApiError("server-error", "Unexpected error."));
    }
  }, [fetcher, cacheKey]);

  useEffect(() => {
    gotFreshData.current = false;
    readCache<T>(cacheKey).then((cached) => {
      if (gotFreshData.current || !cached) return;
      setData(cached);
      setLoading(false);
    });
    load();
  }, [load, cacheKey]);

  // Offline with cached data to show beats a blank error screen.
  const isOffline = error?.kind === "offline" && data !== null;

  return { data, error, loading, refetch: load, isOffline };
}
