/**
 * Exchange configuration constants and helpers for the Admin stock management.
 */

export const EXCHANGES = [
  {
    id: "NSE/BSE",
    label: "NSE & BSE",
    name: "Dual-Listed (NSE & BSE)",
    country: "IN",
    currency: "INR",
    flag: "🇮🇳",
    badge: "NSE & BSE Dual",
    suffix: ".NS",
    note: "Dual-listed on both National & Bombay Stock Exchanges",
    placeholder: "e.g. RELIANCE, TCS, INFY",
  },
  {
    id: "NSE",
    label: "NSE",
    name: "National Stock Exchange",
    country: "IN",
    currency: "INR",
    flag: "🇮🇳",
    badge: "NSE India",
    suffix: ".NS",
    note: "Appends .NS for live Yahoo quotes",
    placeholder: "e.g. RELIANCE, TCS, INFY",
  },
  {
    id: "BSE",
    label: "BSE",
    name: "Bombay Stock Exchange",
    country: "IN",
    currency: "INR",
    flag: "🇮🇳",
    badge: "BSE India",
    suffix: ".BO",
    note: "Appends .BO for live Yahoo quotes",
    placeholder: "e.g. 500325, TCS, INFY",
  },
  {
    id: "NYSE",
    label: "NYSE",
    name: "New York Stock Exchange",
    country: "US",
    currency: "USD",
    flag: "🇺🇸",
    badge: "NYSE Wall St",
    suffix: "",
    note: "Standard US Ticker format",
    placeholder: "e.g. IBM, DIS, KO, JNJ",
  },
  {
    id: "NASDAQ",
    label: "NASDAQ",
    name: "NASDAQ Global Market",
    country: "US",
    currency: "USD",
    flag: "🇺🇸",
    badge: "NASDAQ Tech",
    suffix: "",
    note: "Standard US Ticker format",
    placeholder: "e.g. AAPL, MSFT, GOOGL, NVDA",
  },
];

export const SECTOR_PRESETS = [
  "Information Technology",
  "Banking & Financial Services",
  "Automotive & Mobility",
  "Energy & Petrochemicals",
  "Pharmaceuticals & Healthcare",
  "Consumer Goods & FMCG",
  "Telecommunications",
  "Metals & Mining",
  "Semiconductors & AI",
  "Industrial & Infrastructure",
  "Media & Entertainment",
  "Consumer Discretionary & Retail",
];

export function getFormattedSymbol(rawSymbol, exchange) {
  if (!rawSymbol) return "";
  const s = rawSymbol.trim().toUpperCase();
  if (exchange === "NSE" || exchange === "NSE/BSE") {
    return s.endsWith(".NS") ? s : s.endsWith(".BO") ? s.replace(/\.BO$/, ".NS") : `${s}.NS`;
  }
  if (exchange === "BSE") {
    return s.endsWith(".BO") ? s : s.endsWith(".NS") ? s.replace(/\.NS$/, ".BO") : `${s}.BO`;
  }
  return s;
}
