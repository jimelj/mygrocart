const axios = require('axios');
const { Store } = require('../models');
const { getRedisClient } = require('../config/redis');
const { createLogger } = require('../utils/logger');

/**
 * Store Discovery Service
 * Discovers stores on-demand based on user location (ZIP code + radius)
 *
 * Strategy:
 * 1. Check Redis cache (30-day TTL)
 * 2. If not cached, call store locator API
 * 3. Upsert discovered stores to database
 * 4. Cache results in Redis
 *
 * Supports:
 * - Target stores (via API)
 * - Future store chains (extensible pattern)
 */
class StoreDiscoveryService {
  constructor() {
    this.logger = createLogger('StoreDiscoveryService');
    this.CACHE_TTL_DAYS = 30; // Stores rarely move/close
    this.TARGET_API_KEY = process.env.TARGET_API_KEY || '9f36aeafbe60771e321a7cc95a78140772ab3e96';
  }

  /**
   * Discover all stores near a ZIP code (all chains)
   * @param {string} zipCode - 5-digit ZIP code
   * @param {number} radius - Search radius in miles
   * @returns {Promise<Array>} - Array of stores
   */
  async discoverStores(zipCode, radius = 10) {
    this.logger.info(`Discovering stores near ${zipCode} within ${radius} miles`);

    try {
      // Discover Target stores
      const targetStores = await this.discoverTargetStores(zipCode, radius);

      // Future: Add more store chains here
      // const acmeStores = await this.discoverAcmeStores(zipCode, radius);
      // const wholeFoodsStores = await this.discoverWholeFoodsStores(zipCode, radius);

      const allStores = [...targetStores];

      this.logger.info(`Discovered ${allStores.length} stores total (${targetStores.length} Target)`);

      return allStores;
    } catch (error) {
      this.logger.error(`Error discovering stores: ${error.message}`);
      return [];
    }
  }

