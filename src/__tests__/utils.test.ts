import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  ActivitySchema,
  ChatMessageSchema,
  safeValidate,
} from '../lib/validation';
import {
  sanitizeHTML,
  escapeText,
  safeLocalStorage,
} from '../lib/security';

describe('Validation Library', () => {
  describe('ActivitySchema', () => {
    it('should validate a correct activity', () => {
      const activity = {
        type: 'transportation' as const,
        duration: 30,
        impact: 5.2,
        category: 'Car',
      };
      const result = ActivitySchema.safeParse(activity);
      expect(result.success).toBe(true);
    });

    it('should reject invalid activity type', () => {
      const activity = {
        type: 'invalid' as any,
        duration: 30,
        impact: 5.2,
        category: 'Car',
      };
      const result = ActivitySchema.safeParse(activity);
      expect(result.success).toBe(false);
    });

    it('should reject negative duration', () => {
      const activity = {
        type: 'transportation' as const,
        duration: -10,
        impact: 5.2,
        category: 'Car',
      };
      const result = ActivitySchema.safeParse(activity);
      expect(result.success).toBe(false);
    });
  });

  describe('ChatMessageSchema', () => {
    it('should validate a correct message', () => {
      const message = {
        role: 'user' as const,
        content: 'Hello AI!',
      };
      const result = ChatMessageSchema.safeParse(message);
      expect(result.success).toBe(true);
    });

    it('should reject empty content', () => {
      const message = {
        role: 'user' as const,
        content: '',
      };
      const result = ChatMessageSchema.safeParse(message);
      expect(result.success).toBe(false);
    });
  });

  describe('safeValidate', () => {
    it('should return success for valid data', () => {
      const result = safeValidate(ActivitySchema, {
        type: 'transportation',
        duration: 30,
        impact: 5.2,
        category: 'Car',
      });
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should return error for invalid data', () => {
      const result = safeValidate(ActivitySchema, { type: 'invalid' });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});

describe('Security Library', () => {
  describe('escapeText', () => {
    it('should escape HTML special characters', () => {
      const text = '<script>alert("xss")</script>';
      const escaped = escapeText(text);
      expect(escaped).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });

    it('should not escape safe text', () => {
      const text = 'Hello World';
      const escaped = escapeText(text);
      expect(escaped).toBe('Hello World');
    });
  });

  describe('safeLocalStorage', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    afterEach(() => {
      localStorage.clear();
    });

    it('should safely set and get items', () => {
      const success = safeLocalStorage.setItem('key', 'value');
      expect(success).toBe(true);

      const value = safeLocalStorage.getItem('key');
      expect(value).toBe('value');
    });

    it('should handle JSON serialization', () => {
      const obj = { name: 'test', count: 42 };
      const success = safeLocalStorage.setJSON('test-key', obj);
      expect(success).toBe(true);

      const retrieved = safeLocalStorage.getJSON('test-key', {});
      expect(retrieved).toEqual(obj);
    });

    it('should return fallback for missing items', () => {
      const fallback = { default: true };
      const result = safeLocalStorage.getJSON('missing', fallback);
      expect(result).toEqual(fallback);
    });
  });
});
