const axios = require('axios');
const { createLogger } = require('../utils/logger');

/**
 * TargetScraper - Production-ready scraper for Target's Redsky API
 *
 * Based on Day 1 research findings from DAY_1_RESEARCH_NOTES.md
 * API Documentation: https://redsky.target.com/redsky_aggregations/v1/web
 *
 * RATE LIMITING:
 * This scraper implements rate limiting to prevent API abuse and avoid being blocked.
 * - Delay: 10 seconds (10000ms) between each request for bulk scraping
 * - Reason: Target's API has undocumented rate limits. Excessive requests can result in:
 *   1. Temporary IP bans (403/429 errors)
 *   2. API key revocation
 *   3. Degraded response times
 * - Implementation: The delay() method is called before every API request in searchProducts()
 *   and getProductDetails()
 * - Best practice: For bulk scraping, consider implementing a request queue with dynamic
 *   rate limiting based on API response headers
 *
 * WARNING: Do not reduce the delay below 10 seconds for bulk scraping operations.
 */
class TargetScraper {
  constructor() {
    this.apiKey = process.env.TARGET_API_KEY;
    this.baseUrl = 'https://redsky.target.com/redsky_aggregations/v1/web';
    this.isInitialized = true;
    this.logger = createLogger('TargetScraper');

    // Validate API key on initialization
    if (!this.apiKey) {
      throw new Error('TARGET_API_KEY environment variable is required');
    }
  }

  /**
   * Validate and sanitize input parameters
   * @param {string} query - Search query
   * @param {string} zipCode - ZIP code
   * @param {string} storeId - Store ID
   * @returns {object} - Validated parameters
   * @throws {Error} - If validation fails
   */
  validateInput(query, zipCode, storeId) {
    // Validate query
    if (typeof query !== 'string' || query.trim().length === 0) {
      throw new Error('Query must be a non-empty string');
    }
    if (query.length > 100) {
      throw new Error('Query must be less than 100 characters');
    }

    // Validate ZIP code (5 digits)
    if (zipCode && !/^\d{5}$/.test(zipCode)) {
      throw new Error('ZIP code must be exactly 5 digits');
    }

    // Validate store ID (1-6 digits)
    if (storeId && !/^\d{1,6}$/.test(storeId)) {
      throw new Error('Store ID must be 1-6 digits');
    }

    return {
      query: query.trim(),
      zipCode: zipCode || '10001',
      storeId: storeId || '2055'
    };
  }

  /**
   * Generate a random visitor ID for API requests
   * Format: 32-character hex string
   * @returns {string} - Random visitor ID
   */
  generateVisitorId() {
    const chars = '0123456789ABCDEF';
    let visitorId = '';
    for (let i = 0; i < 32; i++) {
      visitorId += chars[Math.floor(Math.random() * chars.length)];
    }
    return visitorId;
  }

