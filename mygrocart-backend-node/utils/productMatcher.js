const axios = require('axios');

/**
 * Product Matcher Utility
 * Matches products across different stores using multiple strategies:
 * 1. Real UPC matching (via OpenFoodFacts validation)
 * 2. Fuzzy name + brand + size matching
 */

class ProductMatcher {
  /**
   * Normalize a product name for comparison
   * - Convert to lowercase
   * - Remove extra whitespace
   * - Remove common filler words
   * - Normalize size units
   */
  static normalizeProductName(name) {
    if (!name) return '';

    return name
      .toLowerCase()
      .trim()
      // Remove common filler words
      .replace(/\b(organic|gluten free|fat free|low sodium|condensed|microwaveable|cup|can)\b/gi, '')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Normalize brand name for comparison
   */
  static normalizeBrand(brand) {
    if (!brand) return '';

    return brand
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, ''); // Remove special characters
  }

  /**
   * Normalize size for comparison
   * Converts various size formats to a standardized number
   */
  static normalizeSize(size) {
    if (!size) return null;

    const sizeStr = size.toLowerCase().trim();

    // Extract number and unit
    const match = sizeStr.match(/(\d+\.?\d*)\s*(oz|fl oz|lb|g|kg|ml|l|count|ct)?/i);
    if (!match) return null;

    const value = parseFloat(match[1]);
    const unit = match[2] || '';

    // Convert to ounces for standardization
    let normalizedValue = value;
    if (unit.includes('lb')) {
      normalizedValue = value * 16; // pounds to ounces
    } else if (unit.includes('g')) {
      normalizedValue = value * 0.035274; // grams to ounces
    } else if (unit.includes('kg')) {
      normalizedValue = value * 35.274; // kilograms to ounces
    } else if (unit.includes('ml')) {
      normalizedValue = value * 0.033814; // ml to fl oz
    } else if (unit.includes('l') && !unit.includes('fl')) {
      normalizedValue = value * 33.814; // liters to fl oz
    }

    return normalizedValue;
  }

  /**
   * Calculate similarity score between two products (0-100)
   * Higher score means more similar
   */
  static calculateSimilarity(product1, product2) {
    let score = 0;

    // Brand matching (40 points)
    const brand1 = this.normalizeBrand(product1.brand);
    const brand2 = this.normalizeBrand(product2.brand);

    if (brand1 && brand2) {
      if (brand1 === brand2) {
        score += 40;
      } else if (brand1.includes(brand2) || brand2.includes(brand1)) {
        score += 30;
      }
    }

    // Name matching (50 points)
    const name1 = this.normalizeProductName(product1.name);
    const name2 = this.normalizeProductName(product2.name);

    if (name1 && name2) {
      // Extract key words from names
      const words1 = new Set(name1.split(' ').filter(w => w.length > 2));
      const words2 = new Set(name2.split(' ').filter(w => w.length > 2));

      // Calculate word overlap
      const intersection = new Set([...words1].filter(x => words2.has(x)));
      const union = new Set([...words1, ...words2]);

      const overlap = (intersection.size / union.size) * 50;
      score += overlap;
    }

    // Size matching (10 points)
    const size1 = this.normalizeSize(product1.size);
    const size2 = this.normalizeSize(product2.size);

    if (size1 && size2) {
      const sizeDiff = Math.abs(size1 - size2);
      const sizeAvg = (size1 + size2) / 2;
      const sizeScore = Math.max(0, 10 - (sizeDiff / sizeAvg) * 10);
      score += sizeScore;
    }

    return Math.round(score);
  }

