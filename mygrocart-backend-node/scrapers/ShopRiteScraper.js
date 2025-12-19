const { chromium } = require('playwright');
const { createLogger } = require('../utils/logger');

/**
 * ShopRite Scraper using Playwright
 * Based on Day 1 research findings (DAY_1_RESEARCH_NOTES.md)
 *
 * Implementation Details:
 * - Uses Playwright headless browser to bypass Cloudflare
 * - Sets store context via cookies (MI9_RSID, MI9_SHOPPING_MODE, MI9_ZIPCODE)
 * - Waits 15 seconds for React page rendering (increased for bulk scraping)
 * - Extracts products using CSS module selectors
 * - Rate limiting: 15 seconds between requests to avoid IP blocks during bulk scraping
 * - User agent rotation: Rotates between multiple user agents to avoid detection
 */
class ShopRiteScraper {
  constructor() {
    this.baseUrl = 'https://www.shoprite.com';
    this.browser = null;
    this.context = null;
    this.isInitialized = false;
    this.logger = createLogger('ShopRiteScraper');
    this.lastRequestTime = 0;
    this.minRequestDelay = 15000; // 15 seconds between requests for bulk scraping
    this.currentUserAgentIndex = 0;
    this.userAgents = [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
    ];
  }

  /**
   * Get next user agent in rotation
   * @returns {string} - User agent string
   */
  getNextUserAgent() {
    const userAgent = this.userAgents[this.currentUserAgentIndex];
    this.currentUserAgentIndex = (this.currentUserAgentIndex + 1) % this.userAgents.length;
    return userAgent;
  }

  /**
   * Initialize Playwright browser
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.isInitialized && this.browser) {
      return;
    }

    try {
      this.logger.info('Initializing Playwright browser...');
      this.browser = await chromium.launch({
        headless: true,
        args: ['--disable-blink-features=AutomationControlled']
      });

      // Use rotated user agent
      const userAgent = this.getNextUserAgent();
      this.logger.debug(`Using user agent: ${userAgent.substring(0, 50)}...`);

      this.context = await this.browser.newContext({
        userAgent: userAgent,
        viewport: { width: 1920, height: 1080 }
      });

      this.isInitialized = true;
      this.logger.info('Browser initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize browser:', error.message);
      throw error;
    }
  }

  /**
   * Set store context via cookies
   * @param {string} storeId - ShopRite store ID (e.g., "3000")
   * @param {string} zipCode - ZIP code for store location
   * @returns {Promise<void>}
   */
  async setStore(storeId, zipCode) {
    if (!this.context) {
      await this.initialize();
    }

    try {
      this.logger.debug(`Setting store context - Store ID: ${storeId}, ZIP: ${zipCode}`);

      await this.context.addCookies([
        {
          name: 'MI9_RSID',
          value: storeId.toString(),
          domain: 'www.shoprite.com',
          path: '/'
        },
        {
          name: 'MI9_SHOPPING_MODE',
          value: 'pickup',
          domain: 'www.shoprite.com',
          path: '/'
        },
        {
          name: 'MI9_ZIPCODE',
          value: zipCode.toString(),
          domain: 'www.shoprite.com',
          path: '/'
        }
      ]);

      this.logger.debug('Store context set successfully');
    } catch (error) {
      this.logger.error('Failed to set store cookies:', error.message);
      throw error;
    }
  }

