// Lightweight request logger. Deliberately dependency-free so it works
// without an `npm install` step. If you want richer structured logs
// (JSON output, log levels, file transport) later, swap this for
// pino/winston — the interface (one middleware function) stays the same.
const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const ms = Date.now() - start;
    const line = `${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`;

    if (res.statusCode >= 500) {
      console.error(line);
    } else if (res.statusCode >= 400) {
      console.warn(line);
    } else {
      console.log(line);
    }
  });

  next();
};

module.exports = requestLogger;
