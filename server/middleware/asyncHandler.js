// Wraps an async route handler so thrown errors / rejected promises
// are forwarded to Express's error-handling middleware instead of
// requiring a try/catch in every controller.
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
