/**
 * LidlFlyerScraper
 *
 * Fetches Lidl weekly deals using their public REST API.
 * No scraping needed — Lidl exposes structured deal data
 * via mobileapi.lidl.com with product names, prices, and images.
 */

const axios = require('axios');

// Lidl store IDs are discovered via the store locator API
const LIDL_API_BASE = 'https://mobileapi.lidl.com/v1';

class LidlFlyerScraper {
  constructor(options = {}) {
    this.rateLimitMs = options.rateLimitMs || 1500;

    this.httpClient = axios.create({
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms || this.rateLimitMs));
  }

  /**
   * Find Lidl stores near a ZIP code using their store locator API.
   * @param {string} zipCode
   * @returns {Promise<Array>} Array of store objects with storeId
   */
  async getStoreLocations(zipCode) {
    console.log(`[LidlFlyerScraper] Looking up Lidl stores near ZIP ${zipCode}...`);

    try {
      const response = await this.httpClient.get(`${LIDL_API_BASE}/stores`, {
        params: { zip: zipCode, radius: 25 }
      });

      const stores = response.data?.results || response.data;
      if (Array.isArray(stores) && stores.length > 0) {
        console.log(`[LidlFlyerScraper] Found ${stores.length} Lidl store(s) near ZIP ${zipCode}`);
        return stores.map(store => ({
          storeId: store.id || store.storeId,
          name: 'Lidl',
          address: store.address?.street || store.street || '',
          city: store.address?.city || store.city || '',
          state: store.address?.state || store.state || 'GA',
          zipCode: store.address?.zip || store.zip || zipCode,
          latitude: store.latitude || store.lat,
          longitude: store.longitude || store.lng
        }));
      }

      console.log(`[LidlFlyerScraper] No Lidl stores found near ZIP ${zipCode}`);
      return [];
    } catch (err) {
      console.error(`[LidlFlyerScraper] Store locator error: ${err.message}`);
      // Fallback: try with a known Atlanta-area store ID
      return [{
        storeId: 'US01248',
        name: 'Lidl',
        address: '',
        city: 'Marietta',
        state: 'GA',
        zipCode: '30064'
      }];
    }
  }

  /**
   * Fetch weekly specials from Lidl's API for a given store.
   * Returns structured deal data — no OCR needed.
   *
   * @param {object} store - Store object with storeId
   * @param {string} zipCode
   * @returns {Promise<object|null>} Flyer object with embedded deals
   */
  async fetchFlyerForStore(store, zipCode) {
    try {
      console.log(`[LidlFlyerScraper] Fetching weekly specials for Lidl store ${store.storeId}...`);

      await this.delay();

      const response = await this.httpClient.get(`${LIDL_API_BASE}/specials`, {
        params: { storeId: store.storeId }
      });

      const rawData = response.data;
      // API returns { current: [...], upcoming: [...] }
      const specials = rawData?.current || rawData?.results || (Array.isArray(rawData) ? rawData : []);
      if (!specials || specials.length === 0) {
        console.log(`[LidlFlyerScraper] No specials found for store ${store.storeId}`);
        return null;
      }

      console.log(`[LidlFlyerScraper] Found ${specials.length} special group(s) for store ${store.storeId}`);

      // Extract deals from all special groups
      const deals = [];
      const imageUrls = [];
      let validFrom = null;
      let validTo = null;

      for (const group of specials) {
        // Track date range
        if (group.startDate && (!validFrom || new Date(group.startDate) < new Date(validFrom))) {
          validFrom = group.startDate;
        }
        if (group.endDate && (!validTo || new Date(group.endDate) > new Date(validTo))) {
          validTo = group.endDate;
        }

        if (!group.products || !Array.isArray(group.products)) continue;

        for (const product of group.products) {
          // Extract price from nested priceInformation structure
          const priceInfo = product.priceInformation;
          let salePrice = product.price || product.promotionPrice || null;
          let regularPrice = product.regularPrice || null;
          let unit = 'each';

          if (priceInfo?.currentPrice?.currentPrice) {
            salePrice = priceInfo.currentPrice.currentPrice.value;
            // Extract unit from basePriceText (e.g., "$ 1.95 per lb.")
            const unitMatch = priceInfo.currentPrice.currentPrice.basePriceText?.match(/per\s+(\w+)/i);
            if (unitMatch) unit = unitMatch[1];
          }
          if (priceInfo?.regularPrice?.regularPrice) {
            regularPrice = priceInfo.regularPrice.regularPrice.value;
          }

          const deal = {
            productName: product.name || '',
            productBrand: (product.brands || []).join(', ') || null,
            salePrice,
            regularPrice,
            unit,
            dealType: 'sale',
            productCategory: group.type || group.name || null
          };

          if (deal.productName && deal.salePrice) {
            deals.push(deal);
          }

          // Collect product images
          if (product.images && product.images.length > 0) {
            imageUrls.push(product.images[0].url);
          }
        }
      }

      // Use today's date range if API didn't provide one
      if (!validFrom) {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const daysToLastWed = (dayOfWeek + 4) % 7;
        const from = new Date(now);
        from.setDate(now.getDate() - daysToLastWed);
        validFrom = from.toISOString().split('T')[0];
      }
      if (!validTo) {
        const to = new Date(validFrom);
        to.setDate(to.getDate() + 6);
        validTo = to.toISOString().split('T')[0];
      }

      const validFromStr = typeof validFrom === 'string' ? validFrom.split('T')[0] : new Date(validFrom).toISOString().split('T')[0];
      const validToStr = typeof validTo === 'string' ? validTo.split('T')[0] : new Date(validTo).toISOString().split('T')[0];

      console.log(`[LidlFlyerScraper] Found ${deals.length} deals, ${imageUrls.length} images for store ${store.storeId}`);

      return {
        storeName: 'Lidl',
        storeSlug: 'lidl',
        flyerName: 'Weekly Deals',
        imageUrls: imageUrls.slice(0, 20), // Cap at 20 images
        validFrom: validFromStr,
        validTo: validToStr,
        zipCode,
        source: 'direct_api',
        storeAddress: store.address,
        storeCity: store.city,
        storeState: store.state,
        storeLatitude: store.latitude,
        storeLongitude: store.longitude,
        // Embed pre-extracted deals — no OCR needed
        preExtractedDeals: deals
      };
    } catch (error) {
      console.error(`[LidlFlyerScraper] Failed to fetch specials for store ${store.storeId}: ${error.message}`);
      return null;
    }
  }

  async fetchFlyers(zipCode) {
    console.log(`[LidlFlyerScraper] Starting deal fetch for ZIP ${zipCode}...`);

    const stores = await this.getStoreLocations(zipCode);
    if (stores.length === 0) return [];

    // Lidl deals are regional — fetch from first store only
    const flyer = await this.fetchFlyerForStore(stores[0], zipCode);
    const flyers = flyer ? [flyer] : [];

    console.log(`[LidlFlyerScraper] Fetched ${flyers.length} flyer(s) with ${flyer?.preExtractedDeals?.length || 0} deals for ZIP ${zipCode}`);
    return flyers;
  }
}

module.exports = LidlFlyerScraper;
