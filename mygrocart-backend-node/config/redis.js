const Redis = require('ioredis');
const { createLogger } = require('../utils/logger');

const logger = createLogger('Redis');

let redisClient = null;
let isConnected = false;

/**
 * Initialize Redis connection
 * Supports both local Redis and Upstash Redis REST API
 */
const initializeRedis = async () => {
  try {
    // Check if Redis is enabled
    const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;

    if (!redisUrl) {
      logger.warn('Redis URL not configured. Caching will be disabled.');
      return null;
    }

    // Upstash Redis (for production on Render)
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      logger.info('Initializing Upstash Redis client...');

      // Extract host and port from Upstash URL
      const upstashUrl = new URL(process.env.UPSTASH_REDIS_REST_URL);
      const port = upstashUrl.port || 6379;

      // Use ioredis for Upstash with TLS
      redisClient = new Redis({
        host: upstashUrl.hostname,
        port: parseInt(port),
        username: 'default',
        password: process.env.UPSTASH_REDIS_REST_TOKEN,
        tls: {
          rejectUnauthorized: false
        },
        family: 6, // Use IPv6 if available, fallback to IPv4
        maxRetriesPerRequest: 3,
        lazyConnect: true, // Don't auto-connect
        retryStrategy(times) {
          // Give up after 5 retries to prevent infinite loops
          if (times > 5) {
            logger.error('Redis max retries reached, giving up');
            return null; // Stop retrying
          }
          const delay = Math.min(times * 100, 2000);
          return delay;
        },
        reconnectOnError(err) {
          // Don't auto-reconnect on errors - prevents infinite retry loop
          logger.error('Redis connection error:', err.message);
          return false;
        }
      });
    }
    // Local Redis (for development)
    else if (process.env.REDIS_URL) {
      logger.info('Initializing local Redis client...');

      redisClient = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        reconnectOnError(err) {
          logger.error('Redis connection error:', err.message);
          return true;
        }
      });
    } else {
      logger.warn('No valid Redis configuration found');
      return null;
    }

    // Event listeners
    redisClient.on('connect', () => {
      logger.info('Redis client connected');
      isConnected = true;
    });

    redisClient.on('ready', () => {
      logger.info('Redis client ready');
      isConnected = true;
    });

    redisClient.on('error', (err) => {
      logger.error('Redis client error:', err.message);
      isConnected = false;
    });

    redisClient.on('close', () => {
      logger.warn('Redis connection closed');
      isConnected = false;
    });

    redisClient.on('reconnecting', () => {
      logger.info('Redis client reconnecting...');
      isConnected = false;
    });

    // Test connection
    await redisClient.ping();
    logger.info('Redis connection successful');

    return redisClient;
  } catch (error) {
    logger.error('Failed to initialize Redis:', error.message);
    logger.warn('Application will continue without caching');
    redisClient = null;
    isConnected = false;
    return null;
  }
};

/**
 * Get Redis client instance
 * @returns {Redis|null} Redis client or null if not connected
 */
const getRedisClient = () => {
  return redisClient;
};

/**
 * Check if Redis is connected and available
 * @returns {boolean} True if Redis is connected
 */
const isRedisAvailable = () => {
  return isConnected && redisClient !== null;
};

/**
 * Close Redis connection gracefully
 */
const closeRedis = async () => {
  if (redisClient) {
    try {
      await redisClient.quit();
      logger.info('Redis connection closed gracefully');
    } catch (error) {
      logger.error('Error closing Redis connection:', error.message);
    } finally {
      redisClient = null;
      isConnected = false;
    }
  }
};

/**
 * Get cache statistics
 * @returns {object} Cache statistics
 */
const getCacheStats = async () => {
  if (!isRedisAvailable()) {
    return { available: false };
  }

  try {
    const info = await redisClient.info('stats');
    const dbSize = await redisClient.dbsize();

    return {
      available: true,
      connected: isConnected,
      dbSize,
      rawInfo: info
    };
  } catch (error) {
    logger.error('Error getting cache stats:', error.message);
    return { available: false, error: error.message };
  }
};

module.exports = {
  initializeRedis,
  getRedisClient,
  isRedisAvailable,
  closeRedis,
  getCacheStats
};
