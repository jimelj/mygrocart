const ShopRiteScraper = require('../scrapers/ShopRiteScraper');
const ProductService = require('./ProductService');
const Store = require('../models/Store');

class ScrapingOrchestrator {
  constructor() {
    this.shopRiteScraper = new ShopRiteScraper();
    this.productService = new ProductService();
    this.isRunning = false;
  }

  /**
   * Scrape products from ShopRite and save to database
   * @param {object} options - Scraping options
   * @returns {Promise<object>} - Scraping results
   */
  async scrapeShopRite(options = {}) {
    const {
      searchTerms = ['milk', 'bread', 'eggs', 'chicken', 'apples'],
      zipCode = '07001',
      maxResultsPerTerm = 10
    } = options;

    if (this.isRunning) {
      throw new Error('Scraping is already in progress');
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      console.log('Starting ShopRite scraping process...');
      
      // Ensure ShopRite store exists in database
      const shopRiteStore = await this.ensureStoreExists({
        storeId: 'shoprite',
        chainName: 'ShopRite',
        storeName: 'ShopRite',
        address: 'Various Locations',
        city: 'New York',
        state: 'NY',
        zipCode: zipCode,
        latitude: 40.7128,
        longitude: -74.0060
      });

      const allScrapedProducts = [];
      const termResults = {};

      // Scrape products for each search term
      for (const searchTerm of searchTerms) {
        try {
          console.log(`Scraping products for: ${searchTerm}`);
          
          const products = await this.shopRiteScraper.searchProducts(
            searchTerm, 
            zipCode, 
            maxResultsPerTerm
          );

          termResults[searchTerm] = {
            found: products.length,
            withUPC: products.filter(p => p.upc).length,
            withPrice: products.filter(p => p.price !== null).length
          };

          allScrapedProducts.push(...products);
          
          // Add delay between requests to be respectful
          await this.delay(2000);
          
        } catch (error) {
          console.error(`Error scraping ${searchTerm}:`, error.message);
          termResults[searchTerm] = {
            error: error.message
          };
        }
      }

      // Process and save scraped products to database
      console.log(`Processing ${allScrapedProducts.length} scraped products...`);
      const processingResults = await this.productService.processScrapedProducts(
        allScrapedProducts,
        'shoprite'
      );

      const endTime = Date.now();
      const duration = Math.round((endTime - startTime) / 1000);

      const results = {
        success: true,
        duration: `${duration} seconds`,
        searchTerms: searchTerms,
        termResults: termResults,
        totalProductsFound: allScrapedProducts.length,
        processingResults: processingResults,
        timestamp: new Date().toISOString()
      };

      console.log('ShopRite scraping completed successfully:', results);
      return results;

    } catch (error) {
      console.error('ShopRite scraping failed:', error.message);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Scrape detailed information for specific products
   * @param {Array} productUrls - Array of product URLs to scrape
   * @returns {Promise<object>} - Detailed scraping results
   */
  async scrapeProductDetails(productUrls) {
    if (this.isRunning) {
      throw new Error('Scraping is already in progress');
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      console.log(`Scraping details for ${productUrls.length} products...`);
      
      const detailedProducts = [];
      const errors = [];

      for (const productUrl of productUrls) {
        try {
          const productDetails = await this.shopRiteScraper.getProductDetails(productUrl);
          if (productDetails) {
            detailedProducts.push(productDetails);
          }
          
          // Add delay between requests
          await this.delay(3000);
          
        } catch (error) {
          console.error(`Error scraping product details ${productUrl}:`, error.message);
          errors.push({
            url: productUrl,
            error: error.message
          });
        }
      }

      // Process detailed products
      const processingResults = await this.productService.processScrapedProducts(
        detailedProducts,
        'shoprite'
      );

      const endTime = Date.now();
      const duration = Math.round((endTime - startTime) / 1000);

      const results = {
        success: true,
        duration: `${duration} seconds`,
        totalUrlsProcessed: productUrls.length,
        successfullyScraped: detailedProducts.length,
        errors: errors.length,
        errorDetails: errors,
        processingResults: processingResults,
        timestamp: new Date().toISOString()
      };

      console.log('Product details scraping completed:', results);
      return results;

    } catch (error) {
      console.error('Product details scraping failed:', error.message);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Run a comprehensive scraping session
   * @param {object} options - Comprehensive scraping options
   * @returns {Promise<object>} - Complete scraping results
   */
  async runComprehensiveScraping(options = {}) {
    const {
      searchTerms = [
        'milk', 'bread', 'eggs', 'chicken breast', 'ground beef',
        'bananas', 'apples', 'tomatoes', 'lettuce', 'onions',
        'rice', 'pasta', 'cereal', 'yogurt', 'cheese'
      ],
      zipCode = '07001',
      maxResultsPerTerm = 15,
      includeDetailedScraping = false
    } = options;

    try {
      console.log('Starting comprehensive ShopRite scraping...');
      
      // Phase 1: Search-based scraping
      const searchResults = await this.scrapeShopRite({
        searchTerms,
        zipCode,
        maxResultsPerTerm
      });

      let detailResults = null;

      // Phase 2: Detailed scraping (if requested)
      if (includeDetailedScraping) {
        // Get product URLs from search results for detailed scraping
        const productUrls = searchResults.termResults
          ? Object.values(searchResults.termResults)
              .filter(result => !result.error)
              .slice(0, 10) // Limit to 10 for demo
          : [];

        if (productUrls.length > 0) {
          detailResults = await this.scrapeProductDetails(productUrls);
        }
      }

      return {
        success: true,
        searchPhase: searchResults,
        detailPhase: detailResults,
        summary: {
          totalProductsProcessed: searchResults.processingResults.processed + (detailResults?.processingResults.processed || 0),
          totalProductsCreated: searchResults.processingResults.created + (detailResults?.processingResults.created || 0),
          totalErrors: searchResults.processingResults.errors + (detailResults?.processingResults.errors || 0)
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Comprehensive scraping failed:', error.message);
      throw error;
    }
  }

  /**
   * Ensure a store exists in the database
   * @param {object} storeData - Store information
   * @returns {Promise<object>} - Store document
   */
  async ensureStoreExists(storeData) {
    try {
      let store = await Store.findOne({ storeId: storeData.storeId });
      
      if (!store) {
        store = new Store(storeData);
        await store.save();
        console.log(`Created store: ${storeData.name}`);
      }
      
      return store;
    } catch (error) {
      console.error('Error ensuring store exists:', error.message);
      throw error;
    }
  }

  /**
   * Get scraping status and statistics
   * @returns {Promise<object>} - Current scraping status
   */
  async getScrapingStatus() {
    try {
      const shopRiteStore = await Store.findOne({ storeId: 'shoprite' });
      
      if (!shopRiteStore) {
        return {
          isRunning: this.isRunning,
          storeConfigured: false,
          message: 'ShopRite store not configured'
        };
      }

      // Get recent scraping statistics
      const recentProducts = await this.productService.getProductsByStore('shoprite', 10);
      
      return {
        isRunning: this.isRunning,
        storeConfigured: true,
        store: shopRiteStore,
        recentProductCount: recentProducts.length,
        lastScrapedProducts: recentProducts.slice(0, 5).map(p => ({
          name: p.name,
          price: p.price,
          lastUpdated: p.lastUpdated
        }))
      };
    } catch (error) {
      console.error('Error getting scraping status:', error.message);
      return {
        isRunning: this.isRunning,
        error: error.message
      };
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

module.exports = ScrapingOrchestrator;

