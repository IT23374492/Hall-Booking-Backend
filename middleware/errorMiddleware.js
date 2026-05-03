const notFound = (req, res, next) => {
  res.status(404);
  next(new Error(`Route not found: ${req.method} ${req.originalUrl}`));
};

const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  const safeMessage = statusCode >= 500
    ? 'Something went wrong on the server.'
    : err.message || 'Request failed.';

  if (statusCode >= 500) {
    console.error(err.stack || err.message || err);
  }

  if (res.headersSent) {
    return next(err);
  }

  res.status(statusCode).json({
    message: safeMessage,
  });
};

module.exports = {
  notFound,
  errorHandler,
};
