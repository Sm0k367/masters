"use client";

import { useCallback, useEffect, useState } from "react";

export function useLive<T>(url: string | null, intervalMs = 25_000) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(url));
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  const reload = useCallback(
    async (silent = false) => {
      if (!url) return;
      if (!silent) setLoading(true);
      try {
        const response = await fetch(url, { cache: "no-store" });
        const body = (await response.json()) as T & { error?: string };
        if (!response.ok) {
          throw new Error(body.error ?? `HTTP ${response.status}`);
        }
        setData(body);
        setError(null);
        setUpdatedAt(Date.now());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Request failed");
      } finally {
        setLoading(false);
      }
    },
    [url],
  );

  useEffect(() => {
    if (!url) return;
    const kickoff = window.setTimeout(() => {
      void reload();
    }, 0);
    const timer = setInterval(() => {
      void reload(true);
    }, intervalMs);
    return () => {
      window.clearTimeout(kickoff);
      clearInterval(timer);
    };
  }, [url, intervalMs, reload]);

  return { data, error, loading, updatedAt, reload };
}
