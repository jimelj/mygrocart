// Import models from index.js to ensure associations are loaded
const { Product, Store, StorePrice } = require('../models');
const ProductMatcher = require('../utils/productMatcher');

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
        tcin,
        name,
        brand,
        size,
        category,
        imageUrl,
        image,
        description,
        isEnriched
      } = productData;

      if (!upc || !name) {
        throw new Error('UPC and name are required for product creation');
      }

      // Clean UPC (supports both real UPCs and pseudo-UPCs like TGT{tcin})
      const cleanUpc = this.cleanUPC(upc);
      if (!cleanUpc) {
        throw new Error(`Invalid UPC format: ${upc}`);
      }

      // Validate and clean product name before saving (safety net for scraper issues)
      const cleanedName = this.validateProductName(name);

      // Step 1: Check if product with this exact UPC already exists
      let product = await Product.findOne({ where: { upc: cleanUpc } });

      if (product) {
        // Update existing product with new information
        const updateData = {};
        if (cleanedName && cleanedName !== product.name) updateData.name = cleanedName;
        if (brand && brand !== product.brand) updateData.brand = brand;
        if (size && size !== product.size) updateData.size = size;
        if (category && category !== product.category) updateData.category = category;
        if (tcin && tcin !== product.tcin) updateData.tcin = tcin;
        if (typeof isEnriched === 'boolean' && isEnriched !== product.isEnriched) updateData.isEnriched = isEnriched;

        // Handle both imageUrl and image fields
        const newImageUrl = imageUrl || image;
        if (newImageUrl && newImageUrl !== product.imageUrl) updateData.imageUrl = newImageUrl;

        if (Object.keys(updateData).length > 0) {
          await product.update(updateData);
          console.log(`Updated product: ${cleanUpc} - ${cleanedName}`);
        }
        return product;
      }

      // Step 2: NEW - Check for similar products using fuzzy matching
      // This prevents duplicate products with different UPCs (e.g., Target vs ShopRite)
      const allProducts = await Product.findAll({
        attributes: ['upc', 'name', 'brand', 'size', 'category', 'imageUrl']
      });

      const matches = await ProductMatcher.findMatchingProducts(
        { upc: cleanUpc, name: cleanedName, brand, size },
        allProducts,
        70 // 70% similarity threshold
      );

      if (matches.length > 0) {
        const bestMatch = matches[0];
        console.log(`Found ${matches.length} similar product(s) for "${cleanedName}":`);
        matches.forEach((match, idx) => {
          console.log(`  ${idx + 1}. ${match.product.name} (${match.score}% match, type: ${match.matchType})`);
        });

        // Use the best match if similarity >= 70%
        if (bestMatch.score >= 70) {
          console.log(`Reusing existing product: ${bestMatch.product.upc} for new UPC: ${cleanUpc}`);
          console.log(`  Reason: ${bestMatch.matchType} match with ${bestMatch.score}% similarity`);

          // Return the existing product instead of creating a duplicate
          // This ensures cross-store products are unified
          return bestMatch.product;
        }
      }

      // Step 3: No match found - create new product
      product = await Product.create({
        upc: cleanUpc,
        tcin: tcin || null,
        name: cleanedName,
        brand: brand || null,
        size: size || null,
        category: category || this.defaultCategory,
        imageUrl: imageUrl || image || null,
        isEnriched: isEnriched || false
      });

      console.log(`Created new product: ${cleanUpc} - ${cleanedName}`);

      return product;
    } catch (error) {
      console.error('Error creating/updating product:', error.message);
      throw error;
    }
  }

  /**
   * Upsert product (create or update) - simpler interface for enrichment
   * @param {object} productData - Product data
   * @returns {Promise<object>} - Result with created flag
   */
  async upsertProduct(productData) {
    try {
      const cleanUpc = this.cleanUPC(productData.upc);
      if (!cleanUpc) {
        throw new Error(`Invalid UPC format: ${productData.upc}`);
      }

      // Check if product exists
      const existingProduct = await Product.findOne({ where: { upc: cleanUpc } });
      const wasCreated = !existingProduct;

      // Create or update
      const product = await this.createOrUpdateProduct(productData);

      return {
        product: product,
        created: wasCreated,
        updated: !wasCreated
      };
    } catch (error) {
      console.error('Error upserting product:', error.message);
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

      // Check if price record already exists (Sequelize method)
      let storePrice = await StorePrice.findOne({
        where: {
          upc: cleanUpc,
          storeId: storeId
        }
      });

      if (storePrice) {
        // Update existing price if it has changed
        if (storePrice.price !== price || storePrice.dealType !== dealType) {
          await storePrice.update({
            price: price,
            dealType: dealType,
            lastUpdated: new Date()
          });
          console.log(`Updated price: ${cleanUpc} at ${storeId} - $${price}`);

          // Update product's lastPriceUpdate timestamp
          await Product.update(
            { lastPriceUpdate: new Date() },
            { where: { upc: cleanUpc } }
          );
        }
      } else {
        // Create new price record (Sequelize method)
        storePrice = await StorePrice.create({
          upc: cleanUpc,
          storeId: storeId,
          price: price,
          dealType: dealType,
          lastUpdated: new Date()
        });

        console.log(`Created new price: ${cleanUpc} at ${storeId} - $${price}`);

        // Increment priceDiscoveryCount and update lastPriceUpdate
        // This tracks how many stores have price data for this product
        const product = await Product.findOne({ where: { upc: cleanUpc } });
        if (product) {
          await product.increment('priceDiscoveryCount');
          await product.update({ lastPriceUpdate: new Date() });
          console.log(`  Product discovery count: ${product.priceDiscoveryCount + 1} stores`);
        }
      }

      return storePrice;
    } catch (error) {
      console.error('Error creating/updating store price:', error.message);
      throw error;
    }
  }

  /**
   * Process scraped product data and save to database (OPTIMIZED WITH BATCH OPERATIONS)
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

    // Filter out invalid products
    const validProducts = scrapedProducts.filter(p => {
      if (!p.upc || p.price === null) {
        results.errors++;
        results.errorDetails.push({
          product: p.name || 'Unknown',
          error: 'Missing UPC or price'
        });
        return false;
      }
      return true;
    });

    if (validProducts.length === 0) {
      console.log('No valid products to process');
      return results;
    }

    try {
      // Step 1: Get existing products to determine created vs updated counts
      const upcs = validProducts.map(p => this.cleanUPC(p.upc));
      const existingProducts = await Product.findAll({
        where: { upc: upcs },
        attributes: ['upc']
      });
      const existingUPCs = new Set(existingProducts.map(p => p.upc));

      // Step 2: Batch create/update all products
      const productData = validProducts.map(p => ({
        upc: this.cleanUPC(p.upc),
        tcin: p.tcin || null,
        name: p.name,
        brand: p.brand || null,
        size: p.size || null,
        category: p.category || this.defaultCategory,
        imageUrl: p.imageUrl || p.image || null,
        isEnriched: p.isEnriched || false
      }));

      await Product.bulkCreate(productData, {
        updateOnDuplicate: ['name', 'brand', 'size', 'category', 'imageUrl', 'tcin', 'isEnriched', 'updatedAt'],
        validate: true
      });

      // Count created vs updated
      validProducts.forEach(p => {
        const cleanUpc = this.cleanUPC(p.upc);
        if (existingUPCs.has(cleanUpc)) {
          results.updated++;
        } else {
          results.created++;
        }
        results.processed++;
      });

      console.log(`Batch created/updated ${validProducts.length} products`);

      // Step 3: Batch create/update all store prices
      const priceData = validProducts.map(p => ({
        upc: this.cleanUPC(p.upc),
        storeId: storeId,
        price: p.price,
        dealType: this.determineDealType(p),
        lastUpdated: new Date()
      }));

      // Note: bulkCreate with updateOnDuplicate requires a unique constraint
      // Since we have a composite unique constraint on (upc, storeId), we need to handle this differently
      // We'll use a transaction with individual upserts for prices
      const { sequelize } = require('../config/database');
      const transaction = await sequelize.transaction();

      try {
        for (const priceRecord of priceData) {
          await StorePrice.upsert(priceRecord, { transaction });
        }
        await transaction.commit();
        console.log(`Batch created/updated ${priceData.length} store prices`);
      } catch (error) {
        await transaction.rollback();
        throw error;
      }

    } catch (error) {
      console.error('Error in batch processing:', error.message);
      results.errors++;
      results.errorDetails.push({
        product: 'Batch operation',
        error: error.message
      });
    }

    console.log(`Processing complete: ${results.processed} processed, ${results.created} created, ${results.updated} updated, ${results.errors} errors`);
    return results;
  }

  /**
   * Clean and validate UPC format
   * Supports both real UPCs (12-13 digits) and pseudo-UPCs (e.g., TGT12955065)
   * @param {string} upc - Raw UPC string
   * @returns {string|null} - Cleaned UPC or null if invalid
   */
  cleanUPC(upc) {
    if (!upc) return null;

    const upcStr = upc.toString().trim();

    // Handle pseudo-UPCs (format: TGT{tcin}, SHP{id}, etc.)
    if (/^[A-Z]{3}\d+$/.test(upcStr)) {
      return upcStr; // Return pseudo-UPC as-is
    }

    // Remove all non-digit characters for real UPCs
    const cleanUpc = upcStr.replace(/\D/g, '');

    // Validate length (12 or 13 digits are acceptable for real UPCs)
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
   * Validate and clean product name before saving to database
   * Acts as a safety net for scraper issues (duplicates, embedded prices, etc.)
   * @param {string} name - Raw product name from scraper
   * @returns {string} - Cleaned and validated product name
   */
  validateProductName(name) {
    if (!name) return '';

    let cleaned = name;

    // Step 1: Remove price information (e.g., "$6.49", "$12.99")
    cleaned = cleaned.replace(/,?\s*\$\d+\.\d{2}/g, '');

    // Step 2: Check for duplicated text patterns
    const words = cleaned.split(/\s+/);
    const halfLength = Math.floor(words.length / 2);

    if (words.length > 6 && halfLength > 0) {
      const firstHalf = words.slice(0, halfLength).join(' ').toLowerCase();
      const secondHalf = words.slice(halfLength).join(' ').toLowerCase();

      // If first and second half are identical or very similar, keep only first half
      if (firstHalf === secondHalf || secondHalf.startsWith(firstHalf)) {
        cleaned = words.slice(0, halfLength).join(' ');
      }
    }

    // Step 3: Clean up whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    // Step 4: Remove trailing commas or periods
    cleaned = cleaned.replace(/[,.]$/, '');

    // Step 5: Validate length (prevent empty or too long names)
    if (cleaned.length === 0) {
      throw new Error('Product name cannot be empty after cleaning');
    }

    if (cleaned.length > 500) {
      console.warn(`Product name is very long (${cleaned.length} chars), truncating...`);
      cleaned = cleaned.substring(0, 500);
    }

    return cleaned;
  }

  /**
   * Get products by store with current prices
   * @param {string} storeId - Store identifier
   * @param {number} limit - Maximum number of products to return
   * @returns {Promise<Array>} - Array of products with prices
   */
  async getProductsByStore(storeId, limit = 100) {
    try {
      const storePrices = await StorePrice.findAll({
        where: { storeId },
        order: [['lastUpdated', 'DESC']],
        limit: limit,
        include: [{
          model: Product,
          as: 'product',
          required: true
        }]
      });

      return storePrices.map(storePrice => ({
        ...storePrice.product.toJSON(),
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
      const { Op } = require('sequelize');

      // Search products by name or brand using ILIKE for case-insensitive search
      const products = await Product.findAll({
        where: {
          [Op.or]: [
            { name: { [Op.iLike]: `%${searchTerm}%` } },
            { brand: { [Op.iLike]: `%${searchTerm}%` } }
          ]
        },
        limit: limit
      });

      const results = [];

      for (const product of products) {
        // Get prices from all stores for this product
        const storePrices = await StorePrice.findAll({
          where: { upc: product.upc },
          include: [{
            model: Store,
            as: 'store',
            required: true
          }]
        });

        results.push({
          ...product.toJSON(),
          storePrices: storePrices.map(sp => ({
            storeId: sp.storeId,
            store: sp.store,
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

      const product = await Product.findOne({ where: { upc: cleanUpc } });
      if (!product) {
        throw new Error('Product not found');
      }

      const storePrices = await StorePrice.findAll({
        where: { upc: cleanUpc },
        include: [{
          model: Store,
          as: 'store',
          required: true
        }],
        order: [['price', 'ASC']]
      });

      return {
        product: product.toJSON(),
        prices: storePrices.map(sp => ({
          store: sp.store,
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

