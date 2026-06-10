// API Request/Response Types

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  sessionId?: string;
}

export interface ChatResponse {
  success: boolean;
  data?: {
    response: string;
    tokensUsed: number;
  };
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

export interface InsightsRequest {
  activities: Array<{
    type: string;
    duration: number;
    impact: number;
  }>;
  totalFootprint: number;
}

export interface InsightsResponse {
  success: boolean;
  data?: {
    insights: string[];
    recommendation: string;
  };
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

export interface GeminiStreamEvent {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

export interface GeminiResponse {
  text?: string;
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  service: string;
  action: string;
  status: 'success' | 'failure';
  duration_ms?: number;
  error_code?: string;
  error_message?: string;
  tokens_used?: number;
  user_session_id?: string;
}
