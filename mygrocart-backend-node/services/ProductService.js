const Product = require('../models/Product');
const Store = require('../models/Store');
const StorePrice = require('../models/StorePrice');

class ProductService {
  constructor() {
    this.defaultCategory = 'Grocery';
  }

  /**
   * Create or update a product in the database
   * @param {object} productData - Product information from scraper
   * @returns {Promise<object>} - Created or updated product
   */
  async createOrUpdateProduct(productData) {
    try {
      const {
        upc,
        name,
        brand,
        size,
        category,
        imageUrl,
        description
      } = productData;

      if (!upc || !name) {
        throw new Error('UPC and name are required for product creation');
      }

      // Clean UPC (ensure it's 12 digits)
      const cleanUpc = this.cleanUPC(upc);
      if (!cleanUpc) {
        throw new Error(`Invalid UPC format: ${upc}`);
      }

      // Check if product already exists
      let product = await Product.findOne({ upc: cleanUpc });

      if (product) {
        // Update existing product with new information
        const updateData = {};
        if (name && name !== product.name) updateData.name = name;
        if (brand && brand !== product.brand) updateData.brand = brand;
        if (size && size !== product.size) updateData.size = size;
        if (category && category !== product.category) updateData.category = category;
        if (imageUrl && imageUrl !== product.imageUrl) updateData.imageUrl = imageUrl;

        if (Object.keys(updateData).length > 0) {
          product = await Product.findOneAndUpdate(
            { upc: cleanUpc },
            updateData,
            { new: true }
          );
          console.log(`Updated product: ${cleanUpc} - ${name}`);
        }
      } else {
        // Create new product
        product = new Product({
          upc: cleanUpc,
          name: name,
          brand: brand || null,
          size: size || null,
          category: category || this.defaultCategory,
          imageUrl: imageUrl || null
        });

        await product.save();
        console.log(`Created new product: ${cleanUpc} - ${name}`);
      }

      return product;
    } catch (error) {
      console.error('Error creating/updating product:', error.message);
      throw error;
    }
  }

  /**
   * Create or update store price information
   * @param {object} priceData - Price information from scraper
   * @returns {Promise<object>} - Created or updated store price
   */
  async createOrUpdateStorePrice(priceData) {
    try {
      const {
        upc,
        storeId,
        price,
        dealType = 'regular'
      } = priceData;

      if (!upc || !storeId || price === null || price === undefined) {
        throw new Error('UPC, storeId, and price are required for price creation');
      }

      const cleanUpc = this.cleanUPC(upc);
      if (!cleanUpc) {
        throw new Error(`Invalid UPC format: ${upc}`);
      }

      if (price < 0) {
        throw new Error(`Invalid price: ${price}`);
      }

      // Check if price record already exists
      let storePrice = await StorePrice.findOne({ 
        upc: cleanUpc, 
        storeId: storeId 
      });

      if (storePrice) {
        // Update existing price if it has changed
        if (storePrice.price !== price || storePrice.dealType !== dealType) {
          storePrice = await StorePrice.findOneAndUpdate(
            { upc: cleanUpc, storeId: storeId },
            { 
              price: price,
              dealType: dealType,
              lastUpdated: new Date()
            },
            { new: true }
          );
          console.log(`Updated price: ${cleanUpc} at ${storeId} - $${price}`);
        }
      } else {
        // Create new price record
        storePrice = new StorePrice({
          upc: cleanUpc,
          storeId: storeId,
          price: price,
          dealType: dealType,
          lastUpdated: new Date()
        });

        await storePrice.save();
        console.log(`Created new price: ${cleanUpc} at ${storeId} - $${price}`);
      }

      return storePrice;
    } catch (error) {
      console.error('Error creating/updating store price:', error.message);
      throw error;
    }
  }

  /**
   * Process scraped product data and save to database
   * @param {Array} scrapedProducts - Array of products from scraper
   * @param {string} storeId - Store identifier
   * @returns {Promise<object>} - Processing results
   */
  async processScrapedProducts(scrapedProducts, storeId) {
    const results = {
      processed: 0,
      created: 0,
      updated: 0,
      errors: 0,
      errorDetails: []
    };

    for (const scrapedProduct of scrapedProducts) {
      try {
        results.processed++;

        // Skip products without UPC or price
        if (!scrapedProduct.upc || scrapedProduct.price === null) {
          results.errors++;
          results.errorDetails.push({
            product: scrapedProduct.name,
            error: 'Missing UPC or price'
          });
          continue;
        }

        // Create or update product
        const existingProduct = await Product.findOne({ upc: this.cleanUPC(scrapedProduct.upc) });
        const product = await this.createOrUpdateProduct(scrapedProduct);
        
        if (!existingProduct) {
          results.created++;
        } else {
          results.updated++;
        }

        // Create or update store price
        await this.createOrUpdateStorePrice({
          upc: scrapedProduct.upc,
          storeId: storeId,
          price: scrapedProduct.price,
          dealType: this.determineDealType(scrapedProduct)
        });

      } catch (error) {
        results.errors++;
        results.errorDetails.push({
          product: scrapedProduct.name || 'Unknown',
          error: error.message
        });
        console.error(`Error processing product ${scrapedProduct.name}:`, error.message);
      }
    }

    console.log(`Processing complete: ${results.processed} processed, ${results.created} created, ${results.updated} updated, ${results.errors} errors`);
    return results;
  }

