// src/services/geminiService.ts

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
  callback(usageStats);
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

  // UPDATE: Changed model from 'gemini-1.5-flash' to 'gemini-2.5-flash'
  // If this fails, try 'gemini-pro' or 'gemini-1.5-flash-latest'
  const model = "gemini-2.5-flash"; 
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;

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
      // Log the full error to help debug if it happens again
      console.error("Gemini API Detailed Error:", errorData);
      throw new Error(errorData.error?.message || `API Error: ${response.statusText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";

    usageStats.calls++;
    usageStats.tokens += Math.ceil((prompt.length + text.length) / 4);
    notifyListeners();

    return text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I am having trouble contacting the spirits (API Error). Please try again later.";
  }
}

// --- Exported Service Functions ---

export const getRulesInsight = async (topic: string, context: string): Promise<string> => {
  const systemPrompt = "You are a helpful Daggerheart TTRPG rules assistant. Explain the rule clearly and concisely. Use markdown formatting.";
  const userPrompt = `Topic: ${topic}\nContext: ${context}\n\nPlease explain this rule or mechanic.`;
  return await callGemini(userPrompt, systemPrompt);
};

export const sendChatRuleQuery = async (userMessage: string): Promise<string> => {
  const systemPrompt = "You are a wise and helpful Guide for the Daggerheart TTRPG. Answer the player's questions about rules, character creation, or gameplay. Keep answers concise and friendly. Use markdown.";
  return await callGemini(userMessage, systemPrompt);
};
