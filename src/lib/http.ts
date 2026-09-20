type CacheEntry<T> = { exp: number; data: T };

const mem = new Map<string, CacheEntry<unknown>>();

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

export async function fetchJsonRetry<T>(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<T> {
  try {
    return await fetchJson<T>(url, init);
  } catch (error) {
    if (error instanceof HttpError && error.status >= 400 && error.status < 500) {
      throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
    return fetchJson<T>(url, init);
  }
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
  const data = await loader();
  mem.set(key, { exp: Date.now() + ttlMs, data });
  return data;
}

export async function settled<T>(promise: Promise<T>): Promise<T | null> {
  const result = await Promise.allSettled([promise]);
  const first = result[0];
  if (first.status === "fulfilled") return first.value;
  console.warn(first.reason);
  return null;
}
