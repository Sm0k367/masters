type CacheEntry<T> = { exp: number; data: T };

const mem = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export class HttpError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function fetchJson<T>(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<T> {
  const { timeoutMs = 12_000, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...rest,
      signal: controller.signal,
      headers: {
        accept: "application/json",
        "user-agent": "MastersDesk/1.0",
        ...rest.headers,
      },
    });
    if (!response.ok) {
      throw new HttpError(
        `${response.status} ${response.statusText} for ${url}`,
        response.status,
      );
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

function retryable(error: unknown): boolean {
  if (!(error instanceof HttpError)) return true;
  return error.status === 429 || error.status >= 500;
}

export async function fetchJsonRetry<T>(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {},
  attempts = 4,
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fetchJson<T>(url, { timeoutMs: 18_000, ...init });
    } catch (error) {
      lastError = error;
      if (!retryable(error) || i === attempts - 1) throw error;
      const status = error instanceof HttpError ? error.status : 0;
      const wait = (status === 429 ? 1_200 : 400) * 2 ** i;
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
  }
  throw lastError;
}

export async function cached<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<T> {
  const hit = mem.get(key);
  if (hit && hit.exp > Date.now()) {
    return hit.data as T;
  }
  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;
  const promise = (async () => {
    try {
      const data = await loader();
      mem.set(key, { exp: Date.now() + ttlMs, data });
      return data;
    } catch (error) {
      if (hit) {
        mem.set(key, { exp: Date.now() + Math.min(15_000, ttlMs), data: hit.data });
        return hit.data as T;
      }
      throw error;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, promise);
  return promise as Promise<T>;
}

export async function settled<T>(promise: Promise<T>): Promise<T | null> {
  const result = await Promise.allSettled([promise]);
  const first = result[0];
  if (first.status === "fulfilled") return first.value;
  console.warn(first.reason);
  return null;
}
