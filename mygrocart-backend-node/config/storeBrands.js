/**
 * Store Brand Configuration
 * Maps store chains to their private label brands
 */

const STORE_BRANDS = {
  'ShopRite': {
    brands: [
      'Bowl & Basket',
      'Bowl & Basket Specialty',
      'Paperbird',
      'Wholesome Pantry',
      'ShopRite',
      'Trading Company'
    ],
    chainId: 'shoprite'
  },
  'Stop & Shop': {
    brands: [
      'Stop & Shop',
      'Nature\'s Promise',
      'Wild Harvest',
      'Guarantee'
    ],
    chainId: 'stop-and-shop'
  },
  'Target': {
    brands: [
      'Good & Gather',
      'Market Pantry',
      'Archer Farms',
      'Simply Balanced',
      'Favorite Day',
      'Good & Gather Organic'
    ],
    chainId: 'target'
  },
  'Walmart': {
    brands: [
      'Great Value',
      'Equate',
      'Marketside',
      'Sam\'s Choice',
      'Parent\'s Choice'
    ],
    chainId: 'walmart'
  },
  'Whole Foods': {
    brands: [
      '365',
      '365 Everyday Value',
      '365 Organic'
    ],
    chainId: 'whole-foods'
  },
  'Trader Joe\'s': {
    brands: [
      'Trader Joe\'s',
      'Trader Ming\'s',
      'Trader José\'s',
      'Trader Giotto\'s'
    ],
    chainId: 'trader-joes'
  },
  'Costco': {
    brands: [
      'Kirkland',
      'Kirkland Signature'
    ],
    chainId: 'costco'
  }
};

/**
 * Detect if a brand is a store brand
 * @param {string} brand - Brand name to check
 * @returns {Object|null} - {chain, chainId, brand} or null
 */
function detectStoreBrand(brand) {
  if (!brand) return null;

  const normalizedBrand = brand.trim().toLowerCase();

  for (const [chain, config] of Object.entries(STORE_BRANDS)) {
    for (const storeBrand of config.brands) {
      if (normalizedBrand === storeBrand.toLowerCase() ||
          normalizedBrand.includes(storeBrand.toLowerCase())) {
        return {
          chain,
          chainId: config.chainId,
          brand: storeBrand
        };
      }
    }
  }

  return null;
}

/**
 * Get all brands for a specific chain
 * @param {string} chainName - Chain name (e.g., 'ShopRite')
 * @returns {Array<string>} - Array of brand names
 */
function getBrandsForChain(chainName) {
  const config = STORE_BRANDS[chainName];
  return config ? config.brands : [];
}

/**
 * Check if two products are equivalent store brands
 * @param {Object} product1 - First product
 * @param {Object} product2 - Second product
 * @returns {boolean} - True if they're equivalent store brands
 */
function areEquivalentStoreBrands(product1, product2) {
  const brand1Info = detectStoreBrand(product1.brand);
  const brand2Info = detectStoreBrand(product2.brand);

  // Both must be store brands
  if (!brand1Info || !brand2Info) return false;

  // Must be from different chains
  if (brand1Info.chainId === brand2Info.chainId) return false;

  // Must be in same category
  if (product1.category !== product2.category) return false;

  return true;
}

module.exports = {
  STORE_BRANDS,
  detectStoreBrand,
  getBrandsForChain,
  areEquivalentStoreBrands
};
