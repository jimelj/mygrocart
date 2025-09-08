const axios = require('axios');
const cheerio = require('cheerio');

class ScrapingService {
  constructor() {
    this.scrapeDoToken = process.env.SCRAPE_DO_TOKEN;
    this.scrapeDoApiUrl = process.env.SCRAPE_DO_API_URL;
    
    if (!this.scrapeDoToken) {
      console.warn('SCRAPE_DO_TOKEN not found in environment variables');
    }
  }

  /**
   * Make a request through Scrape.do API
   * @param {string} targetUrl - The URL to scrape
   * @param {object} options - Additional options for the request
   * @returns {Promise<string>} - The HTML content of the page
   */
  async scrapeUrl(targetUrl, options = {}) {
    try {
      const {
        render = true,
        geolocation = 'US',
        format = 'html',
        timeout = 30000,
        customWait = 3000,
        width = 1920,
        height = 1080
      } = options;

      // Build query parameters object with absolute minimal parameters
      const params = new URLSearchParams({
        token: this.scrapeDoToken,
        url: targetUrl
      });

      // Only add optional parameters if they're different from defaults
      if (render) {
        params.append('render', 'true');
      }
      if (customWait && customWait > 0) {
        params.append('customWait', customWait.toString());
      }

      const apiUrl = `${this.scrapeDoApiUrl}/?${params.toString()}`;

      console.log(`Scraping URL: ${targetUrl}`);
      console.log(`API Request: ${this.scrapeDoApiUrl}/?token=***&url=${encodeURIComponent(targetUrl)}&...`);
      
      const response = await axios.get(apiUrl, {
        timeout: timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br'
        }
      });

      if (response.status !== 200) {
        throw new Error(`Scrape.do API returned status ${response.status}: ${response.statusText}`);
      }

      return response.data;
    } catch (error) {
      console.error('Error scraping URL:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      throw new Error(`Failed to scrape ${targetUrl}: ${error.message}`);
    }
  }

  /**
   * Parse HTML content using Cheerio
   * @param {string} html - The HTML content to parse
   * @returns {object} - Cheerio object for DOM manipulation
   */
  parseHtml(html) {
    return cheerio.load(html);
  }

  /**
   * Extract UPC from various possible sources in product data
   * @param {object} productData - Product information object
   * @returns {string|null} - UPC code or null if not found
   */
  extractUPC(productData) {
    // Common UPC patterns and sources
    const upcSources = [
      productData.upc,
      productData.barcode,
      productData.gtin,
      productData.ean,
      productData.productId,
      productData.sku
    ];

    for (const source of upcSources) {
      if (source && typeof source === 'string') {
        // Clean and validate UPC (should be 12 digits)
        const cleanUpc = source.replace(/\D/g, '');
        if (cleanUpc.length === 12 || cleanUpc.length === 13) {
          return cleanUpc;
        }
      }
    }

    return null;
  }

  /**
   * Clean and normalize price string
   * @param {string} priceStr - Raw price string from website
   * @returns {number|null} - Normalized price as number or null
   */
  normalizePrice(priceStr) {
    if (!priceStr) return null;

    // Remove currency symbols and extra whitespace
    const cleanPrice = priceStr.replace(/[$,\s]/g, '');
    
    // Extract price using regex (handles formats like $1.99, 1.99, etc.)
    const priceMatch = cleanPrice.match(/(\d+\.?\d*)/);
    
    if (priceMatch) {
      const price = parseFloat(priceMatch[1]);
      return isNaN(price) ? null : price;
    }

    return null;
  }

  /**
   * Generate a search URL for ShopRite
   * @param {string} searchTerm - Product search term
   * @param {string} zipCode - ZIP code for location-based results
   * @param {string} storeId - Optional specific store ID override
   * @returns {string} - Complete search URL
   */
  buildShopRiteSearchUrl(searchTerm, zipCode = '07001', storeId = null) {
    // Use the comprehensive ID mapping system
    const shopriteMappings = require('../config/shoprite-mappings');
    return shopriteMappings.buildShopRiteUrl(searchTerm, zipCode, storeId);
  }

  /**
   * Generate a product detail URL for ShopRite
   * @param {string} productId - ShopRite product ID
   * @returns {string} - Complete product detail URL
   */
  buildShopRiteProductUrl(productId) {
    const baseUrl = 'https://www.shoprite.com';
    return `${baseUrl}/sm/pickup/rsid/1680/product/${productId}`;
  }

  /**
   * Log scraping activity for monitoring and debugging
   * @param {string} action - The action being performed
   * @param {object} data - Additional data to log
   */
  logActivity(action, data = {}) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ScrapingService: ${action}`, data);
  }
}

module.exports = ScrapingService;

