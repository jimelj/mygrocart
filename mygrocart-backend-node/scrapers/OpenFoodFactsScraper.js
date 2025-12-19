const axios = require('axios');
const { createLogger } = require('../utils/logger');

/**
 * OpenFoodFactsScraper - Product enrichment via OpenFoodFacts API v2
 *
 * Purpose: Enrich product data using UPC barcodes
 * API Docs: https://openfoodfacts.github.io/openfoodfacts-server/api/
 * Rate Limit: 100 requests/minute (600ms delay between requests)
 */
class OpenFoodFactsScraper {
  constructor() {
    this.baseUrl = 'https://world.openfoodfacts.org/api/v2';
    this.isInitialized = true;
    this.logger = createLogger('OpenFoodFactsScraper');
    this.requestDelay = 600; // 600ms = 100 requests/minute
  }

  /**
   * Get product information by UPC barcode
   * @param {string} upc - Product UPC code (barcode)
   * @returns {Promise<object|null>} - Product data or null if not found
   */
  async getProductByUPC(upc) {
    try {
      // Validate UPC
      if (!upc || typeof upc !== 'string') {
        throw new Error('UPC must be a non-empty string');
      }

      // Remove any non-numeric characters and trim
      const cleanUpc = upc.replace(/[^\d]/g, '').trim();

      if (cleanUpc.length < 8 || cleanUpc.length > 14) {
        throw new Error('UPC must be between 8 and 14 digits');
      }

      this.logger.info(`Fetching product data for UPC: ${cleanUpc}`);

      // Rate limiting: 600ms delay between requests
      await this.delay(this.requestDelay);

      // Build API URL
      const url = `${this.baseUrl}/product/${cleanUpc}.json`;

      // Make API request
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'MyGroCart/1.0 (contact@mygrocart.com)',
          'Accept': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      });

      // Check if product was found
      if (!response.data || response.data.status !== 1) {
        this.logger.warn(`Product not found for UPC: ${cleanUpc}`);
        return null;
      }

      const product = response.data.product;
      if (!product) {
        this.logger.warn(`No product data for UPC: ${cleanUpc}`);
        return null;
      }

      // Transform to standardized format
      const transformedProduct = this.transformProduct(product, cleanUpc);

      this.logger.info(`Successfully fetched product: ${transformedProduct.name}`);
      return transformedProduct;

    } catch (error) {
      // Handle 404 gracefully (product not found)
      if (error.response && error.response.status === 404) {
        this.logger.warn(`Product not found in OpenFoodFacts: ${upc}`);
        return null;
      }

      this.logger.error(`Error fetching UPC ${upc}: ${error.message}`);
      return null;
    }
  }

  /**
   * Transform OpenFoodFacts API response to standardized Product format
   * @param {object} product - Raw product data from API
   * @param {string} upc - UPC code
   * @returns {object} - Standardized product object
   */
  transformProduct(product, upc) {
    // Extract product name (prefer product_name, fallback to generic_name)
    const name = product.product_name || product.generic_name || 'Unknown Product';

    // Extract brand (brands field contains comma-separated list)
    const brand = product.brands ? product.brands.split(',')[0].trim() : null;

    // Extract category (use first category from categories_tags)
    let category = null;
    if (product.categories_tags && product.categories_tags.length > 0) {
      // Categories are in format "en:category-name", clean them up
      const firstCategory = product.categories_tags[0];
      category = firstCategory
        .replace(/^[a-z]{2}:/, '') // Remove language prefix (e.g., "en:")
        .replace(/-/g, ' ') // Replace hyphens with spaces
        .split(' ') // Split into words
        .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize
        .join(' ');
    }

    // Extract image URL (prefer front image, fallback to image_url)
    let imageUrl = null;
    if (product.image_front_url) {
      imageUrl = product.image_front_url;
    } else if (product.image_url) {
      imageUrl = product.image_url;
    } else if (product.image_small_url) {
      imageUrl = product.image_small_url;
    }

    // Extract size/quantity
    let size = null;
    if (product.quantity) {
      size = product.quantity;
    } else if (product.product_quantity && product.product_quantity_unit) {
      size = `${product.product_quantity} ${product.product_quantity_unit}`;
    }

    // Build standardized product object
    return {
      upc: upc,
      name: name,
      brand: brand,
      size: size,
      category: category,
      imageUrl: imageUrl,
      // Additional metadata (not saved to Product model, but useful for enrichment)
      metadata: {
        ingredients: product.ingredients_text || null,
        nutriments: product.nutriments || null,
        nutriScore: product.nutriscore_grade || null,
        labels: product.labels || null,
        packaging: product.packaging || null,
        origin: product.origins || null,
        manufacturingPlaces: product.manufacturing_places || null,
        lastModified: product.last_modified_t ? new Date(product.last_modified_t * 1000).toISOString() : null
      },
      source: 'openfoodfacts',
      scrapedAt: new Date().toISOString()
    };
  }

  /**
   * Search for products by name (optional, not primary use case)
   * OpenFoodFacts search API is less reliable than UPC lookup
   * @param {string} searchTerm - Product name to search
   * @param {number} limit - Maximum number of results
   * @returns {Promise<Array>} - Array of product objects
   */
  async searchProducts(searchTerm, limit = 10) {
    try {
      if (!searchTerm || typeof searchTerm !== 'string') {
        throw new Error('Search term must be a non-empty string');
      }

      this.logger.info(`Searching OpenFoodFacts for: ${searchTerm}`);

      // Rate limiting
      await this.delay(this.requestDelay);

      const url = `${this.baseUrl}/search`;
      const response = await axios.get(url, {
        params: {
          search_terms: searchTerm,
          page_size: limit,
          json: 1
        },
        headers: {
          'User-Agent': 'MyGroCart/1.0 (contact@mygrocart.com)',
          'Accept': 'application/json'
        },
        timeout: 10000
      });

      const products = response.data?.products || [];

      if (products.length === 0) {
        this.logger.info(`No products found for: ${searchTerm}`);
        return [];
      }

      // Transform all products
      const transformedProducts = products
        .filter(p => p.code) // Only include products with UPC codes
        .map(p => this.transformProduct(p, p.code));

      this.logger.info(`Found ${transformedProducts.length} products for: ${searchTerm}`);
      return transformedProducts;

    } catch (error) {
      this.logger.error(`Error searching for "${searchTerm}": ${error.message}`);
      return [];
    }
  }

  /**
   * Batch fetch multiple UPCs
   * @param {Array<string>} upcs - Array of UPC codes
   * @returns {Promise<Array>} - Array of product objects (nulls excluded)
   */
  async batchGetProducts(upcs) {
    if (!Array.isArray(upcs) || upcs.length === 0) {
      throw new Error('UPCs must be a non-empty array');
    }

    this.logger.info(`Batch fetching ${upcs.length} products`);

    const results = [];
    for (const upc of upcs) {
      const product = await this.getProductByUPC(upc);
      if (product) {
        results.push(product);
      }
    }

    this.logger.info(`Successfully fetched ${results.length}/${upcs.length} products`);
    return results;
  }

  /**
   * Check if the scraper is working properly
   * @returns {Promise<boolean>} - True if scraper is functional
   */
  async isWorking() {
    try {
      // Test with Coca-Cola UPC (well-known product)
      const testUpc = '5449000000996';
      const result = await this.getProductByUPC(testUpc);
      return result !== null;
    } catch (error) {
      this.logger.error(`Health check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Utility function to add delay between requests
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} - Promise that resolves after delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = OpenFoodFactsScraper;
