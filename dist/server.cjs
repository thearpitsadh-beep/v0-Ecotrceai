var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_helmet = __toESM(require("helmet"), 1);
var import_cors = __toESM(require("cors"), 1);
var import_express_rate_limit = __toESM(require("express-rate-limit"), 1);
var import_vite = require("vite");

// src/lib/validation/chatbot.schemas.ts
var import_zod = require("zod");
var chatMessageSchema = import_zod.z.object({
  role: import_zod.z.enum(["user", "assistant"]),
  content: import_zod.z.string().min(1).max(5e3)
});
var chatRequestSchema = import_zod.z.object({
  messages: import_zod.z.array(chatMessageSchema).min(1).max(50),
  sessionId: import_zod.z.string().optional()
});
var chatResponseSchema = import_zod.z.object({
  success: import_zod.z.boolean(),
  data: import_zod.z.object({
    response: import_zod.z.string(),
    tokensUsed: import_zod.z.number().int().positive()
  }).optional(),
  error: import_zod.z.object({
    code: import_zod.z.string(),
    message: import_zod.z.string(),
    retryable: import_zod.z.boolean()
  }).optional()
});
var activitySchema = import_zod.z.object({
  type: import_zod.z.string().min(1).max(100),
  duration: import_zod.z.number().positive(),
  impact: import_zod.z.number().nonnegative()
});
var insightsRequestSchema = import_zod.z.object({
  activities: import_zod.z.array(activitySchema).min(1).max(10),
  totalFootprint: import_zod.z.number().nonnegative()
});
var insightsResponseSchema = import_zod.z.object({
  success: import_zod.z.boolean(),
  data: import_zod.z.object({
    insights: import_zod.z.array(import_zod.z.string()).min(1),
    recommendation: import_zod.z.string()
  }).optional(),
  error: import_zod.z.object({
    code: import_zod.z.string(),
    message: import_zod.z.string(),
    retryable: import_zod.z.boolean()
  }).optional()
});
function sanitizeMessage(content) {
  return content.trim().substring(0, 5e3).replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function validateAndSanitizeChat(data) {
  const parsed = chatRequestSchema.parse(data);
  return {
    ...parsed,
    messages: parsed.messages.map((msg) => ({
      ...msg,
      content: sanitizeMessage(msg.content)
    }))
  };
}
function validateAndSanitizeInsights(data) {
  return insightsRequestSchema.parse(data);
}

// src/lib/services/chatbot.service.ts
var import_genai = require("@google/genai");

// src/lib/services/logger.service.ts
var LoggerService = class {
  constructor() {
    this.isDev = process.env.NODE_ENV !== "production";
    this.logs = [];
  }
  log(entry) {
    const fullEntry = {
      ...entry,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.logs.push(fullEntry);
    if (this.isDev) {
      const prefix = `[${fullEntry.service}] ${fullEntry.action}`;
      switch (fullEntry.level) {
        case "error":
          console.error(
            prefix,
            fullEntry.error_code ? `(${fullEntry.error_code})` : "",
            fullEntry.error_message || ""
          );
          break;
        case "warn":
          console.warn(prefix, fullEntry);
          break;
        case "debug":
          console.debug(prefix, fullEntry);
          break;
        default:
          console.log(prefix, fullEntry);
      }
    }
  }
  info(service, action, metadata) {
    this.log({
      level: "info",
      service,
      action,
      status: "success",
      ...metadata
    });
  }
  warn(service, action, metadata) {
    this.log({
      level: "warn",
      service,
      action,
      status: "failure",
      ...metadata
    });
  }
  error(service, action, code, message, metadata) {
    this.log({
      level: "error",
      service,
      action,
      status: "failure",
      error_code: code,
      error_message: message,
      ...metadata
    });
  }
  debug(service, action, metadata) {
    this.log({
      level: "debug",
      service,
      action,
      status: "success",
      ...metadata
    });
  }
  // Get logs for analysis (in production, send to external logging service)
  getLogs(filter) {
    let filtered = [...this.logs];
    if (filter?.level) {
      filtered = filtered.filter((l) => l.level === filter.level);
    }
    if (filter?.service) {
      filtered = filtered.filter((l) => l.service === filter.service);
    }
    const limit = filter?.limit || 100;
    return filtered.slice(-limit);
  }
  // Get quota usage stats
  getQuotaStats() {
    const now = /* @__PURE__ */ new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1e3);
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1e3);
    const recentHour = this.logs.filter((l) => new Date(l.timestamp) > hourAgo);
    const recentDay = this.logs.filter((l) => new Date(l.timestamp) > dayAgo);
    return {
      lastHour: {
        requests: recentHour.length,
        tokens: recentHour.reduce((sum, l) => sum + (l.tokens_used || 0), 0),
        errors: recentHour.filter((l) => l.status === "failure").length
      },
      lastDay: {
        requests: recentDay.length,
        tokens: recentDay.reduce((sum, l) => sum + (l.tokens_used || 0), 0),
        errors: recentDay.filter((l) => l.status === "failure").length
      }
    };
  }
};
var loggerService = new LoggerService();

