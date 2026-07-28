import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@shared/api-error";

/**
 * Fetches once on mount and exposes a stable `refetch` for pull-to-refresh.
 * `fetcher` must be a stable reference (e.g. `api.timetable`, not an inline
 * arrow function) or this re-fetches on every render.
 */
export function useApiData<T>(fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetcher());
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError("server-error", "Unexpected error."));
    } finally {
      setLoading(false);
    }
  }, [fetcher]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, error, loading, refetch: load };
}
