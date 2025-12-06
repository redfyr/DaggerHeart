// src/services/geminiService.ts

// Access the key defined in vite.config.ts
const API_KEY = process.env.GEMINI_API_KEY || '';

// --- Usage Stats Tracking ---
type UsageCallback = (stats: { calls: number; tokens: number }) => void;
const listeners: UsageCallback[] = [];
let usageStats = { calls: 0, tokens: 0 };

const notifyListeners = () => {
  listeners.forEach((l) => l(usageStats));
};

export const subscribeToUsage = (callback: UsageCallback) => {
  listeners.push(callback);
  callback(usageStats); // Initial call
  return () => {
    const index = listeners.indexOf(callback);
    if (index > -1) listeners.splice(index, 1);
  };
};

// --- API Helper ---
async function callGemini(prompt: string, systemInstruction?: string): Promise<string> {
  if (!API_KEY) {
    console.error("Gemini API Key is missing");
    return "Error: API Key is missing. Please check your .env file.";
  }

  // Using the REST API directly to avoid Node.js SDK polyfill issues in Vite
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Unknown API Error");
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";

    // Update stats
    usageStats.calls++;
    // Estimate tokens (roughly 4 chars per token)
    usageStats.tokens += Math.ceil((prompt.length + text.length) / 4);
    notifyListeners();

    return text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I am having trouble contacting the spirits (API Error). Please try again later.";
  }
}

// --- Exported Service Functions ---

/**
 * Gets specific insights about a Daggerheart rule or mechanic.
 */
export const getRulesInsight = async (topic: string, context: string): Promise<string> => {
  const systemPrompt = 
    "You are a helpful Daggerheart TTRPG rules assistant. " +
    "Explain the rule clearly and concisely. Use markdown formatting.";
  
  const userPrompt = `Topic: ${topic}\nContext: ${context}\n\nPlease explain this rule or mechanic.`;
  
  return await callGemini(userPrompt, systemPrompt);
};

/**
 * Handles the general chat query for the ChatWidget.
 */
export const sendChatRuleQuery = async (userMessage: string): Promise<string> => {
  const systemPrompt = 
    "You are a wise and helpful Guide for the Daggerheart TTRPG. " +
    "Answer the player's questions about rules, character creation, or gameplay. " +
    "Keep answers concise and friendly. Use markdown for clarity.";

  return await callGemini(userMessage, systemPrompt);
};
