// middleware/errorMiddleware.js

// Custom global error handler middleware
const errorHandler = (err, req, res, next) => {
  console.error('🔥 Error:', err.message);

  // If error already has a status code, use it; else default to 500
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  res.status(statusCode).json({
    message: err.message || 'Server Error',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

module.exports = { errorHandler };
