import { describe, it, expect } from 'vitest';
import {
  isCarbonActivity,
  isMessage,
  isError,
  isStringArray,
  isNumber,
  isPositiveNumber,
  isNonNegativeNumber,
  hasKeys,
  isJsonResponse,
  safeCast,
  safeJsonParse,
} from '../../lib/utils/type.guards';

describe('Type Guards', () => {
  describe('isCarbonActivity', () => {
    it('should validate carbon activity', () => {
      const activity = {
        type: 'Transportation',
        duration: 30,
        impact: 5.2,
        timestamp: '2024-01-01T00:00:00Z',
      };
      expect(isCarbonActivity(activity)).toBe(true);
    });

    it('should reject invalid activities', () => {
      expect(isCarbonActivity({ type: 'Transportation' })).toBe(false);
      expect(isCarbonActivity(null)).toBe(false);
      expect(isCarbonActivity(undefined)).toBe(false);
    });

    it('should require non-negative values', () => {
      const activity = {
        type: 'Transportation',
        duration: -30,
        impact: 5.2,
        timestamp: '2024-01-01T00:00:00Z',
      };
      expect(isCarbonActivity(activity)).toBe(false);
    });
  });

  describe('isMessage', () => {
    it('should validate messages', () => {
      const message = {
        id: '123',
        role: 'user',
        content: 'Hello',
        timestamp: '2024-01-01T00:00:00Z',
      };
      expect(isMessage(message)).toBe(true);
    });

    it('should validate assistant messages', () => {
      const message = {
        id: '123',
        role: 'assistant',
        content: 'Hi there',
      };
      expect(isMessage(message)).toBe(true);
    });

    it('should reject invalid messages', () => {
      expect(isMessage({ id: '123', content: 'Hello' })).toBe(false);
      expect(isMessage({ role: 'user', content: 'Hello' })).toBe(false);
      expect(isMessage(null)).toBe(false);
    });
  });

  describe('isError', () => {
    it('should detect Error objects', () => {
      expect(isError(new Error('test'))).toBe(true);
      expect(isError('not an error')).toBe(false);
      expect(isError(null)).toBe(false);
    });
  });

  describe('isStringArray', () => {
    it('should validate string arrays', () => {
      expect(isStringArray(['a', 'b', 'c'])).toBe(true);
      expect(isStringArray([])).toBe(true);
    });

    it('should reject non-string arrays', () => {
      expect(isStringArray([1, 2, 3])).toBe(false);
      expect(isStringArray(['a', 1, 'b'])).toBe(false);
      expect(isStringArray('not an array')).toBe(false);
    });
  });

  describe('isNumber', () => {
    it('should validate numbers', () => {
      expect(isNumber(42)).toBe(true);
      expect(isNumber(0)).toBe(true);
      expect(isNumber(-5)).toBe(true);
    });

    it('should reject non-numbers', () => {
      expect(isNumber(NaN)).toBe(false);
      expect(isNumber(Infinity)).toBe(false);
      expect(isNumber('42')).toBe(false);
      expect(isNumber(null)).toBe(false);
    });
  });

  describe('isPositiveNumber', () => {
    it('should validate positive numbers', () => {
      expect(isPositiveNumber(42)).toBe(true);
      expect(isPositiveNumber(0.1)).toBe(true);
    });

    it('should reject zero and negative', () => {
      expect(isPositiveNumber(0)).toBe(false);
      expect(isPositiveNumber(-5)).toBe(false);
    });
  });

  describe('isNonNegativeNumber', () => {
    it('should validate non-negative numbers', () => {
      expect(isNonNegativeNumber(42)).toBe(true);
      expect(isNonNegativeNumber(0)).toBe(true);
    });

    it('should reject negative numbers', () => {
      expect(isNonNegativeNumber(-5)).toBe(false);
    });
  });

  describe('hasKeys', () => {
    it('should check for required keys', () => {
      const obj = { a: 1, b: 2, c: 3 };
      expect(hasKeys(obj, 'a', 'b')).toBe(true);
      expect(hasKeys(obj, 'a', 'd')).toBe(false);
    });

    it('should handle null and non-objects', () => {
      expect(hasKeys(null, 'a')).toBe(false);
      expect(hasKeys('string', 'a')).toBe(false);
    });
  });

  describe('safeCast', () => {
    it('should cast valid values', () => {
      const result = safeCast(42, isNumber, 0);
      expect(result).toBe(42);
    });

    it('should use fallback for invalid values', () => {
      const result = safeCast('invalid', isNumber, 0);
      expect(result).toBe(0);
    });
  });

  describe('safeJsonParse', () => {
    it('should parse valid JSON', () => {
      const result = safeJsonParse('{"key": "value"}', isJsonResponse, {});
      expect(result).toEqual({ key: 'value' });
    });

    it('should use fallback on parse error', () => {
      const result = safeJsonParse('invalid json', isJsonResponse, { default: true });
      expect(result).toEqual({ default: true });
    });

    it('should use fallback on type mismatch', () => {
      const result = safeJsonParse('"string"', isJsonResponse, { default: true });
      expect(result).toEqual({ default: true });
    });
  });
});
