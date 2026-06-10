import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "AQ.Ab8RN6Ku_Gc8eVpbUHhrSjq2oNKCw69Ok-dzjLJ9KRzcstYtJA" });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // AI endpoints
  app.post("/api/insights", async (req, res) => {
    try {
      const { activities, totalFootprint } = req.body;
      
      const prompt = `You are a carbon footprint reduction expert. The user has a total footprint of ${totalFootprint} kg CO2e.
      Here are their recent activities: ${JSON.stringify(activities.slice(0, 5))}.
      Provide 3 personalized insights or actionable tips to help them reduce their footprint.`;

      let response;
      let maxRetries = 2;
      for (let i = 0; i < maxRetries; i++) {
        try {
          response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    category: { type: Type.STRING, description: "One of: 'transport', 'diet', 'energy', or 'shopping'" },
                    tip: { type: Type.STRING, description: "A concise, actionable instruction" },
                    potentialSavingsKg: { type: Type.NUMBER, description: "Estimated kg of CO2e saved per month if followed" }
                  },
                  required: ["category", "tip", "potentialSavingsKg"]
                }
              }
            }
          });
          break;
        } catch (e: any) {
          if (i === maxRetries - 1) throw e;
          if (e.status === "UNAVAILABLE" || e.status === 503 || (e.message && e.message.includes("high demand"))) {
            await new Promise(res => setTimeout(res, 2000 * (i + 1))); // backoff
          } else {
            throw e;
          }
        }
      }
      
      let rawText = "[]";
      if (response && response.candidates && response.candidates.length > 0) {
        const parts = response.candidates[0].content?.parts || [];
        const textParts = parts.filter((p: any) => p.text);
        if (textParts.length > 0) {
          rawText = textParts.map((p: any) => p.text).join("");
        }
      }
      
      const insights = JSON.parse(rawText);
      res.json({ insights });
    } catch (error: any) {
      console.error("AI Insights Error:", error);
      if (error?.status === "RESOURCE_EXHAUSTED" || error?.status === 429) {
         res.status(429).json({ error: "API quota exceeded. Please wait a minute and try again." });
      } else if (error?.status === "UNAVAILABLE" || error?.status === 503 || (error?.message && error?.message.includes("high demand"))) {
         res.status(503).json({ error: "The AI model is currently experiencing high demand. Please try again in a few moments." });
      } else {
         res.status(500).json({ error: "Failed to generate insights." });
      }
    }
  });

  const logActivityTool: FunctionDeclaration = {
    name: "logActivity",
    description: "Logs a user's carbon-impacting activity to the dashboard when they explicitly mention doing it today or recently (e.g. eating food, driving, buying something, using power). Never ask for permission to log, just log it and confirm.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        type: {
          type: Type.STRING,
          description: "Strictly one of: 'transport', 'diet', 'energy', 'shopping', 'water'."
        },
        title: {
          type: Type.STRING,
          description: "Concise title of the activity, e.g. 'Drove 20 miles' or 'Ate a cheeseburger'"
        },
        co2ImpactKg: {
          type: Type.NUMBER,
          description: "The estimated CO2 footprint of this activity in kg. Examples: Car=0.4kg/mile, Flight=0.25kg/mile, Meat meal=2.5kg, Electricity=0.4kg/kWh, Water=0.001kg/gallon."
        }
      },
      required: ["type", "title", "co2ImpactKg"]
    }
  };

  app.post("/api/chat", async (req, res) => {
    try {
      const { messages } = req.body;
      const history = messages.slice(0, -1).map((m: any) => {
        const parts: any[] = [];
        if (m.content) parts.push({ text: m.content });
        if (m.attachment) parts.push({ inlineData: { mimeType: m.attachment.mimeType, data: m.attachment.data } });
        return {
          role: m.role === 'user' ? 'user' : 'model',
          parts: parts.length > 0 ? parts : [{ text: '' }]
        };
      });
      const latestMessage = messages[messages.length - 1];
      const messageParts: any[] = [];
      if (latestMessage.content) messageParts.push({ text: latestMessage.content });
      if (latestMessage.attachment) messageParts.push({ inlineData: { mimeType: latestMessage.attachment.mimeType, data: latestMessage.attachment.data } });

      const chat = ai.chats.create({
        model: "gemini-3.5-flash",
        config: {
          systemInstruction: `You are EcoBuddy, an extremely cute, friendly, and enthusiastic AI character. You act like the user's best eco-friend! Greet them warmly with emojis.
          Ask them conversational questions about their day ("What did you eat today?", "Where did you go?").
          If they upload an image, analyze it to estimate the carbon footprint.
          When they tell you an activity, analyze its environmental impact gently and describe it simply to them. Keep responses concise and fast to improve responsiveness!
          Weave optimistic reduction suggestions naturally into the conversation without being too long.
          
          CRITICAL: If the user describes a carbon-impacting activity (e.g., "I ate pizza", "I took a bus to work"), YOU MUST CALL the \`logActivity\` tool to automatically log it to their dashboard. ALWAYS run the tool call AND return a conversational text reply in the SAME response so the user gets immediate feedback.`,
          tools: [{ functionDeclarations: [logActivityTool] }]
        },
        history: history,
      });

      let maxRetries = 2;
      let response;
      for (let i = 0; i < maxRetries; i++) {
        try {
          response = await chat.sendMessage({ message: messageParts });
          break;
        } catch (e: any) {
          if (i === maxRetries - 1) throw e;
          if (e.status === "UNAVAILABLE" || e.status === 503 || (e.message && e.message.includes("high demand"))) {
            await new Promise(res => setTimeout(res, 2000 * (i + 1))); // backoff
          } else {
            throw e;
          }
        }
      }
      
      let replyText = "";
      if (response && response.candidates && response.candidates.length > 0) {
        const parts = response.candidates[0].content?.parts || [];
        const textParts = parts.filter((p: any) => p.text);
        if (textParts.length > 0) {
          replyText = textParts.map((p: any) => p.text).join("");
        }
      }
      let autoLoggedActivity = null;

      // Handle function calls
      if (response?.functionCalls && response.functionCalls.length > 0) {
        const call = response.functionCalls[0];
        if (call.name === "logActivity" && call.args) {
          autoLoggedActivity = call.args as any;
          
          if (!replyText) {
            let funcResponse;
            for (let i = 0; i < maxRetries; i++) {
              try {
                funcResponse = await chat.sendMessage({
                  message: [{
                    functionResponse: {
                      name: call.name,
                      response: { status: "success", message: "Activity successfully logged to dashboard. You can now reply to the user." }
                    }
                  }]
                });
                break;
              } catch (e: any) {
                if (i === maxRetries - 1) throw e;
                if (e.status === "UNAVAILABLE" || e.status === 503 || (e.message && e.message.includes("high demand"))) {
                  await new Promise(res => setTimeout(res, 2000 * (i + 1))); // backoff
                } else {
                  throw e;
                }
              }
            }
            if (!replyText && funcResponse && funcResponse.candidates && funcResponse.candidates.length > 0) {
              const parts = funcResponse.candidates[0].content?.parts || [];
              const textParts = parts.filter((p: any) => p.text);
              if (textParts.length > 0) {
                replyText = textParts.map((p: any) => p.text).join("");
              }
            }
          }
        }
      }

      res.json({ reply: replyText, autoLoggedActivity });
    } catch (error: any) {
      console.error("AI Chat Error:", error);
      if (error?.status === "RESOURCE_EXHAUSTED" || error?.status === 429) {
         res.status(429).json({ error: "API quota exceeded. Please wait a minute and try again." });
      } else if (error?.status === "UNAVAILABLE" || error?.status === 503 || (error?.message && error.message.includes("high demand"))) {
         res.status(503).json({ error: "The AI model is currently experiencing high demand. Please try again in a few moments." });
      } else {
         res.status(500).json({ error: "Failed to generate chat response." });
      }
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

