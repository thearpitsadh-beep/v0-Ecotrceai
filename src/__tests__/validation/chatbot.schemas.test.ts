import { describe, it, expect } from 'vitest';
import {
  chatMessageSchema,
  chatRequestSchema,
  activitySchema,
  insightsRequestSchema,
  sanitizeMessage,
  validateAndSanitizeChat,
  validateAndSanitizeInsights,
} from '../../lib/validation/chatbot.schemas';

describe('Chat Message Schema', () => {
  it('should validate correct message', () => {
    const msg = { role: 'user' as const, content: 'Hello' };
    expect(chatMessageSchema.parse(msg)).toEqual(msg);
  });

  it('should reject invalid role', () => {
    const msg = { role: 'invalid', content: 'Hello' };
    expect(() => chatMessageSchema.parse(msg)).toThrow();
  });

  it('should reject empty content', () => {
    const msg = { role: 'user' as const, content: '' };
    expect(() => chatMessageSchema.parse(msg)).toThrow();
  });

  it('should reject oversized content', () => {
    const msg = {
      role: 'user' as const,
      content: 'a'.repeat(5001),
    };
    expect(() => chatMessageSchema.parse(msg)).toThrow();
  });
});

describe('Chat Request Schema', () => {
  it('should validate correct request', () => {
    const request = {
      messages: [{ role: 'user' as const, content: 'Hello' }],
    };
    expect(chatRequestSchema.parse(request)).toEqual(request);
  });

  it('should reject empty message array', () => {
    const request = { messages: [] };
    expect(() => chatRequestSchema.parse(request)).toThrow();
  });

  it('should reject request with too many messages', () => {
    const messages = Array(51)
      .fill(null)
      .map((_, i) => ({
        role: (i % 2 === 0 ? 'user' : 'assistant') as const,
        content: 'message',
      }));
    const request = { messages };
    expect(() => chatRequestSchema.parse(request)).toThrow();
  });

  it('should allow optional sessionId', () => {
    const request = {
      messages: [{ role: 'user' as const, content: 'Hello' }],
      sessionId: 'test-123',
    };
    const parsed = chatRequestSchema.parse(request);
    expect(parsed.sessionId).toBe('test-123');
  });
});

describe('Activity Schema', () => {
  it('should validate correct activity', () => {
    const activity = {
      type: 'transport',
      duration: 30,
      impact: 2.5,
    };
    expect(activitySchema.parse(activity)).toEqual(activity);
  });

  it('should reject zero duration', () => {
    const activity = {
      type: 'transport',
      duration: 0,
      impact: 2.5,
    };
    expect(() => activitySchema.parse(activity)).toThrow();
  });

  it('should reject negative impact', () => {
    const activity = {
      type: 'transport',
      duration: 30,
      impact: -1,
    };
    expect(() => activitySchema.parse(activity)).toThrow();
  });

  it('should reject oversized type', () => {
    const activity = {
      type: 'a'.repeat(101),
      duration: 30,
      impact: 2.5,
    };
    expect(() => activitySchema.parse(activity)).toThrow();
  });
});

describe('Insights Request Schema', () => {
  it('should validate correct insights request', () => {
    const request = {
      activities: [{ type: 'transport', duration: 30, impact: 2.5 }],
      totalFootprint: 100,
    };
    expect(insightsRequestSchema.parse(request)).toEqual(request);
  });

  it('should reject empty activities', () => {
    const request = {
      activities: [],
      totalFootprint: 100,
    };
    expect(() => insightsRequestSchema.parse(request)).toThrow();
  });

  it('should reject too many activities', () => {
    const activities = Array(11)
      .fill(null)
      .map(() => ({
        type: 'transport',
        duration: 30,
        impact: 2.5,
      }));
    const request = {
      activities,
      totalFootprint: 100,
    };
    expect(() => insightsRequestSchema.parse(request)).toThrow();
  });

  it('should reject negative footprint', () => {
    const request = {
      activities: [{ type: 'transport', duration: 30, impact: 2.5 }],
      totalFootprint: -10,
    };
    expect(() => insightsRequestSchema.parse(request)).toThrow();
  });
});

describe('Message Sanitization', () => {
  it('should trim whitespace', () => {
    const result = sanitizeMessage('  hello  ');
    expect(result).toBe('hello');
  });

  it('should escape HTML special characters', () => {
    const result = sanitizeMessage('<script>alert("xss")</script>');
    expect(result).toContain('&lt;');
    expect(result).not.toContain('<script>');
  });

  it('should truncate long messages', () => {
    const longMsg = 'a'.repeat(6000);
    const result = sanitizeMessage(longMsg);
    expect(result.length).toBe(5000);
  });

  it('should handle mixed cases', () => {
    const input = '  <b>Bold text</b>  ';
    const result = sanitizeMessage(input);
    expect(result).toBe('&lt;b&gt;Bold text&lt;/b&gt;');
  });

  it('should escape greater than sign', () => {
    const input = '1 > 0';
    const result = sanitizeMessage(input);
    expect(result).toContain('&gt;');
  });
});

describe('validateAndSanitizeChat', () => {
  it('should validate and sanitize chat request', () => {
    const input = {
      messages: [
        { role: 'user' as const, content: '  hello <script>  ' },
        { role: 'assistant' as const, content: 'hi' },
      ],
    };
    const result = validateAndSanitizeChat(input);
    expect(result.messages[0].content).toContain('&lt;script&gt;');
    expect(result.messages[0].content).not.toContain('  hello');
  });

  it('should reject invalid input', () => {
    const input = { messages: [] };
    expect(() => validateAndSanitizeChat(input)).toThrow();
  });

  it('should preserve valid content', () => {
    const input = {
      messages: [
        { role: 'user' as const, content: 'I ate a salad today' },
      ],
    };
    const result = validateAndSanitizeChat(input);
    expect(result.messages[0].content).toContain('salad');
  });
});

describe('validateAndSanitizeInsights', () => {
  it('should validate insights request', () => {
    const input = {
      activities: [{ type: 'diet', duration: 60, impact: 2.5 }],
      totalFootprint: 50,
    };
    const result = validateAndSanitizeInsights(input);
    expect(result.activities[0].type).toBe('diet');
  });

  it('should reject invalid input', () => {
    const input = {
      activities: [],
      totalFootprint: 50,
    };
    expect(() => validateAndSanitizeInsights(input)).toThrow();
  });
});
