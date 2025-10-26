// middleware/errorMiddleware.js (Refactored: Added JWT-specific handling)
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  console.error('❌ Global Error:', {
    message: error.message,
    stack: err.stack,
    path: req.path,
    status: err.statusCode || 500
  });

  // ✅ Refactored: Specific JWT handling
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Invalid token signature' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Token expired - Please refresh' });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    message: error.message || 'Server Error'
  });
};

module.exports = { errorHandler };