// Async states
export type AsyncState<T> = 
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

// Discriminated union for better type safety
export type ApiResponse<T> = 
  | { success: true; data: T }
  | { success: false; error: string; code: string };

// Retry configuration
export interface RetryConfig {
  attempts: number;
  delayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

// File upload validation
export interface FileValidationResult {
  valid: boolean;
  error?: string;
  file?: File;
}

// Accessibility attributes
export interface AriaAttributes {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-required'?: boolean;
  'aria-invalid'?: boolean;
  'aria-live'?: 'polite' | 'assertive' | 'off';
  'aria-atomic'?: boolean;
  'aria-busy'?: boolean;
  'aria-hidden'?: boolean;
  'aria-expanded'?: boolean;
  'aria-selected'?: boolean;
  'aria-checked'?: boolean | 'mixed';
  'aria-disabled'?: boolean;
}

// Component props with accessibility
export interface AccessibleComponentProps {
  id?: string;
  className?: string;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  role?: string;
  tabIndex?: number;
}

// Pagination
export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

// Filter and sort
export interface FilterOption<T> {
  value: T;
  label: string;
}

export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

// Notification
export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
}

// Cache configuration
export interface CacheConfig {
  ttlMs: number;
  maxSize: number;
}

// Type guards
export const isAsyncStateSuccess = <T>(
  state: AsyncState<T>
): state is { status: 'success'; data: T } => {
  return state.status === 'success';
};

export const isAsyncStateError = <T>(
  state: AsyncState<T>
): state is { status: 'error'; error: Error } => {
  return state.status === 'error';
};

export const isApiResponseSuccess = <T>(
  response: ApiResponse<T>
): response is { success: true; data: T } => {
  return response.success === true;
};

export const isApiResponseError = <T>(
  response: ApiResponse<T>
): response is { success: false; error: string; code: string } => {
  return response.success === false;
};
