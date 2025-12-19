/**
 * Store Brand Matcher - Intelligent product matching for store brands
 * Handles cross-store brand matching with fuzzy logic
 */

const { detectStoreBrand } = require('../config/storeBrands');

/**
 * Calculate string similarity using Levenshtein distance
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} - Similarity score (0-1)
 */
function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;

  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1;

  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Levenshtein distance implementation
 */
function levenshteinDistance(str1, str2) {
  const track = Array(str2.length + 1).fill(null).map(() =>
    Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i++) track[0][i] = i;
  for (let j = 0; j <= str2.length; j++) track[j][0] = j;

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator
      );
    }
  }

  return track[str2.length][str1.length];
}

/**
 * Normalize product name by removing brand and common words
 * @param {string} name - Product name
 * @param {string} brand - Brand name
 * @returns {string} - Normalized name
 */
function normalizeProductName(name, brand) {
  if (!name) return '';

  let normalized = name.toLowerCase().trim();

  // Remove brand from name
  if (brand) {
    const brandLower = brand.toLowerCase();
    normalized = normalized.replace(brandLower, '').trim();
  }

  // Remove common filler words
  const fillerWords = ['organic', 'natural', 'fresh', 'premium', 'select', 'choice', 'value'];
  fillerWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    normalized = normalized.replace(regex, '').trim();
  });

  // Normalize whitespace
  normalized = normalized.replace(/\s+/g, ' ');

  return normalized;
}

/**
 * Extract product type from name (e.g., "soup", "milk", "bread")
 * @param {string} name - Product name
 * @returns {string} - Product type
 */
function extractProductType(name) {
  if (!name) return '';

  const nameLower = name.toLowerCase();

  // Common product types
  const types = [
    'soup', 'milk', 'bread', 'cheese', 'butter', 'yogurt',
    'cream', 'eggs', 'chicken', 'beef', 'pork', 'fish',
    'pasta', 'rice', 'beans', 'cereal', 'coffee', 'tea',
    'juice', 'soda', 'water', 'chips', 'crackers', 'cookies'
  ];

  for (const type of types) {
    if (nameLower.includes(type)) {
      return type;
    }
  }

  return '';
}

/**
 * Check if two products are the same type (e.g., both are "cream of mushroom soup")
 * @param {Object} product1 - First product
 * @param {Object} product2 - Second product
 * @returns {boolean} - True if same type
 */
function isSameProductType(product1, product2) {
  // Must be in same category
  if (product1.category && product2.category) {
    if (product1.category !== product2.category) return false;
  }

  // Normalize names (remove brand and filler words)
  const norm1 = normalizeProductName(product1.name, product1.brand);
  const norm2 = normalizeProductName(product2.name, product2.brand);

  // Calculate similarity
  const similarity = calculateSimilarity(norm1, norm2);

  // 70% similarity threshold (configurable)
  return similarity >= 0.70;
}

/**
 * Find store brand alternatives for a product across other stores
 * @param {Object} product - Product to find alternatives for
 * @param {Array} allProducts - All available products from other stores
 * @returns {Array} - Array of alternative products with savings info
 */
function findStoreBrandAlternatives(product, allProducts) {
  const alternatives = [];

  // Check if this product is a store brand
  const brandInfo = detectStoreBrand(product.brand);
  if (!brandInfo) {
    return alternatives; // Not a store brand
  }

  // Look for equivalent store brands from different chains
  for (const otherProduct of allProducts) {
    // Skip same product
    if (otherProduct.upc === product.upc) continue;

    // Check if other product is a store brand from different chain
    const otherBrandInfo = detectStoreBrand(otherProduct.brand);
    if (!otherBrandInfo) continue;
    if (otherBrandInfo.chainId === brandInfo.chainId) continue;

    // Check if they're the same product type
    if (!isSameProductType(product, otherProduct)) continue;

    // Calculate potential savings
    const currentPrice = product.storePrices?.[0]?.price || 0;
    const alternativePrice = otherProduct.storePrices?.[0]?.price || 0;

    if (alternativePrice < currentPrice) {
      alternatives.push({
        product: otherProduct,
        savings: currentPrice - alternativePrice,
        chain: otherBrandInfo.chain,
        similarity: calculateSimilarity(
          normalizeProductName(product.name, product.brand),
          normalizeProductName(otherProduct.name, otherProduct.brand)
        )
      });
    }
  }

  // Sort by savings (highest first)
  alternatives.sort((a, b) => b.savings - a.savings);

  return alternatives;
}

/**
 * Check if a store brand product is exclusive to one chain
 * @param {Object} product - Product to check
 * @param {Array} allProducts - All available products
 * @returns {boolean} - True if exclusive
 */
function isStoreExclusive(product, allProducts) {
  const brandInfo = detectStoreBrand(product.brand);
  if (!brandInfo) return false;

  // Look for equivalent products at other stores
  const alternatives = findStoreBrandAlternatives(product, allProducts);

  return alternatives.length === 0;
}

/**
 * Enrich product with store brand information
 * @param {Object} product - Product to enrich
 * @param {Array} allProducts - All available products for comparison
 * @returns {Object} - Enriched product with storeBrandInfo
 */
function enrichWithStoreBrandInfo(product, allProducts = []) {
  const brandInfo = detectStoreBrand(product.brand);

  if (!brandInfo) {
    return {
      ...product,
      storeBrandInfo: null
    };
  }

  const alternatives = findStoreBrandAlternatives(product, allProducts);
  const isExclusive = alternatives.length === 0;

  return {
    ...product,
    storeBrandInfo: {
      isStoreBrand: true,
      chain: brandInfo.chain,
      chainId: brandInfo.chainId,
      brand: brandInfo.brand,
      isExclusive,
      alternatives: alternatives.slice(0, 3), // Top 3 alternatives
      bestAlternative: alternatives[0] || null
    }
  };
}

module.exports = {
  calculateSimilarity,
  normalizeProductName,
  extractProductType,
  isSameProductType,
  findStoreBrandAlternatives,
  isStoreExclusive,
  enrichWithStoreBrandInfo
};
