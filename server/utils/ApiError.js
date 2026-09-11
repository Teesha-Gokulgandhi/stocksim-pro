// Standard application error carrying an HTTP status code.
// Throw this from anywhere (controllers, services) and the central
// error handler in index.js will turn it into a consistent JSON response.
class ApiError extends Error {
  constructor(statusCode, message, details = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ApiError;
