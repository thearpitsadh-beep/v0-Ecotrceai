import type { CarbonActivity, Message } from '../types/api.types';

/**
 * Type guard for CarbonActivity
 */
export function isCarbonActivity(obj: unknown): obj is CarbonActivity {
  if (!obj || typeof obj !== 'object') return false;

  const activity = obj as Record<string, unknown>;

  return (
    typeof activity.type === 'string' &&
    typeof activity.duration === 'number' &&
    typeof activity.impact === 'number' &&
    activity.duration >= 0 &&
    activity.impact >= 0 &&
    typeof activity.timestamp === 'string'
  );
}

/**
 * Type guard for Message
 */
export function isMessage(obj: unknown): obj is Message {
  if (!obj || typeof obj !== 'object') return false;

  const message = obj as Record<string, unknown>;

  return (
    typeof message.id === 'string' &&
    (message.role === 'user' || message.role === 'assistant' || message.role === 'model') &&
    typeof message.content === 'string' &&
    (typeof message.timestamp === 'string' || message.timestamp === undefined)
  );
}

/**
 * Type guard for Error objects
 */
export function isError(obj: unknown): obj is Error {
  return obj instanceof Error;
}

/**
 * Type guard for string arrays
 */
export function isStringArray(obj: unknown): obj is string[] {
  return Array.isArray(obj) && obj.every((item) => typeof item === 'string');
}

/**
 * Type guard for numbers
 */
export function isNumber(obj: unknown): obj is number {
  return typeof obj === 'number' && !isNaN(obj) && isFinite(obj);
}

/**
 * Type guard for positive numbers
 */
export function isPositiveNumber(obj: unknown): obj is number {
  return isNumber(obj) && obj > 0;
}

/**
 * Type guard for non-negative numbers
 */
export function isNonNegativeNumber(obj: unknown): obj is number {
  return isNumber(obj) && obj >= 0;
}

/**
 * Type guard for objects with specific keys
 */
export function hasKeys<K extends PropertyKey>(
  obj: unknown,
  ...keys: K[]
): obj is Record<K, unknown> {
  if (!obj || typeof obj !== 'object') return false;

  return keys.every((key) => key in obj);
}

/**
 * Type guard for fetch response
 */
export function isJsonResponse(
  obj: unknown
): obj is Record<string, unknown> {
  return obj !== null && typeof obj === 'object';
}

/**
 * Type assertion helper - throws if condition is false
 */
export function assert(
  condition: unknown,
  message: string
): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

/**
 * Type assertion helper for exhaustive checks
 */
export function exhaustive(_: never): never {
  throw new Error('Unhandled case in exhaustive switch');
}

/**
 * Safe type cast with validation
 */
export function safeCast<T>(
  value: unknown,
  typeGuard: (v: unknown) => v is T,
  fallback: T
): T {
  return typeGuard(value) ? value : fallback;
}

/**
 * Parse JSON safely with type guard
 */
export function safeJsonParse<T>(
  json: string,
  typeGuard: (v: unknown) => v is T,
  fallback: T
): T {
  try {
    const parsed = JSON.parse(json);
    return typeGuard(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}
