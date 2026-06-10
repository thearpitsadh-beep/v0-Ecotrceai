import { GoogleGenAI } from '@google/genai';
import { ChatMessage, RetryConfig, GeminiResponse } from '../types/api.types';
import { loggerService } from './logger.service';

class ChatbotService {
  private ai: GoogleGenAI;
  private retryConfig: RetryConfig = {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 16000,
    backoffMultiplier: 2,
  };

  private tokenEstimate = 0;
  private model = 'gemini-2.0-flash';

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY is required');
    }
    this.ai = new GoogleGenAI({ apiKey: key });
  }

  /**
   * Generate response with retry logic and error handling
   */
  async generateResponse(
    messages: ChatMessage[],
    sessionId?: string
  ): Promise<{ response: string; tokensUsed: number }> {
    const startTime = Date.now();

    try {
      // Estimate tokens to prevent quota issues
      const estimatedTokens = this.estimateTokens(messages);
      if (estimatedTokens > 30000) {
        throw {
          code: 'TOKEN_LIMIT_EXCEEDED',
          message:
            'Request exceeds token limit. Please clear conversation history.',
          retryable: false,
        };
      }

      // Prepare system prompt
      const systemPrompt = `You are EcoBuddy, a friendly AI assistant helping users reduce their carbon footprint.
      
Guidelines:
- Provide actionable, specific advice tailored to the user's activities
- Be encouraging and positive about sustainability
- Give concrete numbers and statistics when relevant
- Keep responses concise (2-3 paragraphs max)
- If unsure about carbon impact, provide realistic estimates`;

      const conversationHistory = messages
        .slice(-10) // Keep last 10 messages to save tokens
        .map((msg) => ({
          role: msg.role,
          parts: [{ text: msg.content }],
        }));

      const response = await this.retryWithBackoff(async () => {
        const result = await this.ai
          .getGenerativeModel({ model: this.model })
          .generateContent({
            systemInstruction: systemPrompt,
            contents: conversationHistory,
          });

        return result;
      });

      const responseText = this.extractText(response);
      const tokensUsed = this.estimateTokens([
        { role: 'user', content: messages[messages.length - 1].content },
        { role: 'assistant', content: responseText },
      ]);

      loggerService.info('chatbot', 'generate_response_success', {
        duration_ms: Date.now() - startTime,
        tokens_used: tokensUsed,
        user_session_id: sessionId,
      });

      return {
        response: responseText,
        tokensUsed,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorCode = this.getErrorCode(error);
      const errorMessage = this.getErrorMessage(error);
      const retryable = this.isRetryableError(errorCode);

      loggerService.error(
        'chatbot',
        'generate_response_failed',
        errorCode,
        errorMessage,
        {
          duration_ms: duration,
          user_session_id: sessionId,
        }
      );

      throw {
        code: errorCode,
        message: this.getUserFriendlyMessage(errorCode, errorMessage),
        retryable,
      };
    }
  }

  /**
   * Generate insights with error handling
   */
  async generateInsights(
    activities: Array<{ type: string; duration: number; impact: number }>,
    totalFootprint: number,
    sessionId?: string
  ): Promise<{ insights: string[]; recommendation: string }> {
    const startTime = Date.now();

    try {
      const prompt = `Analyze these carbon footprint activities and provide 3 personalized insights:
      
Activities: ${JSON.stringify(activities)}
Total Footprint: ${totalFootprint} kg CO2e

Provide insights as a JSON object with:
{
  "insights": ["insight1", "insight2", "insight3"],
  "recommendation": "main_recommendation"
}`;

      const response = await this.retryWithBackoff(async () => {
        return await this.ai
          .getGenerativeModel({ model: this.model })
          .generateContent(prompt);
      });

      const responseText = this.extractText(response);
      const parsed = this.parseJSON(responseText);

      loggerService.info('chatbot', 'generate_insights_success', {
        duration_ms: Date.now() - startTime,
        user_session_id: sessionId,
      });

      return {
        insights: parsed.insights || [],
        recommendation: parsed.recommendation || '',
      };
    } catch (error) {
      const errorCode = this.getErrorCode(error);
      const errorMessage = this.getErrorMessage(error);

      loggerService.error(
        'chatbot',
        'generate_insights_failed',
        errorCode,
        errorMessage,
        {
          duration_ms: Date.now() - startTime,
          user_session_id: sessionId,
        }
      );

      throw {
        code: errorCode,
        message: this.getUserFriendlyMessage(errorCode, errorMessage),
        retryable: this.isRetryableError(errorCode),
      };
    }
  }

  /**
   * Retry with exponential backoff
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>
  ): Promise<T> {
    let lastError: any;
    let delay = this.retryConfig.initialDelayMs;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        const code = this.getErrorCode(error);

        // Don't retry non-retryable errors
        if (!this.isRetryableError(code)) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === this.retryConfig.maxRetries) {
          break;
        }

        // Add jitter to prevent thundering herd
        const jitter = Math.random() * 0.1 * delay;
        const waitTime = Math.min(
          delay + jitter,
          this.retryConfig.maxDelayMs
        );

        await this.sleep(waitTime);
        delay = Math.min(
          delay * this.retryConfig.backoffMultiplier,
          this.retryConfig.maxDelayMs
        );

        loggerService.debug('chatbot', `retry_attempt_${attempt + 1}`);
      }
    }

    throw lastError;
  }

  /**
   * Extract text from Gemini response
   */
  private extractText(response: any): string {
    try {
      if (response.text) return response.text;
      if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
        return response.candidates[0].content.parts[0].text;
      }
      throw new Error('Invalid response structure');
    } catch {
      throw {
        code: 'RESPONSE_PARSE_ERROR',
        message: 'Failed to parse API response',
        retryable: false,
      };
    }
  }

  /**
   * Parse JSON from text safely
   */
  private parseJSON(text: string): any {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { insights: [], recommendation: text };
      }
      return JSON.parse(jsonMatch[0]);
    } catch {
      return { insights: [], recommendation: text };
    }
  }

  /**
   * Estimate tokens (rough calculation)
   */
  private estimateTokens(messages: ChatMessage[]): number {
    // Rough estimate: 1 token ≈ 4 characters
    const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0);
    return Math.ceil(totalChars / 4);
  }

  /**
   * Determine error code
   */
  private getErrorCode(error: any): string {
    if (typeof error === 'object' && error?.code) {
      return error.code;
    }
    if (error?.status === 429) return 'RATE_LIMITED';
    if (error?.status === 503) return 'SERVICE_UNAVAILABLE';
    if (error?.status === 401) return 'UNAUTHORIZED';
    if (error?.message?.includes('timeout')) return 'TIMEOUT';
    return 'API_ERROR';
  }

  /**
   * Get error message
   */
  private getErrorMessage(error: any): string {
    return error?.message || String(error);
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(code: string): boolean {
    return ['RATE_LIMITED', 'SERVICE_UNAVAILABLE', 'TIMEOUT', 'API_ERROR'].includes(code);
  }

  /**
   * Get user-friendly error message
   */
  private getUserFriendlyMessage(code: string, _fallback: string): string {
    const messages: Record<string, string> = {
      RATE_LIMITED:
        'The AI is busy right now. Please try again in a moment.',
      SERVICE_UNAVAILABLE:
        'The AI service is temporarily unavailable. Please try again soon.',
      UNAUTHORIZED:
        'There\'s an authentication issue. Please refresh and try again.',
      TIMEOUT:
        'The request took too long. Please try again with a shorter message.',
      TOKEN_LIMIT_EXCEEDED:
        'Your conversation is too long. Please start a new chat.',
      RESPONSE_PARSE_ERROR:
        'There was an issue processing the response. Please try again.',
      API_ERROR:
        'Something went wrong with the AI service. Please try again.',
    };

    return messages[code] || messages.API_ERROR;
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const chatbotService = new ChatbotService();
