/**
 * DynamicPriceDiscoveryService
 *
 * Enables on-demand price discovery for products at stores near user locations.
 * This service powers the user-driven expansion strategy by scraping prices
 * only when users actually need them.
 *
 * Key Features:
 * - Find stores within user's travel radius
 * - Identify products missing price data at nearby stores
 * - Queue background scraping jobs for missing prices
 * - Track discovery progress and provide status updates
 *
 * Integration:
 * - Called by comparePrices GraphQL resolver
 * - Can be extended with Bull queue for background processing
 */

const { Product, Store, StorePrice, UserList } = require('../models');
const { Op } = require('sequelize');
const ScrapingOrchestrator = require('./ScrapingOrchestrator');

class DynamicPriceDiscoveryService {
  constructor() {
    this.orchestrator = new ScrapingOrchestrator();
    // Track in-progress discovery jobs (in-memory for now, can be moved to Redis)
    this.discoveryJobs = new Map();
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * @param {number} lat1 - Latitude of point 1
   * @param {number} lon1 - Longitude of point 1
   * @param {number} lat2 - Latitude of point 2
   * @param {number} lon2 - Longitude of point 2
   * @returns {number} - Distance in miles
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Find stores within a user's travel radius
   * @param {number} userLat - User's latitude
   * @param {number} userLon - User's longitude
   * @param {number} radiusMiles - Travel radius in miles
   * @param {string} chainName - Optional: filter by chain (e.g., "ShopRite")
   * @returns {Promise<Array>} - Array of nearby stores with distances
   */
  async findNearbyStores(userLat, userLon, radiusMiles = 10, chainName = null) {
    try {
      const whereClause = chainName ? { chainName } : {};

      const allStores = await Store.findAll({
        where: whereClause,
        attributes: ['storeId', 'chainName', 'storeName', 'address', 'city', 'state',
                     'zipCode', 'latitude', 'longitude', 'externalStoreId']
      });

      // Calculate distance for each store and filter by radius
      const nearbyStores = allStores
        .map(store => {
          const distance = this.calculateDistance(
            userLat,
            userLon,
            parseFloat(store.latitude),
            parseFloat(store.longitude)
          );
          return {
            ...store.get({ plain: true }),
            distance: Math.round(distance * 10) / 10 // Round to 1 decimal
          };
        })
        .filter(store => store.distance <= radiusMiles)
        .sort((a, b) => a.distance - b.distance);

      console.log(`Found ${nearbyStores.length} stores within ${radiusMiles} miles`);
      return nearbyStores;
    } catch (error) {
      console.error('Error finding nearby stores:', error.message);
      throw error;
    }
  }

  /**
   * Check if a product needs price discovery at a specific store
   * @param {string} upc - Product UPC
   * @param {string} storeId - Store UUID
   * @returns {Promise<boolean>} - True if price is missing or stale
   */
  async needsPriceDiscovery(upc, storeId) {
    try {
      const storePrice = await StorePrice.findOne({
        where: { upc, storeId }
      });

      if (!storePrice) {
        return true; // No price exists
      }

      // Check if price is stale (older than 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      if (storePrice.lastUpdated < sevenDaysAgo) {
        return true; // Price is stale
      }

      return false; // Price exists and is fresh
    } catch (error) {
      console.error('Error checking price discovery need:', error.message);
      return true; // Default to needing discovery on error
    }
  }

  /**
   * Get products from user's shopping list that need price discovery at nearby stores
   * @param {string} userId - User UUID
   * @param {Array} nearbyStores - Array of stores from findNearbyStores()
   * @returns {Promise<Object>} - Discovery needs organized by store
   */
  async getDiscoveryNeeds(userId, nearbyStores) {
    try {
      // Get user's shopping list items
      const userListItems = await UserList.findAll({
        where: { userId },
        include: [{
          model: Product,
          as: 'product',
          attributes: ['upc', 'name', 'brand', 'priceDiscoveryCount']
        }]
      });

      if (userListItems.length === 0) {
        return { stores: [], totalProducts: 0, totalMissingPrices: 0 };
      }

      const products = userListItems.map(item => item.product);
      const discoveryNeeds = [];

      // For each nearby store, check which products need price discovery
      for (const store of nearbyStores) {
        const missingProducts = [];

        for (const product of products) {
          const needsDiscovery = await this.needsPriceDiscovery(product.upc, store.storeId);
          if (needsDiscovery) {
            missingProducts.push({
              upc: product.upc,
              name: product.name,
              brand: product.brand
            });
          }
        }

        if (missingProducts.length > 0) {
          discoveryNeeds.push({
            store: {
              storeId: store.storeId,
              chainName: store.chainName,
              storeName: store.storeName,
              externalStoreId: store.externalStoreId,
              distance: store.distance
            },
            missingProducts: missingProducts,
            missingCount: missingProducts.length,
            totalProducts: products.length,
            coveragePercent: Math.round(((products.length - missingProducts.length) / products.length) * 100)
          });
        }
      }

      // Sort by priority: stores with most missing prices first
      discoveryNeeds.sort((a, b) => b.missingCount - a.missingCount);

      const totalMissingPrices = discoveryNeeds.reduce((sum, need) => sum + need.missingCount, 0);

      return {
        stores: discoveryNeeds,
        totalProducts: products.length,
        totalStores: nearbyStores.length,
        storesNeedingDiscovery: discoveryNeeds.length,
        totalMissingPrices: totalMissingPrices
      };
    } catch (error) {
      console.error('Error getting discovery needs:', error.message);
      throw error;
    }
  }

