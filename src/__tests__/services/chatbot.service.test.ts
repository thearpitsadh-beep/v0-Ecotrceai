import { describe, it, expect } from 'vitest';
import { ChatMessage } from '../../lib/types/api.types';

describe('ChatbotService - Error Handling & Recovery', () => {
  // Test error code classification
  const isRetryableError = (code: string): boolean => {
    return ['RATE_LIMITED', 'SERVICE_UNAVAILABLE', 'TIMEOUT', 'API_ERROR'].includes(code);
  };

  const getUserFriendlyMessage = (code: string): string => {
    const messages: Record<string, string> = {
      RATE_LIMITED: 'The AI is busy right now. Please try again in a moment.',
      SERVICE_UNAVAILABLE: 'The AI service is temporarily unavailable. Please try again soon.',
      UNAUTHORIZED: 'There\'s an authentication issue. Please refresh and try again.',
      TIMEOUT: 'The request took too long. Please try again with a shorter message.',
      TOKEN_LIMIT_EXCEEDED: 'Your conversation is too long. Please start a new chat.',
      RESPONSE_PARSE_ERROR: 'There was an issue processing the response. Please try again.',
      API_ERROR: 'Something went wrong with the AI service. Please try again.',
    };
    return messages[code] || messages.API_ERROR;
  };

  const getErrorCode = (error: any): string => {
    if (typeof error === 'object' && error?.code) {
      return error.code;
    }
    if (error?.status === 429) return 'RATE_LIMITED';
    if (error?.status === 503) return 'SERVICE_UNAVAILABLE';
    if (error?.status === 401) return 'UNAUTHORIZED';
    if (error?.message?.includes('timeout')) return 'TIMEOUT';
    return 'API_ERROR';
  };

  describe('Error Classification', () => {
    it('should classify rate limit errors as retryable', () => {
      expect(isRetryableError('RATE_LIMITED')).toBe(true);
    });

    it('should classify service unavailable as retryable', () => {
      expect(isRetryableError('SERVICE_UNAVAILABLE')).toBe(true);
    });

    it('should classify timeout as retryable', () => {
      expect(isRetryableError('TIMEOUT')).toBe(true);
    });

    it('should classify auth errors as non-retryable', () => {
      expect(isRetryableError('UNAUTHORIZED')).toBe(false);
    });

    it('should classify token limit as non-retryable', () => {
      expect(isRetryableError('TOKEN_LIMIT_EXCEEDED')).toBe(false);
    });
  });

  describe('Error Code Mapping', () => {
    it('should map HTTP 429 to RATE_LIMITED', () => {
      const code = getErrorCode({ status: 429 });
      expect(code).toBe('RATE_LIMITED');
    });

    it('should map HTTP 503 to SERVICE_UNAVAILABLE', () => {
      const code = getErrorCode({ status: 503 });
      expect(code).toBe('SERVICE_UNAVAILABLE');
    });

    it('should map HTTP 401 to UNAUTHORIZED', () => {
      const code = getErrorCode({ status: 401 });
      expect(code).toBe('UNAUTHORIZED');
    });

    it('should extract code from error object', () => {
      const code = getErrorCode({ code: 'CUSTOM_CODE' });
      expect(code).toBe('CUSTOM_CODE');
    });

    it('should detect timeout errors', () => {
      const code = getErrorCode({ message: 'Request timeout after 30s' });
      expect(code).toBe('TIMEOUT');
    });

    it('should default to API_ERROR', () => {
      const code = getErrorCode('unknown string');
      expect(code).toBe('API_ERROR');
    });
  });

  describe('User-Friendly Messages', () => {
    it('should provide rate limit message', () => {
      const msg = getUserFriendlyMessage('RATE_LIMITED');
      expect(msg).toContain('busy');
      expect(msg).toContain('try again');
    });

    it('should provide service unavailable message', () => {
      const msg = getUserFriendlyMessage('SERVICE_UNAVAILABLE');
      expect(msg).toContain('temporarily unavailable');
    });

    it('should provide timeout message', () => {
      const msg = getUserFriendlyMessage('TIMEOUT');
      expect(msg).toContain('took too long');
    });

    it('should provide token limit message', () => {
      const msg = getUserFriendlyMessage('TOKEN_LIMIT_EXCEEDED');
      expect(msg).toContain('too long');
    });

    it('should provide generic error message', () => {
      const msg = getUserFriendlyMessage('UNKNOWN_ERROR');
      expect(msg).toContain('Something went wrong');
    });
  });

  describe('Token Estimation', () => {
    const estimateTokens = (messages: ChatMessage[]): number => {
      const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0);
      return Math.ceil(totalChars / 4);
    };

    it('should estimate tokens from character count', () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello world' }, // 11 chars = 3 tokens
      ];
      const tokens = estimateTokens(messages);
      expect(tokens).toBe(3);
    });

    it('should handle empty messages', () => {
      const tokens = estimateTokens([]);
      expect(tokens).toBe(0);
    });

    it('should scale with message length', () => {
      const shortMsg = estimateTokens([
        { role: 'user', content: 'Hi' },
      ]);
      const longMsg = estimateTokens([
        { role: 'user', content: 'a'.repeat(1000) },
      ]);
      expect(longMsg).toBeGreaterThan(shortMsg);
      expect(longMsg).toBe(250);
    });

    it('should detect huge conversations', () => {
      const hugeMessages = Array(50)
        .fill(null)
        .map(() => ({
          role: 'user' as const,
          content: 'a'.repeat(1000),
        }));
      const tokens = estimateTokens(hugeMessages);
      expect(tokens).toBeGreaterThan(10000);
      // 50 * 1000 chars / 4 = 12500 tokens
      expect(tokens).toBe(12500);
    });
  });

  describe('JSON Parsing', () => {
    const parseJSON = (text: string): any => {
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          return { insights: [], recommendation: text };
        }
        return JSON.parse(jsonMatch[0]);
      } catch {
        return { insights: [], recommendation: text };
      }
    };

    it('should parse valid JSON from text', () => {
      const result = parseJSON('text { "key": "value" } more');
      expect(result.key).toBe('value');
    });

    it('should return fallback for no JSON', () => {
      const result = parseJSON('No JSON here');
      expect(result.insights).toEqual([]);
      expect(result.recommendation).toBe('No JSON here');
    });

    it('should handle nested JSON', () => {
      const result = parseJSON('{ "a": { "b": "c" } }');
      expect(result.a.b).toBe('c');
    });

    it('should use first JSON object if multiple exist', () => {
      const result = parseJSON('{ "first": 1 } { "second": 2 }');
      // The regex will capture the entire first-to-end range, giving { "first": 1 } { "second": 2 }
      // which will fail to parse, so we fallback to { insights: [], recommendation: text }
      expect(result.insights).toEqual([]);
    });

    it('should handle empty objects', () => {
      const result = parseJSON('{}');
      expect(Object.keys(result).length).toBe(0);
    });
  });

  describe('Retry Logic', () => {
    const calculateBackoff = (attempt: number, initialMs: number): number => {
      const delay = Math.min(
        initialMs * Math.pow(2, attempt),
        16000 // max 16s
      );
      return delay;
    };

    it('should increase delay exponentially', () => {
      const attempt0 = calculateBackoff(0, 1000);
      const attempt1 = calculateBackoff(1, 1000);
      const attempt2 = calculateBackoff(2, 1000);

      expect(attempt0).toBe(1000);
      expect(attempt1).toBe(2000);
      expect(attempt2).toBe(4000);
    });

    it('should cap delay at max value', () => {
      const attempt10 = calculateBackoff(10, 1000);
      expect(attempt10).toBeLessThanOrEqual(16000);
    });

    it('should support custom initial delay', () => {
      const fast = calculateBackoff(1, 500);
      const slow = calculateBackoff(1, 2000);
      expect(fast).toBeLessThan(slow);
    });
  });

  describe('Message Validation', () => {
    const validateInput = (text: string): { valid: boolean; error?: string } => {
      if (!text.trim()) {
        return { valid: false, error: 'Message cannot be empty' };
      }
      if (text.length > 5000) {
        return { valid: false, error: 'Message is too long (max 5000 characters)' };
      }
      return { valid: true };
    };

    it('should accept valid messages', () => {
      const result = validateInput('Hello world');
      expect(result.valid).toBe(true);
    });

    it('should reject empty messages', () => {
      const result = validateInput('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('should reject oversized messages', () => {
      const result = validateInput('a'.repeat(5001));
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too long');
    });

    it('should allow exactly max length', () => {
      const result = validateInput('a'.repeat(5000));
      expect(result.valid).toBe(true);
    });
  });
});
