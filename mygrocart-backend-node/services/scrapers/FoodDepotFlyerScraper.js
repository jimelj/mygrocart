/**
 * FoodDepotFlyerScraper
 *
 * Fetches Food Depot weekly ad data using the Flipp Enterprise API.
 * Food Depot's site uses a Flipp flyerkit widget with a public access token.
 *
 * Access token: 32f09b3d4ec0fe31895bbfa7a048d0f1
 * Merchant slug: fooddepot
 * Nearest store to ZIP 30132: store_code 51 (Dallas, GA)
 */

const axios = require('axios');

const FLIPP_API_BASE = 'https://dam.flippenterprise.net/flyerkit';
const FLIPP_ACCESS_TOKEN = '32f09b3d4ec0fe31895bbfa7a048d0f1';

// Known Food Depot stores near ZIP 30132
const FOOD_DEPOT_STORES = [
  { storeCode: '51', name: 'Dallas', zipCode: '30157', address: '2985 Villa Rica Hwy, Dallas, GA' },
  { storeCode: '23', name: 'Hiram', zipCode: '30141', address: '4355 Jimmy Lee Smith Pkwy, Hiram, GA' }
];

class FoodDepotFlyerScraper {
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
    console.log(`[FoodDepotFlyerScraper] Looking up Food Depot stores near ZIP ${zipCode}...`);
    // Return the nearest store
    const store = FOOD_DEPOT_STORES.find(s => s.zipCode === zipCode) || FOOD_DEPOT_STORES[0];
    console.log(`[FoodDepotFlyerScraper] Using store: ${store.name} (code ${store.storeCode})`);
    return [store];
  }

  /**
   * Fetch current Food Depot publications from Flipp API.
   */
  async fetchPublications(store) {
    try {
      const response = await this.httpClient.get(`${FLIPP_API_BASE}/publications/fooddepot`, {
        params: {
          'languages[]': 'en',
          locale: 'en',
          access_token: FLIPP_ACCESS_TOKEN,
          show_storefronts: true,
          postal_code: store.zipCode,
          store_code: store.storeCode
        }
      });

      const pubs = response.data;
      if (!Array.isArray(pubs) || pubs.length === 0) {
        console.log(`[FoodDepotFlyerScraper] No publications found`);
        return [];
      }

      console.log(`[FoodDepotFlyerScraper] Found ${pubs.length} publication(s)`);
      return pubs;
    } catch (err) {
      console.error(`[FoodDepotFlyerScraper] Publications API error: ${err.message}`);
      return [];
    }
  }

  /**
   * Fetch all deal products from a Food Depot publication.
   */
  async fetchPublicationProducts(publicationId) {
    try {
      const response = await this.httpClient.get(
        `${FLIPP_API_BASE}/publication/${publicationId}/products`,
        {
          params: {
            display_type: 'all',
            locale: 'en',
            access_token: FLIPP_ACCESS_TOKEN
          }
        }
      );

      return response.data || [];
    } catch (err) {
      console.error(`[FoodDepotFlyerScraper] Products API error for pub ${publicationId}: ${err.message}`);
      return [];
    }
  }

  async fetchFlyerForStore(store, zipCode) {
    try {
      console.log(`[FoodDepotFlyerScraper] Fetching Food Depot weekly ad via Flipp for store ${store.name}...`);

      await this.delay();

      // Step 1: Get current publications
      const publications = await this.fetchPublications(store);
      if (publications.length === 0) return null;

      const pub = publications[0];
      const publicationId = pub.id;

      console.log(`[FoodDepotFlyerScraper] Publication ID: ${publicationId}, valid: ${pub.valid_from} to ${pub.valid_to}`);

      await this.delay();

      // Step 2: Fetch structured deal products
      const products = await this.fetchPublicationProducts(publicationId);
      console.log(`[FoodDepotFlyerScraper] Got ${products.length} products from Flipp`);

      // Extract deals
      const deals = [];
      const imageUrls = [];

      for (const product of products) {
        let salePrice = null;
        const priceText = product.price_text || '';
        const priceMatch = priceText.match(/\$?([\d]+\.[\d]{2})/);
        if (priceMatch) {
          salePrice = parseFloat(priceMatch[1]);
        }

        let regularPrice = null;
        if (product.original_price) {
          const origMatch = String(product.original_price).match(/\$?([\d]+\.[\d]{2})/);
          if (origMatch) regularPrice = parseFloat(origMatch[1]);
        }

        const deal = {
          productName: product.name || '',
          productBrand: product.brand || null,
          salePrice,
          regularPrice,
          unit: 'each',
          dealType: 'sale',
          productCategory: (product.categories || []).join(', ') || null,
          imageUrl: product.image_url || null
        };

        if (deal.productName && deal.salePrice) {
          deals.push(deal);
        }

        if (product.image_url) {
          imageUrls.push(product.image_url);
        }
      }

      // Build flyer page image URLs if available
      const flyerPageUrls = [];
      if (pub.page_count) {
        for (let i = 1; i <= pub.page_count; i++) {
          flyerPageUrls.push(
            `https://f.wishabi.net/page_pdf_images/${publicationId}/${i}/x_large`
          );
        }
      }

      // Also include thumbnail
      if (pub.first_page_thumbnail_400h_url) {
        flyerPageUrls.unshift(pub.first_page_thumbnail_400h_url);
      }

      const finalImageUrls = flyerPageUrls.length > 0 ? flyerPageUrls : imageUrls.slice(0, 20);

      const validFromStr = pub.valid_from
        ? new Date(pub.valid_from).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      const validToStr = pub.valid_to
        ? new Date(pub.valid_to).toISOString().split('T')[0]
        : new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

      console.log(`[FoodDepotFlyerScraper] Extracted ${deals.length} deals for Food Depot`);

      return {
        storeName: 'Food Depot',
        storeSlug: 'food-depot',
        flyerName: pub.name || 'Weekly Ad',
        imageUrls: finalImageUrls,
        validFrom: validFromStr,
        validTo: validToStr,
        zipCode,
        source: 'flipp_api',
        preExtractedDeals: deals,
        flippPublicationId: publicationId
      };
    } catch (error) {
      console.error(`[FoodDepotFlyerScraper] Failed to fetch Food Depot flyer: ${error.message}`);
      return null;
    }
  }

  async fetchFlyers(zipCode) {
    console.log(`[FoodDepotFlyerScraper] Starting flyer fetch for ZIP ${zipCode}...`);

    const stores = await this.getStoreLocations(zipCode);
    if (stores.length === 0) return [];

    const flyer = await this.fetchFlyerForStore(stores[0], zipCode);
    const flyers = flyer ? [flyer] : [];

    console.log(`[FoodDepotFlyerScraper] Fetched ${flyers.length} flyer(s) with ${flyer?.preExtractedDeals?.length || 0} deals for ZIP ${zipCode}`);
    return flyers;
  }
}

module.exports = FoodDepotFlyerScraper;
