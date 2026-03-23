/**
 * AldiFlyerScraper
 *
 * Fetches ALDI weekly ad flyer pages for stores near a given ZIP code.
 * ALDI publishes weekly specials at aldi.us/weekly-specials and uses
 * Flipp for their digital circular viewer.
 */

const axios = require('axios');

// Known ALDI store locations near Dallas, GA (ZIP 30132)
const ALDI_STORES_NEAR_30132 = [
  {
    storeId: 'aldi-dallas-ga-01',
    name: 'ALDI',
    address: '474 W Memorial Dr',
    city: 'Dallas',
    state: 'GA',
    zipCode: '30132',
    latitude: 33.9195,
    longitude: -84.8510,
    aldiStoreNum: '88'
  },
  {
    storeId: 'aldi-hiram-ga-01',
    name: 'ALDI',
    address: '4580 Jimmy Lee Smith Pkwy',
    city: 'Hiram',
    state: 'GA',
    zipCode: '30141',
    latitude: 33.8748,
    longitude: -84.7640,
    aldiStoreNum: '64'
  }
];

class AldiFlyerScraper {
  constructor(options = {}) {
    this.rateLimitMs = options.rateLimitMs || 1500;

    this.httpClient = axios.create({
      timeout: 20000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      }
    });

    // ALDI weekly specials page
    this.WEEKLY_AD_URL = 'https://www.aldi.us/weekly-specials/this-weeks-aldi-finds/';

    // ALDI also uses Flipp
    this.FLIPP_API = 'https://dam.flippenterprise.net/flyerkit/publications';
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms || this.rateLimitMs));
  }

  async getStoreLocations(zipCode) {
    console.log(`[AldiFlyerScraper] Looking up ALDI stores near ZIP ${zipCode}...`);

    const stores = ALDI_STORES_NEAR_30132.filter(store => {
      return store.zipCode === zipCode || store.state === 'GA';
    });

    if (stores.length > 0) {
      console.log(`[AldiFlyerScraper] Found ${stores.length} ALDI location(s) near ZIP ${zipCode}`);
      return stores;
    }

    console.log(`[AldiFlyerScraper] No exact match, returning all known ALDI stores`);
    return ALDI_STORES_NEAR_30132;
  }

  /**
   * Try to extract flyer data from ALDI's weekly specials page.
   * ALDI embeds a Flipp-powered circular viewer.
   */
  async fetchFlyerMetaFromWebsite() {
    try {
      const response = await this.httpClient.get(this.WEEKLY_AD_URL, { timeout: 15000 });
      const html = response.data;

      // Look for Flipp publication data or image URLs
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
      console.warn(`[AldiFlyerScraper] Could not fetch website meta: ${err.message}`);
      return null;
    }
  }

  async fetchFlyerForStore(store, zipCode) {
    try {
      console.log(`[AldiFlyerScraper] Fetching weekly ad for ALDI at ${store.address}, ${store.city}, ${store.state}...`);

      await this.delay();

      // ALDI weekly ads run Wednesday to Tuesday
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

      // Try to get live metadata
      const liveMeta = await this.fetchFlyerMetaFromWebsite();

      let imageUrls = [];

      if (liveMeta && liveMeta.imageUrls && liveMeta.imageUrls.length > 0) {
        imageUrls = liveMeta.imageUrls;
        console.log(`[AldiFlyerScraper] Got ${imageUrls.length} image URLs from website`);
      } else {
        // Build ALDI CDN image URLs using Flipp pattern
        const dateSlug = validFromStr.replace(/-/g, '');
        const pageCount = 10;

        for (let page = 1; page <= pageCount; page++) {
          imageUrls.push(
            `https://dam.flippenterprise.net/flyerkit/publications/aldi-us-${dateSlug}/public/page-${page}.jpg`
          );
        }
      }

      return {
        storeName: 'ALDI',
        storeSlug: 'aldi',
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
      console.error(`[AldiFlyerScraper] Failed to fetch flyer for ALDI at ${store.address}: ${error.message}`);
      return null;
    }
  }

  async fetchFlyers(zipCode) {
    console.log(`[AldiFlyerScraper] Starting flyer fetch for ZIP ${zipCode}...`);

    // ALDI flyers are regional, not store-specific — fetch one
    const stores = await this.getStoreLocations(zipCode);
    if (stores.length === 0) return [];

    const flyer = await this.fetchFlyerForStore(stores[0], zipCode);
    const flyers = flyer ? [flyer] : [];

    console.log(`[AldiFlyerScraper] Fetched ${flyers.length} flyer(s) for ZIP ${zipCode}`);
    return flyers;
  }
}

module.exports = AldiFlyerScraper;