  /**
   * Try to get real UPC from OpenFoodFacts
   * This helps validate if a product's UPC is real or store-specific
   */
  static async getRealUPCFromOpenFoodFacts(productName, brand, size) {
    try {
      // Search OpenFoodFacts by product name
      const searchQuery = `${brand || ''} ${productName}`.trim();
      const response = await axios.get(
        `https://world.openfoodfacts.org/cgi/search.pl`,
        {
          params: {
            search_terms: searchQuery,
            search_simple: 1,
            action: 'process',
            json: 1,
            page_size: 5
          },
          headers: {
            'User-Agent': 'MyGroCart/1.0 (contact@mygrocart.com)'
          },
          timeout: 3000
        }
      );

      if (response.data && response.data.products && response.data.products.length > 0) {
        // Find best match based on name and brand
        for (const product of response.data.products) {
          const similarity = this.calculateSimilarity(
            { name: productName, brand, size },
            {
              name: product.product_name || '',
              brand: product.brands || '',
              size: product.quantity || ''
            }
          );

          // If similarity is high enough, return the real UPC
          if (similarity >= 70 && product.code) {
            return product.code;
          }
        }
      }
    } catch (error) {
      // Silently fail - OpenFoodFacts is optional
      console.error('OpenFoodFacts lookup failed:', error.message);
    }

    return null;
  }

  /**
   * Check if a UPC looks like a real UPC (not store-specific)
   * Real UPCs are typically 12-13 digits
   */
  static isRealUPC(upc) {
    if (!upc) return false;

    // Remove any non-digit characters
    const digits = upc.replace(/\D/g, '');

    // Real UPCs are 12 or 13 digits
    // Store-specific codes often start with letters (TGT, etc.) or have different patterns
    return digits.length >= 12 && digits.length <= 13 && !upc.match(/^[A-Z]{3,}/);
  }

  /**
   * Find matching products across stores
   * Returns an array of matching products from other stores
   */
  static async findMatchingProducts(targetProduct, allProducts, threshold = 70) {
    const matches = [];

    // First, try to get real UPC from OpenFoodFacts
    let realUPC = null;
    if (!this.isRealUPC(targetProduct.upc)) {
      realUPC = await this.getRealUPCFromOpenFoodFacts(
        targetProduct.name,
        targetProduct.brand,
        targetProduct.size
      );
    }

    // If we have a real UPC, look for exact matches first
    if (realUPC) {
      const exactMatches = allProducts.filter(p =>
        p.upc === realUPC ||
        (p.upc && p.upc.replace(/\D/g, '') === realUPC.replace(/\D/g, ''))
      );
      if (exactMatches.length > 0) {
        return exactMatches.map(p => ({ product: p, score: 100, matchType: 'upc' }));
      }
    }

    // Fall back to fuzzy matching by name + brand + size
    for (const product of allProducts) {
      // Skip if it's the same product (same UPC)
      if (product.upc === targetProduct.upc) continue;

      const score = this.calculateSimilarity(targetProduct, product);

      if (score >= threshold) {
        matches.push({ product, score, matchType: 'fuzzy' });
      }
    }

    // Sort by score descending
    matches.sort((a, b) => b.score - a.score);

    return matches;
  }

  /**
   * Find similar products from a list (synchronous, no OpenFoodFacts call)
   * Used for deduplication within search results
   * Returns an array of { product, similarity } objects
   */
  static findSimilarProducts(targetProduct, allProducts, threshold = 70) {
    const matches = [];

    for (const product of allProducts) {
      // Skip if it's the same product (same UPC)
      if (product.upc === targetProduct.upc) continue;

      const similarity = this.calculateSimilarity(targetProduct, product);

      if (similarity >= threshold) {
        matches.push({ product, similarity });
      }
    }

    // Sort by similarity descending
    matches.sort((a, b) => b.similarity - a.similarity);

    return matches;
  }

  /**
   * Select the best "primary" product from a group of duplicates
   * Prioritizes products with more complete data
   */
  static selectPrimaryProduct(products) {
    if (products.length === 0) return null;
    if (products.length === 1) return products[0];

    // Score each product based on data completeness
    const scored = products.map(product => {
      let score = 0;

      // Award points for having key fields
      if (product.brand) score += 20;
      if (product.size) score += 15;
      if (product.category) score += 10;
      if (product.imageUrl) score += 25;
      if (product.isEnriched) score += 30; // Prefer enriched products

      // Prefer products with real UPCs
      if (this.isRealUPC(product.upc)) score += 15;

      // Prefer products with more store prices
      const priceCount = product.storePrices ? product.storePrices.length : 0;
      score += priceCount * 5;

      return { product, score };
    });

    // Sort by score descending and return the best
    scored.sort((a, b) => b.score - a.score);
    return scored[0].product;
  }
}

module.exports = ProductMatcher;
