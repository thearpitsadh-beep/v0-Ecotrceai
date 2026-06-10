import express from 'express';
import path from 'path';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createServer as createViteServer } from 'vite';
import { Type, FunctionDeclaration } from '@google/genai';
import {
  chatRequestSchema,
  insightsRequestSchema,
  validateAndSanitizeChat,
  validateAndSanitizeInsights,
} from './src/lib/validation/chatbot.schemas';
import { chatbotService } from './src/lib/services/chatbot.service';
import { loggerService } from './src/lib/services/logger.service';

// Validate API key at startup
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error('ERROR: GEMINI_API_KEY environment variable is not set');
  process.exit(1);
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  skipSuccessfulRequests: false,
});

// CORS configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  optionsSuccessStatus: 200,
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Security middleware
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'https://generativelanguage.googleapis.com'],
        },
      },
      frameguard: { action: 'deny' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    })
  );

  app.use(cors(corsOptions));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));
  app.use(limiter);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Chat endpoint
  app.post('/api/chat', chatLimiter, async (req, res) => {
    try {
      // Validate request
      const validated = validateAndSanitizeChat(req.body);
      const sessionId = validated.sessionId || `session-${Date.now()}`;

      loggerService.info('chat', 'request_received', {
        user_session_id: sessionId,
        message_count: validated.messages.length,
      });

      // Call chatbot service
      const result = await chatbotService.generateResponse(validated.messages, sessionId);

      loggerService.info('chat', 'response_sent', {
        user_session_id: sessionId,
        tokens_used: result.tokensUsed,
      });

      res.json({
        success: true,
        reply: result.response,
        tokensUsed: result.tokensUsed,
      });
    } catch (error: any) {
      const code = error?.code || 'UNKNOWN_ERROR';
      const message = error?.message || 'An unexpected error occurred';
      const retryable = error?.retryable || false;

      loggerService.error('chat', 'request_failed', code, message);

      // Return standardized error response
      const statusCode = code === 'RATE_LIMITED' ? 429 : code === 'SERVICE_UNAVAILABLE' ? 503 : 500;

      res.status(statusCode).json({
        success: false,
        error: {
          code,
          message,
          retryable,
        },
      });
    }
  });

  // Insights endpoint
  app.post('/api/insights', limiter, async (req, res) => {
    try {
      // Validate request
      const validated = validateAndSanitizeInsights(req.body);
      const sessionId = `session-${Date.now()}`;

      loggerService.info('insights', 'request_received', {
        user_session_id: sessionId,
        activity_count: validated.activities.length,
      });

      // Call chatbot service
      const result = await chatbotService.generateInsights(
        validated.activities,
        validated.totalFootprint,
        sessionId
      );

      loggerService.info('insights', 'response_sent', {
        user_session_id: sessionId,
      });

      res.json({
        success: true,
        insights: result.insights,
        recommendation: result.recommendation,
      });
    } catch (error: any) {
      const code = error?.code || 'UNKNOWN_ERROR';
      const message = error?.message || 'An unexpected error occurred';
      const retryable = error?.retryable || false;

      loggerService.error('insights', 'request_failed', code, message);

      const statusCode = code === 'RATE_LIMITED' ? 429 : code === 'SERVICE_UNAVAILABLE' ? 503 : 500;

      res.status(statusCode).json({
        success: false,
        error: {
          code,
          message,
          retryable,
        },
      });
    }
  });

  // Logs endpoint for debugging
  app.get('/api/logs', (req, res) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Not available in production' });
    }

    const limit = parseInt(req.query.limit as string, 10) || 50;
    const logs = loggerService.getLogs({ limit });
    const stats = loggerService.getQuotaStats();

    res.json({ logs, stats });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    loggerService.info('server', 'started', { port: PORT });
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
