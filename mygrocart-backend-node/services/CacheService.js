const { getRedisClient, isRedisAvailable } = require('../config/redis');
const { createLogger } = require('../utils/logger');

const logger = createLogger('CacheService');

/**
 * CacheService - Centralized caching layer for MyGroCart
 *
 * Caching Strategy:
 * - Product searches: 1 hour (searches don't change often)
 * - Individual products: 1 hour (product info is relatively static)
 * - Price comparisons: 30 minutes (prices can change more frequently)
 * - Store prices: 1 hour (prices updated by scrapers)
 *
 * Cache Keys:
 * - product:search:{query}:{limit}:{offset} - Product search results
 * - product:upc:{upc} - Individual product with prices
 * - comparison:user:{userId} - User's price comparison
 * - prices:store:{storeId} - Store prices (for batch lookups)
 * - prices:upc:{upc} - All prices for a product across stores
 */
class CacheService {
  constructor() {
    this.redis = null;
    this.hitCount = 0;
    this.missCount = 0;

    // TTL configuration (in seconds)
    this.TTL = {
      PRODUCT_SEARCH: parseInt(process.env.REDIS_TTL_PRODUCTS) || 3600, // 1 hour
      PRODUCT_DETAILS: parseInt(process.env.REDIS_TTL_PRODUCTS) || 3600, // 1 hour
      PRICE_COMPARISON: parseInt(process.env.REDIS_TTL_PRICES) || 1800, // 30 minutes
      STORE_PRICES: parseInt(process.env.REDIS_TTL_PRICES) || 1800, // 30 minutes
      PRODUCT_PRICES: parseInt(process.env.REDIS_TTL_PRICES) || 1800 // 30 minutes
    };
  }

  /**
   * Initialize Redis client
   * @returns {boolean} True if Redis is available
   */
  async initialize() {
    this.redis = getRedisClient();
    return isRedisAvailable();
  }

  /**
   * Check if Redis is available
   * @returns {boolean}
   */
  isAvailable() {
    return isRedisAvailable() && this.redis !== null;
  }

  /**
   * Get cache statistics
   * @returns {object} Cache hit/miss stats
   */
  getStats() {
    const total = this.hitCount + this.missCount;
    const hitRate = total > 0 ? ((this.hitCount / total) * 100).toFixed(2) : 0;

    return {
      hits: this.hitCount,
      misses: this.missCount,
      total,
      hitRate: `${hitRate}%`,
      available: this.isAvailable()
    };
  }

  /**
   * Reset cache statistics
   */
  resetStats() {
    this.hitCount = 0;
    this.missCount = 0;
    logger.info('Cache statistics reset');
  }

  // ============================================================================
  // Product Search Caching
  // ============================================================================

  /**
   * Cache product search results
   * @param {string} query - Search query
   * @param {number} limit - Result limit
   * @param {number} offset - Result offset
   * @param {object} results - Search results to cache
   * @param {number} ttl - TTL in seconds (optional)
   * @returns {Promise<boolean>} Success status
   */
  async cacheProductSearch(query, limit, offset, results, ttl = null) {
    if (!this.isAvailable()) return false;

    try {
      const key = `product:search:${query.toLowerCase()}:${limit}:${offset}`;
      const value = JSON.stringify(results);
      const expiry = ttl || this.TTL.PRODUCT_SEARCH;

      await this.redis.setex(key, expiry, value);
      logger.debug(`Cached product search: ${key} (TTL: ${expiry}s)`);
      return true;
    } catch (error) {
      logger.error('Error caching product search:', error.message);
      return false;
    }
  }

  /**
   * Get cached product search results
   * @param {string} query - Search query
   * @param {number} limit - Result limit
   * @param {number} offset - Result offset
   * @returns {Promise<object|null>} Cached results or null
   */
  async getProductSearch(query, limit, offset) {
    if (!this.isAvailable()) {
      this.missCount++;
      return null;
    }

    try {
      const key = `product:search:${query.toLowerCase()}:${limit}:${offset}`;
      const cached = await this.redis.get(key);

      if (cached) {
        this.hitCount++;
        logger.debug(`Cache HIT: ${key}`);
        return JSON.parse(cached);
      }

      this.missCount++;
      logger.debug(`Cache MISS: ${key}`);
      return null;
    } catch (error) {
      logger.error('Error getting cached product search:', error.message);
      this.missCount++;
      return null;
    }
  }

  /**
   * Invalidate all product search caches
   * @returns {Promise<boolean>} Success status
   */
  async invalidateProductSearches() {
    if (!this.isAvailable()) return false;

    try {
      const pattern = 'product:search:*';
      const keys = await this.redis.keys(pattern);

      if (keys.length > 0) {
        await this.redis.del(...keys);
        logger.info(`Invalidated ${keys.length} product search caches`);
      }

      return true;
    } catch (error) {
      logger.error('Error invalidating product searches:', error.message);
      return false;
    }
  }