  /**
   * Search for products on Target
   * @param {string} query - Product search term (e.g., "milk", "bread")
   * @param {string} zipCode - ZIP code for pricing (not used directly, but store ID should match)
   * @param {string} storeId - Target store ID for pricing (e.g., "2055" for Bridgewater NJ)
   * @param {number} limit - Maximum number of results to return (default: 24)
   * @returns {Promise<Array>} - Array of product objects with price data
   */
  async searchProducts(query, zipCode = '10001', storeId = '2055', limit = 24) {
    try {
      // Validate and sanitize inputs
      const validated = this.validateInput(query, zipCode, storeId);
      query = validated.query;
      zipCode = validated.zipCode;
      storeId = validated.storeId;

      this.logger.info(`Searching for "${query}" at store ${storeId} (limit: ${limit})`);

      // Target API limits each request to max 28 products
      // If more products are requested, we'll make multiple paginated requests
      const MAX_PER_REQUEST = 24;
      const allProducts = [];
      let offset = 0;

      // Calculate how many requests we need
      const requestsNeeded = Math.ceil(limit / MAX_PER_REQUEST);

      for (let i = 0; i < requestsNeeded; i++) {
        // Rate limiting: 10 second delay between requests to avoid IP blocks during bulk scraping
        if (i > 0) {
          await this.delay(10000);
        }

        const visitorId = this.generateVisitorId();
        const remainingProducts = limit - allProducts.length;
        const countForThisRequest = Math.min(remainingProducts, MAX_PER_REQUEST);

        // Build API URL with all required parameters
        const url = `${this.baseUrl}/plp_search_v2`;
        const params = {
          keyword: query,
          pricing_store_id: storeId,
          visitor_id: visitorId,
          page: `/s/${query}`,
          key: this.apiKey,
          channel: 'WEB',
          count: countForThisRequest,
          offset: offset,
          store_ids: storeId,
          default_purchasability_filter: true
        };

        this.logger.info(`Request ${i + 1}/${requestsNeeded}: fetching ${countForThisRequest} products (offset: ${offset})`);

        // Make API request
        const response = await axios.get(url, {
          params,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'application/json'
          },
          timeout: 10000 // 10 second timeout
        });

        // Extract products from nested response structure
        const searchData = response.data?.data?.search;
        if (!searchData) {
          this.logger.warn(`No search data in response for request ${i + 1}`);
          break;
        }

        const products = searchData.products || [];

        if (!Array.isArray(products) || products.length === 0) {
          this.logger.info(`No more products found (request ${i + 1})`);
          break;
        }

        // Transform and add products to results
        const transformedProducts = products.map(product => this.transformProduct(product, query, storeId));
        allProducts.push(...transformedProducts);

        this.logger.info(`Added ${transformedProducts.length} products (total: ${allProducts.length})`);

        // Move offset forward for next request
        offset += products.length;

        // Stop if we received fewer products than requested (no more available)
        if (products.length < countForThisRequest) {
          this.logger.info(`Received fewer products than requested - no more available`);
          break;
        }

        // Stop if we've reached the requested limit
        if (allProducts.length >= limit) {
          break;
        }
      }

      this.logger.info(`Found ${allProducts.length} total products for "${query}"`);
      return allProducts;

    } catch (error) {
      this.logger.error(`Error searching for "${query}": ${error.message}`);
      if (error.response) {
        this.logger.error(`Response status: ${error.response.status}`);
        this.logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
        this.logger.error(`Request URL: ${error.config?.url}`);
        this.logger.error(`Request params: ${JSON.stringify(error.config?.params)}`);
      }
      return [];
    }
  }

  /**
   * Get detailed product information by TCIN
   * Note: This endpoint provides fulfillment/stock data but NOT price
   * For price information, use searchProducts() instead
   * @param {string} tcin - Target product ID (TCIN)
   * @param {string} storeId - Target store ID for pricing
   * @returns {Promise<object|null>} - Detailed product information
   */
  async getProductDetails(tcin, storeId = '2055') {
    try {
      // Validate TCIN (should be numeric)
      if (!tcin || !/^\d+$/.test(tcin)) {
        throw new Error('TCIN must be numeric');
      }

      this.logger.info(`Getting details for TCIN ${tcin}`);

      // Rate limiting: 10 second delay between requests for bulk scraping
      await this.delay(10000);

      const visitorId = this.generateVisitorId();

      const url = `${this.baseUrl}/product_summary_with_fulfillment_v1`;
      const params = {
        key: this.apiKey,
        tcins: tcin,
        store_id: storeId,
        visitor_id: visitorId,
        channel: 'WEB',
        page: '/p/' + tcin
      };

      const response = await axios.get(url, {
        params,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'application/json'
        },
        timeout: 10000
      });

      // Extract from product_summaries array
      const productSummaries = response.data?.data?.product_summaries;
      if (!productSummaries || !Array.isArray(productSummaries) || productSummaries.length === 0) {
        this.logger.warn(`No product data for TCIN ${tcin}`);
        return null;
      }

      const productData = productSummaries[0];
      const item = productData.item || {};
      const fulfillment = productData.fulfillment || {};
      const classification = item.product_classification || {};

      return {
        tcin: tcin,
        name: this.decodeHtmlEntities(item.product_description?.title || 'Unknown Product'),
        category: classification.item_type?.name || null,
        inStock: fulfillment.is_out_of_stock_in_all_store_locations === false,
        storeId: storeId,
        url: item.enrichment?.buy_url || `https://www.target.com/p/-/A-${tcin}`
      };

    } catch (error) {
      this.logger.error(`Error getting details for TCIN ${tcin}: ${error.message}`);
      return null;
    }
  }

  /**
   * Extract size from product name
   * Looks for patterns like "10.8oz", "0.5gal", "18.8oz", "12 oz", "1.5 gal", etc.
   * @param {string} productName - Product name/title
   * @returns {string|null} - Extracted size or null
   */
  extractSizeFromName(productName) {
    if (!productName) return null;

    // Common patterns: "10.8oz", "0.5gal", "18oz", "1.5 gallons", "12 oz", "64 fl oz"
    const sizePatterns = [
      /(\d+\.?\d*\s?(?:oz|ounce|ounces))/i,
      /(\d+\.?\d*\s?(?:lb|lbs|pound|pounds))/i,
      /(\d+\.?\d*\s?(?:gal|gallon|gallons))/i,
      /(\d+\.?\d*\s?(?:ml|milliliter|milliliters))/i,
      /(\d+\.?\d*\s?(?:l|liter|liters))/i,
      /(\d+\.?\d*\s?(?:fl oz|fluid ounce|fluid ounces))/i,
      /(\d+\.?\d*\s?(?:qt|quart|quarts))/i,
      /(\d+\.?\d*\s?(?:pt|pint|pints))/i,
      /(\d+\.?\d*\s?(?:ct|count))/i,
      /(\d+\.?\d*\s?(?:pk|pack))/i,
      /(\d+\s?-\s?(?:pack|count|ct))/i
    ];

    for (const pattern of sizePatterns) {
      const match = productName.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * Transform raw Target API product data to standardized format
   * @param {object} product - Raw product data from API
   * @param {string} searchTerm - Original search term
   * @param {string} storeId - Store ID used for search
   * @returns {object} - Standardized product object
   */
  transformProduct(product, searchTerm, storeId) {
    const item = product.item || {};
    const priceData = product.price || {};
    const images = item.enrichment?.images || {};

    // Extract primary image
    let imageUrl = null;
    if (images.primary_image_url) {
      imageUrl = images.primary_image_url;
    } else if (images.base_url && images.primary) {
      imageUrl = images.base_url + images.primary;
    }

    // Extract UPC (if available)
    // Target API doesn't provide UPC in search results, so we use TCIN as a pseudo-UPC
    // Format: TGT{tcin} (e.g., TGT12955065)
    // This allows products to be saved to database immediately
    // Real UPCs can be enriched later via OpenFoodFacts API or product detail endpoint
    const upc = item.primary_barcode || (product.tcin ? `TGT${product.tcin}` : null);

    // Decode HTML entities in product name
    const productName = this.decodeHtmlEntities(item.product_description?.title || 'Unknown Product');

    // Extract size from product name
    const size = this.extractSizeFromName(productName);

    // Build product object
    return {
      tcin: product.tcin || null, // Target's internal product ID
      name: productName,
      brand: item.product_brand?.name || null,
      price: priceData.current_retail || null,
      originalPrice: priceData.reg_retail || null,
      formattedPrice: priceData.formatted_current_price || null,
      savings: priceData.save_dollar || null,
      savingsPercent: priceData.save_percent || null,
      upc: upc, // Pseudo-UPC (TGT{tcin}) - will be enriched with real UPC later
      size: size, // Extracted from product name
      image: imageUrl,
      imageUrl: imageUrl,
      productUrl: `https://www.target.com/p/-/A-${product.tcin}`,
      store: 'target',
      storeId: storeId,
      category: this.getCategoryFromProduct(product),
      dealType: this.getDealType(priceData),
      inStock: true, // Assume in stock if in search results
      scrapedAt: new Date().toISOString(),
      searchTerm: searchTerm,
      needsEnrichment: upc.startsWith('TGT') // Flag products that need real UPC enrichment
    };
  }

  /**
   * Determine deal type from price data
   * @param {object} priceData - Price data from API
   * @returns {string|null} - Deal type (sale, clearance, etc.)
   */
  getDealType(priceData) {
    if (!priceData) return null;

    if (priceData.save_dollar > 0) {
      if (priceData.save_percent >= 30) {
        return 'clearance';
      } else if (priceData.save_percent >= 10) {
        return 'sale';
      }
      return 'discount';
    }

    return null;
  }

  /**
   * Extract category from product data
   * @param {object} product - Product data from API
   * @returns {string} - Product category
   */
  getCategoryFromProduct(product) {
    const item = product.item || {};
    const classification = item.product_classification || {};

    // Try to get category from product classification
    if (classification.product_type_name) {
      return classification.product_type_name;
    }

    if (classification.merchandise_type_name) {
      return classification.merchandise_type_name;
    }

    return 'General';
  }

  /**
   * Parse price string to numeric value
   * @param {string|number} priceValue - Price value (string or number)
   * @returns {number|null} - Parsed price as number
   */
  parsePrice(priceValue) {
    if (typeof priceValue === 'number') {
      return priceValue;
    }

    if (!priceValue || typeof priceValue !== 'string') {
      return null;
    }

    const cleaned = priceValue.replace(/[$,\s]/g, '');
    const parsed = parseFloat(cleaned);

    return isNaN(parsed) ? null : parsed;
  }

  /**
   * Check if the scraper is working properly
   * @returns {Promise<boolean>} - True if scraper is functional
   */
  async isWorking() {
    try {
      const testResults = await this.searchProducts('milk', '10001', '2055', 1);
      return Array.isArray(testResults) && testResults.length > 0;
    } catch (error) {
      this.logger.error(`Health check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Decode HTML entities in a string
   * @param {string} text - Text with HTML entities
   * @returns {string} - Decoded text
   */
  decodeHtmlEntities(text) {
    if (!text || typeof text !== 'string') {
      return text;
    }

    const entities = {
      '&#38;': '&',
      '&#8482;': '™',
      '&#174;': '®',
      '&#169;': '©',
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&nbsp;': ' '
    };

    let decoded = text;
    for (const [entity, char] of Object.entries(entities)) {
      decoded = decoded.replace(new RegExp(entity, 'g'), char);
    }

    return decoded;
  }

  /**
   * Utility function to add delay between requests (rate limiting)
   *
   * This method implements a simple but effective rate limiting strategy by introducing
   * a fixed delay between consecutive API requests.
   *
   * RATE LIMITING DETAILS:
   * - Default delay: 10000ms (10 seconds) for bulk scraping operations
   * - Purpose: Prevent Target API from rate limiting or blocking our requests
   * - Target's limits: Undocumented, but 10s delay ensures safe bulk scraping (~6 requests/minute)
   * - Consequences of exceeding limits:
   *   - 403 Forbidden errors
   *   - 429 Too Many Requests errors
   *   - Temporary IP blocks (can last hours)
   *   - Potential API key suspension
   *
   * USAGE:
   * Always call this before making API requests:
   *   await this.delay(10000);
   *   const response = await axios.get(url);
   *
   * @param {number} ms - Milliseconds to delay (recommended: 10000ms for bulk scraping)
   * @returns {Promise} - Promise that resolves after the specified delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = TargetScraper;
