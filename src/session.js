const session = require('express-session');
const { RedisStore } = require('connect-redis');
const { createClient } = require('redis');

function createSessionMiddleware() {
  const isProduction = process.env.NODE_ENV === 'production';
  const secret = process.env.SESSION_SECRET;

  if (isProduction && !secret) {
    throw new Error('SESSION_SECRET must be configured in production');
  }

  if (!isProduction) {
    return session({
      secret: secret || 'dev-only-session-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        maxAge: 1000 * 60 * 60 * 24 * 7
      }
    });
  }

  if (!process.env.REDIS_URL) {
    throw new Error('REDIS_URL must be configured in production for persistent sessions');
  }

  const redisClient = createClient({ url: process.env.REDIS_URL });
  redisClient.on('error', err => console.error('Redis session store error:', err));
  const redisReady = redisClient.connect();
  redisReady.catch(err => {
    console.error('Failed to connect to Redis session store:', err);
    process.exit(1);
  });

  const store = new RedisStore({
    client: redisClient,
    prefix: 'easylife:sess:'
  });

  const middleware = session({
    store,
    secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      maxAge: 1000 * 60 * 60 * 24 * 7
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
}

module.exports = { createSessionMiddleware };