  // ============================================================================
  // Product Details Caching
  // ============================================================================

  /**
   * Cache individual product with prices
   * @param {string} upc - Product UPC
   * @param {object} productData - Product data to cache
   * @param {number} ttl - TTL in seconds (optional)
   * @returns {Promise<boolean>} Success status
   */
  async cacheProduct(upc, productData, ttl = null) {
    if (!this.isAvailable()) return false;

    try {
      const key = `product:upc:${upc}`;
      const value = JSON.stringify(productData);
      const expiry = ttl || this.TTL.PRODUCT_DETAILS;

      await this.redis.setex(key, expiry, value);
      logger.debug(`Cached product: ${key} (TTL: ${expiry}s)`);
      return true;
    } catch (error) {
      logger.error('Error caching product:', error.message);
      return false;
    }
  }

  /**
   * Get cached product with prices
   * @param {string} upc - Product UPC
   * @returns {Promise<object|null>} Cached product or null
   */
  async getProduct(upc) {
    if (!this.isAvailable()) {
      this.missCount++;
      return null;
    }

    try {
      const key = `product:upc:${upc}`;
      const cached = await this.redis.get(key);

      if (cached) {
        this.hitCount++;
        logger.debug(`Cache HIT: ${key}`);
        return JSON.parse(cached);
      }

      this.missCount++;
      logger.debug(`Cache MISS: ${key}`);
      return null;
    } catch (error) {
      logger.error('Error getting cached product:', error.message);
      this.missCount++;
      return null;
    }
  }

  /**
   * Invalidate cached product
   * @param {string} upc - Product UPC
   * @returns {Promise<boolean>} Success status
   */
  async invalidateProduct(upc) {
    if (!this.isAvailable()) return false;

    try {
      const keys = [
        `product:upc:${upc}`,
        `prices:upc:${upc}`
      ];

      await this.redis.del(...keys);
      logger.debug(`Invalidated product cache: ${upc}`);
      return true;
    } catch (error) {
      logger.error('Error invalidating product:', error.message);
      return false;
    }
  }

  // ============================================================================
  // Price Comparison Caching
  // ============================================================================

  /**
   * Cache user's price comparison results
   * @param {string} userId - User ID
   * @param {object} comparison - Comparison results to cache
   * @param {number} ttl - TTL in seconds (optional)
   * @returns {Promise<boolean>} Success status
   */
  async cachePriceComparison(userId, comparison, ttl = null) {
    if (!this.isAvailable()) return false;

    try {
      const key = `comparison:user:${userId}`;
      const value = JSON.stringify(comparison);
      const expiry = ttl || this.TTL.PRICE_COMPARISON;

      await this.redis.setex(key, expiry, value);
      logger.debug(`Cached price comparison: ${key} (TTL: ${expiry}s)`);
      return true;
    } catch (error) {
      logger.error('Error caching price comparison:', error.message);
      return false;
    }
  }

  /**
   * Get cached price comparison
   * @param {string} userId - User ID
   * @returns {Promise<object|null>} Cached comparison or null
   */
  async getPriceComparison(userId) {
    if (!this.isAvailable()) {
      this.missCount++;
      return null;
    }

    try {
      const key = `comparison:user:${userId}`;
      const cached = await this.redis.get(key);

      if (cached) {
        this.hitCount++;
        logger.debug(`Cache HIT: ${key}`);
        return JSON.parse(cached);
      }

      this.missCount++;
      logger.debug(`Cache MISS: ${key}`);
      return null;
    } catch (error) {
      logger.error('Error getting cached price comparison:', error.message);
      this.missCount++;
      return null;
    }
  }

  /**
   * Invalidate user's price comparison cache
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  async invalidatePriceComparison(userId) {
    if (!this.isAvailable()) return false;

    try {
      const key = `comparison:user:${userId}`;
      await this.redis.del(key);
      logger.debug(`Invalidated price comparison: ${userId}`);
      return true;
    } catch (error) {
      logger.error('Error invalidating price comparison:', error.message);
      return false;
    }
  }

  // ============================================================================
  // Store Prices Caching
  // ============================================================================

  /**
   * Cache store prices
   * @param {string} storeId - Store ID
   * @param {array} prices - Array of prices to cache
   * @param {number} ttl - TTL in seconds (optional)
   * @returns {Promise<boolean>} Success status
   */
  async cacheStorePrices(storeId, prices, ttl = null) {
    if (!this.isAvailable()) return false;

    try {
      const key = `prices:store:${storeId}`;
      const value = JSON.stringify(prices);
      const expiry = ttl || this.TTL.STORE_PRICES;

      await this.redis.setex(key, expiry, value);
      logger.debug(`Cached store prices: ${key} (${prices.length} items, TTL: ${expiry}s)`);
      return true;
    } catch (error) {
      logger.error('Error caching store prices:', error.message);
      return false;
    }
  }

