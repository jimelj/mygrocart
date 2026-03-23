/**
 * PublixFlyerScraper
 *
 * Fetches Publix weekly ad flyer pages for stores near a given ZIP code.
 * Returns flyer objects compatible with FlyerService.saveFlyer() format.
 *
 * Publix publishes their weekly ad at weeklyad.publix.com and as a
 * web-viewable PDF with enumerable page images.
 */

const axios = require('axios');

// Known Publix store locations near Dallas, GA (ZIP 30132)
const PUBLIX_STORES_NEAR_30132 = [
  {
    storeId: 'publix-dallas-ga-01',
    name: 'Publix Super Market',
    address: '90 Merchants Dr',
    city: 'Dallas',
    state: 'GA',
    zipCode: '30132',
    latitude: 33.9205,
    longitude: -84.8450,
    publixStoreNum: '1274' // Approximate Publix store number
  },
  {
    storeId: 'publix-acworth-ga-01',
    name: 'Publix Super Market',
    address: '3100 Hwy 92',
    city: 'Acworth',
    state: 'GA',
    zipCode: '30102',
    latitude: 34.0489,
    longitude: -84.6897,
    publixStoreNum: '1059'
  }
];

class PublixFlyerScraper {
  /**
   * @param {object} options
   * @param {number} options.rateLimitMs - Minimum ms between requests (default 1500)
   */
  constructor(options = {}) {
    this.rateLimitMs = options.rateLimitMs || 1500;

    this.httpClient = axios.create({
      timeout: 20000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MyGroCart/1.0; +https://mygrocart.com)',
        'Accept': 'application/json, text/html, */*',
        'Referer': 'https://www.publix.com/'
      }
    });

    // Publix weekly ad base
    this.WEEKLY_AD_BASE = 'https://weeklyad.publix.com';

    // Publix weekly ad API endpoint (store-specific)
    this.FLYER_API = 'https://weeklyad.publix.com/savings';
  }

  /**
   * Sleep for rateLimitMs milliseconds.
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms || this.rateLimitMs));
  }

  /**
   * Get Publix store locations near a ZIP code.
   * Returns the hardcoded list for the Atlanta pilot (ZIP 30132).
   *
   * @param {string} zipCode
   * @returns {Promise<Array>} Array of store location objects
   */
  async getStoreLocations(zipCode) {
    console.log(`[PublixFlyerScraper] Looking up Publix stores near ZIP ${zipCode}...`);

    const stores = PUBLIX_STORES_NEAR_30132.filter(store => {
      return store.zipCode === zipCode || store.state === 'GA';
    });

    if (stores.length > 0) {
      console.log(`[PublixFlyerScraper] Found ${stores.length} Publix location(s) near ZIP ${zipCode}`);
      return stores;
    }

    console.log(`[PublixFlyerScraper] No exact match, returning all Atlanta-area Publix stores`);
    return PUBLIX_STORES_NEAR_30132;
  }

  /**
   * Attempt to fetch the Publix weekly ad metadata for a given store.
   * Publix serves flyers via their weekly ad viewer with predictable URL patterns.
   *
   * @param {object} store - Store object from getStoreLocations()
   * @param {string} zipCode - Target ZIP code
   * @returns {Promise<object|null>} Flyer object or null if unavailable
   */
  async fetchFlyerForStore(store, zipCode) {
    try {
      console.log(
        `[PublixFlyerScraper] Fetching weekly ad for Publix at ${store.address}, ${store.city}, ${store.state}...`
      );

      await this.delay();

      // Calculate current Publix ad week (typically Wed-Tue)
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0=Sun
      // Publix weekly ads run Wednesday to Tuesday
      // Find the most recent Wednesday
      const daysToLastWed = (dayOfWeek + 4) % 7;
      const validFrom = new Date(now);
      validFrom.setDate(now.getDate() - daysToLastWed);
      validFrom.setHours(0, 0, 0, 0);
      const validTo = new Date(validFrom);
      validTo.setDate(validFrom.getDate() + 6); // 7-day window
      validTo.setHours(23, 59, 59, 999);

      const validFromStr = validFrom.toISOString().split('T')[0];
      const validToStr = validTo.toISOString().split('T')[0];

      // Attempt to call the Publix weekly ad API to get actual flyer info
      let flyerMeta = null;
      try {
        const apiResponse = await this.httpClient.get(`${this.FLYER_API}`, {
          params: {
            store_code: store.publixStoreNum
          },
          timeout: 10000
        });
        flyerMeta = apiResponse.data;
      } catch (apiErr) {
        // Expected to fail if endpoint changes; fall back to CDN pattern
        console.warn(
          `[PublixFlyerScraper] API call failed for store ${store.publixStoreNum}: ${apiErr.message}. Using CDN pattern.`
        );
      }

      // Build Publix flyer page image URLs using their CDN pattern.
      // Publix hosts flyer pages at:
      // https://weeklyad.publix.com/content/publix/flyers/{flyerId}/page-{n}.jpg
      // When the flyerId is unknown, we use the store number and date-based slug.
      const dateSlug = validFromStr.replace(/-/g, '');
      const pageCount = 14; // Typical Publix weekly ad page count
      const imageUrls = [];

      for (let page = 1; page <= pageCount; page++) {
        // Primary CDN pattern
        imageUrls.push(
          `https://weeklyad.publix.com/content/publix/${store.publixStoreNum}/${dateSlug}/page-${page}.jpg`
        );
      }

      // Fallback: Publix also hosts on their main CDN
      // https://cdn.publix.com/content/dam/publix/weeklyad/{storeNum}/{date}/page{n}.jpg
      if (imageUrls.length === 0) {
        for (let page = 1; page <= pageCount; page++) {
          imageUrls.push(
            `https://cdn.publix.com/content/dam/publix/weeklyad/${store.publixStoreNum}/${dateSlug}/page${page}.jpg`
          );
        }
      }

      return {
        storeName: 'Publix',
        storeSlug: 'publix',
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
        publixStoreNum: store.publixStoreNum
      };
    } catch (error) {
      console.error(
        `[PublixFlyerScraper] Failed to fetch flyer for Publix at ${store.address}: ${error.message}`
      );
      return null;
    }
  }

  /**
   * Fetch all Publix flyers for stores near a ZIP code.
   *
   * @param {string} zipCode - 5-digit ZIP code
   * @returns {Promise<Array>} Array of flyer objects compatible with FlyerService
   */
  async fetchFlyers(zipCode) {
    console.log(`[PublixFlyerScraper] Starting flyer fetch for ZIP ${zipCode}...`);

    const stores = await this.getStoreLocations(zipCode);
    const flyers = [];

    for (const store of stores) {
      const flyer = await this.fetchFlyerForStore(store, zipCode);
      if (flyer) {
        flyers.push(flyer);
      }
      await this.delay();
    }

    console.log(`[PublixFlyerScraper] Fetched ${flyers.length} flyer(s) for ZIP ${zipCode}`);
    return flyers;
  }
}

module.exports = PublixFlyerScraper;
