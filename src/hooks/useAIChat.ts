import { useState, useCallback, useRef, useEffect } from 'react';
import { API, LIMITS, ERROR_MESSAGES, STORAGE_KEYS } from '../constants';
import { useFetchWithRetry } from './useFetchWithRetry';
import type { ChatMessage } from '../lib/types/api.types';

export interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
}

export function useAIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { fetch, state } = useFetchWithRetry();
  const messagesRef = useRef<ChatMessage[]>([]);

  // Load messages from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CHAT_HISTORY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setMessages(parsed);
          messagesRef.current = parsed;
        }
      } catch (e) {
        console.error('[useAIChat] Failed to load chat history:', e);
      }
    }
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(messages));
        messagesRef.current = messages;
      } catch (e) {
        console.error('[useAIChat] Failed to save chat history:', e);
      }
    }
  }, [messages]);

  const validateMessage = useCallback((content: string): { valid: boolean; error?: string } => {
    if (!content.trim()) {
      return { valid: false, error: 'Message cannot be empty' };
    }
    if (content.length > LIMITS.MAX_MESSAGE_LENGTH) {
      return { valid: false, error: ERROR_MESSAGES.INVALID_INPUT };
    }
    if (messages.length >= LIMITS.MAX_MESSAGES_IN_CONVERSATION) {
      return { valid: false, error: ERROR_MESSAGES.TOKEN_LIMIT };
    }
    return { valid: true };
  }, [messages.length]);

  const sendMessage = useCallback(
    async (content: string, attachment?: ChatMessage['attachment']) => {
      const validation = validateMessage(content);
      if (!validation.valid) {
        setError(validation.error || ERROR_MESSAGES.INVALID_INPUT);
        return false;
      }

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        attachment,
        timestamp: new Date().toISOString(),
      };

      const newMessages = [...messages, userMessage];
      setMessages(newMessages);
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(API.CHAT_ENDPOINT, {
          method: 'POST',
          body: {
            messages: newMessages.map((m) => ({
              role: m.role,
              content: m.content,
              attachment: m.attachment,
            })),
          },
        });

        if (!response) {
          throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
        }

        // Type guard for response
        if (typeof response !== 'object' || response === null) {
          throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
        }

        const data = response as Record<string, unknown>;
        if (!data.reply || typeof data.reply !== 'string') {
          throw new Error('Invalid response format');
        }

        const assistantMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.reply as string,
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : ERROR_MESSAGES.NETWORK_ERROR;
        setError(errorMessage);
        // Remove the user message if sending failed
        setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [messages, validateMessage, fetch]
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
    messagesRef.current = [];
    try {
      localStorage.removeItem(STORAGE_KEYS.CHAT_HISTORY);
    } catch (e) {
      console.error('[useAIChat] Failed to clear chat history:', e);
    }
  }, []);

  const removeMessage = useCallback((messageId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearChat,
    removeMessage,
    validateMessage,
  };
}
