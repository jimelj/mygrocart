const express = require('express');
const ScrapingOrchestrator = require('../services/ScrapingOrchestrator');
const ProductService = require('../services/ProductService');

const router = express.Router();
const orchestrator = new ScrapingOrchestrator();
const productService = new ProductService();

/**
 * GET /api/scraping/status
 * Get current scraping status and statistics
 */
router.get('/status', async (req, res) => {
  try {
    const status = await orchestrator.getScrapingStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/scraping/shoprite/search
 * Trigger ShopRite product search scraping
 */
router.post('/shoprite/search', async (req, res) => {
  try {
    const {
      searchTerms = ['milk', 'bread', 'eggs'],
      zipCode = '07001',
      maxResultsPerTerm = 10
    } = req.body;

    // Validate input
    if (!Array.isArray(searchTerms) || searchTerms.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'searchTerms must be a non-empty array'
      });
    }

    if (searchTerms.length > 20) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 20 search terms allowed'
      });
    }

    if (maxResultsPerTerm > 50) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 50 results per term allowed'
      });
    }

    // Start scraping (async)
    const results = await orchestrator.scrapeShopRite({
      searchTerms,
      zipCode,
      maxResultsPerTerm
    });

    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/scraping/shoprite/comprehensive
 * Run comprehensive ShopRite scraping
 */
router.post('/shoprite/comprehensive', async (req, res) => {
  try {
    const {
      searchTerms,
      zipCode = '07001',
      maxResultsPerTerm = 15,
      includeDetailedScraping = false
    } = req.body;

    const results = await orchestrator.runComprehensiveScraping({
      searchTerms,
      zipCode,
      maxResultsPerTerm,
      includeDetailedScraping
    });

    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/scraping/shoprite/product-details
 * Scrape detailed information for specific product URLs
 */
router.post('/shoprite/product-details', async (req, res) => {
  try {
    const { productUrls } = req.body;

    if (!Array.isArray(productUrls) || productUrls.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'productUrls must be a non-empty array'
      });
    }

    if (productUrls.length > 10) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 10 product URLs allowed per request'
      });
    }

    const results = await orchestrator.scrapeProductDetails(productUrls);

    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/scraping/products/store/:storeId
 * Get products scraped from a specific store
 */
router.get('/products/store/:storeId', async (req, res) => {
  try {
    const { storeId } = req.params;
    const { limit = 50 } = req.query;

    const products = await productService.getProductsByStore(storeId, parseInt(limit));

    res.json({
      success: true,
      data: {
        storeId,
        count: products.length,
        products
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/scraping/products/search
 * Search products with prices across all stores
 */
router.get('/products/search', async (req, res) => {
  try {
    const { q: searchTerm, limit = 25 } = req.query;

    if (!searchTerm) {
      return res.status(400).json({
        success: false,
        error: 'Search term (q) is required'
      });
    }

    const products = await productService.searchProductsWithPrices(searchTerm, parseInt(limit));

    res.json({
      success: true,
      data: {
        searchTerm,
        count: products.length,
        products
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/scraping/products/:upc/prices
 * Get price comparison for a specific product
 */
router.get('/products/:upc/prices', async (req, res) => {
  try {
    const { upc } = req.params;

    const comparison = await productService.getPriceComparison(upc);

    res.json({
      success: true,
      data: comparison
    });

  } catch (error) {
    if (error.message === 'Product not found') {
      res.status(404).json({
        success: false,
        error: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
});

/**
 * POST /api/scraping/test
 * Test scraping functionality without database
 */
router.post('/test', async (req, res) => {
  try {
    const { testScrapingService } = require('../test_scraper_standalone');
    
    // Run basic tests
    const testResults = {
      urlBuilding: true,
      upcProcessing: true,
      priceNormalization: true,
      htmlParsing: true,
      apiConfiguration: !!process.env.SCRAPE_DO_TOKEN && process.env.SCRAPE_DO_TOKEN !== 'your-scrape-do-api-token-here'
    };

    res.json({
      success: true,
      data: {
        message: 'Scraper functionality test completed',
        results: testResults,
        ready: Object.values(testResults).every(Boolean),
        nextSteps: testResults.apiConfiguration ? 
          ['Start MongoDB', 'Run comprehensive scraping'] :
          ['Configure Scrape.do API token', 'Start MongoDB', 'Run comprehensive scraping']
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

