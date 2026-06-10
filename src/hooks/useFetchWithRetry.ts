import { useState, useCallback, useRef, useEffect } from 'react';
import { API, LIMITS } from '../constants';
import type { ApiResponse, AsyncState, RetryConfig } from '../lib/types/utility.types';

interface FetchOptions<T> {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  timeout?: number;
  retryConfig?: Partial<RetryConfig>;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  attempts: API.RETRY_ATTEMPTS,
  delayMs: API.RETRY_DELAY_MS,
  maxDelayMs: API.MAX_RETRY_DELAY_MS,
  backoffMultiplier: 2,
};

export function useFetchWithRetry<T>() {
  const [state, setState] = useState<AsyncState<T>>({ status: 'idle' });
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);

  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const fetchWithRetry = useCallback(
    async (
      url: string,
      options: FetchOptions<T> = {}
    ): Promise<T | null> => {
      const {
        method = 'GET',
        body,
        headers = {},
        timeout = API.TIMEOUT_MS,
        retryConfig = {},
      } = options;

      const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
      let lastError: Error | null = null;
      let delay = config.delayMs;

      setState({ status: 'loading' });

      for (let attempt = 0; attempt < config.attempts; attempt++) {
        try {
          cleanup();

          abortControllerRef.current = new AbortController();

          // Set timeout
          timeoutIdRef.current = setTimeout(() => {
            abortControllerRef.current?.abort();
          }, timeout);

          const response = await fetch(url, {
            method,
            headers: {
              'Content-Type': 'application/json',
              ...headers,
            },
            body: body ? JSON.stringify(body) : undefined,
            signal: abortControllerRef.current.signal,
          });

          clearTimeout(timeoutIdRef.current);

          if (!response.ok) {
            // Don't retry on 4xx errors (except 429)
            if (response.status >= 400 && response.status < 500 && response.status !== 429) {
              const error = new Error(`HTTP ${response.status}`);
              setState({
                status: 'error',
                error,
              });
              return null;
            }

            // Retryable errors: 429, 503, 5xx
            if (attempt === config.attempts - 1) {
              const error = new Error(`HTTP ${response.status}`);
              setState({
                status: 'error',
                error,
              });
              return null;
            }

            await new Promise((resolve) => setTimeout(resolve, delay));
            delay = Math.min(delay * config.backoffMultiplier, config.maxDelayMs);
            continue;
          }

          const data = (await response.json()) as T;
          setState({ status: 'success', data });
          return data;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));

          if (error instanceof Error && error.name === 'AbortError') {
            // Timeout or manual abort - only retry if not last attempt
            if (attempt === config.attempts - 1) {
              const timeoutError = new Error('Request timeout');
              setState({ status: 'error', error: timeoutError });
              return null;
            }
          }

          if (attempt === config.attempts - 1) {
            setState({ status: 'error', error: lastError });
            return null;
          }

          await new Promise((resolve) => setTimeout(resolve, delay));
          delay = Math.min(delay * config.backoffMultiplier, config.maxDelayMs);
        }
      }

      const finalError = lastError || new Error('Unknown error');
      setState({ status: 'error', error: finalError });
      return null;
    },
    [cleanup]
  );

  const reset = useCallback(() => {
    cleanup();
    setState({ status: 'idle' });
  }, [cleanup]);

  return {
    state,
    fetch: fetchWithRetry,
    reset,
    isLoading: state.status === 'loading',
    isError: state.status === 'error',
    isSuccess: state.status === 'success',
  };
}
