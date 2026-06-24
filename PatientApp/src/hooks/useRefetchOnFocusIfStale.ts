import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { DEFAULT_STALE_TIME } from "@/lib/queryClient";

// Minimal shape shared by useQuery / useInfiniteQuery results — pass either the
// whole query result or just these three fields.
interface RefetchableQuery {
  refetch: () => unknown;
  dataUpdatedAt: number;
  fetchStatus: "fetching" | "paused" | "idle";
}

// Refetch a query when its screen regains focus, but only when it's worth it:
//   - skip if it's already fetching (e.g. the on-mount fetch) — don't pile on,
//     which also avoids the redundant first-mount refetch + extra render;
//   - refetch if there's no data yet and it isn't fetching (a failed initial
//     load), so refocusing retries it;
//   - otherwise refetch only once the cached data has gone stale, mirroring
//     React Query's staleTime so quick tab-switches are served from cache.
// Calling refetch() directly (the old pattern) ignored staleTime and always hit
// the network; this restores the dedup while keeping error recovery on focus.
export function useRefetchOnFocusIfStale(
  query: RefetchableQuery,
  staleMs: number = DEFAULT_STALE_TIME,
): void {
  const { refetch, dataUpdatedAt, fetchStatus } = query;
  useFocusEffect(
    useCallback(() => {
      if (fetchStatus === "fetching") return;
      const hasData = dataUpdatedAt > 0;
      if (!hasData || Date.now() - dataUpdatedAt > staleMs) refetch();
    }, [refetch, dataUpdatedAt, fetchStatus, staleMs]),
  );
}
