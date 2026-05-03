const windows = new Map();

const cleanupKey = (key) => {
  const entry = windows.get(key);
  if (!entry) return;

  const now = Date.now();
  entry.hits = entry.hits.filter((timestamp) => now - timestamp < entry.windowMs);
  if (!entry.hits.length) {
    windows.delete(key);
  } else {
    windows.set(key, entry);
  }
};

const createRateLimiter = ({ windowMs, max, message }) => (req, res, next) => {
  const key = `${req.ip}:${req.baseUrl}:${req.path}`;
  cleanupKey(key);

  const now = Date.now();
  const entry = windows.get(key) || { windowMs, hits: [] };
  entry.hits.push(now);
  entry.windowMs = windowMs;
  windows.set(key, entry);

  if (entry.hits.length > max) {
    return res.status(429).json({
      message: message || 'Too many requests. Please try again later.',
    });
  }

  return next();
};

module.exports = {
  createRateLimiter,
};
