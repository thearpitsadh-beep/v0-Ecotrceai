import { ERROR_MESSAGES } from '../../constants';

/**
 * Custom error class with code and context
 */
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public context?: Record<string, unknown>,
    public retryable = false
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Error types
 */
export type ErrorCode =
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'RATE_LIMITED'
  | 'SERVICE_UNAVAILABLE'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'TOKEN_LIMIT'
  | 'UNKNOWN';

/**
 * Error classification
 */
export function classifyError(error: unknown): {
  code: ErrorCode;
  message: string;
  retryable: boolean;
} {
  if (error instanceof AppError) {
    return {
      code: error.code as ErrorCode,
      message: error.message,
      retryable: error.retryable,
    };
  }

  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      return {
        code: 'TIMEOUT',
        message: ERROR_MESSAGES.TIMEOUT,
        retryable: true,
      };
    }

    if (error.message.includes('Failed to fetch')) {
      return {
        code: 'NETWORK_ERROR',
        message: ERROR_MESSAGES.NETWORK_ERROR,
        retryable: true,
      };
    }

    if (error.message.includes('JSON')) {
      return {
        code: 'VALIDATION_ERROR',
        message: 'Invalid response format',
        retryable: false,
      };
    }
  }

  return {
    code: 'UNKNOWN',
    message: ERROR_MESSAGES.NETWORK_ERROR,
    retryable: true,
  };
}

/**
 * HTTP status to error code mapping
 */
export function httpStatusToErrorCode(status: number): ErrorCode {
  switch (status) {
    case 400:
      return 'VALIDATION_ERROR';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 429:
      return 'RATE_LIMITED';
    case 503:
      return 'SERVICE_UNAVAILABLE';
    default:
      return 'UNKNOWN';
  }
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(code: ErrorCode): string {
  const messages: Record<ErrorCode, string> = {
    NETWORK_ERROR: ERROR_MESSAGES.NETWORK_ERROR,
    TIMEOUT: ERROR_MESSAGES.TIMEOUT,
    RATE_LIMITED: ERROR_MESSAGES.RATE_LIMITED,
    SERVICE_UNAVAILABLE: ERROR_MESSAGES.SERVICE_UNAVAILABLE,
    VALIDATION_ERROR: ERROR_MESSAGES.INVALID_INPUT,
    NOT_FOUND: 'The requested resource was not found.',
    UNAUTHORIZED: 'You are not authorized to perform this action.',
    FORBIDDEN: 'You do not have permission to access this resource.',
    TOKEN_LIMIT: ERROR_MESSAGES.TOKEN_LIMIT,
    UNKNOWN: ERROR_MESSAGES.NETWORK_ERROR,
  };

  return messages[code];
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  const { code } = classifyError(error);
  const retryableCodes: ErrorCode[] = [
    'NETWORK_ERROR',
    'TIMEOUT',
    'RATE_LIMITED',
    'SERVICE_UNAVAILABLE',
  ];

  return retryableCodes.includes(code);
}

/**
 * Safe error logging
 */
export function logError(context: string, error: unknown): void {
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${context}]`, error);
  } else {
    // In production, you might want to send to error tracking service
    const { code, message } = classifyError(error);
    console.error(`[${context}] ${code}: ${message}`);
  }
}

/**
 * Create error from HTTP response
 */
export function createErrorFromResponse(
  status: number,
  body?: Record<string, unknown>
): AppError {
  const code = httpStatusToErrorCode(status);
  const message = body?.error ? String(body.error) : getUserFriendlyMessage(code);
  const retryable = code === 'RATE_LIMITED' || code === 'SERVICE_UNAVAILABLE';

  return new AppError(code, message, { status, body }, retryable);
}

/**
 * Catch and handle errors in async functions
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context: string
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    logError(context, error);
    return null;
  }
}