  /**
   * Clean and validate UPC format
   * @param {string} upc - Raw UPC string
   * @returns {string|null} - Cleaned UPC or null if invalid
   */
  cleanUPC(upc) {
    if (!upc) return null;

    // Remove all non-digit characters
    const cleanUpc = upc.toString().replace(/\D/g, '');

    // Validate length (12 or 13 digits are acceptable)
    if (cleanUpc.length === 12 || cleanUpc.length === 13) {
      // Return 12-digit UPC (remove leading digit if 13 digits)
      return cleanUpc.length === 13 ? cleanUpc.substring(1) : cleanUpc;
    }

    return null;
  }

  /**
   * Determine deal type based on scraped product data
   * @param {object} scrapedProduct - Product data from scraper
   * @returns {string} - Deal type
   */
  determineDealType(scrapedProduct) {
    const priceText = (scrapedProduct.priceText || '').toLowerCase();
    
    if (priceText.includes('sale') || priceText.includes('special')) {
      return 'sale';
    }
    
    if (priceText.includes('clearance')) {
      return 'clearance';
    }
    
    if (priceText.includes('coupon') || priceText.includes('digital')) {
      return 'coupon';
    }
    
    return 'regular';
  }

  /**
   * Get products by store with current prices
   * @param {string} storeId - Store identifier
   * @param {number} limit - Maximum number of products to return
   * @returns {Promise<Array>} - Array of products with prices
   */
  async getProductsByStore(storeId, limit = 100) {
    try {
      const storePrices = await StorePrice.find({ storeId })
        .sort({ lastUpdated: -1 })
        .limit(limit)
        .populate('upc');

      return storePrices.map(storePrice => ({
        ...storePrice.upc.toObject(),
        price: storePrice.price,
        dealType: storePrice.dealType,
        lastUpdated: storePrice.lastUpdated
      }));
    } catch (error) {
      console.error('Error getting products by store:', error.message);
      throw error;
    }
  }

  /**
   * Search products across all stores
   * @param {string} searchTerm - Search term
   * @param {number} limit - Maximum number of results
   * @returns {Promise<Array>} - Array of products with prices from all stores
   */
  async searchProductsWithPrices(searchTerm, limit = 50) {
    try {
      // Search products by name or brand
      const products = await Product.find({
        $text: { $search: searchTerm }
      }).limit(limit);

      const results = [];

      for (const product of products) {
        // Get prices from all stores for this product
        const storePrices = await StorePrice.find({ upc: product.upc })
          .populate('storeId');

        results.push({
          ...product.toObject(),
          storePrices: storePrices.map(sp => ({
            storeId: sp.storeId,
            price: sp.price,
            dealType: sp.dealType,
            lastUpdated: sp.lastUpdated
          }))
        });
      }

      return results;
    } catch (error) {
      console.error('Error searching products with prices:', error.message);
      throw error;
    }
  }

  /**
   * Get price comparison for a specific product across stores
   * @param {string} upc - Product UPC
   * @returns {Promise<Array>} - Array of prices from different stores
   */
  async getPriceComparison(upc) {
    try {
      const cleanUpc = this.cleanUPC(upc);
      if (!cleanUpc) {
        throw new Error('Invalid UPC format');
      }

      const product = await Product.findOne({ upc: cleanUpc });
      if (!product) {
        throw new Error('Product not found');
      }

      const storePrices = await StorePrice.find({ upc: cleanUpc })
        .populate('storeId')
        .sort({ price: 1 });

      return {
        product: product.toObject(),
        prices: storePrices.map(sp => ({
          store: sp.storeId,
          price: sp.price,
          dealType: sp.dealType,
          lastUpdated: sp.lastUpdated
        }))
      };
    } catch (error) {
      console.error('Error getting price comparison:', error.message);
      throw error;
    }
  }
}

module.exports = ProductService;

