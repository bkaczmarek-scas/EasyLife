const expressSession = require('express-session');
const { RedisStore } = require('connect-redis');
const { createClient } = require('redis');

if (process.env.NODE_ENV === 'production') {
  if (!process.env.SESSION_SECRET) throw new Error('SESSION_SECRET must be configured in production');
  if (!process.env.REDIS_URL) throw new Error('REDIS_URL must be configured in production for persistent sessions');

  const redisClient = createClient({ url: process.env.REDIS_URL });
  redisClient.on('error', err => console.error('Redis session store error:', err));
  const redisReady = redisClient.connect();
  redisReady.catch(err => {
    console.error('Failed to connect to Redis session store:', err);
    process.exit(1);
  });
  const store = new RedisStore({ client: redisClient, prefix: 'easylife:sess:' });

  const originalSession = expressSession;
  const wrappedSession = function secureSession(options = {}) {
    const middleware = originalSession({
      ...options,
      store,
      secret: process.env.SESSION_SECRET,
      cookie: {
        ...(options.cookie || {}),
        httpOnly: true,
        sameSite: 'lax',
        secure: true
      }
    });
    return async (req, res, next) => {
      try {
        await redisReady;
        middleware(req, res, next);
      } catch (err) {
        next(err);
      }
    };
  };
  Object.assign(wrappedSession, originalSession);
  require.cache[require.resolve('express-session')].exports = wrappedSession;
}
