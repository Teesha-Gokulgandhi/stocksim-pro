const axios = require("axios");

/**
 * Google Gemini Pool Provider
 * Tier 2 Automatic Failover Pool (gemini-flash-latest, gemini-3.6-flash, gemini-3.5-flash)
 */
const askGemini = async ({ systemPrompt, contextBlock, userQuery }) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.startsWith("CHANGE_ME") || apiKey.trim() === "") {
    return null;
  }

  const activeGeminiModels = [
    "gemini-flash-latest",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
  ];

  const fullInstruction = contextBlock
    ? `${systemPrompt}\n\n### Live Platform Context:\n${contextBlock}`
    : systemPrompt;

  const payload = {
    systemInstruction: { parts: [{ text: fullInstruction }] },
    contents: [{ role: "user", parts: [{ text: userQuery }] }],
    generationConfig: {
      temperature: 0.35,
      maxOutputTokens: 1500,
      topP: 0.9,
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
    ],
  };

  for (const modelName of activeGeminiModels) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const response = await axios.post(endpoint, payload, {
        timeout: 7000,
        headers: { "Content-Type": "application/json" },
      });
      const candidateText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (candidateText && candidateText.trim().length > 0) {
        return { text: candidateText.trim(), source: modelName };
      }
    } catch (err) {
      console.warn(`Gemini model ${modelName} unavailable (${err.response?.status || err.message}), trying next...`);
    }
  }

  return null;
};

module.exports = { askGemini };