  /**
   * Scrape a single product at a specific store
   * @param {string} upc - Product UPC
   * @param {string} storeId - Store UUID
   * @returns {Promise<Object>} - Scraping result
   */
  async scrapeProductAtStore(upc, storeId) {
    try {
      const product = await Product.findOne({ where: { upc } });
      const store = await Store.findOne({ where: { storeId } });

      if (!product || !store) {
        throw new Error('Product or store not found');
      }

      console.log(`Scraping ${product.name} at ${store.storeName}...`);

      // Use orchestrator to scrape the product from the appropriate store
      let scrapedProducts = [];

      if (store.chainName === 'Target' && this.orchestrator.targetScraper) {
        scrapedProducts = await this.orchestrator.targetScraper.searchProducts(
          product.name,
          '10001', // Default ZIP
          store.externalStoreId,
          5 // Limit to 5 results
        );
      } else if (store.chainName === 'ShopRite') {
        scrapedProducts = await this.orchestrator.shopRiteScraper.searchProducts(
          product.name,
          store.externalStoreId,
          '10001', // Default ZIP
          5 // Limit to 5 results
        );
      } else {
        throw new Error(`Unsupported store chain: ${store.chainName}`);
      }

      // Find matching product in scraped results
      const matchedProduct = scrapedProducts.find(p => p.upc === upc || p.name.includes(product.name));

      if (matchedProduct && matchedProduct.price !== null) {
        // Save the price
        await this.orchestrator.productService.createOrUpdateStorePrice({
          upc: upc,
          storeId: storeId,
          price: matchedProduct.price,
          dealType: matchedProduct.dealType || 'regular'
        });

        return {
          success: true,
          product: product.name,
          store: store.storeName,
          price: matchedProduct.price
        };
      } else {
        return {
          success: false,
          product: product.name,
          store: store.storeName,
          error: 'Product not found at store'
        };
      }
    } catch (error) {
      console.error(`Error scraping product at store:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Discover prices for a user's shopping list at nearby stores
   * @param {string} userId - User UUID
   * @param {Object} options - Discovery options
   * @returns {Promise<Object>} - Discovery results
   */
  async discoverPricesForUserLocation(userId, options = {}) {
    const {
      userLat = 40.7128, // Default NYC
      userLon = -74.0060,
      radiusMiles = 10,
      maxStores = 5,
      priorityChain = null // Optional: prioritize specific chain
    } = options;

    const jobId = `${userId}_${Date.now()}`;
    this.discoveryJobs.set(jobId, {
      status: 'in_progress',
      startTime: new Date(),
      userId: userId
    });

    try {
      console.log(`Starting price discovery for user ${userId}...`);

      // Step 1: Find nearby stores
      const nearbyStores = await this.findNearbyStores(
        userLat,
        userLon,
        radiusMiles,
        priorityChain
      );

      if (nearbyStores.length === 0) {
        return {
          success: false,
          message: 'No stores found within travel radius',
          jobId: jobId
        };
      }

      // Step 2: Identify products needing price discovery
      const discoveryNeeds = await this.getDiscoveryNeeds(userId, nearbyStores.slice(0, maxStores));

      if (discoveryNeeds.storesNeedingDiscovery === 0) {
        return {
          success: true,
          message: 'All prices up to date',
          nearbyStores: nearbyStores.slice(0, maxStores),
          jobId: jobId
        };
      }

      // Step 3: Queue scraping jobs (for now, process synchronously)
      // In production, use Bull queue with Redis for background processing
      const scrapingResults = [];

      for (const need of discoveryNeeds.stores.slice(0, 3)) { // Limit to top 3 stores
        for (const product of need.missingProducts.slice(0, 5)) { // Limit to 5 products per store
          const result = await this.scrapeProductAtStore(product.upc, need.store.storeId);
          scrapingResults.push(result);

          // Add delay between requests to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }

      const successCount = scrapingResults.filter(r => r.success).length;
      const failureCount = scrapingResults.filter(r => !r.success).length;

      this.discoveryJobs.set(jobId, {
        status: 'completed',
        startTime: this.discoveryJobs.get(jobId).startTime,
        endTime: new Date(),
        userId: userId,
        results: {
          totalScraped: scrapingResults.length,
          successful: successCount,
          failed: failureCount
        }
      });

      return {
        success: true,
        message: `Discovered ${successCount} new prices`,
        jobId: jobId,
        discoveryNeeds: discoveryNeeds,
        scrapingResults: scrapingResults,
        summary: {
          storesChecked: discoveryNeeds.storesNeedingDiscovery,
          pricesDiscovered: successCount,
          pricesFailed: failureCount
        }
      };
    } catch (error) {
      console.error('Error during price discovery:', error.message);
      this.discoveryJobs.set(jobId, {
        status: 'failed',
        startTime: this.discoveryJobs.get(jobId).startTime,
        endTime: new Date(),
        userId: userId,
        error: error.message
      });

      return {
        success: false,
        message: error.message,
        jobId: jobId
      };
    }
  }

  /**
   * Get the status of a discovery job
   * @param {string} jobId - Job ID from discoverPricesForUserLocation
   * @returns {Object} - Job status
   */
  getDiscoveryStatus(jobId) {
    const job = this.discoveryJobs.get(jobId);
    if (!job) {
      return { found: false, message: 'Job not found' };
    }

    return {
      found: true,
      ...job
    };
  }
}

module.exports = DynamicPriceDiscoveryService;