// src/lib/services/chatbot.service.ts
var ChatbotService = class {
  constructor(apiKey) {
    this.retryConfig = {
      maxRetries: 3,
      initialDelayMs: 1e3,
      maxDelayMs: 16e3,
      backoffMultiplier: 2
    };
    this.tokenEstimate = 0;
    this.model = "gemini-2.0-flash";
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is required");
    }
    this.ai = new import_genai.GoogleGenAI({ apiKey: key });
  }
  /**
   * Generate response with retry logic and error handling
   */
  async generateResponse(messages, sessionId) {
    const startTime = Date.now();
    try {
      const estimatedTokens = this.estimateTokens(messages);
      if (estimatedTokens > 3e4) {
        throw {
          code: "TOKEN_LIMIT_EXCEEDED",
          message: "Request exceeds token limit. Please clear conversation history.",
          retryable: false
        };
      }
      const systemPrompt = `You are EcoBuddy, a friendly AI assistant helping users reduce their carbon footprint.
      
Guidelines:
- Provide actionable, specific advice tailored to the user's activities
- Be encouraging and positive about sustainability
- Give concrete numbers and statistics when relevant
- Keep responses concise (2-3 paragraphs max)
- If unsure about carbon impact, provide realistic estimates`;
      const conversationHistory = messages.slice(-10).map((msg) => ({
        role: msg.role,
        parts: [{ text: msg.content }]
      }));
      const response = await this.retryWithBackoff(async () => {
        const result = await this.ai.getGenerativeModel({ model: this.model }).generateContent({
          systemInstruction: systemPrompt,
          contents: conversationHistory
        });
        return result;
      });
      const responseText = this.extractText(response);
      const tokensUsed = this.estimateTokens([
        { role: "user", content: messages[messages.length - 1].content },
        { role: "assistant", content: responseText }
      ]);
      loggerService.info("chatbot", "generate_response_success", {
        duration_ms: Date.now() - startTime,
        tokens_used: tokensUsed,
        user_session_id: sessionId
      });
      return {
        response: responseText,
        tokensUsed
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorCode = this.getErrorCode(error);
      const errorMessage = this.getErrorMessage(error);
      const retryable = this.isRetryableError(errorCode);
      loggerService.error(
        "chatbot",
        "generate_response_failed",
        errorCode,
        errorMessage,
        {
          duration_ms: duration,
          user_session_id: sessionId
        }
      );
      throw {
        code: errorCode,
        message: this.getUserFriendlyMessage(errorCode, errorMessage),
        retryable
      };
    }
  }
  /**
   * Generate insights with error handling
   */
  async generateInsights(activities, totalFootprint, sessionId) {
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
        return await this.ai.getGenerativeModel({ model: this.model }).generateContent(prompt);
      });
      const responseText = this.extractText(response);
      const parsed = this.parseJSON(responseText);
      loggerService.info("chatbot", "generate_insights_success", {
        duration_ms: Date.now() - startTime,
        user_session_id: sessionId
      });
      return {
        insights: parsed.insights || [],
        recommendation: parsed.recommendation || ""
      };
    } catch (error) {
      const errorCode = this.getErrorCode(error);
      const errorMessage = this.getErrorMessage(error);
      loggerService.error(
        "chatbot",
        "generate_insights_failed",
        errorCode,
        errorMessage,
        {
          duration_ms: Date.now() - startTime,
          user_session_id: sessionId
        }
      );
      throw {
        code: errorCode,
        message: this.getUserFriendlyMessage(errorCode, errorMessage),
        retryable: this.isRetryableError(errorCode)
      };
    }
  }
  /**
   * Retry with exponential backoff
   */
  async retryWithBackoff(fn) {
    let lastError;
    let delay = this.retryConfig.initialDelayMs;
    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        const code = this.getErrorCode(error);
        if (!this.isRetryableError(code)) {
          throw error;
        }
        if (attempt === this.retryConfig.maxRetries) {
          break;
        }
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
        loggerService.debug("chatbot", `retry_attempt_${attempt + 1}`);
      }
    }
    throw lastError;
  }
  /**
   * Extract text from Gemini response
   */
  extractText(response) {
    try {
      if (response.text) return response.text;
      if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
        return response.candidates[0].content.parts[0].text;
      }
      throw new Error("Invalid response structure");
    } catch {
      throw {
        code: "RESPONSE_PARSE_ERROR",
        message: "Failed to parse API response",
        retryable: false
      };
    }
  }
  /**
   * Parse JSON from text safely
   */
  parseJSON(text) {
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
  estimateTokens(messages) {
    const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0);
    return Math.ceil(totalChars / 4);
  }
  /**
   * Determine error code
   */
  getErrorCode(error) {
    if (typeof error === "object" && error?.code) {
      return error.code;
    }
    if (error?.status === 429) return "RATE_LIMITED";
    if (error?.status === 503) return "SERVICE_UNAVAILABLE";
    if (error?.status === 401) return "UNAUTHORIZED";
    if (error?.message?.includes("timeout")) return "TIMEOUT";
    return "API_ERROR";
  }
  /**
   * Get error message
   */
  getErrorMessage(error) {
    return error?.message || String(error);
  }
  /**
   * Check if error is retryable
   */
  isRetryableError(code) {
    return ["RATE_LIMITED", "SERVICE_UNAVAILABLE", "TIMEOUT", "API_ERROR"].includes(code);
  }
  /**
   * Get user-friendly error message
   */
  getUserFriendlyMessage(code, _fallback) {
    const messages = {
      RATE_LIMITED: "The AI is busy right now. Please try again in a moment.",
      SERVICE_UNAVAILABLE: "The AI service is temporarily unavailable. Please try again soon.",
      UNAUTHORIZED: "There's an authentication issue. Please refresh and try again.",
      TIMEOUT: "The request took too long. Please try again with a shorter message.",
      TOKEN_LIMIT_EXCEEDED: "Your conversation is too long. Please start a new chat.",
      RESPONSE_PARSE_ERROR: "There was an issue processing the response. Please try again.",
      API_ERROR: "Something went wrong with the AI service. Please try again."
    };
    return messages[code] || messages.API_ERROR;
  }
  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
};
var chatbotService = new ChatbotService();

