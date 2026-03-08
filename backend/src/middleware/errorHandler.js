const errorHandler = (err, req, res, next) => {
  const isDev = process.env.NODE_ENV === 'development';

  return res.status(500).json({
    success: false,
    data:    null,
    message: isDev ? err.message : 'Internal server error',
    errors:  null,
  });
};

module.exports = errorHandler;
