// A small, dependency-free stand-in for the headers `helmet` would set.
// Particularly important now that there's an admin panel: X-Frame-Options
// stops this app (including /admin) from being loaded inside an <iframe>
// on an attacker's site for a clickjacking attack.
const securityHeaders = (req, res, next) => {
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "geolocation=(), camera=(), microphone=()");
  // HSTS only makes sense once you're actually served over HTTPS (the
  // header is ignored over plain HTTP, and setting it locally is harmless).
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  next();
};

module.exports = securityHeaders;
