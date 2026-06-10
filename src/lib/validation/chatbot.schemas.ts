import { z } from 'zod';

// Chat message validation
export const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(5000),
});

// Chat request validation
export const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(50),
  sessionId: z.string().optional(),
});

// Chat response validation
export const chatResponseSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      response: z.string(),
      tokensUsed: z.number().int().positive(),
    })
    .optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      retryable: z.boolean(),
    })
    .optional(),
});

// Insights request validation
export const activitySchema = z.object({
  type: z.string().min(1).max(100),
  duration: z.number().positive(),
  impact: z.number().nonnegative(),
});

export const insightsRequestSchema = z.object({
  activities: z.array(activitySchema).min(1).max(10),
  totalFootprint: z.number().nonnegative(),
});

// Insights response validation
export const insightsResponseSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      insights: z.array(z.string()).min(1),
      recommendation: z.string(),
    })
    .optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      retryable: z.boolean(),
    })
    .optional(),
});

// Sanitization utilities
export function sanitizeMessage(content: string): string {
  return content
    .trim()
    .substring(0, 5000)
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function validateAndSanitizeChat(data: unknown) {
  const parsed = chatRequestSchema.parse(data);
  return {
    ...parsed,
    messages: parsed.messages.map((msg) => ({
      ...msg,
      content: sanitizeMessage(msg.content),
    })),
  };
}

export function validateAndSanitizeInsights(data: unknown) {
  return insightsRequestSchema.parse(data);
}
