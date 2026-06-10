import { describe, it, expect } from 'vitest';
import { memoize, calculateImpact, getGrade, TTLCache, RequestDeduplicator } from '../../lib/utils/performance.utils';

describe('Performance Utils', () => {
  describe('memoize', () => {
    it('should cache function results', () => {
      let callCount = 0;
      const add = memoize((a: number, b: number) => {
        callCount++;
        return a + b;
      });

      expect(add(1, 2)).toBe(3);
      expect(add(1, 2)).toBe(3);
      expect(callCount).toBe(1); // Only called once
    });

    it('should handle different arguments', () => {
      const add = memoize((a: number, b: number) => a + b);

      expect(add(1, 2)).toBe(3);
      expect(add(2, 3)).toBe(5);
    });

    it('should respect max cache size', () => {
      let callCount = 0;
      const fn = memoize(
        (x: number) => {
          callCount++;
          return x * 2;
        },
        { maxSize: 2 }
      );

      fn(1);
      fn(2);
      fn(3); // Should evict first entry
      fn(1); // Should recalculate

      expect(callCount).toBe(4);
    });
  });

  describe('calculateImpact', () => {
    it('should calculate car emissions', () => {
      const impact = calculateImpact('km', 100, 'car');
      expect(impact).toBe(21); // 100 * 0.21
    });

    it('should calculate electricity emissions', () => {
      const impact = calculateImpact('kwh', 50, 'electricity');
      expect(impact).toBe(19.25); // 50 * 0.385
    });

    it('should cache results', () => {
      const first = calculateImpact('km', 100, 'car');
      const second = calculateImpact('km', 100, 'car');
      expect(first).toBe(second);
    });
  });

  describe('getGrade', () => {
    it('should assign grade A for low emissions', () => {
      expect(getGrade(3)).toBe('A');
      expect(getGrade(5)).toBe('A');
    });

    it('should assign grade B for moderate emissions', () => {
      expect(getGrade(6)).toBe('B');
      expect(getGrade(10)).toBe('B');
    });

    it('should assign grade F for high emissions', () => {
      expect(getGrade(25)).toBe('F');
    });
  });

  describe('TTLCache', () => {
    it('should store and retrieve values', () => {
      const cache = new TTLCache<number>(1000);
      cache.set('key', 42);
      expect(cache.get('key')).toBe(42);
    });

    it('should return undefined for expired entries', async () => {
      const cache = new TTLCache<number>(100);
      cache.set('key', 42);

      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(cache.get('key')).toBeUndefined();
    });

    it('should check key existence', () => {
      const cache = new TTLCache<number>(1000);
      cache.set('key', 42);
      expect(cache.has('key')).toBe(true);
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('should clear all entries', () => {
      const cache = new TTLCache<number>(1000);
      cache.set('key1', 1);
      cache.set('key2', 2);
      cache.clear();
      expect(cache.size()).toBe(0);
    });
  });

  describe('RequestDeduplicator', () => {
    it('should deduplicate concurrent requests', async () => {
      const dedup = new RequestDeduplicator();
      let callCount = 0;

      const request = async () => {
        callCount++;
        return new Promise((resolve) => setTimeout(() => resolve(42), 10));
      };

      const [result1, result2] = await Promise.all([
        dedup.deduplicate('key', request),
        dedup.deduplicate('key', request),
      ]);

      expect(result1).toBe(42);
      expect(result2).toBe(42);
      expect(callCount).toBe(1); // Only called once
    });

    it('should handle different keys separately', async () => {
      const dedup = new RequestDeduplicator();
      let callCount = 0;

      const request = async () => {
        callCount++;
        return 42;
      };

      await Promise.all([
        dedup.deduplicate('key1', request),
        dedup.deduplicate('key2', request),
      ]);

      expect(callCount).toBe(2);
    });

    it('should clear pending requests', async () => {
      const dedup = new RequestDeduplicator();
      dedup.deduplicate('key', async () => 42);
      dedup.clear();
      expect(dedup['pending'].size).toBe(0);
    });
  });
});
