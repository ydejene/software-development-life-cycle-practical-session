const errorHandler = (err, req, res, next) => {
  const isDev = process.env.NODE_ENV === 'development';

  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
    if (isDev) console.error(err.stack);

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      data:    null,
      message: 'Validation failed',
      errors:  err.details || err.message,
    });
  }

  if (err.name === 'UnauthorizedError' || err.message === 'jwt malformed' || err.message === 'invalid token') {
    return res.status(401).json({
      success: false,
      data:    null,
      message: 'Invalid or expired token',
      errors:  null,
    });
  }

  return res.status(500).json({
    success: false,
    data:    null,
    message: isDev ? err.message : 'Internal server error',
    errors:  null,
  });
};

module.exports = errorHandler;
