/**
 * Scraper Registry
 *
 * Exports all store-specific flyer scrapers and a ScraperRegistry
 * that maps store slugs to their scraper classes.
 *
 * Each scraper implements:
 *   constructor(options = {})
 *   async fetchFlyers(zipCode) -> Array of flyer objects
 *   async getStoreLocations(zipCode) -> Array of store info objects
 */

const KrogerFlyerScraper = require('./KrogerFlyerScraper');
const PublixFlyerScraper = require('./PublixFlyerScraper');
const FoodDepotFlyerScraper = require('./FoodDepotFlyerScraper');
const LidlFlyerScraper = require('./LidlFlyerScraper');
const AldiFlyerScraper = require('./AldiFlyerScraper');
const FoodLionFlyerScraper = require('./FoodLionFlyerScraper');
/**
 * ScraperRegistry maps store slugs to their scraper classes.
 * Use this to instantiate scrapers by store name dynamically.
 *
 * @example
 * const ScraperClass = ScraperRegistry['kroger'];
 * const scraper = new ScraperClass({ rateLimitMs: 2000 });
 * const flyers = await scraper.fetchFlyers('30132');
 */
const ScraperRegistry = {
  kroger: KrogerFlyerScraper,
  publix: PublixFlyerScraper,
  'food-depot': FoodDepotFlyerScraper,
  lidl: LidlFlyerScraper,
  aldi: AldiFlyerScraper,
  'food-lion': FoodLionFlyerScraper
};

/**
 * Get a scraper instance for a given store slug.
 *
 * @param {string} storeSlug - The store's slug identifier (e.g., 'kroger', 'publix')
 * @param {object} options - Options passed to the scraper constructor
 * @returns {object|null} Scraper instance or null if not found
 */
function getScraperForStore(storeSlug, options = {}) {
  const normalizedSlug = storeSlug.toLowerCase().trim();
  const ScraperClass = ScraperRegistry[normalizedSlug];

  if (!ScraperClass) {
    console.warn(`[ScraperRegistry] No scraper registered for store slug: "${storeSlug}"`);
    return null;
  }

  return new ScraperClass(options);
}

/**
 * Fetch flyers for all registered stores near a given ZIP code.
 *
 * @param {string} zipCode - 5-digit ZIP code
 * @param {object} options - Options passed to each scraper constructor
 * @returns {Promise<Array>} Combined array of flyer objects from all scrapers
 */
async function fetchAllStoreFlyers(zipCode, options = {}) {
  console.log(`[ScraperRegistry] Fetching flyers for all stores near ZIP ${zipCode}...`);

  const allFlyers = [];
  const slugs = Object.keys(ScraperRegistry);

  for (const slug of slugs) {
    try {
      const scraper = getScraperForStore(slug, options);
      if (!scraper) continue;

      const flyers = await scraper.fetchFlyers(zipCode);
      allFlyers.push(...flyers);
      console.log(`[ScraperRegistry] ${slug}: fetched ${flyers.length} flyer(s)`);
    } catch (err) {
      console.error(`[ScraperRegistry] Error fetching flyers for ${slug}:`, err.message);
    }
  }

  console.log(`[ScraperRegistry] Total flyers fetched: ${allFlyers.length}`);
  return allFlyers;
}

module.exports = {
  KrogerFlyerScraper,
  PublixFlyerScraper,
  FoodDepotFlyerScraper,
  LidlFlyerScraper,
  AldiFlyerScraper,
  FoodLionFlyerScraper,
  ScraperRegistry,
  getScraperForStore,
  fetchAllStoreFlyers
};
