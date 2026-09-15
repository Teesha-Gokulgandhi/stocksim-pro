const axios = require("axios");

/**
 * Grok / Groq High-Speed LPU Engine Provider
 * Tier 1 Primary AI Engine for sub-second responses (~0.8s inference)
 */
const askGrok = async ({ systemPrompt, contextBlock, userQuery }) => {
  const grokApiKey = process.env.GROQ_API_KEY || process.env.GROK_API_KEY;
  if (!grokApiKey || grokApiKey.startsWith("CHANGE_ME") || grokApiKey.trim() === "") {
    return null;
  }

  const endpoint = "https://api.groq.com/openai/v1/chat/completions";
  const grokModels = ["openai/gpt-oss-120b", "qwen/qwen3.8-27b", "groq/compound"];

  // Inject system directives and live market/portfolio context into system message
  const fullSystemPrompt = contextBlock 
    ? `${systemPrompt}\n\n### Live Platform Context:\n${contextBlock}`
    : systemPrompt;

  const messages = [
    { role: "system", content: fullSystemPrompt },
    { role: "user", content: userQuery },
  ];

  for (const model of grokModels) {
    try {
      const response = await axios.post(
        endpoint,
        {
          model,
          messages,
          temperature: 0.35,
          max_tokens: 1500,
        },
        {
          timeout: 9000,
          headers: {
            Authorization: `Bearer ${grokApiKey}`,
            "Content-Type": "application/json",
          },
        }
      );
      const text = response.data?.choices?.[0]?.message?.content;
      if (text && text.trim().length > 0) {
        return { text: text.trim(), source: "grok-engine" };
      }
    } catch (err) {
      console.warn(`Grok/Groq model ${model} unavailable (${err.response?.status || err.message}), trying next...`);
    }
  }

  return null;
};

module.exports = { askGrok };
