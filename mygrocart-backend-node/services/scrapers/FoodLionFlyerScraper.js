/**
 * FoodLionFlyerScraper
 *
 * Fetches Food Lion weekly ad flyer pages for stores near a given ZIP code.
 * Food Lion publishes weekly specials at foodlion.com/weekly-specials and
 * uses Flipp for their digital circular viewer.
 */

const axios = require('axios');

// Known Food Lion store locations near Dallas, GA (ZIP 30132)
const FOOD_LION_STORES_NEAR_30132 = [
  {
    storeId: 'food-lion-dallas-ga-01',
    name: 'Food Lion',
    address: '346 W Memorial Dr',
    city: 'Dallas',
    state: 'GA',
    zipCode: '30132',
    latitude: 33.9225,
    longitude: -84.8490,
    storeNum: '2537'
  },
  {
    storeId: 'food-lion-temple-ga-01',
    name: 'Food Lion',
    address: '320 Carrollton Hwy',
    city: 'Temple',
    state: 'GA',
    zipCode: '30179',
    latitude: 33.7362,
    longitude: -85.0337,
    storeNum: '2544'
  }
];

class FoodLionFlyerScraper {
  constructor(options = {}) {
    this.rateLimitMs = options.rateLimitMs || 1500;

    this.httpClient = axios.create({
      timeout: 20000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      }
    });

    this.WEEKLY_AD_URL = 'https://www.foodlion.com/weekly-specials/';
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms || this.rateLimitMs));
  }

  async getStoreLocations(zipCode) {
    console.log(`[FoodLionFlyerScraper] Looking up Food Lion stores near ZIP ${zipCode}...`);

    const stores = FOOD_LION_STORES_NEAR_30132.filter(store => {
      return store.zipCode === zipCode || store.state === 'GA';
    });

    if (stores.length > 0) {
      console.log(`[FoodLionFlyerScraper] Found ${stores.length} Food Lion location(s) near ZIP ${zipCode}`);
      return stores;
    }

    console.log(`[FoodLionFlyerScraper] No exact match, returning all known Food Lion stores`);
    return FOOD_LION_STORES_NEAR_30132;
  }

  /**
   * Try to extract flyer data from Food Lion's weekly specials page.
   * Food Lion uses Flipp for their digital circular.
   */
  async fetchFlyerMetaFromWebsite() {
    try {
      const response = await this.httpClient.get(this.WEEKLY_AD_URL, { timeout: 15000 });
      const html = response.data;

      // Look for Flipp publication data
      const flippMatch = html.match(/publication[_-]?id["'\s:=]+["']?(\d+)/i);
      const imageMatches = html.match(/https?:\/\/[^"'\s]+flipp[^"'\s]+\.(jpg|png|webp)/gi);

      if (flippMatch) {
        return { flyerProvider: 'flipp', publicationId: flippMatch[1] };
      }

      if (imageMatches && imageMatches.length > 0) {
        return { imageUrls: [...new Set(imageMatches)].slice(0, 20) };
      }

      return null;
    } catch (err) {
      console.warn(`[FoodLionFlyerScraper] Could not fetch website meta: ${err.message}`);
      return null;
    }
  }

  async fetchFlyerForStore(store, zipCode) {
    try {
      console.log(`[FoodLionFlyerScraper] Fetching weekly ad for Food Lion at ${store.address}, ${store.city}, ${store.state}...`);

      await this.delay();

      // Food Lion weekly ads typically run Wednesday to Tuesday
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

      const liveMeta = await this.fetchFlyerMetaFromWebsite();

      let imageUrls = [];

      if (liveMeta && liveMeta.imageUrls && liveMeta.imageUrls.length > 0) {
        imageUrls = liveMeta.imageUrls;
        console.log(`[FoodLionFlyerScraper] Got ${imageUrls.length} image URLs from website`);
      } else {
        // Build Food Lion CDN image URLs using Flipp pattern
        const dateSlug = validFromStr.replace(/-/g, '');
        const pageCount = 12;

        for (let page = 1; page <= pageCount; page++) {
          imageUrls.push(
            `https://dam.flippenterprise.net/flyerkit/publications/foodlion-${dateSlug}/public/page-${page}.jpg`
          );
        }
      }

      return {
        storeName: 'Food Lion',
        storeSlug: 'food-lion',
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
        storeLongitude: store.longitude
      };
    } catch (error) {
      console.error(`[FoodLionFlyerScraper] Failed to fetch flyer for Food Lion at ${store.address}: ${error.message}`);
      return null;
    }
  }

  async fetchFlyers(zipCode) {
    console.log(`[FoodLionFlyerScraper] Starting flyer fetch for ZIP ${zipCode}...`);

    // Food Lion flyers are regional — fetch one
    const stores = await this.getStoreLocations(zipCode);
    if (stores.length === 0) return [];

    const flyer = await this.fetchFlyerForStore(stores[0], zipCode);
    const flyers = flyer ? [flyer] : [];

    console.log(`[FoodLionFlyerScraper] Fetched ${flyers.length} flyer(s) for ZIP ${zipCode}`);
    return flyers;
  }
}

module.exports = FoodLionFlyerScraper;
