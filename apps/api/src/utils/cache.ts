type CacheEntry<TValue> = {
  expiresAt: number;
  value: TValue;
};

export class InMemoryCache {
  private readonly storage = new Map<string, CacheEntry<unknown>>();

  get<TValue>(key: string): TValue | null {
    const entry = this.storage.get(key);

    if (!entry) {
      return null;
    }

    if (Date.now() >= entry.expiresAt) {
      this.storage.delete(key);
      return null;
    }

    return entry.value as TValue;
  }

  set<TValue>(key: string, value: TValue, ttlMs: number): void {
    this.storage.set(key, {
      value,
      expiresAt: Date.now() + ttlMs
    });
  }

  del(key: string): void {
    this.storage.delete(key);
  }

  clearByPrefix(prefix: string): void {
    for (const cacheKey of this.storage.keys()) {
      if (cacheKey.startsWith(prefix)) {
        this.storage.delete(cacheKey);
      }
    }
  }
}

export const appCache = new InMemoryCache();

export async function withCache<TValue>(input: {
  key: string;
  ttlMs: number;
  resolver: () => Promise<TValue>;
}): Promise<TValue> {
  const cachedValue = appCache.get<TValue>(input.key);
  if (cachedValue !== null) {
    return cachedValue;
  }

  const nextValue = await input.resolver();
  appCache.set(input.key, nextValue, input.ttlMs);
  return nextValue;
}

