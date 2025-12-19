const { Store, StorePrice, Product } = require('../models');
const ScrapingOrchestrator = require('./ScrapingOrchestrator');
const StoreDiscoveryService = require('./StoreDiscoveryService');
const { Op } = require('sequelize');

/**
 * Progressive Discovery Service
 * Implements smart caching and on-demand scraping to minimize upfront seeding.
 *
 * Strategy:
 * 1. Check if we have fresh prices (< 24 hours old)
 * 2. If yes → return from database
 * 3. If no → scrape on-demand + cache
 */
class ProgressiveDiscoveryService {
  constructor() {
    this.orchestrator = new ScrapingOrchestrator();
    this.storeDiscovery = new StoreDiscoveryService();
    this.PRICE_FRESHNESS_HOURS = 24; // Prices expire after 24 hours
    this.SCRAPING_COOLDOWN_MINUTES = 30; // Prevent re-scraping same store within 30 mins
  }

  /**
   * Search products with progressive discovery
   * @param {string} searchTerm - Product search term
   * @param {object} options - Search options
   * @returns {Promise<Array>} - Products with fresh prices
   */
  async searchProducts(searchTerm, options = {}) {
    const {
      zipCode = '10001',
      radius = 10,
      limit = 20,
      forceRefresh = false // Allow manual refresh
    } = options;

    try {
      console.log(`[Progressive Discovery] Searching for "${searchTerm}" in ZIP ${zipCode}`);

      // Step 1: Find stores within radius
      const stores = await this.findStoresInRadius(zipCode, radius);
      console.log(`[Progressive Discovery] Found ${stores.length} stores in radius`);

      if (stores.length === 0) {
        return {
          products: [],
          message: 'No stores found in your area',
          freshData: false
        };
      }

      // Step 2: Check which stores need scraping
      const storeAnalysis = await this.analyzeStores(stores, searchTerm, forceRefresh);

      console.log(`[Progressive Discovery] Stores needing scraping: ${storeAnalysis.storesNeedingScraping.length}`);
      console.log(`[Progressive Discovery] Stores with fresh data: ${storeAnalysis.storesWithFreshData.length}`);

      // Step 3: Scrape stores that need fresh data
      const scrapingPromises = storeAnalysis.storesNeedingScraping.map(async (store) => {
        try {
          return await this.scrapeStore(store, searchTerm, limit);
        } catch (error) {
          console.error(`[Progressive Discovery] Error scraping ${store.chainName}:`, error.message);
          return { store: store.chainName, products: [], error: error.message };
        }
      });

      const scrapedResults = await Promise.allSettled(scrapingPromises);

      // Step 4: Get cached products from stores with fresh data
      const cachedProducts = await this.getCachedProducts(
        storeAnalysis.storesWithFreshData,
        searchTerm,
        limit
      );

      // Step 5: Combine scraped + cached results
      const allProducts = [];

      // Add scraped products
      scrapedResults.forEach(result => {
        if (result.status === 'fulfilled' && result.value.products) {
          allProducts.push(...result.value.products);
        }
      });

      // Add cached products
      allProducts.push(...cachedProducts);

      // Deduplicate by UPC
      const uniqueProducts = this.deduplicateProducts(allProducts);

      return {
        products: uniqueProducts.slice(0, limit),
        totalFound: uniqueProducts.length,
        freshData: storeAnalysis.storesNeedingScraping.length > 0,
        cacheHit: storeAnalysis.storesWithFreshData.length > 0,
        storesSearched: stores.length,
        storesScraped: storeAnalysis.storesNeedingScraping.length,
        searchTerm: searchTerm
      };

    } catch (error) {
      console.error('[Progressive Discovery] Error:', error.message);
      throw error;
    }
  }

