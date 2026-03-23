/**
 * WegmansFlyerScraper
 *
 * Fetches Wegmans weekly circular pages for stores near a given ZIP code.
 * Wegmans publishes their circular at wegmans.com/weekly-circular and
 * uses their own viewer system.
 */

const axios = require('axios');

// Known Wegmans store locations near Dallas, GA (ZIP 30132)
// Note: Wegmans has limited GA presence — nearest may be further away
const WEGMANS_STORES_NEAR_30132 = [
  {
    storeId: 'wegmans-atlanta-01',
    name: "Wegman's",
    address: '650 Ponce De Leon Ave NE',
    city: 'Atlanta',
    state: 'GA',
    zipCode: '30308',
    latitude: 33.7720,
    longitude: -84.3655,
    storeNum: '139'
  }
];

class WegmansFlyerScraper {
  constructor(options = {}) {
    this.rateLimitMs = options.rateLimitMs || 1500;

    this.httpClient = axios.create({
      timeout: 20000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      }
    });

    this.WEEKLY_AD_URL = 'https://www.wegmans.com/weekly-circular/';
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms || this.rateLimitMs));
  }

  async getStoreLocations(zipCode) {
    console.log(`[WegmansFlyerScraper] Looking up Wegmans stores near ZIP ${zipCode}...`);

    const stores = WEGMANS_STORES_NEAR_30132.filter(store => {
      return store.zipCode === zipCode || store.state === 'GA';
    });

    if (stores.length > 0) {
      console.log(`[WegmansFlyerScraper] Found ${stores.length} Wegmans location(s) near ZIP ${zipCode}`);
      return stores;
    }

    console.log(`[WegmansFlyerScraper] No exact match, returning all known Wegmans stores`);
    return WEGMANS_STORES_NEAR_30132;
  }

  /**
   * Try to extract flyer data from Wegmans website.
   * Wegmans uses their own circular viewer.
   */
  async fetchFlyerMetaFromWebsite() {
    try {
      const response = await this.httpClient.get(this.WEEKLY_AD_URL, { timeout: 15000 });
      const html = response.data;

      // Look for circular image URLs or API data embedded in page
      const imageMatches = html.match(/https?:\/\/[^"'\s]*circular[^"'\s]*\.(jpg|png|webp)/gi);
      const cdnMatches = html.match(/https?:\/\/[^"'\s]*wegmans[^"'\s]*\.(jpg|png|webp)/gi);

      const allImages = [
        ...(imageMatches || []),
        ...(cdnMatches || [])
      ];

      if (allImages.length > 0) {
        return { imageUrls: [...new Set(allImages)].slice(0, 20) };
      }

      return null;
    } catch (err) {
      console.warn(`[WegmansFlyerScraper] Could not fetch website meta: ${err.message}`);
      return null;
    }
  }

  async fetchFlyerForStore(store, zipCode) {
    try {
      console.log(`[WegmansFlyerScraper] Fetching weekly circular for Wegmans at ${store.address}, ${store.city}, ${store.state}...`);

      await this.delay();

      // Wegmans circular runs Sunday to Saturday
      const now = new Date();
      const dayOfWeek = now.getDay();
      const daysToLastSun = dayOfWeek;
      const validFrom = new Date(now);
      validFrom.setDate(now.getDate() - daysToLastSun);
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
        console.log(`[WegmansFlyerScraper] Got ${imageUrls.length} image URLs from website`);
      } else {
        // Wegmans CDN pattern — they host their own circular images
        const dateSlug = validFromStr.replace(/-/g, '');
        const pageCount = 14;

        for (let page = 1; page <= pageCount; page++) {
          imageUrls.push(
            `https://www.wegmans.com/content/dam/wegmans/circular/${store.storeNum}/${dateSlug}/page-${page}.jpg`
          );
        }
      }

      return {
        storeName: "Wegman's",
        storeSlug: 'wegmans',
        flyerName: 'Weekly Circular',
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
      console.error(`[WegmansFlyerScraper] Failed to fetch flyer for Wegmans at ${store.address}: ${error.message}`);
      return null;
    }
  }

  async fetchFlyers(zipCode) {
    console.log(`[WegmansFlyerScraper] Starting flyer fetch for ZIP ${zipCode}...`);

    const stores = await this.getStoreLocations(zipCode);
    if (stores.length === 0) return [];

    const flyer = await this.fetchFlyerForStore(stores[0], zipCode);
    const flyers = flyer ? [flyer] : [];

    console.log(`[WegmansFlyerScraper] Fetched ${flyers.length} flyer(s) for ZIP ${zipCode}`);
    return flyers;
  }
}

module.exports = WegmansFlyerScraper;
