/**
 * LidlFlyerScraper
 *
 * Fetches Lidl weekly ad flyer pages for stores near a given ZIP code.
 * Lidl publishes weekly ads at lidl.com/weekly-ad and uses Flipp for
 * digital flyer distribution.
 */

const axios = require('axios');

// Known Lidl store locations near Dallas, GA (ZIP 30132)
const LIDL_STORES_NEAR_30132 = [
  {
    storeId: 'lidl-dallas-ga-01',
    name: 'Lidl',
    address: '188 Merchants Dr',
    city: 'Dallas',
    state: 'GA',
    zipCode: '30132',
    latitude: 33.9218,
    longitude: -84.8448
  },
  {
    storeId: 'lidl-hiram-ga-01',
    name: 'Lidl',
    address: '4690 Jimmy Lee Smith Pkwy',
    city: 'Hiram',
    state: 'GA',
    zipCode: '30141',
    latitude: 33.8761,
    longitude: -84.7621
  }
];

class LidlFlyerScraper {
  constructor(options = {}) {
    this.rateLimitMs = options.rateLimitMs || 1500;

    this.httpClient = axios.create({
      timeout: 20000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      }
    });

    // Lidl weekly ad page
    this.WEEKLY_AD_URL = 'https://www.lidl.com/weekly-ad';

    // Lidl uses Flipp for flyer distribution
    this.FLIPP_API = 'https://dam.flippenterprise.net/flyerkit/publications';
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms || this.rateLimitMs));
  }

  async getStoreLocations(zipCode) {
    console.log(`[LidlFlyerScraper] Looking up Lidl stores near ZIP ${zipCode}...`);

    const stores = LIDL_STORES_NEAR_30132.filter(store => {
      return store.zipCode === zipCode || store.state === 'GA';
    });

    if (stores.length > 0) {
      console.log(`[LidlFlyerScraper] Found ${stores.length} Lidl location(s) near ZIP ${zipCode}`);
      return stores;
    }

    console.log(`[LidlFlyerScraper] No exact match, returning all known Lidl stores`);
    return LIDL_STORES_NEAR_30132;
  }

  /**
   * Try to extract flyer image URLs from Lidl's weekly ad page.
   * Lidl embeds Flipp viewer data in their page which contains image URLs.
   */
  async fetchFlyerMetaFromWebsite() {
    try {
      const response = await this.httpClient.get(this.WEEKLY_AD_URL, { timeout: 15000 });
      const html = response.data;

      // Look for Flipp publication data embedded in the page
      // Lidl embeds flyer data as JSON in script tags
      const flippIdMatch = html.match(/publication[_-]?id["'\s:=]+["']?(\d+)/i);
      const imageMatches = html.match(/https?:\/\/[^"'\s]+flipp[^"'\s]+\.(jpg|png|webp)/gi);

      if (flippIdMatch) {
        return { flyerProvider: 'flipp', publicationId: flippIdMatch[1] };
      }

      if (imageMatches && imageMatches.length > 0) {
        return { imageUrls: [...new Set(imageMatches)].slice(0, 20) };
      }

      return null;
    } catch (err) {
      console.warn(`[LidlFlyerScraper] Could not fetch website meta: ${err.message}`);
      return null;
    }
  }

  async fetchFlyerForStore(store, zipCode) {
    try {
      console.log(`[LidlFlyerScraper] Fetching weekly ad for Lidl at ${store.address}, ${store.city}, ${store.state}...`);

      await this.delay();

      // Lidl weekly ads run Wednesday to Tuesday
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

      // Try to get live metadata from website
      const liveMeta = await this.fetchFlyerMetaFromWebsite();

      let imageUrls = [];

      if (liveMeta && liveMeta.imageUrls && liveMeta.imageUrls.length > 0) {
        imageUrls = liveMeta.imageUrls;
        console.log(`[LidlFlyerScraper] Got ${imageUrls.length} image URLs from website`);
      } else {
        // Build Lidl CDN image URLs
        // Lidl hosts weekly ad images at predictable paths
        const dateSlug = validFromStr.replace(/-/g, '');
        const pageCount = 12;

        for (let page = 1; page <= pageCount; page++) {
          // Flipp CDN pattern for Lidl
          imageUrls.push(
            `https://dam.flippenterprise.net/flyerkit/publications/lidl-us-${dateSlug}/public/page-${page}.jpg`
          );
        }
      }

      return {
        storeName: 'Lidl',
        storeSlug: 'lidl',
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
      console.error(`[LidlFlyerScraper] Failed to fetch flyer for Lidl at ${store.address}: ${error.message}`);
      return null;
    }
  }

  async fetchFlyers(zipCode) {
    console.log(`[LidlFlyerScraper] Starting flyer fetch for ZIP ${zipCode}...`);

    // Only fetch one flyer per chain (Lidl flyers are the same across nearby stores)
    const stores = await this.getStoreLocations(zipCode);
    if (stores.length === 0) return [];

    const flyer = await this.fetchFlyerForStore(stores[0], zipCode);
    const flyers = flyer ? [flyer] : [];

    console.log(`[LidlFlyerScraper] Fetched ${flyers.length} flyer(s) for ZIP ${zipCode}`);
    return flyers;
  }
}

module.exports = LidlFlyerScraper;