  /**
   * Search for products on ShopRite
   * @param {string} query - Search term (e.g., "milk", "bread")
   * @param {string} storeId - ShopRite store ID (default: "3000")
   * @param {string} zipCode - ZIP code for store location (default: "07001")
   * @param {number} limit - Maximum number of results to return (default: 30)
   * @returns {Promise<Array>} - Array of product objects
   */
  async searchProducts(query, storeId = '3000', zipCode = '07001', limit = 30) {
    let page = null;

    try {
      this.logger.info(`Searching for "${query}" at store ${storeId} (ZIP: ${zipCode})`);

      // Rate limiting: Wait if needed
      await this.enforceRateLimit();

      // Initialize browser if not already done
      await this.initialize();

      // Set store context
      await this.setStore(storeId, zipCode);

      // Create new page
      page = await this.context.newPage();

      // Navigate to search results page
      const searchUrl = `${this.baseUrl}/sm/pickup/rsid/${storeId}/results?q=${encodeURIComponent(query)}`;
      this.logger.debug(`Navigating to ${searchUrl}`);

      await page.goto(searchUrl, {
        timeout: 60000,
        waitUntil: 'domcontentloaded'
      });

      // Wait 15 seconds for React to render products (increased for bulk scraping reliability)
      this.logger.debug('Waiting 15 seconds for page rendering...');
      await page.waitForTimeout(15000);

      // Extract product data from __PRELOADED_STATE__ (ShopRite's React state object)
      this.logger.debug('Extracting product data from __PRELOADED_STATE__...');
      const products = await page.evaluate(() => {
        const preloadedState = window.__PRELOADED_STATE__;

        if (!preloadedState) {
          console.error('[DEBUG] No __PRELOADED_STATE__ found');
          return [];
        }

        if (!preloadedState.search) {
          console.error('[DEBUG] No search key in __PRELOADED_STATE__', Object.keys(preloadedState));
          return [];
        }

        console.log('[DEBUG] search keys:', Object.keys(preloadedState.search));

        // Try searchProductItems first (array), then productCardDictionary (object)
        let productsList = [];
        let source = null;

        if (preloadedState.search.searchProductItems && Array.isArray(preloadedState.search.searchProductItems) && preloadedState.search.searchProductItems.length > 0) {
          productsList = preloadedState.search.searchProductItems;
          source = 'searchProductItems';
        } else if (preloadedState.search.productCardDictionary && Object.keys(preloadedState.search.productCardDictionary).length > 0) {
          // Convert dictionary to array
          productsList = Object.values(preloadedState.search.productCardDictionary);
          source = 'productCardDictionary';
        }

        console.log(`[DEBUG] Using ${source}, found ${productsList.length} products`);

        // Map products to our format
        return productsList.map(item => ({
          name: item.name,
          price: item.price != null && typeof item.price === 'number' ? `$${item.price.toFixed(2)}` : (item.priceLabel || null),
          unitPrice: item.unitPrice ? (typeof item.unitPrice === 'number' ? `$${item.unitPrice.toFixed(2)}/${item.unitOfPrice || 'unit'}` : String(item.unitPrice)) : null,
          brand: item.brand,
          image: item.image,
          link: null,  // Not available in __PRELOADED_STATE__
          sku: item.sku  // Get SKU from __PRELOADED_STATE__
        }));
      });

      this.logger.info(`Found ${products.length} products for "${query}"`);

      // Transform and limit results
      const transformedProducts = products.slice(0, limit).map(product => {
        // Clean product name BEFORE processing
        const cleanedName = this.cleanProductName(product.name);

        return {
          name: cleanedName,
          price: this.parsePrice(product.price),
          originalPrice: product.price,
          unitPrice: product.unitPrice,
          brand: product.brand || this.extractBrandFromName(cleanedName),
          size: this.extractSizeFromName(cleanedName),
          image: product.image,
          productUrl: product.link,
          upc: product.sku || this.generateSyntheticUPC(cleanedName), // Use actual SKU if available, else generate synthetic UPC
          store: 'ShopRite',
          storeId: storeId,
          category: null,
          inStock: true,
          scrapedAt: new Date().toISOString(),
          searchTerm: query,
          zipCode: zipCode
        };
      });

      return transformedProducts;

    } catch (error) {
      this.logger.error(`Error searching for "${query}":`, error.message);
      return [];
    } finally {
      // Always close the page to prevent memory leaks
      if (page) {
        try {
          await page.close();
          this.logger.debug('Page closed successfully');
        } catch (closeError) {
          this.logger.error('Error closing page:', closeError.message);
        }
      }
    }
  }

