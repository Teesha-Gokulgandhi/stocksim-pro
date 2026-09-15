const { askMarketCopilot, SYSTEM_PROMPT } = require("./copilotService");
const { askGrok } = require("./grokProvider");
const { askGemini } = require("./geminiProvider");

module.exports = {
  askMarketCopilot,
  SYSTEM_PROMPT,
  askGrok,
  askGemini,
};
