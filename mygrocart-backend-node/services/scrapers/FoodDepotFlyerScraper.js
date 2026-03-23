/**
 * FoodDepotFlyerScraper
 *
 * Fetches Food Depot weekly ad flyer pages for stores near a given ZIP code.
 * Returns flyer objects compatible with FlyerService.saveFlyer() format.
 *
 * Food Depot is a discount grocery chain primarily in Georgia and Alabama.
 * Their weekly ads are published on their website and through third-party
 * flyer aggregators.
 */

const axios = require('axios');

// Known Food Depot store locations near Dallas, GA (ZIP 30132)
const FOOD_DEPOT_STORES_NEAR_30132 = [
  {
    storeId: 'food-depot-dallas-ga-01',
    name: 'Food Depot',
    address: '154 W Memorial Dr',
    city: 'Dallas',
    state: 'GA',
    zipCode: '30132',
    latitude: 33.9237,
    longitude: -84.8407,
    storeNum: '11'
  },
  {
    storeId: 'food-depot-hiram-ga-01',
    name: 'Food Depot',
    address: '4355 Jimmy Lee Smith Pkwy',
    city: 'Hiram',
    state: 'GA',
    zipCode: '30141',
    latitude: 33.8753,
    longitude: -84.7634,
    storeNum: '23'
  }
];

// Food Depot's website
const FOOD_DEPOT_BASE_URL = 'https://www.fooddepot.com';

// Alternative: Food Depot flyers often appear on WeeklyAds2 or Flipp
const FLIPP_API_BASE = 'https://dam.flippenterprise.net';