  /**
   * Get cached store prices
   * @param {string} storeId - Store ID
   * @returns {Promise<array|null>} Cached prices or null
   */
  async getStorePrices(storeId) {
    if (!this.isAvailable()) {
      this.missCount++;
      return null;
    }

    try {
      const key = `prices:store:${storeId}`;
      const cached = await this.redis.get(key);

      if (cached) {
        this.hitCount++;
        logger.debug(`Cache HIT: ${key}`);
        return JSON.parse(cached);
      }

      this.missCount++;
      logger.debug(`Cache MISS: ${key}`);
      return null;
    } catch (error) {
      logger.error('Error getting cached store prices:', error.message);
      this.missCount++;
      return null;
    }
  }

  /**
   * Invalidate store prices cache
   * @param {string} storeId - Store ID
   * @returns {Promise<boolean>} Success status
   */
  async invalidateStorePrices(storeId) {
    if (!this.isAvailable()) return false;

    try {
      const key = `prices:store:${storeId}`;
      await this.redis.del(key);
      logger.debug(`Invalidated store prices: ${storeId}`);
      return true;
    } catch (error) {
      logger.error('Error invalidating store prices:', error.message);
      return false;
    }
  }

  // ============================================================================
  // Product Prices (All Stores) Caching
  // ============================================================================

  /**
   * Cache all prices for a product across stores
   * @param {string} upc - Product UPC
   * @param {array} prices - Array of prices across stores
   * @param {number} ttl - TTL in seconds (optional)
   * @returns {Promise<boolean>} Success status
   */
  async cacheProductPrices(upc, prices, ttl = null) {
    if (!this.isAvailable()) return false;

    try {
      const key = `prices:upc:${upc}`;
      const value = JSON.stringify(prices);
      const expiry = ttl || this.TTL.PRODUCT_PRICES;

      await this.redis.setex(key, expiry, value);
      logger.debug(`Cached product prices: ${key} (${prices.length} stores, TTL: ${expiry}s)`);
      return true;
    } catch (error) {
      logger.error('Error caching product prices:', error.message);
      return false;
    }
  }

  /**
   * Get cached product prices
   * @param {string} upc - Product UPC
   * @returns {Promise<array|null>} Cached prices or null
   */
  async getProductPrices(upc) {
    if (!this.isAvailable()) {
      this.missCount++;
      return null;
    }

    try {
      const key = `prices:upc:${upc}`;
      const cached = await this.redis.get(key);

      if (cached) {
        this.hitCount++;
        logger.debug(`Cache HIT: ${key}`);
        return JSON.parse(cached);
      }

      this.missCount++;
      logger.debug(`Cache MISS: ${key}`);
      return null;
    } catch (error) {
      logger.error('Error getting cached product prices:', error.message);
      this.missCount++;
      return null;
    }
  }

  // ============================================================================
  // Bulk Operations
  // ============================================================================

  /**
   * Invalidate all caches
   * @returns {Promise<boolean>} Success status
   */
  async invalidateAll() {
    if (!this.isAvailable()) return false;

    try {
      await this.redis.flushdb();
      logger.info('All caches invalidated');
      this.resetStats();
      return true;
    } catch (error) {
      logger.error('Error invalidating all caches:', error.message);
      return false;
    }
  }

  /**
   * Invalidate caches by pattern
   * @param {string} pattern - Redis key pattern (e.g., "product:*")
   * @returns {Promise<number>} Number of keys deleted
   */
  async invalidateByPattern(pattern) {
    if (!this.isAvailable()) return 0;

    try {
      const keys = await this.redis.keys(pattern);

      if (keys.length > 0) {
        await this.redis.del(...keys);
        logger.info(`Invalidated ${keys.length} keys matching pattern: ${pattern}`);
        return keys.length;
      }

      return 0;
    } catch (error) {
      logger.error('Error invalidating by pattern:', error.message);
      return 0;
    }
  }

  /**
   * Get all cache keys (for debugging)
   * @param {string} pattern - Optional pattern filter
   * @returns {Promise<array>} Array of cache keys
   */
  async getAllKeys(pattern = '*') {
    if (!this.isAvailable()) return [];

    try {
      const keys = await this.redis.keys(pattern);
      return keys;
    } catch (error) {
      logger.error('Error getting all keys:', error.message);
      return [];
    }
  }

  /**
   * Get cache key TTL
   * @param {string} key - Cache key
   * @returns {Promise<number>} TTL in seconds (-2 if key doesn't exist, -1 if no expiry)
   */
  async getTTL(key) {
    if (!this.isAvailable()) return -2;

    try {
      return await this.redis.ttl(key);
    } catch (error) {
      logger.error('Error getting TTL:', error.message);
      return -2;
    }
  }
}

// Singleton instance
const cacheService = new CacheService();

module.exports = cacheService;