// server.ts
var API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error("ERROR: GEMINI_API_KEY environment variable is not set");
  process.exit(1);
}
var limiter = (0, import_express_rate_limit.default)({
  windowMs: 15 * 60 * 1e3,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});
var chatLimiter = (0, import_express_rate_limit.default)({
  windowMs: 60 * 1e3,
  max: 30,
  skipSuccessfulRequests: false
});
var corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:3000", "http://localhost:5173"],
  credentials: true,
  optionsSuccessStatus: 200
};
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(
    (0, import_helmet.default)({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "https://generativelanguage.googleapis.com"]
        }
      },
      frameguard: { action: "deny" },
      referrerPolicy: { policy: "strict-origin-when-cross-origin" }
    })
  );
  app.use((0, import_cors.default)(corsOptions));
  app.use(import_express.default.json({ limit: "10mb" }));
  app.use(import_express.default.urlencoded({ limit: "10mb", extended: true }));
  app.use(limiter);
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app.post("/api/chat", chatLimiter, async (req, res) => {
    try {
      const validated = validateAndSanitizeChat(req.body);
      const sessionId = validated.sessionId || `session-${Date.now()}`;
      loggerService.info("chat", "request_received", {
        user_session_id: sessionId,
        message_count: validated.messages.length
      });
      const result = await chatbotService.generateResponse(validated.messages, sessionId);
      loggerService.info("chat", "response_sent", {
        user_session_id: sessionId,
        tokens_used: result.tokensUsed
      });
      res.json({
        success: true,
        reply: result.response,
        tokensUsed: result.tokensUsed
      });
    } catch (error) {
      const code = error?.code || "UNKNOWN_ERROR";
      const message = error?.message || "An unexpected error occurred";
      const retryable = error?.retryable || false;
      loggerService.error("chat", "request_failed", code, message);
      const statusCode = code === "RATE_LIMITED" ? 429 : code === "SERVICE_UNAVAILABLE" ? 503 : 500;
      res.status(statusCode).json({
        success: false,
        error: {
          code,
          message,
          retryable
        }
      });
    }
  });
  app.post("/api/insights", limiter, async (req, res) => {
    try {
      const validated = validateAndSanitizeInsights(req.body);
      const sessionId = `session-${Date.now()}`;
      loggerService.info("insights", "request_received", {
        user_session_id: sessionId,
        activity_count: validated.activities.length
      });
      const result = await chatbotService.generateInsights(
        validated.activities,
        validated.totalFootprint,
        sessionId
      );
      loggerService.info("insights", "response_sent", {
        user_session_id: sessionId
      });
      res.json({
        success: true,
        insights: result.insights,
        recommendation: result.recommendation
      });
    } catch (error) {
      const code = error?.code || "UNKNOWN_ERROR";
      const message = error?.message || "An unexpected error occurred";
      const retryable = error?.retryable || false;
      loggerService.error("insights", "request_failed", code, message);
      const statusCode = code === "RATE_LIMITED" ? 429 : code === "SERVICE_UNAVAILABLE" ? 503 : 500;
      res.status(statusCode).json({
        success: false,
        error: {
          code,
          message,
          retryable
        }
      });
    }
  });
  app.get("/api/logs", (req, res) => {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({ error: "Not available in production" });
    }
    const limit = parseInt(req.query.limit, 10) || 50;
    const logs = loggerService.getLogs({ limit });
    const stats = loggerService.getQuotaStats();
    res.json({ logs, stats });
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    loggerService.info("server", "started", { port: PORT });
  });
}
startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
//# sourceMappingURL=server.cjs.map