  /**
   * Enforce rate limiting between requests
   * @returns {Promise<void>}
   */
  async enforceRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minRequestDelay) {
      const waitTime = this.minRequestDelay - timeSinceLastRequest;
      this.logger.debug(`Rate limiting: waiting ${waitTime}ms`);
      await this.delay(waitTime);
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Get detailed product information from product page
   * @param {string} productUrl - URL of the product page
   * @returns {Promise<object|null>} - Detailed product information or null
   */
  async getProductDetails(productUrl) {
    let page = null;

    try {
      this.logger.info(`Getting details for ${productUrl}`);

      await this.enforceRateLimit();
      await this.initialize();

      page = await this.context.newPage();
      await page.goto(productUrl, {
        timeout: 60000,
        waitUntil: 'domcontentloaded'
      });

      // Wait for page rendering (increased to 15s for bulk scraping reliability)
      await page.waitForTimeout(15000);

      // Extract detailed product information
      const details = await page.evaluate(() => {
        // This would need custom selectors for the product detail page
        // For now, return basic structure
        return {
          upc: null, // Would need to extract from page
          nutrition: null,
          ingredients: null,
          description: null
        };
      });

      return details;

    } catch (error) {
      this.logger.error(`Error getting details for "${productUrl}":`, error.message);
      return null;
    } finally {
      // Always close the page to prevent memory leaks
      if (page) {
        try {
          await page.close();
          this.logger.debug('Page closed successfully');
        } catch (closeError) {
          this.logger.error('Error closing page:', closeError.message);
        }
      }
    }
  }

  /**
   * Clean product name to remove duplicates and price information
   * Fixes issue where ShopRite DOM contains duplicated accessibility text
   * Example: "Soup, 10 oz, $2.09Soup, 10 oz" -> "Soup, 10 oz"
   * @param {string} rawName - Raw product name from DOM
   * @returns {string} - Cleaned product name
   */
  cleanProductName(rawName) {
    if (!rawName) return '';

    // Step 1: Remove price information (e.g., "$6.49", "$12.99")
    let cleaned = rawName.replace(/,?\s*\$\d+\.\d{2}/g, '');

    // Step 2: Split by double spaces or newlines to find potential duplicates
    const parts = cleaned.split(/\s{2,}|\n/).filter(p => p.trim());

    if (parts.length > 1) {
      // Check if parts are duplicates (normalize for comparison)
      const normalized = parts.map(p => p.trim().toLowerCase().replace(/[^\w\s]/g, ''));

      // If first and second parts are identical or very similar, keep only the first
      if (normalized[0] === normalized[1] || normalized[1].startsWith(normalized[0])) {
        cleaned = parts[0].trim();
      }
    }

    // Step 3: Check for pattern where text appears twice in sequence
    // Example: "Organic Valley Milk Organic Valley Milk" -> "Organic Valley Milk"
    const words = cleaned.split(/\s+/);
    const halfLength = Math.floor(words.length / 2);

    if (words.length > 6 && halfLength > 0) {
      const firstHalf = words.slice(0, halfLength).join(' ').toLowerCase();
      const secondHalf = words.slice(halfLength).join(' ').toLowerCase();

      // If first and second half are identical, keep only first half
      if (firstHalf === secondHalf) {
        cleaned = words.slice(0, halfLength).join(' ');
      }
    }

    // Step 4: Clean up multiple spaces and trim
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    // Step 5: Remove trailing commas or periods
    cleaned = cleaned.replace(/[,.]$/, '');

    return cleaned;
  }

  /**
   * Parse price string to extract numeric value
   * @param {string} priceString - Price string like "$3.99" or "3.99"
   * @returns {number|null} - Parsed price as number or null if invalid
   */
  parsePrice(priceString) {
    if (!priceString || typeof priceString !== 'string') {
      return null;
    }

    // Remove currency symbols, commas, and whitespace
    const cleaned = priceString.replace(/[$,\s]/g, '');
    const parsed = parseFloat(cleaned);

    return isNaN(parsed) ? null : parsed;
  }

  /**
   * Extract brand from product name
   * @param {string} productName - Full product name
   * @returns {string|null} - Extracted brand or null
   */
  extractBrandFromName(productName) {
    if (!productName) return null;

    // Brand is typically the first word or words before comma
    const parts = productName.split(',');
    if (parts.length > 0) {
      const firstPart = parts[0].trim();
      const words = firstPart.split(' ');

      // If first part is short (1-3 words), it's likely the brand
      if (words.length <= 3) {
        return firstPart;
      }

      // Otherwise, take first 2 words as brand
      return words.slice(0, 2).join(' ');
    }

    return null;
  }

  /**
   * Extract size from product name
   * @param {string} productName - Full product name
   * @returns {string|null} - Extracted size or null
   */
  extractSizeFromName(productName) {
    if (!productName) return null;

    // Look for common size patterns: "16 oz", "1 gallon", "12 ct", etc.
    const sizePattern = /\b\d+(\.\d+)?\s*(oz|lb|lbs|gallon|gal|ct|count|ml|l|kg|g)\b/i;
    const match = productName.match(sizePattern);

    return match ? match[0] : null;
  }

  /**
   * Generate a synthetic UPC from product URL or name
   * ShopRite doesn't provide UPCs in search results, so we generate a unique identifier
   * @param {string} identifier - Product URL or name
   * @returns {string} - 12-digit synthetic UPC
   */
  generateSyntheticUPC(identifier) {
    if (!identifier) {
      // Generate random UPC if no identifier
      return '999' + Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
    }

    // Create hash from identifier
    let hash = 0;
    for (let i = 0; i < identifier.length; i++) {
      const char = identifier.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    // Convert to positive number and ensure 12 digits
    const upc = Math.abs(hash).toString().padStart(12, '0').slice(0, 12);

    // Prefix with '999' to indicate synthetic UPC
    return '999' + upc.slice(3);
  }

  /**
   * Check if the scraper is working properly
   * @returns {Promise<boolean>} - True if scraper is functional
   */
  async isWorking() {
    try {
      const testResults = await this.searchProducts('milk', '3000', '07001', 1);
      return Array.isArray(testResults) && testResults.length > 0;
    } catch (error) {
      this.logger.error('Health check failed:', error.message);
      return false;
    }
  }

  /**
   * Close browser and cleanup resources
   * @returns {Promise<void>}
   */
  async close() {
    try {
      if (this.browser) {
        this.logger.info('Closing browser...');
        await this.browser.close();
        this.browser = null;
        this.context = null;
        this.isInitialized = false;
        this.logger.info('Browser closed successfully');
      }
    } catch (error) {
      this.logger.error('Error closing browser:', error.message);
    }
  }

  /**
   * Utility function to add delay between requests
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = ShopRiteScraper;
