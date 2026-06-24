import type { QueryClient } from "@tanstack/react-query";

// Dev-only TanStack Query logger. Logs every *network* fetch with its duration
// and a running per-key call count. Cache hits (data served without a fetch)
// produce no log line — so a shrinking number of "[rq] ... network" lines after
// navigating is direct evidence that caching/dedup is working.
//
// This replaces the web-only @tanstack/react-query-devtools (which can't be
// imported in a React Native bundle) and the Expo dev-tools plugin (which would
// require adding expo-dev-client to the build).
export function installQueryLogger(client: QueryClient): void {
  if (!__DEV__) return;

  const cache = client.getQueryCache();
  const startedAt = new Map<string, number>();
  const networkCalls = new Map<string, number>();

  cache.subscribe((event) => {
    if (event.type !== "updated" || !event.action) return;
    const key = JSON.stringify(event.query.queryKey);
    const action = event.action.type;

    if (action === "fetch") {
      startedAt.set(key, Date.now());
    } else if (action === "success") {
      const began = startedAt.get(key);
      startedAt.delete(key);
      const ms = began ? Date.now() - began : 0;
      const n = (networkCalls.get(key) ?? 0) + 1;
      networkCalls.set(key, n);
      console.log(`[rq] ${key} ← network ${ms}ms (total network calls: ${n})`);
    } else if (action === "error") {
      startedAt.delete(key);
      console.log(`[rq] ${key} ← error`);
    }
  });
}
