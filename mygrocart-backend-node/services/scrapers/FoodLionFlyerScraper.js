/**
 * FoodLionFlyerScraper
 *
 * Fetches Food Lion weekly ad data using the public Flipp API.
 * Same pattern as Kroger — no auth required.
 *
 * API Flow:
 * 1. GET backflipp.wishabi.com/flipp/flyers?postal_code=30132 → discover flyer ID
 * 2. GET dam.flippenterprise.net/api/flipp/flyers/{id}/flyer_items → all deals
 */

const axios = require('axios');

class FoodLionFlyerScraper {
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

  async getStoreLocations(zipCode) {
    return [{ zipCode }];
  }

  /**
   * Discover the current Food Lion weekly ad flyer ID using Flipp's flyers API.
   */
  async discoverFlyerId(zipCode) {
    try {
      const response = await this.httpClient.get(
        'https://backflipp.wishabi.com/flipp/flyers',
        { params: { postal_code: zipCode, locale: 'en-us' } }
      );

      const flyers = response.data?.flyers || response.data || [];

      // Find Food Lion weekly ad
      const foodLionWeekly = flyers.find(f =>
        (f.merchant || '').toLowerCase().includes('food lion') &&
        (f.name || '').toLowerCase().includes('weekly')
      );

      if (foodLionWeekly) {
        console.log(`[FoodLionFlyerScraper] Found Food Lion Weekly Ad ID: ${foodLionWeekly.id}, valid: ${foodLionWeekly.valid_from} to ${foodLionWeekly.valid_to}`);
        return foodLionWeekly;
      }

      // Fall back to any Food Lion flyer
      const anyFoodLion = flyers.find(f =>
        (f.merchant || '').toLowerCase().includes('food lion')
      );

      if (anyFoodLion) {
        console.log(`[FoodLionFlyerScraper] Found Food Lion flyer: ${anyFoodLion.id} (${anyFoodLion.name})`);
        return anyFoodLion;
      }

      console.log(`[FoodLionFlyerScraper] No Food Lion flyers found for ZIP ${zipCode}`);
      return null;
    } catch (err) {
      console.error(`[FoodLionFlyerScraper] Flipp flyers API error: ${err.message}`);
      return null;
    }
  }

  /**
   * Fetch all deal items from a Food Lion flyer via Flipp API.
   */
  async fetchFlyerItems(flyerId) {
    try {
      const response = await this.httpClient.get(
        `https://dam.flippenterprise.net/api/flipp/flyers/${flyerId}/flyer_items`,
        { params: { locale: 'en' } }
      );

      return response.data || [];
    } catch (err) {
      console.error(`[FoodLionFlyerScraper] Flyer items API error: ${err.message}`);
      return [];
    }
  }

  async fetchFlyerForStore(store, zipCode) {
    try {
      console.log(`[FoodLionFlyerScraper] Fetching Food Lion weekly ad via Flipp for ZIP ${zipCode}...`);

      await this.delay();

      // Step 1: Discover current flyer ID
      const flyerMeta = await this.discoverFlyerId(zipCode);
      if (!flyerMeta) return null;

      await this.delay();

      // Step 2: Fetch all deal items
      const items = await this.fetchFlyerItems(flyerMeta.id);
      console.log(`[FoodLionFlyerScraper] Got ${items.length} items from Flipp`);

      // Extract deals
      const deals = [];
      const imageUrls = [];

      for (const item of items) {
        if (item.display_type && item.display_type !== 1) continue;

        let salePrice = null;
        if (item.price) {
          const priceMatch = String(item.price).match(/\$?([\d]+\.[\d]{2})/);
          if (priceMatch) salePrice = parseFloat(priceMatch[1]);
        }
        if (!salePrice && item.pre_price_text) {
          const match = String(item.pre_price_text).match(/\$?([\d]+\.[\d]{2})/);
          if (match) salePrice = parseFloat(match[1]);
        }
        if (!salePrice && item.post_price_text) {
          const match = String(item.post_price_text).match(/\$?([\d]+\.[\d]{2})/);
          if (match) salePrice = parseFloat(match[1]);
        }

        const deal = {
          productName: item.name || '',
          productBrand: item.brand || null,
          salePrice,
          regularPrice: null,
          unit: 'each',
          dealType: 'sale',
          productCategory: null,
          imageUrl: item.cutout_image_url || null
        };

        if (deal.productName && deal.salePrice) {
          deals.push(deal);
        }

        if (item.cutout_image_url) {
          imageUrls.push(item.cutout_image_url);
        }
      }

      const thumbnailUrl = flyerMeta.premium_thumbnail_url || flyerMeta.thumbnail_url;
      if (thumbnailUrl) {
        imageUrls.unshift(thumbnailUrl);
      }

      const validFromStr = flyerMeta.valid_from
        ? new Date(flyerMeta.valid_from).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      const validToStr = flyerMeta.valid_to
        ? new Date(flyerMeta.valid_to).toISOString().split('T')[0]
        : new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

      console.log(`[FoodLionFlyerScraper] Extracted ${deals.length} deals for Food Lion`);

      return {
        storeName: 'Food Lion',
        storeSlug: 'food-lion',
        flyerName: flyerMeta.name || 'Weekly Ad',
        imageUrls: imageUrls.slice(0, 20),
        validFrom: validFromStr,
        validTo: validToStr,
        zipCode,
        source: 'flipp_api',
        preExtractedDeals: deals,
        flippFlyerId: flyerMeta.id
      };
    } catch (error) {
      console.error(`[FoodLionFlyerScraper] Failed to fetch Food Lion flyer: ${error.message}`);
      return null;
    }
  }

  async fetchFlyers(zipCode) {
    console.log(`[FoodLionFlyerScraper] Starting flyer fetch for ZIP ${zipCode}...`);

    const stores = await this.getStoreLocations(zipCode);
    const flyer = await this.fetchFlyerForStore(stores[0], zipCode);
    const flyers = flyer ? [flyer] : [];

    console.log(`[FoodLionFlyerScraper] Fetched ${flyers.length} flyer(s) with ${flyer?.preExtractedDeals?.length || 0} deals for ZIP ${zipCode}`);
    return flyers;
  }
}

module.exports = FoodLionFlyerScraper;
