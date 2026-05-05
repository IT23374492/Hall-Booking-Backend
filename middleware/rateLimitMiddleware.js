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

const getClientIp = (req) => {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
};

const buildRetryMessage = (message, retryAfterSeconds) => {
  const retryValue = retryAfterSeconds >= 60
    ? `${Math.ceil(retryAfterSeconds / 60)} minute(s)`
    : `${retryAfterSeconds} second(s)`;
  return `${message || 'Too many requests. Please try again later.'} Try again in about ${retryValue}.`;
};

const removeHit = (key, timestamp) => {
  const entry = windows.get(key);
  if (!entry) return;

  entry.hits = entry.hits.filter((hit) => hit !== timestamp);
  if (!entry.hits.length) {
    windows.delete(key);
    return;
  }

  windows.set(key, entry);
};

const createRateLimiter = ({
  windowMs,
  max,
  message,
  keyBuilder,
  skip,
  skipSuccessfulRequests = false,
}) => (req, res, next) => {
  if (typeof skip === 'function' && skip(req)) {
    return next();
  }

  const key = typeof keyBuilder === 'function'
    ? keyBuilder(req, getClientIp(req))
    : `${getClientIp(req)}:${req.baseUrl}:${req.path}`;
  cleanupKey(key);

  const now = Date.now();
  const entry = windows.get(key) || { windowMs, hits: [] };
  entry.windowMs = windowMs;

  if (entry.hits.length >= max) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((entry.windowMs - (now - entry.hits[0])) / 1000)
    );
    res.set('Retry-After', String(retryAfterSeconds));
    return res.status(429).json({
      message: buildRetryMessage(message, retryAfterSeconds),
      retryAfterSeconds,
    });
  }

  entry.hits.push(now);
  windows.set(key, entry);

  if (skipSuccessfulRequests) {
    res.on('finish', () => {
      if (res.statusCode < 400) {
        removeHit(key, now);
      }
    });
  }

  return next();
};

module.exports = {
  createRateLimiter,
  getClientIp,
};
