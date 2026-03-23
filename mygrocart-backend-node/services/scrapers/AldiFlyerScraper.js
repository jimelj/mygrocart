/**
 * AldiFlyerScraper
 *
 * Fetches ALDI weekly ad data using the Flipp API.
 * ALDI uses Flipp for their digital circular — we use the same
 * public API that their embedded viewer calls.
 *
 * Returns both flyer page images (high-res from Flipp CDN)
 * and structured deal data (no OCR needed).
 */

const axios = require('axios');

// Flipp API credentials for ALDI (extracted from their public iframe.js)
const FLIPP_ACCESS_TOKEN = '29d9bfdcf546dc601c10c64ed1e932f5';
const FLIPP_MERCHANT_ID = '2353';
const FLIPP_STORE_CODE = '440-018'; // Default US ALDI store code
const FLIPP_API_BASE = 'https://dam.flippenterprise.net/flyerkit';

class AldiFlyerScraper {
  constructor(options = {}) {
    this.rateLimitMs = options.rateLimitMs || 1500;

    this.httpClient = axios.create({
      timeout: 20000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://www.aldi.us/'
      }
    });
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms || this.rateLimitMs));
  }

  async getStoreLocations(zipCode) {
    // ALDI Flipp uses a single store code for all US stores
    console.log(`[AldiFlyerScraper] Using default ALDI store code ${FLIPP_STORE_CODE} for ZIP ${zipCode}`);
    return [{
      storeId: FLIPP_STORE_CODE,
      name: 'ALDI',
      state: 'GA',
      zipCode
    }];
  }

  /**
   * Fetch current ALDI publications from Flipp API.
   * Returns the publication ID needed to fetch deals and images.
   */
  async fetchPublications(zipCode) {
    try {
      const response = await this.httpClient.get(`${FLIPP_API_BASE}/publications/aldi`, {
        params: {
          'languages[]': 'en',
          locale: 'en',
          access_token: FLIPP_ACCESS_TOKEN,
          show_storefronts: true,
          postal_code: zipCode,
          store_code: FLIPP_STORE_CODE
        }
      });

      const pubs = response.data;
      if (!Array.isArray(pubs) || pubs.length === 0) {
        console.log(`[AldiFlyerScraper] No publications found`);
        return [];
      }

      console.log(`[AldiFlyerScraper] Found ${pubs.length} publication(s)`);
      return pubs;
    } catch (err) {
      console.error(`[AldiFlyerScraper] Publications API error: ${err.message}`);
      return [];
    }
  }

  /**
   * Fetch all deal products from a Flipp publication.
   * Returns structured deal data — no OCR needed.
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
      console.error(`[AldiFlyerScraper] Products API error for pub ${publicationId}: ${err.message}`);
      return [];
    }
  }

  async fetchFlyerForStore(store, zipCode) {
    try {
      console.log(`[AldiFlyerScraper] Fetching ALDI weekly ad via Flipp API for ZIP ${zipCode}...`);

      await this.delay();

      // Step 1: Get current publications
      const publications = await this.fetchPublications(zipCode);

      if (publications.length === 0) {
        return null;
      }

      // Use the first publication (typically the weekly ad)
      const pub = publications[0];
      const publicationId = pub.id;
      const validFrom = pub.valid_from || pub.available_from;
      const validTo = pub.valid_to || pub.available_to;

      console.log(`[AldiFlyerScraper] Publication ID: ${publicationId}, valid: ${validFrom} to ${validTo}`);

      await this.delay();

      // Step 2: Fetch structured deal products
      const products = await this.fetchPublicationProducts(publicationId);

      console.log(`[AldiFlyerScraper] Got ${products.length} deal products from Flipp`);

      // Extract deals from Flipp product data
      const deals = [];
      const imageUrls = [];

      for (const product of products) {
        // Parse price from text
        let salePrice = null;
        const priceText = product.price_text || product.pre_price_text || '';
        const priceMatch = priceText.match(/\$?([\d]+\.[\d]{2})/);
        if (priceMatch) {
          salePrice = parseFloat(priceMatch[1]);
        }

        const deal = {
          productName: product.name || '',
          productBrand: product.brand || null,
          salePrice,
          regularPrice: null,
          unit: 'each',
          dealType: 'sale',
          productCategory: (product.categories || []).join(', ') || null
        };

        if (deal.productName && deal.salePrice) {
          deals.push(deal);
        }

        // Collect image URLs
        if (product.image_url) {
          imageUrls.push(product.image_url);
        }
      }

      // Also build flyer page image URLs from the Flipp CDN
      // Flipp CDN pattern for high-res flyer pages
      const flyerPageUrls = [];
      if (pub.page_count) {
        for (let i = 1; i <= pub.page_count; i++) {
          flyerPageUrls.push(
            `https://f.wishabi.net/page_pdf_images/${publicationId}/${i}/x_large`
          );
        }
      }

      // Use flyer page images if available, otherwise product images
      const finalImageUrls = flyerPageUrls.length > 0 ? flyerPageUrls : imageUrls.slice(0, 20);

      const validFromStr = validFrom ? new Date(validFrom).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      const validToStr = validTo ? new Date(validTo).toISOString().split('T')[0] : new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

      return {
        storeName: 'ALDI',
        storeSlug: 'aldi',
        flyerName: pub.name || 'Weekly Ad',
        imageUrls: finalImageUrls,
        validFrom: validFromStr,
        validTo: validToStr,
        zipCode,
        source: 'flipp_api',
        // Embed pre-extracted deals — no OCR needed
        preExtractedDeals: deals,
        flippPublicationId: publicationId
      };
    } catch (error) {
      console.error(`[AldiFlyerScraper] Failed to fetch ALDI flyer: ${error.message}`);
      return null;
    }
  }

  async fetchFlyers(zipCode) {
    console.log(`[AldiFlyerScraper] Starting flyer fetch for ZIP ${zipCode}...`);

    const stores = await this.getStoreLocations(zipCode);
    if (stores.length === 0) return [];

    const flyer = await this.fetchFlyerForStore(stores[0], zipCode);
    const flyers = flyer ? [flyer] : [];

    console.log(`[AldiFlyerScraper] Fetched ${flyers.length} flyer(s) with ${flyer?.preExtractedDeals?.length || 0} deals for ZIP ${zipCode}`);
    return flyers;
  }
}

module.exports = AldiFlyerScraper;