  /**
   * Discover Target stores near a ZIP code
   * @param {string} zipCode - 5-digit ZIP code
   * @param {number} radius - Search radius in miles
   * @returns {Promise<Array>} - Array of Target stores
   */
  async discoverTargetStores(zipCode, radius = 10) {
    try {
      // Step 1: Check Redis cache
      const cacheKey = `stores:target:${zipCode}:${radius}`;
      const redisClient = getRedisClient();

      if (redisClient) {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          this.logger.debug(`Target stores cache HIT for ${zipCode}`);
          return JSON.parse(cached);
        }
      }

      this.logger.debug(`Target stores cache MISS for ${zipCode}`);

      // Step 2: Call Target Store Locator API
      const storesFromAPI = await this.fetchTargetStores(zipCode, radius);

      if (storesFromAPI.length === 0) {
        this.logger.warn(`No Target stores found near ${zipCode}`);
        return [];
      }

      // Step 3: Upsert stores to database and get back store instances with storeIds
      const storesWithIds = await this.upsertStores(storesFromAPI);

      // Step 4: Cache in Redis for 30 days (cache the database objects with storeIds)
      if (redisClient) {
        const ttl = this.CACHE_TTL_DAYS * 24 * 60 * 60;
        // Convert Sequelize instances to plain objects for caching
        const storesToCache = storesWithIds.map(store => store.toJSON());
        await redisClient.setex(cacheKey, ttl, JSON.stringify(storesToCache));
        this.logger.debug(`Cached ${storesToCache.length} Target stores for ${this.CACHE_TTL_DAYS} days`);
      }

      // Return plain objects with storeId accessible
      return storesWithIds.map(store => ({ ...store.toJSON(), storeId: store.storeId }));
    } catch (error) {
      this.logger.error(`Error discovering Target stores: ${error.message}`);
      return [];
    }
  }

  /**
   * Fetch Target stores from their Store Locator API
   * @param {string} zipCode - 5-digit ZIP code
   * @param {number} radius - Search radius in miles
   * @returns {Promise<Array>} - Array of store objects
   */
  async fetchTargetStores(zipCode, radius) {
    try {
      this.logger.info(`Fetching Target stores from API for ${zipCode}`);

      // Use correct Redsky nearby_stores_v1 endpoint
      const response = await axios.get('https://redsky.target.com/redsky_aggregations/v1/web/nearby_stores_v1', {
        params: {
          place: zipCode,
          within: radius,
          limit: 20, // Target API maximum is 20
          key: this.TARGET_API_KEY,
          visitor_id: `MYGROCART_${Date.now()}`,
          channel: 'WEB',
          page: '/store-locator/find-stores'
        },
        timeout: 10000,
        headers: {
          'User-Agent': 'MyGroCart/1.0'
        }
      });

      if (!response.data || !response.data.data || !response.data.data.nearby_stores || !response.data.data.nearby_stores.stores) {
        this.logger.warn('Target API returned no stores');
        return [];
      }

      const stores = response.data.data.nearby_stores.stores.map(store => ({
        chainName: 'Target',
        externalStoreId: store.store_id.toString(),
        storeName: store.location_name || `Target ${store.store_id}`,
        address: store.mailing_address.address_line1,
        city: store.mailing_address.city,
        state: store.mailing_address.region,
        zipCode: store.mailing_address.postal_code,
        latitude: null, // Target API doesn't return lat/long in this endpoint
        longitude: null  // We can get it from store_location_v1 if needed
        // Note: phone and distance from API are not stored in database
        // phone: store.main_voice_phone_number
        // distance: store.distance (already calculated by Target API)
      }));

      this.logger.info(`Fetched ${stores.length} Target stores from API`);

      return stores;
    } catch (error) {
      if (error.response) {
        this.logger.error(`Target API error: ${error.response.status} - ${error.response.statusText}`);
      } else if (error.request) {
        this.logger.error('Target API timeout or network error');
      } else {
        this.logger.error(`Error fetching Target stores: ${error.message}`);
      }
      return [];
    }
  }

  /**
   * Upsert stores to database
   * Creates new stores or updates existing ones based on chainName + externalStoreId
   * @param {Array} stores - Array of store objects
   * @returns {Promise<Array>} - Array of upserted store instances with storeIds
   */
  async upsertStores(stores) {
    if (stores.length === 0) return [];

    try {
      this.logger.debug(`Upserting ${stores.length} stores to database`);

      const upsertPromises = stores.map(async (storeData) => {
        try {
          // Find or create store by chainName + externalStoreId
          const [store, created] = await Store.findOrCreate({
            where: {
              chainName: storeData.chainName,
              externalStoreId: storeData.externalStoreId
            },
            defaults: storeData
          });

          // Update if store already exists
          if (!created) {
            await store.update(storeData);
          }

          return { success: true, created, store };
        } catch (error) {
          this.logger.error(`Error upserting store ${storeData.externalStoreId}: ${error.message}`);
          return { success: false, error: error.message, store: null };
        }
      });

      const results = await Promise.all(upsertPromises);
      const successful = results.filter(r => r.success).length;
      const created = results.filter(r => r.created).length;
      const updated = successful - created;

      this.logger.info(`Upserted ${successful}/${stores.length} stores (${created} new, ${updated} updated)`);

      // Return the actual store instances with storeIds
      return results.filter(r => r.success && r.store).map(r => r.store);
    } catch (error) {
      this.logger.error(`Error upserting stores: ${error.message}`);
      return [];
    }
  }

  /**
   * Get stores from database by actual distance (Haversine formula)
   * Used for pre-loaded stores (like ShopRite)
   * @param {string} zipCode - 5-digit ZIP code
   * @param {number} radius - Search radius in miles
   * @param {object} coordinates - Optional user coordinates {latitude, longitude}
   * @returns {Promise<Array>} - Array of stores within radius
   */
  async getStoresFromDatabase(zipCode, radius = 10, coordinates = null) {
    try {
      // If coordinates not provided, try to get them from Target API or geocoding
      let userLat, userLon;

      if (coordinates) {
        userLat = coordinates.latitude;
        userLon = coordinates.longitude;
      } else {
        // Try to get coordinates from a nearby Target store lookup
        // Target API will give us the center point for the ZIP code
        const targetStores = await this.fetchTargetStores(zipCode, radius);
        if (targetStores.length > 0) {
          // Use the first Target store's approximate area as reference
          // Note: This is not perfect but works as a fallback
          userLat = targetStores[0].latitude;
          userLon = targetStores[0].longitude;
        }
      }

      // If we still don't have coordinates, fall back to wider ZIP search
      if (!userLat || !userLon) {
        this.logger.warn(`No coordinates available for ZIP ${zipCode}, using wider ZIP search as fallback`);
        const zipPrefix = zipCode.substring(0, 3);
        const stores = await Store.findAll({
          where: {
            zipCode: {
              [require('sequelize').Op.like]: `${zipPrefix}%`
            }
          },
          limit: 50
        });
        this.logger.debug(`Fallback: Found ${stores.length} stores with ZIP prefix ${zipPrefix}`);
        return stores;
      }

      // Get all stores in a wider area (expand ZIP prefix search)
      const zipPrefix = zipCode.substring(0, 2); // Use first 2 digits for wider search
      const allStores = await Store.findAll({
        where: {
          zipCode: {
            [require('sequelize').Op.like]: `${zipPrefix}%`
          }
        },
        limit: 200 // Get more stores to filter by distance
      });

      // Import distance calculator
      const { calculateDistance } = require('../utils/distance');

      // Filter stores by actual distance using Haversine formula
      const storesWithDistance = allStores
        .map(store => {
          const distance = calculateDistance(
            userLat,
            userLon,
            store.latitude,
            store.longitude
          );
          // Explicitly include storeId to ensure it's accessible downstream
          return { ...store.toJSON(), distance, storeId: store.storeId };
        })
        .filter(store => store.distance <= radius)
        .sort((a, b) => a.distance - b.distance); // Sort by distance

      this.logger.debug(`Found ${storesWithDistance.length} stores within ${radius} miles of ${zipCode} using Haversine distance`);

      return storesWithDistance;
    } catch (error) {
      this.logger.error(`Error getting stores from database: ${error.message}`);
      return [];
    }
  }

  /**
   * Clear cache for a specific ZIP code and chain
   * Useful when stores close or move
   * @param {string} chainName - Store chain name (e.g., "Target")
   * @param {string} zipCode - 5-digit ZIP code
   * @param {number} radius - Search radius
   * @returns {Promise<boolean>} - True if cache cleared
   */
  async clearCache(chainName, zipCode, radius = 10) {
    try {
      const cacheKey = `stores:${chainName.toLowerCase()}:${zipCode}:${radius}`;
      const redisClient = getRedisClient();

      if (redisClient) {
        await redisClient.del(cacheKey);
        this.logger.info(`Cleared cache for ${chainName} stores near ${zipCode}`);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(`Error clearing cache: ${error.message}`);
      return false;
    }
  }

  /**
   * Future: Discover ACME stores
   * Placeholder for future implementation
   */
  async discoverAcmeStores(zipCode, radius) {
    // TODO: Implement ACME store discovery
    // Similar pattern to Target
    this.logger.debug('ACME store discovery not yet implemented');
    return [];
  }

  /**
   * Future: Discover Whole Foods stores
   * Placeholder for future implementation
   */
  async discoverWholeFoodsStores(zipCode, radius) {
    // TODO: Implement Whole Foods store discovery
    // Similar pattern to Target
    this.logger.debug('Whole Foods store discovery not yet implemented');
    return [];
  }
}

module.exports = StoreDiscoveryService;
