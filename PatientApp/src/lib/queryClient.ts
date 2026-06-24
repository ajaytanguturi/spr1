import { QueryClient } from "@tanstack/react-query";
import { installQueryLogger } from "./queryLogger";

// How long server data is treated as fresh. Shared with useRefetchOnFocusIfStale
// so on-focus refetches use the same window as React Query's built-in dedup.
export const DEFAULT_STALE_TIME = 30 * 1000;

// Shared query client. Server data is cached and deduped across screens so
// navigating back to a list doesn't refire the same request immediately.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: DEFAULT_STALE_TIME, // treat data as fresh for 30s (dedupes focus refetches)
      gcTime: 5 * 60 * 1000, // keep unused data cached for 5 min
      retry: 1,
      refetchOnWindowFocus: false, // RN: focus refetch is handled explicitly per screen
    },
  },
});

// Dev-only: log network fetches + durations so caching/dedup is observable.
installQueryLogger(queryClient);
