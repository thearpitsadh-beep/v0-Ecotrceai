import { z } from 'zod';

// Activity validation schema
export const ActivitySchema = z.object({
  id: z.string().uuid().optional(),
  type: z.enum(['transportation', 'energy', 'waste', 'food']),
  duration: z.number().positive('Duration must be positive'),
  impact: z.number().nonnegative('Impact must be non-negative'),
  category: z.string().min(1, 'Category is required'),
  details: z.string().max(500, 'Details must be less than 500 characters').optional(),
  timestamp: z.number().optional(),
});

export type Activity = z.infer<typeof ActivitySchema>;

// Chat message validation schema
export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1, 'Message cannot be empty').max(5000, 'Message too long'),
  timestamp: z.number().optional(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

// Validation utility functions
export const safeValidate = <T>(schema: z.ZodSchema<T>, data: unknown): { success: boolean; data?: T; error?: string } => {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: 'Validation failed' };
  }
};
