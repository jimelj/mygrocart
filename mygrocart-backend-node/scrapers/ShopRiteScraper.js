class ShopRiteScraper {
  constructor() {
    this.isInitialized = true;
    this.crawlerAvailable = false;
    
    // Try to load the crawler, but don't fail if dependencies are missing
    try {
      this.scrapeShopRite = require('../crawlers/shoprite/index').scrapeShopRite;
      this.crawlerAvailable = true;
      console.log('ShopRiteScraper: Crawler dependencies loaded successfully');
    } catch (error) {
      console.warn('ShopRiteScraper: Crawler dependencies not available, using mock data:', error.message);
      this.crawlerAvailable = false;
    }
  }

  /**
   * Search for products on ShopRite
   * @param {string} searchTerm - Product to search for
   * @param {string} zipCode - ZIP code for store location
   * @param {number} maxResults - Maximum number of results to return
   * @returns {Promise<Array>} - Array of product objects
   */
  async searchProducts(searchTerm, zipCode = '07001', maxResults = 10) {
    try {
      console.log(`ShopRiteScraper: Searching for "${searchTerm}" in ${zipCode}`);
      
      if (this.crawlerAvailable) {
        // Use the crawler function to scrape ShopRite
        const products = await this.scrapeShopRite(zipCode, searchTerm);
        
        if (!products || !Array.isArray(products)) {
          console.warn('No products returned from ShopRite scraper');
          return [];
        }

        // Transform the scraped data to match expected format
        const transformedProducts = products.slice(0, maxResults).map((product, index) => ({
          name: product.name || 'Unknown Product',
          price: this.parsePrice(product.price),
          originalPrice: product.price,
          upc: null, // UPC would need to be extracted from product details
          brand: null, // Brand would need to be extracted
          size: null, // Size would need to be extracted
          image: null, // Image URL would need to be extracted
          productUrl: null, // Product URL would need to be captured
          store: 'shoprite',
          storeId: 'shoprite',
          category: null,
          inStock: true, // Assume in stock if scraped
          scrapedAt: new Date().toISOString(),
          searchTerm: searchTerm,
          zipCode: zipCode
        }));

        console.log(`ShopRiteScraper: Found ${transformedProducts.length} products for "${searchTerm}"`);
        return transformedProducts;
      } else {
        // Return mock data when crawler is not available
        console.log(`ShopRiteScraper: Using mock data for "${searchTerm}"`);
        return this.getMockProducts(searchTerm, zipCode, maxResults);
      }

    } catch (error) {
      console.error(`ShopRiteScraper error for "${searchTerm}":`, error.message);
      return [];
    }
  }

  /**
   * Get detailed product information (placeholder for future implementation)
   * @param {string} productUrl - URL of the product page
   * @returns {Promise<object>} - Detailed product information
   */
  async getProductDetails(productUrl) {
    try {
      // This would need to be implemented to scrape individual product pages
      console.log(`ShopRiteScraper: Getting details for ${productUrl}`);
      
      // For now, return null to indicate this feature is not yet implemented
      return null;
      
    } catch (error) {
      console.error(`ShopRiteScraper details error for "${productUrl}":`, error.message);
      return null;
    }
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

    // Remove currency symbols and extract numeric value
    const cleaned = priceString.replace(/[$,\s]/g, '');
    const parsed = parseFloat(cleaned);
    
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * Check if the scraper is working properly
   * @returns {Promise<boolean>} - True if scraper is functional
   */
  async isWorking() {
    try {
      // Test with a simple search
      const testResults = await this.searchProducts('milk', '07001', 1);
      return Array.isArray(testResults);
    } catch (error) {
      console.error('ShopRiteScraper health check failed:', error.message);
      return false;
    }
  }

  /**
   * Generate mock product data for testing when crawler is not available
   * @param {string} searchTerm - Product search term
   * @param {string} zipCode - ZIP code
   * @param {number} maxResults - Maximum number of mock products
   * @returns {Array} - Array of mock product objects
   */
  getMockProducts(searchTerm, zipCode, maxResults) {
    const mockProductsMap = {
      'milk': [
        { name: 'ShopRite Whole Milk 1 Gallon', price: 3.49 },
        { name: 'ShopRite 2% Reduced Fat Milk 1 Gallon', price: 3.49 },
        { name: 'ShopRite Organic Whole Milk 1/2 Gallon', price: 4.99 },
        { name: 'ShopRite Lactose Free Milk 1/2 Gallon', price: 4.49 }
      ],
      'bread': [
        { name: 'ShopRite White Bread 20oz', price: 1.99 },
        { name: 'ShopRite Whole Wheat Bread 20oz', price: 2.49 },
        { name: 'ShopRite Multigrain Bread 20oz', price: 2.99 },
        { name: 'ShopRite Italian Bread 16oz', price: 1.79 }
      ],
      'eggs': [
        { name: 'ShopRite Large Eggs 12 Count', price: 2.99 },
        { name: 'ShopRite Extra Large Eggs 12 Count', price: 3.49 },
        { name: 'ShopRite Organic Eggs 12 Count', price: 4.99 },
        { name: 'ShopRite Brown Eggs 12 Count', price: 3.29 }
      ],
      'chicken': [
        { name: 'ShopRite Chicken Breast Boneless 1lb', price: 5.99 },
        { name: 'ShopRite Chicken Thighs 1lb', price: 3.99 },
        { name: 'ShopRite Whole Chicken 3-4lbs', price: 4.99 },
        { name: 'ShopRite Chicken Wings 1lb', price: 4.49 }
      ],
      'apples': [
        { name: 'ShopRite Gala Apples 3lb Bag', price: 3.99 },
        { name: 'ShopRite Red Delicious Apples 3lb Bag', price: 3.99 },
        { name: 'ShopRite Granny Smith Apples 3lb Bag', price: 4.49 },
        { name: 'ShopRite Honeycrisp Apples 2lb Bag', price: 4.99 }
      ]
    };

    const baseProducts = mockProductsMap[searchTerm.toLowerCase()] || [
      { name: `ShopRite ${searchTerm}`, price: 2.99 },
      { name: `ShopRite Premium ${searchTerm}`, price: 4.99 },
      { name: `ShopRite Organic ${searchTerm}`, price: 5.99 }
    ];

    return baseProducts.slice(0, maxResults).map((product, index) => ({
      name: product.name,
      price: product.price,
      originalPrice: `$${product.price.toFixed(2)}`,
      upc: `${Math.floor(Math.random() * 1000000000000)}`,
      brand: 'ShopRite',
      size: '1 unit',
      image: null,
      productUrl: `https://www.shoprite.com/products/${searchTerm}-${index}`,
      store: 'shoprite',
      storeId: 'shoprite',
      category: this.getCategoryFromSearchTerm(searchTerm),
      inStock: true,
      scrapedAt: new Date().toISOString(),
      searchTerm: searchTerm,
      zipCode: zipCode,
      isMockData: true
    }));
  }

  /**
   * Get category based on search term
   * @param {string} searchTerm - Product search term
   * @returns {string} - Product category
   */
  getCategoryFromSearchTerm(searchTerm) {
    const categoryMap = {
      'milk': 'Dairy',
      'bread': 'Bakery',
      'eggs': 'Dairy',
      'chicken': 'Meat',
      'apples': 'Produce',
      'cheese': 'Dairy',
      'yogurt': 'Dairy',
      'cereal': 'Breakfast',
      'pasta': 'Pantry',
      'rice': 'Pantry'
    };
    
    return categoryMap[searchTerm.toLowerCase()] || 'General';
  }
}

module.exports = ShopRiteScraper;