  /**
   * Find stores within radius of a ZIP code
   * Uses hybrid approach:
   * 1. Get pre-loaded stores from database (e.g., ShopRite)
   * 2. Discover Target stores on-demand via API
   * 3. Future stores (ACME, Whole Foods, etc.) via on-demand discovery
   *
   * @param {string} zipCode - User's ZIP code
   * @param {number} radius - Search radius in miles
   * @returns {Promise<Array>} - Stores within radius
   */
  async findStoresInRadius(zipCode, radius) {
    // Validate ZIP code format (5 digits only)
    if (!zipCode || !/^\d{5}$/.test(zipCode)) {
      throw new Error('Invalid ZIP code format. Must be 5 digits.');
    }

    // Validate radius
    if (radius < 0 || radius > 100) {
      throw new Error('Invalid radius. Must be between 0 and 100 miles.');
    }

    console.log(`[Progressive Discovery] Finding stores near ${zipCode} within ${radius} miles`);

    try {
      // Step 1: Get pre-loaded stores from database (ShopRite, etc.)
      const dbStores = await this.storeDiscovery.getStoresFromDatabase(zipCode, radius);
      console.log(`[Progressive Discovery] Found ${dbStores.length} pre-loaded stores in database`);

      // Step 2: Discover Target stores on-demand
      const discoveredStores = await this.storeDiscovery.discoverStores(zipCode, radius);
      console.log(`[Progressive Discovery] Discovered ${discoveredStores.length} stores via API`);

      // Step 3: Combine and deduplicate
      const allStores = [...dbStores, ...discoveredStores];
      const uniqueStores = this.deduplicateStores(allStores);

      console.log(`[Progressive Discovery] Total unique stores: ${uniqueStores.length}`);

      return uniqueStores;
    } catch (error) {
      console.error(`[Progressive Discovery] Error finding stores: ${error.message}`);

      // Fallback to database-only if discovery fails
      const dbStores = await this.storeDiscovery.getStoresFromDatabase(zipCode, radius);
      console.log(`[Progressive Discovery] Fallback: ${dbStores.length} stores from database`);
      return dbStores;
    }
  }

  /**
   * Deduplicate stores by chainName + externalStoreId
   * @param {Array} stores - Array of store objects
   * @returns {Array} - Unique stores
   */
  deduplicateStores(stores) {
    const seen = new Map();

    stores.forEach(store => {
      const key = `${store.chainName}-${store.externalStoreId}`;
      if (!seen.has(key)) {
        seen.set(key, store);
      }
    });

    return Array.from(seen.values());
  }

  /**
   * Analyze which stores need scraping vs can use cache
   * @param {Array} stores - Stores to analyze
   * @param {string} searchTerm - Search term
   * @param {boolean} forceRefresh - Force refresh all stores
   * @returns {Promise<object>} - Store analysis
   */
  async analyzeStores(stores, searchTerm, forceRefresh = false) {
    const storesNeedingScraping = [];
    const storesWithFreshData = [];

    for (const store of stores) {
      if (forceRefresh) {
        storesNeedingScraping.push(store);
        continue;
      }

      const isFresh = await this.hasRecentPrices(store.storeId);

      if (isFresh) {
        storesWithFreshData.push(store);
      } else {
        // Check cooldown to prevent excessive scraping
        const canScrape = await this.checkScrapingCooldown(store.storeId);
        if (canScrape) {
          storesNeedingScraping.push(store);
        }
      }
    }

    return {
      storesNeedingScraping,
      storesWithFreshData
    };
  }

  /**
   * Check if a store has recent prices (within freshness window)
   * @param {string} storeId - Store UUID
   * @returns {Promise<boolean>} - True if prices are fresh
   */
  async hasRecentPrices(storeId) {
    const freshnessThreshold = new Date(
      Date.now() - (this.PRICE_FRESHNESS_HOURS * 60 * 60 * 1000)
    );

    const recentPrice = await StorePrice.findOne({
      where: {
        storeId: storeId,
        lastUpdated: {
          [Op.gte]: freshnessThreshold
        }
      }
    });

    return !!recentPrice;
  }

  /**
   * Check if enough time has passed since last scraping attempt
   * @param {string} storeId - Store UUID
   * @returns {Promise<boolean>} - True if can scrape
   */
  async checkScrapingCooldown(storeId) {
    const cooldownThreshold = new Date(
      Date.now() - (this.SCRAPING_COOLDOWN_MINUTES * 60 * 1000)
    );

    const recentScrape = await StorePrice.findOne({
      where: {
        storeId: storeId,
        createdAt: {
          [Op.gte]: cooldownThreshold
        }
      }
    });

    return !recentScrape; // Can scrape if no recent scrape found
  }

  /**
   * Scrape a specific store for products
   * @param {object} store - Store object
   * @param {string} searchTerm - Product search term
   * @param {number} limit - Max products to scrape
   * @returns {Promise<object>} - Scraping results
   */
  async scrapeStore(store, searchTerm, limit = 10) {
    console.log(`[Progressive Discovery] Scraping ${store.chainName} (Store ${store.externalStoreId})`);

    const startTime = Date.now();

    // Use the orchestrator's searchProductsAllStores method
    const results = await this.orchestrator.searchProductsAllStores(searchTerm, {
      limit: limit,
      zipCode: store.zipCode,
      targetStoreId: store.chainName === 'Target' ? store.externalStoreId : '2055',
      shopriteStoreId: store.chainName === 'ShopRite' ? store.externalStoreId : '3000'
    });

    const duration = Date.now() - startTime;

    console.log(`[Progressive Discovery] Scraped ${results.products.length} products in ${duration}ms`);

    return {
      store: store.chainName,
      products: results.products,
      duration: duration
    };
  }

