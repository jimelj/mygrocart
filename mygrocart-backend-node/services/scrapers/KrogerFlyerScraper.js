/**
 * KrogerFlyerScraper
 *
 * Fetches Kroger weekly ad data using the public Flipp API.
 * Kroger distributes its weekly ad through Flipp.com — no auth required.
 *
 * API Flow:
 * 1. GET /api/flipp/data?postal_code=30132 → discover current flyer ID
 * 2. GET /api/flipp/flyers/{id}/flyer_items → all deal products with prices
 */

const axios = require('axios');

const FLIPP_API_BASE = 'https://dam.flippenterprise.net/api/flipp';

class KrogerFlyerScraper {
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
    // Kroger uses Flipp for flyer distribution — store discovery is via Flipp
    return [{ zipCode }];
  }

  /**
   * Discover the current Kroger weekly ad flyer ID using Flipp's flyers API.
   */
  async discoverFlyerId(zipCode) {
    try {
      const response = await this.httpClient.get(
        'https://backflipp.wishabi.com/flipp/flyers',
        { params: { postal_code: zipCode, locale: 'en-us' } }
      );

      const flyers = response.data?.flyers || response.data || [];
      // Find the Kroger "Weekly Ad" flyer (not seasonal catalogs)
      const krogerWeeklyAd = flyers.find(f =>
        (f.merchant || '').toLowerCase().includes('kroger') &&
        (f.name || '').toLowerCase().includes('weekly')
      );

      if (!krogerWeeklyAd) {
        // Fall back to any Kroger flyer
        const anyKroger = flyers.find(f =>
          (f.merchant || '').toLowerCase().includes('kroger')
        );
        if (anyKroger) {
          console.log(`[KrogerFlyerScraper] Found Kroger flyer: ${anyKroger.id} (${anyKroger.name})`);
          return anyKroger;
        }
        console.log(`[KrogerFlyerScraper] No Kroger flyers found for ZIP ${zipCode}`);
        return null;
      }

      console.log(`[KrogerFlyerScraper] Found Kroger Weekly Ad ID: ${krogerWeeklyAd.id}, valid: ${krogerWeeklyAd.valid_from} to ${krogerWeeklyAd.valid_to}`);
      return krogerWeeklyAd;
    } catch (err) {
      console.error(`[KrogerFlyerScraper] Flipp flyers API error: ${err.message}`);
      return null;
    }
  }

  /**
   * Fetch all deal items from a Kroger flyer via Flipp API.
   */
  async fetchFlyerItems(flyerId) {
    try {
      const response = await this.httpClient.get(
        `${FLIPP_API_BASE}/flyers/${flyerId}/flyer_items`,
        { params: { locale: 'en' } }
      );

      return response.data || [];
    } catch (err) {
      console.error(`[KrogerFlyerScraper] Flyer items API error: ${err.message}`);
      return [];
    }
  }

  async fetchFlyerForStore(store, zipCode) {
    try {
      console.log(`[KrogerFlyerScraper] Fetching Kroger weekly ad via Flipp for ZIP ${zipCode}...`);

      await this.delay();

      // Step 1: Discover current flyer ID
      const flyerMeta = await this.discoverFlyerId(zipCode);
      if (!flyerMeta) return null;

      await this.delay();

      // Step 2: Fetch all deal items
      const items = await this.fetchFlyerItems(flyerMeta.id);
      console.log(`[KrogerFlyerScraper] Got ${items.length} items from Flipp`);

      // Extract deals — filter to actual products (display_type 1)
      const deals = [];
      const imageUrls = [];

      for (const item of items) {
        if (item.display_type && item.display_type !== 1) continue; // Skip headers/banners

        let salePrice = null;
        if (item.price) {
          const priceMatch = String(item.price).match(/\$?([\d]+\.[\d]{2})/);
          if (priceMatch) salePrice = parseFloat(priceMatch[1]);
        }
        // Try pre_price_text or post_price_text for prices like "2/$5"
        if (!salePrice && item.pre_price_text) {
          const match = String(item.pre_price_text).match(/\$?([\d]+\.[\d]{2})/);
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

      // Build flyer image URL — use stock_premium (high-quality full overview)
      // Construct from flyer ID + timestamp extracted from thumbnail_url
      const finalImageUrls = [];
      const thumbnailUrl = flyerMeta.thumbnail_url || '';
      const timestamp = thumbnailUrl.split('/').pop() || '';
      if (timestamp) {
        finalImageUrls.push(`https://f.wishabi.net/flyers/${flyerMeta.id}/stock_premium/${timestamp}`);
      }

      const validFromStr = flyerMeta.valid_from
        ? new Date(flyerMeta.valid_from).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      const validToStr = flyerMeta.valid_to
        ? new Date(flyerMeta.valid_to).toISOString().split('T')[0]
        : new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

      console.log(`[KrogerFlyerScraper] Extracted ${deals.length} deals for Kroger`);

      return {
        storeName: 'Kroger',
        storeSlug: 'kroger',
        flyerName: flyerMeta.name || 'Weekly Ad',
        imageUrls: finalImageUrls,
        validFrom: validFromStr,
        validTo: validToStr,
        zipCode,
        source: 'flipp_api',
        preExtractedDeals: deals,
        flippFlyerId: flyerMeta.id,
        flippPath: flyerMeta.path,
        flippWidth: flyerMeta.width,
        flippHeight: flyerMeta.height
      };
    } catch (error) {
      console.error(`[KrogerFlyerScraper] Failed to fetch Kroger flyer: ${error.message}`);
      return null;
    }
  }

  async fetchFlyers(zipCode) {
    console.log(`[KrogerFlyerScraper] Starting flyer fetch for ZIP ${zipCode}...`);

    const stores = await this.getStoreLocations(zipCode);
    const flyer = await this.fetchFlyerForStore(stores[0], zipCode);
    const flyers = flyer ? [flyer] : [];

    console.log(`[KrogerFlyerScraper] Fetched ${flyers.length} flyer(s) with ${flyer?.preExtractedDeals?.length || 0} deals for ZIP ${zipCode}`);
    return flyers;
  }
}

module.exports = KrogerFlyerScraper;
