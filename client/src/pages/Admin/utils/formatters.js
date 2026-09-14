/**
 * Shared formatting utilities for the Admin panel.
 */

export function formatINR(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatUSD(amount) {
  return `$${Number(amount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatIST(dateVal) {
  if (!dateVal) return "—";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    const formatted = d.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
    return formatted.replace(/\b([ap]m)\b/gi, (m) => m.toUpperCase()) + " IST";
  } catch (e) {
    return String(dateVal);
  }
}

export function formatISTShort(dateVal) {
  if (!dateVal) return "—";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    const formatted = d.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return formatted.replace(/\b([ap]m)\b/gi, (m) => m.toUpperCase());
  } catch (e) {
    return String(dateVal);
  }
}

export function formatISTDate(dateVal) {
  if (!dateVal) return "—";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch (e) {
    return String(dateVal);
  }
}

export function formatAuditDetails(details) {
  if (!details || typeof details !== "string") return details || "—";
  // Dynamically replace any ISO UTC timestamp (e.g. 2026-09-13T21:13:33.613Z) with clean IST format
  return details.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/g, (isoStr) => {
    return formatIST(isoStr);
  });
}
