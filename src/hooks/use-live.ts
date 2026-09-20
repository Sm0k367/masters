"use client";

/* eslint-disable react-hooks/set-state-in-effect -- live tape polling */
import { useCallback, useEffect, useState } from "react";

export function useLive<T>(
  url: string | null,
  intervalMs = 25_000,
  initial: T | null = null,
) {
  const [data, setData] = useState<T | null>(initial);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(initial == null && Boolean(url));
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
    if (!url) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const seeded = initial != null;
    setData(initial);
    setError(null);
    setLoading(!seeded);

    async function pull(silent: boolean) {
      if (!url) return;
      if (!silent) setLoading(true);
      try {
        const response = await fetch(url, { cache: "no-store" });
        const body = (await response.json()) as T & { error?: string };
        if (!response.ok) {
          throw new Error(body.error ?? `HTTP ${response.status}`);
        }
        if (cancelled) return;
        setData(body);
        setError(null);
        setUpdatedAt(Date.now());
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Request failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void pull(seeded);
    const timer = window.setInterval(() => {
      void pull(true);
    }, intervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
    // Seed belongs to the url that just became active.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, intervalMs]);

  return { data, error, loading, updatedAt, reload };
}