  /**
   * Get cached products from stores with fresh data
   * @param {Array} stores - Stores with fresh data
   * @param {string} searchTerm - Search term
   * @param {number} limit - Max products
   * @returns {Promise<Array>} - Cached products
   */
  async getCachedProducts(stores, searchTerm, limit = 10) {
    // Build the include clause conditionally based on whether we have stores to filter by
    const includeClause = stores.length > 0 ? [{
      model: StorePrice,
      as: 'storePrices',
      required: false, // LEFT JOIN - include products even without prices
      where: {
        storeId: {
          [Op.in]: stores.map(s => s.storeId)
        }
      },
      include: [{
        model: Store,
        as: 'store'
      }]
    }] : [{
      model: StorePrice,
      as: 'storePrices',
      required: false, // LEFT JOIN - include products even without prices
      include: [{
        model: Store,
        as: 'store'
      }]
    }];

    // Search products by name match
    const products = await Product.findAll({
      where: {
        name: {
          [Op.iLike]: `%${searchTerm}%` // Case-insensitive search
        }
      },
      include: includeClause,
      limit: limit
    });

    // Transform to match scraper format
    return products.map(product => ({
      upc: product.upc,
      name: product.name,
      brand: product.brand,
      size: product.size,
      category: product.category,
      imageUrl: product.imageUrl,
      storePrices: product.storePrices || [],
      price: product.storePrices[0]?.price || null,
      dealType: product.storePrices[0]?.dealType || 'regular',
      store: product.storePrices[0]?.store?.chainName || 'Unknown',
      cached: true // Mark as cached
    }));
  }

  /**
   * Deduplicate products by UPC
   * @param {Array} products - Products to deduplicate
   * @returns {Array} - Unique products
   */
  deduplicateProducts(products) {
    const seen = new Map();

    products.forEach(product => {
      const key = product.upc || product.name;

      // Prefer products with prices
      if (!seen.has(key) || (product.price !== null && seen.get(key).price === null)) {
        seen.set(key, product);
      }
    });

    return Array.from(seen.values());
  }

  /**
   * Get stores that need nightly refresh
   * Returns stores that had searches in the last 7 days
   * @returns {Promise<Array>} - Stores needing refresh
   */
  async getStoresNeedingRefresh() {
    const sevenDaysAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));

    // Find stores with recent price updates (indicating recent searches)
    const storePrices = await StorePrice.findAll({
      where: {
        lastUpdated: {
          [Op.gte]: sevenDaysAgo
        }
      },
      attributes: ['storeId'],
      group: ['storeId'],
      include: [{
        model: Store,
        as: 'store'
      }]
    });

    return storePrices.map(sp => sp.store);
  }

  /**
   * Refresh prices for popular stores (nightly job)
   * @param {Array} searchTerms - Common search terms to refresh
   * @returns {Promise<object>} - Refresh results
   */
  async refreshPopularStores(searchTerms = ['milk', 'bread', 'eggs', 'chicken', 'bananas']) {
    console.log('[Progressive Discovery] Starting nightly refresh...');

    const stores = await this.getStoresNeedingRefresh();
    console.log(`[Progressive Discovery] Refreshing ${stores.length} stores`);

    const results = {
      storesRefreshed: 0,
      productsUpdated: 0,
      errors: []
    };

    for (const store of stores) {
      try {
        for (const term of searchTerms) {
          const result = await this.scrapeStore(store, term, 10);
          results.productsUpdated += result.products.length;
        }
        results.storesRefreshed++;

        // Add delay between stores to avoid rate limiting
        await this.delay(5000);
      } catch (error) {
        console.error(`[Progressive Discovery] Error refreshing ${store.chainName}:`, error.message);
        results.errors.push({ store: store.chainName, error: error.message });
      }
    }

    console.log('[Progressive Discovery] Nightly refresh complete:', results);
    return results;
  }

  /**
   * Utility delay function
   * @param {number} ms - Milliseconds to delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = ProgressiveDiscoveryService;
