/**
 * Simple memoization decorator for functions
 * Caches results based on arguments
 */
export function memoize<T extends (...args: any[]) => any>(fn: T, options?: { maxSize?: number }): T {
  const cache = new Map<string, any>();
  const maxSize = options?.maxSize ?? 100;

  return ((...args: any[]) => {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = fn(...args);

    if (cache.size >= maxSize) {
      // Remove oldest entry
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }

    cache.set(key, result);
    return result;
  }) as T;
}

/**
 * Calculate impact with memoization
 * Avoids recalculating carbon impact for same inputs
 */
export const calculateImpact = memoize(
  (type: string, value: number, unit: string): number => {
    const impactMap: Record<string, number> = {
      'km-car': 0.21,
      'km-bus': 0.03,
      'km-flight': 0.255,
      'kwh-electricity': 0.385,
      'meal-vegetarian': 1.25,
      'meal-meat': 6.61,
      'item-shopping': 0.5,
      'kg-waste': 0.3,
    };

    const key = `${type}-${unit}`;
    const factor = impactMap[key] ?? 0;

    return value * factor;
  },
  { maxSize: 200 }
);

/**
 * Grade calculation with memoization
 */
export const getGrade = memoize(
  (dailyCO2: number): string => {
    if (dailyCO2 <= 5) return 'A';
    if (dailyCO2 <= 10) return 'B';
    if (dailyCO2 <= 15) return 'C';
    if (dailyCO2 <= 20) return 'D';
    return 'F';
  },
  { maxSize: 50 }
);

/**
 * Request deduplication - prevent duplicate API calls
 */
export class RequestDeduplicator {
  private pending = new Map<string, Promise<any>>();

  async deduplicate<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    if (this.pending.has(key)) {
      return this.pending.get(key)!;
    }

    const promise = requestFn().finally(() => {
      this.pending.delete(key);
    });

    this.pending.set(key, promise);
    return promise;
  }

  clear(): void {
    this.pending.clear();
  }
}

/**
 * Simple cache implementation with TTL
 */
export class TTLCache<T> {
  private cache = new Map<string, { value: T; expiresAt: number }>();

  constructor(private ttlMs: number = 5 * 60 * 1000) {}

  set(key: string, value: T): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

/**
 * Batch API requests to reduce network calls
 */
export class RequestBatcher<T, R> {
  private queue: Array<{ key: string; payload: T }> = [];
  private timeoutId: NodeJS.Timeout | null = null;
  private readonly batchDelayMs = 50;
  private readonly maxBatchSize = 10;

  async batch(key: string, payload: T, batchFn: (items: Array<{ key: string; payload: T }>) => Promise<R>): Promise<R> {
    this.queue.push({ key, payload });

    return new Promise((resolve, reject) => {
      const sendBatch = async () => {
        const items = this.queue.splice(0, this.maxBatchSize);
        try {
          const result = await batchFn(items);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      if (this.queue.length >= this.maxBatchSize) {
        this.timeoutId = null;
        sendBatch();
      } else if (!this.timeoutId) {
        this.timeoutId = setTimeout(() => {
          this.timeoutId = null;
          sendBatch();
        }, this.batchDelayMs);
      }
    });
  }

  clear(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.queue = [];
  }
}

/**
 * Performance measurement utility
 */
export class PerformanceMonitor {
  private marks = new Map<string, number>();

  mark(label: string): void {
    this.marks.set(label, performance.now());
  }

  measure(label: string, startLabel: string): number {
    const startTime = this.marks.get(startLabel);
    if (!startTime) {
      console.warn(`[PerformanceMonitor] Start mark "${startLabel}" not found`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.marks.delete(startLabel);

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${label}: ${duration.toFixed(2)}ms`);
    }

    return duration;
  }

  clear(): void {
    this.marks.clear();
  }
}