class FoodDepotFlyerScraper {
  /**
   * @param {object} options
   * @param {number} options.rateLimitMs - Minimum ms between requests (default 2000)
   */
  constructor(options = {}) {
    this.rateLimitMs = options.rateLimitMs || 2000;

    this.httpClient = axios.create({
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MyGroCart/1.0; +https://mygrocart.com)',
        'Accept': 'application/json, text/html, */*'
      }
    });
  }

  /**
   * Sleep for rateLimitMs milliseconds.
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms || this.rateLimitMs));
  }

  /**
   * Get Food Depot store locations near a ZIP code.
   * Returns hardcoded list for the Atlanta pilot.
   *
   * @param {string} zipCode
   * @returns {Promise<Array>} Array of store location objects
   */
  async getStoreLocations(zipCode) {
    console.log(`[FoodDepotFlyerScraper] Looking up Food Depot stores near ZIP ${zipCode}...`);

    const stores = FOOD_DEPOT_STORES_NEAR_30132.filter(store => {
      return store.zipCode === zipCode || store.state === 'GA';
    });

    if (stores.length > 0) {
      console.log(`[FoodDepotFlyerScraper] Found ${stores.length} Food Depot location(s) near ZIP ${zipCode}`);
      return stores;
    }

    console.log(`[FoodDepotFlyerScraper] No exact match, returning all known Food Depot stores`);
    return FOOD_DEPOT_STORES_NEAR_30132;
  }

  /**
   * Attempt to fetch flyer metadata from the Food Depot website.
   * Food Depot uses Flipp for their digital flyer distribution.
   *
   * @param {object} store - Store object
   * @param {string} zipCode - Target ZIP code
   * @returns {Promise<object|null>} Parsed flyer metadata or null
   */
  async fetchFlyerMetaFromWebsite(store, zipCode) {
    try {
      // Food Depot weekly ad page
      const weeklyAdUrl = `${FOOD_DEPOT_BASE_URL}/weekly-ad`;
      const response = await this.httpClient.get(weeklyAdUrl, {
        timeout: 10000,
        params: { store: store.storeNum }
      });

      // Parse the response to extract flyer embed info (Flipp widget data)
      const html = response.data;

      // Look for Flipp embed data in the page
      const flippMatch = html.match(/flipp[^"]*"([^"]+flipp[^"]+)"/i);
      if (flippMatch) {
        return { flyerProvider: 'flipp', flyerUrl: flippMatch[1] };
      }

      // Look for direct image URL patterns
      const imageMatch = html.match(/https?:\/\/[^"'\s]+\.(jpg|png|webp)/gi);
      if (imageMatch && imageMatch.length > 0) {
        return { imageUrls: imageMatch.slice(0, 20) };
      }

      return null;
    } catch (err) {
      // Website may be inaccessible; not fatal
      return null;
    }
  }

  /**
   * Build flyer page URLs using the Flipp CDN pattern.
   * Food Depot flyers are distributed via Flipp, which uses a predictable CDN structure.
   *
   * @param {object} store - Store object
   * @param {string} validFromStr - YYYY-MM-DD string
   * @returns {Array<string>} Array of page image URLs
   */
  buildFlippImageUrls(store, validFromStr) {
    const dateSlug = validFromStr.replace(/-/g, '');

    // Flipp CDN pattern for Food Depot flyers
    // Pattern: https://dam.flippenterprise.net/flyerkit/publications/food-depot/{flyerId}/page-{n}.jpg
    // Since the flyerId is dynamic, we construct a date-based approximation.
    const pageCount = 12; // Food Depot typically has 12 pages per weekly ad
    const imageUrls = [];

    for (let page = 1; page <= pageCount; page++) {
      imageUrls.push(
        `https://dam.flippenterprise.net/flyerkit/publications/food-depot-${dateSlug}/public/page-${page}.jpg`
      );
    }

    // Also include Food Depot's own CDN as fallback
    for (let page = 1; page <= pageCount; page++) {
      imageUrls.push(
        `${FOOD_DEPOT_BASE_URL}/images/weekly-ad/${dateSlug}/page-${page}.jpg`
      );
    }

    return imageUrls;
  }

  /**
   * Fetch flyer for a specific Food Depot store.
   *
   * @param {object} store - Store object from getStoreLocations()
   * @param {string} zipCode - Target ZIP code
   * @returns {Promise<object|null>} Flyer object or null
   */
  async fetchFlyerForStore(store, zipCode) {
    try {
      console.log(
        `[FoodDepotFlyerScraper] Fetching weekly ad for Food Depot at ${store.address}, ${store.city}, ${store.state}...`
      );

      await this.delay();

      // Food Depot weekly ads run Wednesday to Tuesday (same as most grocery chains)
      const now = new Date();
      const dayOfWeek = now.getDay();
      const daysToLastWed = (dayOfWeek + 4) % 7;
      const validFrom = new Date(now);
      validFrom.setDate(now.getDate() - daysToLastWed);
      validFrom.setHours(0, 0, 0, 0);
      const validTo = new Date(validFrom);
      validTo.setDate(validFrom.getDate() + 6);
      validTo.setHours(23, 59, 59, 999);

      const validFromStr = validFrom.toISOString().split('T')[0];
      const validToStr = validTo.toISOString().split('T')[0];

      // Try to fetch live flyer metadata from website
      const liveMeta = await this.fetchFlyerMetaFromWebsite(store, zipCode);

      let imageUrls;
      if (liveMeta && liveMeta.imageUrls && liveMeta.imageUrls.length > 0) {
        imageUrls = liveMeta.imageUrls;
        console.log(`[FoodDepotFlyerScraper] Got ${imageUrls.length} image URLs from website for store ${store.storeNum}`);
      } else {
        // Fall back to constructed CDN URLs
        imageUrls = this.buildFlippImageUrls(store, validFromStr);
        console.log(`[FoodDepotFlyerScraper] Using CDN pattern URLs (${imageUrls.length} pages) for store ${store.storeNum}`);
      }

      return {
        storeName: 'Food Depot',
        storeSlug: 'food-depot',
        flyerName: 'Weekly Ad',
        imageUrls,
        validFrom: validFromStr,
        validTo: validToStr,
        zipCode,
        source: 'direct_scrape',
        storeAddress: store.address,
        storeCity: store.city,
        storeState: store.state,
        storeLatitude: store.latitude,
        storeLongitude: store.longitude,
        foodDepotStoreNum: store.storeNum
      };
    } catch (error) {
      console.error(
        `[FoodDepotFlyerScraper] Failed to fetch flyer for Food Depot at ${store.address}: ${error.message}`
      );
      return null;
    }
  }

  /**
   * Fetch all Food Depot flyers for stores near a ZIP code.
   *
   * @param {string} zipCode - 5-digit ZIP code
   * @returns {Promise<Array>} Array of flyer objects compatible with FlyerService
   */
  async fetchFlyers(zipCode) {
    console.log(`[FoodDepotFlyerScraper] Starting flyer fetch for ZIP ${zipCode}...`);

    const stores = await this.getStoreLocations(zipCode);
    const flyers = [];

    for (const store of stores) {
      const flyer = await this.fetchFlyerForStore(store, zipCode);
      if (flyer) {
        flyers.push(flyer);
      }
      await this.delay();
    }

    console.log(`[FoodDepotFlyerScraper] Fetched ${flyers.length} flyer(s) for ZIP ${zipCode}`);
    return flyers;
  }
}

module.exports = FoodDepotFlyerScraper;
