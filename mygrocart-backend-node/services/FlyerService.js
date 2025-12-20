const axios = require('axios');
const { Flyer, Deal, Store } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const OpenAI = require('openai');
const cloudinary = require('cloudinary').v2;
const pLimit = require('p-limit');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

// Configure Cloudinary (reads from CLOUDINARY_URL env var)
cloudinary.config();

/**
 * Safely parse Unix timestamp to Date, with fallback
 */
const safeParseDate = (timestamp, fallbackDays = 0) => {
  if (timestamp && !isNaN(timestamp)) {
    const date = new Date(timestamp * 1000);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  // Fallback: return current date + fallbackDays
  const fallback = new Date();
  fallback.setDate(fallback.getDate() + fallbackDays);
  return fallback;
};

/**
 * FlyerService - Handles flyer ingestion from WeeklyAds2 API
 *
 * This service:
 * 1. Fetches flyers for a ZIP code from WeeklyAds2 API
 * 2. Filters to only grocery stores
 * 3. Downloads flyer images from CDN
 * 4. Uploads images to Cloudinary
 * 5. Processes flyers with OCR (GPT-4o Mini)
 * 6. Saves flyers and deals to database
 */
class FlyerService {
  constructor() {
    this.WEEKLYADS2_API = 'https://www.weeklyads2.com/wp-content/themes/wead/modules/flyers/flyer.php';
    this.CDN_BASE_URL = 'https://weadflipp-957b.kxcdn.com';

    // Initialize OpenAI client (optional - will skip OCR if not configured)
    this.openai = process.env.OPENAI_API_KEY
      ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      : null;

    // Grocery stores we support (based on research)
    this.GROCERY_STORES = [
      'target',
      'walmart',
      'shoprite',
      'stop-shop',
      'acme-markets',
      'aldi',
      'lidl',
      'costco',
      'food-bazaar-supermarket',
      'kings-food-markets',
      'western-beef',
      'wegmans',
      'giant-food',
      'food-lion',
      'publix'
    ];

    // Rate limiting: 1 request per second to be polite
    this.requestDelay = 1000;

    // Concurrency control: Max 2 concurrent API requests
    this.apiLimit = pLimit(2);

    // OpenFoodFacts API for product image search
    this.OFF_API = 'https://world.openfoodfacts.org';
    this.OFF_USER_AGENT = 'MyGroCart/1.0 (contact@mygrocart.com)';
  }

  /**
   * Search for product image using OpenFoodFacts API
   * @param {string} productName - Product name to search
   * @param {string} brand - Optional brand name
   * @returns {Promise<string|null>} Image URL or null if not found
   */
  async searchProductImage(productName, brand = null) {
    try {
      // Build search query - combine product name and brand for better results
      const searchQuery = brand ? `${brand} ${productName}` : productName;

      // Clean up the query - remove common grocery terms that don't help
      const cleanedQuery = searchQuery
        .replace(/\b(sale|bogo|off|save|coupon|deal|each|lb|oz|pack|ct|count)\b/gi, '')
        .replace(/\$[\d.]+/g, '')  // Remove prices
        .replace(/\d+\s*for\s*\$?\d+/gi, '')  // Remove "2 for $5" patterns
        .trim();

      if (cleanedQuery.length < 3) {
        return null;
      }

      // Rate limit: OpenFoodFacts allows 10 search requests/minute
      await this.delay(150);

      const response = await axios.get(`${this.OFF_API}/cgi/search.pl`, {
        params: {
          search_terms: cleanedQuery,
          search_simple: 1,
          action: 'process',
          json: 1,
          page_size: 5,
          fields: 'product_name,brands,image_url,image_front_url,image_small_url'
        },
        headers: {
          'User-Agent': this.OFF_USER_AGENT
        },
        timeout: 8000
      });

      if (response.data && response.data.products && response.data.products.length > 0) {
        // Find best matching product
        const products = response.data.products;

        for (const product of products) {
          // Prefer front image, fall back to general image
          const imageUrl = product.image_front_url || product.image_url || product.image_small_url;

          if (imageUrl) {
            console.log(`[FlyerService] Found image for "${cleanedQuery}": ${imageUrl.substring(0, 60)}...`);
            return imageUrl;
          }
        }
      }

      console.log(`[FlyerService] No image found for "${cleanedQuery}"`);
      return null;
    } catch (error) {
      // Don't log every failure - it's expected for many products
      if (error.code !== 'ECONNABORTED' && error.response?.status !== 404) {
        console.warn(`[FlyerService] Image search error for "${productName}":`, error.message);
      }
      return null;
    }
  }

  /**
   * Enrich deals with product images from OpenFoodFacts
   * @param {Array} deals - Array of deal objects
   * @returns {Promise<Array>} Deals enriched with imageUrl
   */
  async enrichDealsWithImages(deals) {
    if (!deals || deals.length === 0) {
      return deals;
    }

    console.log(`[FlyerService] Enriching ${deals.length} deals with product images...`);

    let imagesFound = 0;
    const enrichedDeals = [];

    for (const deal of deals) {
      try {
        const imageUrl = await this.searchProductImage(deal.productName, deal.productBrand);

        if (imageUrl) {
          imagesFound++;
        }

        enrichedDeals.push({
          ...deal,
          imageUrl: imageUrl || null
        });
      } catch (error) {
        // Continue with deal even if image search fails
        enrichedDeals.push({
          ...deal,
          imageUrl: null
        });
      }
    }

    console.log(`[FlyerService] Found images for ${imagesFound}/${deals.length} deals`);
    return enrichedDeals;
  }

  /**
   * Fetch flyers for a ZIP code from WeeklyAds2 API
   * @param {string} zipCode - 5-digit ZIP code
   * @returns {Promise<Array>} Array of flyer objects
   */
  async fetchFlyersForZip(zipCode) {
    try {
      console.log(`[FlyerService] Fetching flyers for ZIP ${zipCode}...`);

      const response = await axios.get(this.WEEKLYADS2_API, {
        params: { zip: zipCode },
        headers: {
          'User-Agent': 'MyGroCart/1.0 (contact@mygrocart.com)'
        },
        timeout: 10000
      });

      if (!response.data || !response.data.flyers) {
        console.log(`[FlyerService] No flyers found for ZIP ${zipCode}`);
        return [];
      }

      console.log(`[FlyerService] Found ${response.data.flyers.length} flyers for ZIP ${zipCode}`);
      return response.data.flyers;
    } catch (error) {
      console.error(`[FlyerService] Error fetching flyers for ZIP ${zipCode}:`, error.message);
      throw new Error(`Failed to fetch flyers: ${error.message}`);
    }
  }

  /**
   * Filter flyers to only include grocery stores
   * @param {Array} flyers - Array of flyer objects from API
   * @returns {Array} Filtered array of grocery store flyers
   */
  filterGroceryStores(flyers) {
    const groceryFlyers = flyers.filter(flyer =>
      this.GROCERY_STORES.includes(flyer.merchant_slug)
    );

    console.log(`[FlyerService] Filtered to ${groceryFlyers.length} grocery store flyers`);
    return groceryFlyers;
  }

  /**
   * Parse flyer CDN path from WeeklyAds2 API response
   * @param {object} flyer - Flyer object from API
   * @returns {string|null} CDN path or null if not found
   */
  parseFlyerPath(flyer) {
    try {
      if (!flyer.sui) return null;

      const suiData = JSON.parse(flyer.sui);
      return suiData.fl1_path || null;
    } catch (error) {
      console.error('[FlyerService] Error parsing flyer path:', error.message);
      return null;
    }
  }

  /**
   * Parse flyer dimensions from SUI data
   * @param {object} flyer - Flyer object from API
   * @returns {{width: number, height: number}|null} Dimensions or null if not found
   */
  parseFlyerDimensions(flyer) {
    try {
      if (!flyer.sui) return null;

      const suiData = JSON.parse(flyer.sui);
      return {
        width: suiData.fl1_width || 0,
        height: suiData.fl1_height || 0
      };
    } catch (error) {
      console.error('[FlyerService] Error parsing flyer dimensions:', error.message);
      return null;
    }
  }

  /**
   * Probe CDN to determine how many pages a flyer has
   * Tests tile URLs at a low zoom level to quickly find page count
   * @param {string} flyerPath - CDN path for the flyer
   * @returns {Promise<number>} Number of pages (0 if error)
   */
  async probePageCount(flyerPath) {
    let pageCount = 0;
    const maxPagesToCheck = 30;

    for (let page = 0; page < maxPagesToCheck; page++) {
      try {
        // Use zoom level 0 (lowest resolution) for fast probing
        const testUrl = `${this.CDN_BASE_URL}/${flyerPath}0_0_${page}.jpg`;
        const response = await axios.head(testUrl, { timeout: 5000 });

        if (response.status === 200) {
          pageCount = page + 1;
        } else {
          break;
        }
      } catch {
        // 404 or error means we've found all pages
        break;
      }
    }

    console.log(`[FlyerService] Probed ${pageCount} pages for flyer`);
    return pageCount;
  }

  /**
   * Probe CDN to determine grid dimensions for a specific page at zoom level 5
   * @param {string} flyerPath - CDN path for the flyer
   * @param {number} pageIndex - Page index (0-based)
   * @returns {Promise<{cols: number, rows: number}>} Grid dimensions
   */
  async probeGridDimensions(flyerPath, pageIndex) {
    // Probe columns (check row 0, increment col until 404)
    let cols = 0;
    for (let col = 0; col < 20; col++) {
      try {
        const testUrl = `${this.CDN_BASE_URL}/${flyerPath}5_${col}_${pageIndex}.jpg`;
        const response = await axios.head(testUrl, { timeout: 3000 });
        if (response.status === 200) {
          cols = col + 1;
        } else {
          break;
        }
      } catch {
        break;
      }
    }

    // Probe rows (check col 0, increment row until 404 or we hit next page)
    // Note: For a single page, row index is typically 0-9 at zoom level 5
    let rows = 0;
    for (let row = 0; row < 15; row++) {
      try {
        const testUrl = `${this.CDN_BASE_URL}/${flyerPath}5_0_${pageIndex * 10 + row}.jpg`;
        const response = await axios.head(testUrl, { timeout: 3000 });
        if (response.status === 200) {
          rows = row + 1;
        } else {
          break;
        }
      } catch {
        break;
      }
    }

    console.log(`[FlyerService] Grid dimensions for page ${pageIndex}: ${cols}x${rows}`);
    return { cols, rows };
  }

  /**
   * Download and stitch all tiles into a full flyer image
   * @param {string} flyerPath - CDN path for the flyer
   * @param {number} cols - Number of columns
   * @param {number} rows - Number of rows
   * @returns {Promise<Buffer|null>} Full flyer image buffer or null if error
   */
  async stitchFullFlyer(flyerPath, cols, rows) {
    const TILE_SIZE = 256;
    const BATCH_SIZE = 30; // Smaller batches for better memory management

    try {
      console.log(`[FlyerService] Downloading ${cols * rows} tiles (${cols}x${rows})...`);

      // Download tiles in batches
      const allTiles = [];
      const totalTiles = cols * rows;

      for (let batch = 0; batch < Math.ceil(totalTiles / BATCH_SIZE); batch++) {
        const batchPromises = [];
        const startIdx = batch * BATCH_SIZE;
        const endIdx = Math.min(startIdx + BATCH_SIZE, totalTiles);

        for (let idx = startIdx; idx < endIdx; idx++) {
          const col = idx % cols;
          const row = Math.floor(idx / cols);
          const tileUrl = `${this.CDN_BASE_URL}/${flyerPath}5_${col}_${row}.jpg`;

          batchPromises.push(
            axios.get(tileUrl, { responseType: 'arraybuffer', timeout: 15000 })
              .then(response => ({
                col,
                row,
                data: Buffer.from(response.data)
              }))
              .catch(() => null)
          );
        }

        const batchTiles = (await Promise.all(batchPromises)).filter(t => t !== null);
        allTiles.push(...batchTiles);

        // Delay between batches to allow GC
        if (batch < Math.ceil(totalTiles / BATCH_SIZE) - 1) {
          await this.delay(150);
        }
      }

      console.log(`[FlyerService] Downloaded ${allTiles.length}/${totalTiles} tiles`);

      if (allTiles.length === 0) {
        console.warn(`[FlyerService] No tiles downloaded`);
        return null;
      }

      // Create composite image with Sharp
      const compositeWidth = cols * TILE_SIZE;
      const compositeHeight = rows * TILE_SIZE;

      // CDN stores tiles with row 0 at the bottom, so we need to invert the row placement
      const compositeOps = allTiles.map(tile => ({
        input: tile.data,
        left: tile.col * TILE_SIZE,
        top: (rows - 1 - tile.row) * TILE_SIZE
      }));

      // Clear tile data to free memory before compositing
      allTiles.length = 0;

      const stitchedImage = await sharp({
        create: {
          width: compositeWidth,
          height: compositeHeight,
          channels: 3,
          background: { r: 255, g: 255, b: 255 }
        }
      })
      .composite(compositeOps)
      .jpeg({ quality: 85 }) // Slightly lower quality for smaller file size
      .toBuffer();

      console.log(`[FlyerService] Stitched full flyer: ${compositeWidth}x${compositeHeight}`);
      return stitchedImage;
    } catch (error) {
      console.error(`[FlyerService] Error stitching flyer:`, error.message);
      return null;
    }
  }

  /**
   * Split a wide flyer image into pages for easier viewing
   * @param {Buffer} fullImage - Full stitched flyer image buffer
   * @param {number} width - Full image width
   * @param {number} height - Full image height
   * @param {number} targetAspectRatio - Target aspect ratio for each page (width/height)
   * @returns {Promise<Buffer[]>} Array of page image buffers
   */
  async splitIntoPages(fullImage, width, height, targetAspectRatio = 0.75) {
    // Calculate optimal page width based on height and target aspect ratio
    const pageWidth = Math.round(height * targetAspectRatio);
    const numPages = Math.ceil(width / pageWidth);

    console.log(`[FlyerService] Splitting ${width}x${height} image into ${numPages} pages (${pageWidth}px wide each)`);

    const pages = [];
    for (let i = 0; i < numPages; i++) {
      const left = i * pageWidth;
      const extractWidth = Math.min(pageWidth, width - left);

      const pageBuffer = await sharp(fullImage)
        .extract({ left, top: 0, width: extractWidth, height })
        .jpeg({ quality: 90 })
        .toBuffer();

      pages.push(pageBuffer);
    }

    return pages;
  }

  /**
   * Download flyer pages in low-memory mode (no stitching)
   * For very large flyers, we download individual low-res pages directly
   * @param {object} flyer - Flyer object from API
   * @param {string} flyerPath - CDN path
   * @returns {Promise<Array>} Array of image URLs
   */
  async downloadFlyerPagesLowMemory(flyer, flyerPath) {
    try {
      // Probe how many pages exist at zoom level 0 (lowest resolution)
      // At zoom 0, each tile is a full page
      const pageCount = await this.probePageCount(flyerPath);

      if (pageCount === 0) {
        console.warn(`[FlyerService] No pages found for ${flyer.merchant}`);
        return [];
      }

      console.log(`[FlyerService] Low-memory mode: Found ${pageCount} pages for ${flyer.merchant}`);

      // Download each page at zoom level 0 (single tile per page, ~256x256 or larger)
      // This avoids any stitching and keeps memory usage minimal
      const imageUrls = [];

      for (let page = 0; page < Math.min(pageCount, 20); page++) { // Limit to 20 pages
        const pageUrl = `${this.CDN_BASE_URL}/${flyerPath}0_0_${page}.jpg`;

        try {
          // Verify page exists
          const response = await axios.head(pageUrl, { timeout: 5000 });

          if (response.status === 200) {
            if (process.env.CLOUDINARY_URL) {
              // Upload to Cloudinary for better OCR quality
              try {
                const result = await cloudinary.uploader.upload(pageUrl, {
                  folder: `flyers/${flyer.flyer_run_id}`,
                  public_id: `page_${page + 1}_lowres`,
                  resource_type: 'image',
                  overwrite: true,
                  timeout: 30000
                });
                imageUrls.push(result.secure_url);
                console.log(`[FlyerService] Uploaded page ${page + 1}/${pageCount} to Cloudinary`);
              } catch (uploadError) {
                // Fallback to CDN URL
                imageUrls.push(pageUrl);
                console.log(`[FlyerService] Using CDN URL for page ${page + 1}`);
              }
            } else {
              imageUrls.push(pageUrl);
            }
          }
        } catch {
          // Page doesn't exist, stop
          break;
        }

        // Small delay between uploads
        await this.delay(200);
      }

      console.log(`[FlyerService] Low-memory mode: Got ${imageUrls.length} page URLs for ${flyer.merchant}`);
      return imageUrls;
    } catch (error) {
      console.error(`[FlyerService] Low-memory download failed:`, error.message);
      return [];
    }
  }

  /**
   * Download flyer images at medium quality (zoom level 4)
   * For flyers with 80-400 tiles at zoom 5 - uses zoom 4 which has 1/4 the tiles
   * @param {object} flyer - Flyer object from API
   * @param {string} flyerPath - CDN path
   * @param {number} cols5 - Number of columns at zoom level 5
   * @param {number} rows5 - Number of rows at zoom level 5
   * @returns {Promise<Array>} Array of image URLs
   */
  async downloadFlyerMediumQuality(flyer, flyerPath, cols5, rows5) {
    const TILE_SIZE = 256;
    const BATCH_SIZE = 20; // Smaller batches to reduce memory pressure

    try {
      // At zoom level 4, we have half the cols and rows (1/4 tiles total)
      const cols = Math.ceil(cols5 / 2);
      const rows = Math.ceil(rows5 / 2);
      const totalTiles = cols * rows;

      console.log(`[FlyerService] Medium-quality mode: ${cols}x${rows} tiles (${totalTiles} total) at zoom 4`);

      // Download tiles in small batches and stitch
      const allTiles = [];

      for (let batch = 0; batch < Math.ceil(totalTiles / BATCH_SIZE); batch++) {
        const batchPromises = [];
        const startIdx = batch * BATCH_SIZE;
        const endIdx = Math.min(startIdx + BATCH_SIZE, totalTiles);

        for (let idx = startIdx; idx < endIdx; idx++) {
          const col = idx % cols;
          const row = Math.floor(idx / cols);
          // Use zoom level 4 instead of 5
          const tileUrl = `${this.CDN_BASE_URL}/${flyerPath}4_${col}_${row}.jpg`;

          batchPromises.push(
            axios.get(tileUrl, { responseType: 'arraybuffer', timeout: 15000 })
              .then(response => ({
                col,
                row,
                data: Buffer.from(response.data)
              }))
              .catch(() => null)
          );
        }

        const batchTiles = (await Promise.all(batchPromises)).filter(t => t !== null);
        allTiles.push(...batchTiles);

        // Delay between batches to reduce memory pressure
        if (batch < Math.ceil(totalTiles / BATCH_SIZE) - 1) {
          await this.delay(200);
        }
      }

      console.log(`[FlyerService] Downloaded ${allTiles.length}/${totalTiles} tiles at zoom 4`);

      if (allTiles.length === 0) {
        console.warn(`[FlyerService] No tiles downloaded at zoom 4`);
        return [];
      }

      // Stitch tiles into composite image
      const compositeWidth = cols * TILE_SIZE;
      const compositeHeight = rows * TILE_SIZE;

      // CDN stores tiles with row 0 at the bottom, so we need to invert the row placement
      const compositeOps = allTiles.map(tile => ({
        input: tile.data,
        left: tile.col * TILE_SIZE,
        top: (rows - 1 - tile.row) * TILE_SIZE
      }));

      // Clear tile data from memory after creating composite ops
      allTiles.length = 0;

      const stitchedImage = await sharp({
        create: {
          width: compositeWidth,
          height: compositeHeight,
          channels: 3,
          background: { r: 255, g: 255, b: 255 }
        }
      })
      .composite(compositeOps)
      .jpeg({ quality: 85 })
      .toBuffer();

      console.log(`[FlyerService] Stitched medium-quality flyer: ${compositeWidth}x${compositeHeight}`);

      // Split into pages if very wide
      const aspectRatio = compositeWidth / compositeHeight;
      let pageBuffers;

      if (aspectRatio > 2) {
        pageBuffers = await this.splitIntoPages(stitchedImage, compositeWidth, compositeHeight, 0.75);
        console.log(`[FlyerService] Split into ${pageBuffers.length} pages`);
      } else {
        pageBuffers = [stitchedImage];
      }

      // Upload to Cloudinary
      const imageUrls = [];

      for (let i = 0; i < pageBuffers.length; i++) {
        if (process.env.CLOUDINARY_URL) {
          try {
            const result = await new Promise((resolve, reject) => {
              const uploadStream = cloudinary.uploader.upload_stream(
                {
                  folder: `flyers/${flyer.flyer_run_id}`,
                  public_id: `page_${i + 1}_med`,
                  resource_type: 'image',
                  overwrite: true
                },
                (error, result) => {
                  if (error) reject(error);
                  else resolve(result);
                }
              );
              uploadStream.end(pageBuffers[i]);
            });

            imageUrls.push(result.secure_url);
            console.log(`[FlyerService] Uploaded medium-quality page ${i + 1}/${pageBuffers.length}`);
          } catch (uploadError) {
            console.error(`[FlyerService] Cloudinary upload failed:`, uploadError.message);
            // Fallback to CDN tile URL
            imageUrls.push(`${this.CDN_BASE_URL}/${flyerPath}4_0_0.jpg`);
          }
        } else {
          imageUrls.push(`${this.CDN_BASE_URL}/${flyerPath}4_0_0.jpg`);
        }

        await this.delay(100);
      }

      console.log(`[FlyerService] Generated ${imageUrls.length} medium-quality images for ${flyer.merchant}`);
      return imageUrls;
    } catch (error) {
      console.error(`[FlyerService] Medium-quality download failed:`, error.message);
      // Fallback to low-memory mode
      return await this.downloadFlyerPagesLowMemory(flyer, flyerPath);
    }
  }

  /**
   * Download flyer images at a specific zoom level (for large flyers)
   * @param {object} flyer - Flyer object from API
   * @param {string} flyerPath - CDN path
   * @param {number} cols - Number of columns at this zoom
   * @param {number} rows - Number of rows at this zoom
   * @param {number} zoomLevel - Zoom level (4 or 5)
   * @returns {Promise<Array>} Array of image URLs
   */
  async downloadFlyerImagesAtZoom(flyer, flyerPath, cols, rows, zoomLevel) {
    const TILE_SIZE = 256;
    const BATCH_SIZE = 50;

    try {
      const totalTiles = cols * rows;
      console.log(`[FlyerService] Downloading ${totalTiles} tiles at zoom level ${zoomLevel}...`);

      // Download tiles in batches
      const allTiles = [];

      for (let batch = 0; batch < Math.ceil(totalTiles / BATCH_SIZE); batch++) {
        const batchPromises = [];
        const startIdx = batch * BATCH_SIZE;
        const endIdx = Math.min(startIdx + BATCH_SIZE, totalTiles);

        for (let idx = startIdx; idx < endIdx; idx++) {
          const col = idx % cols;
          const row = Math.floor(idx / cols);
          const tileUrl = `${this.CDN_BASE_URL}/${flyerPath}${zoomLevel}_${col}_${row}.jpg`;

          batchPromises.push(
            axios.get(tileUrl, { responseType: 'arraybuffer', timeout: 15000 })
              .then(response => ({
                col,
                row,
                data: Buffer.from(response.data)
              }))
              .catch(() => null)
          );
        }

        const batchTiles = (await Promise.all(batchPromises)).filter(t => t !== null);
        allTiles.push(...batchTiles);

        console.log(`[FlyerService] Downloaded ${allTiles.length}/${totalTiles} tiles`);

        // Small delay between batches
        if (batch < Math.ceil(totalTiles / BATCH_SIZE) - 1) {
          await this.delay(100);
        }
      }

      if (allTiles.length === 0) {
        console.warn(`[FlyerService] No tiles downloaded for ${flyer.merchant}`);
        return [`${this.CDN_BASE_URL}/${flyerPath}${zoomLevel}_0_0.jpg`];
      }

      // Create composite image
      const compositeWidth = cols * TILE_SIZE;
      const compositeHeight = rows * TILE_SIZE;

      const compositeOps = allTiles.map(tile => ({
        input: tile.data,
        left: tile.col * TILE_SIZE,
        top: (rows - 1 - tile.row) * TILE_SIZE
      }));

      const stitchedImage = await sharp({
        create: {
          width: compositeWidth,
          height: compositeHeight,
          channels: 3,
          background: { r: 255, g: 255, b: 255 }
        }
      })
      .composite(compositeOps)
      .jpeg({ quality: 85 })
      .toBuffer();

      console.log(`[FlyerService] Stitched flyer at zoom ${zoomLevel}: ${compositeWidth}x${compositeHeight}`);

      // Split into pages if very wide
      const aspectRatio = compositeWidth / compositeHeight;
      let pageBuffers;

      if (aspectRatio > 2) {
        pageBuffers = await this.splitIntoPages(stitchedImage, compositeWidth, compositeHeight, 0.75);
        console.log(`[FlyerService] Split wide flyer into ${pageBuffers.length} pages`);
      } else {
        pageBuffers = [stitchedImage];
      }

      // Upload to Cloudinary
      const imageUrls = [];
      for (let i = 0; i < pageBuffers.length; i++) {
        if (process.env.CLOUDINARY_URL) {
          try {
            const result = await new Promise((resolve, reject) => {
              const uploadStream = cloudinary.uploader.upload_stream(
                {
                  folder: `flyers/${flyer.flyer_run_id}`,
                  public_id: `page_${i + 1}_z${zoomLevel}`,
                  resource_type: 'image',
                  overwrite: true
                },
                (error, result) => {
                  if (error) reject(error);
                  else resolve(result);
                }
              );
              uploadStream.end(pageBuffers[i]);
            });

            imageUrls.push(result.secure_url);
            console.log(`[FlyerService] Uploaded page ${i + 1}/${pageBuffers.length} to Cloudinary`);
          } catch (uploadError) {
            console.error(`[FlyerService] Cloudinary upload failed:`, uploadError.message);
            imageUrls.push(`${this.CDN_BASE_URL}/${flyerPath}${zoomLevel}_0_0.jpg`);
          }
        } else {
          imageUrls.push(`${this.CDN_BASE_URL}/${flyerPath}${zoomLevel}_0_0.jpg`);
        }

        await this.delay(100);
      }

      return imageUrls;
    } catch (error) {
      console.error(`[FlyerService] Error downloading at zoom ${zoomLevel}:`, error.message);
      return [`${this.CDN_BASE_URL}/${flyerPath}${zoomLevel}_0_0.jpg`];
    }
  }

  /**
   * Download flyer images from CDN - now with full-page stitching
   * @param {object} flyer - Flyer object from API
   * @returns {Promise<Array>} Array of image URLs (Cloudinary or fallback CDN)
   */
  async downloadFlyerImages(flyer) {
    const TILE_SIZE = 256;
    const MAX_TILES = 120; // Balanced limit for full quality (Render 512MB)
    const MEDIUM_TILES = 300; // Threshold for medium quality (zoom 4)

    try {
      const flyerPath = this.parseFlyerPath(flyer);
      if (!flyerPath) {
        console.warn(`[FlyerService] No flyer path found for ${flyer.merchant}`);
        return [];
      }

      // Get dimensions from SUI data
      const dimensions = this.parseFlyerDimensions(flyer);
      let cols, rows, fullWidth, fullHeight;

      if (dimensions && dimensions.width > 0 && dimensions.height > 0) {
        // Use SUI dimensions
        cols = Math.ceil(dimensions.width / TILE_SIZE);
        rows = Math.ceil(dimensions.height / TILE_SIZE);
        fullWidth = dimensions.width;
        fullHeight = dimensions.height;
        console.log(`[FlyerService] Using SUI dimensions: ${fullWidth}x${fullHeight} (${cols}x${rows} tiles)`);
      } else {
        // Fallback to probing
        console.log(`[FlyerService] SUI dimensions not available, probing...`);
        const probed = await this.probeGridDimensions(flyerPath, 0);
        cols = probed.cols;
        rows = probed.rows;
        fullWidth = cols * TILE_SIZE;
        fullHeight = rows * TILE_SIZE;
      }

      if (cols === 0 || rows === 0) {
        console.warn(`[FlyerService] No tiles found for ${flyer.merchant}`);
        return [];
      }

      const totalTiles = cols * rows;
      console.log(`[FlyerService] Processing ${flyer.merchant}: ${cols}x${rows} tiles (${totalTiles} total)`);

      // Memory-conscious processing based on tile count:
      // - <= 120 tiles: Full quality at zoom level 5 with stitching
      // - 121-300 tiles: Medium quality at zoom level 4 (1/4 tiles)
      // - > 300 tiles: Low-memory page mode (individual pages)
      if (totalTiles > MEDIUM_TILES) {
        console.log(`[FlyerService] Very large flyer (${totalTiles} tiles > ${MEDIUM_TILES}). Using low-memory page mode.`);
        return await this.downloadFlyerPagesLowMemory(flyer, flyerPath);
      } else if (totalTiles > MAX_TILES) {
        console.log(`[FlyerService] Large flyer (${totalTiles} tiles > ${MAX_TILES}). Using medium-quality mode at zoom level 4.`);
        return await this.downloadFlyerMediumQuality(flyer, flyerPath, cols, rows);
      }

      // Step 1: Stitch the full flyer
      const fullFlyerBuffer = await this.stitchFullFlyer(flyerPath, cols, rows);

      if (!fullFlyerBuffer) {
        console.warn(`[FlyerService] Failed to stitch flyer for ${flyer.merchant}`);
        // Fallback to single tile
        return [`${this.CDN_BASE_URL}/${flyerPath}5_0_0.jpg`];
      }

      // Step 2: Split into viewable pages if flyer is very wide
      const aspectRatio = fullWidth / fullHeight;
      let pageBuffers;

      if (aspectRatio > 2) {
        // Very wide flyer - split into pages with ~0.75 aspect ratio (portrait-ish)
        pageBuffers = await this.splitIntoPages(fullFlyerBuffer, cols * TILE_SIZE, rows * TILE_SIZE, 0.75);
        console.log(`[FlyerService] Split wide flyer into ${pageBuffers.length} pages`);
      } else {
        // Normal aspect ratio - use as single page
        pageBuffers = [fullFlyerBuffer];
      }

      // Step 3: Upload pages to Cloudinary
      const imageUrls = [];

      for (let i = 0; i < pageBuffers.length; i++) {
        if (process.env.CLOUDINARY_URL) {
          try {
            const result = await new Promise((resolve, reject) => {
              const uploadStream = cloudinary.uploader.upload_stream(
                {
                  folder: `flyers/${flyer.flyer_run_id}`,
                  public_id: `page_${i + 1}_full`,
                  resource_type: 'image',
                  overwrite: true
                },
                (error, result) => {
                  if (error) reject(error);
                  else resolve(result);
                }
              );
              uploadStream.end(pageBuffers[i]);
            });

            imageUrls.push(result.secure_url);
            console.log(`[FlyerService] Uploaded page ${i + 1}/${pageBuffers.length} to Cloudinary`);
          } catch (uploadError) {
            console.error(`[FlyerService] Cloudinary upload failed for page ${i + 1}:`, uploadError.message);
            // Fallback to CDN tile URL
            imageUrls.push(`${this.CDN_BASE_URL}/${flyerPath}5_0_0.jpg`);
          }
        } else {
          // No Cloudinary - save locally or use CDN fallback
          imageUrls.push(`${this.CDN_BASE_URL}/${flyerPath}5_0_0.jpg`);
        }

        // Rate limiting between uploads
        await this.delay(100);
      }

      console.log(`[FlyerService] Generated ${imageUrls.length} full-page image URLs for ${flyer.merchant}`);
      return imageUrls;
    } catch (error) {
      console.error('[FlyerService] Error downloading flyer images:', error.message);
      return [];
    }
  }

  /**
   * Upload images to Cloudinary
   * @param {Array} imageUrls - Array of image URLs from CDN
   * @param {string} flyerId - Flyer ID for organizing uploads
   * @returns {Promise<Array>} Array of Cloudinary URLs
   */
  async uploadToCloudinary(imageUrls, flyerId) {
    // Skip if CLOUDINARY_URL not configured
    if (!process.env.CLOUDINARY_URL) {
      console.log(`[FlyerService] Cloudinary not configured - returning ${imageUrls.length} CDN URLs`);
      return imageUrls;
    }

    const uploadedUrls = [];
    const MAX_RETRIES = 2;

    for (let i = 0; i < imageUrls.length; i++) {
      let retries = 0;
      let uploaded = false;

      while (retries < MAX_RETRIES && !uploaded) {
        try {
          const result = await cloudinary.uploader.upload(imageUrls[i], {
            folder: `flyers/${flyerId}`,
            public_id: `page_${i + 1}`,
            resource_type: 'image',
            overwrite: true,
            timeout: 30000
          });

          uploadedUrls.push(result.secure_url);
          uploaded = true;
          console.log(`[FlyerService] Uploaded page ${i + 1}/${imageUrls.length} to Cloudinary`);
        } catch (error) {
          retries++;
          console.error(`[FlyerService] Cloudinary upload failed for page ${i + 1} (attempt ${retries}/${MAX_RETRIES}):`, error.message);

          if (retries >= MAX_RETRIES) {
            // Fallback to CDN URL after all retries exhausted
            uploadedUrls.push(imageUrls[i]);
            console.warn(`[FlyerService] Using CDN fallback for page ${i + 1}`);
          } else {
            // Exponential backoff before retry
            await this.delay(1000 * retries);
          }
        }
      }
    }

    console.log(`[FlyerService] Uploaded ${uploadedUrls.length} images to Cloudinary`);
    return uploadedUrls;
  }

  /**
   * Process flyer with OCR (GPT-4o Mini)
   * @param {Array} imageUrls - Array of flyer image URLs
   * @returns {Promise<Array>} Array of extracted deals
   */
  async extractDealsWithOCR(imageUrls) {
    // Skip if OpenAI not configured
    if (!this.openai) {
      console.log(`[FlyerService] OpenAI not configured - skipping OCR for ${imageUrls.length} images`);
      return [];
    }

    const deals = [];

    for (const imageUrl of imageUrls) {
      // Rate limit: 100 requests/minute = 600ms delay
      await this.delay(600);

      try {
        const response = await this.openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Analyze this grocery store flyer image and extract all deals.
For each deal, provide a JSON object with:
- product_name (required): The product name
- brand (optional): Brand name if visible
- sale_price (required): The sale price as a number
- regular_price (optional): Regular price if shown
- unit (optional): "each", "lb", "oz", etc.
- deal_type: "sale", "bogo", "multi_buy", or "coupon"
- quantity (optional): e.g., "2 for $5", "Buy 1 Get 1"
- category (optional): "produce", "dairy", "meat", "bakery", "frozen", "beverages", "snacks", "pantry", "household", "personal_care"

Return ONLY a JSON array of deals. If no deals found, return [].
Example: [{"product_name": "Whole Milk", "brand": "Horizon", "sale_price": 3.99, "regular_price": 5.49, "unit": "gallon", "deal_type": "sale", "category": "dairy"}]`
                },
                {
                  type: "image_url",
                  image_url: {
                    url: imageUrl,
                    detail: "high"
                  }
                }
              ]
            }
          ],
          max_tokens: 4096
        });

        const content = response.choices[0].message.content;

        // Parse JSON from response with validation
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          let parsedDeals;
          try {
            parsedDeals = JSON.parse(jsonMatch[0]);

            if (!Array.isArray(parsedDeals)) {
              throw new Error('OCR response is not an array');
            }

            // Validate and sanitize each deal
            parsedDeals = parsedDeals.filter(d => {
              // If sale_price is missing but quantity has "X for $Y" pattern, parse it
              if (typeof d.sale_price !== 'number' && d.quantity) {
                const multiBuyMatch = d.quantity.match(/(\d+)\s*for\s*\$?([\d.]+)/i);
                if (multiBuyMatch) {
                  const qty = parseInt(multiBuyMatch[1]);
                  const totalPrice = parseFloat(multiBuyMatch[2]);
                  if (qty > 0 && totalPrice > 0) {
                    d.sale_price = totalPrice / qty; // Per-unit price
                    d.deal_type = 'multi_buy';
                    console.log(`[FlyerService] Parsed multi-buy: ${d.quantity} -> $${d.sale_price.toFixed(2)} each`);
                  }
                }
              }

              // Also try parsing sale_price if it's a string like "$3.99"
              if (typeof d.sale_price === 'string') {
                const priceMatch = d.sale_price.match(/\$?([\d.]+)/);
                if (priceMatch) {
                  d.sale_price = parseFloat(priceMatch[1]);
                }
              }

              if (!d.product_name || typeof d.sale_price !== 'number' || isNaN(d.sale_price)) {
                console.warn('[FlyerService] Skipping invalid deal:', d);
                return false;
              }
              if (d.sale_price < 0 || d.sale_price > 10000) {
                console.warn('[FlyerService] Invalid price:', d.sale_price);
                return false;
              }
              return true;
            });

            deals.push(...parsedDeals.map(d => ({
              productName: d.product_name,
              productBrand: d.brand || null,
              productCategory: d.category || null,
              salePrice: parseFloat(d.sale_price),
              regularPrice: d.regular_price ? parseFloat(d.regular_price) : null,
              unit: d.unit || 'each',
              dealType: d.deal_type || 'sale',
              quantity: d.quantity || null,
              confidence: 0.9, // GPT-4o Mini is generally reliable
              rawText: content.substring(0, 500)
            })));

            console.log(`[FlyerService] Extracted ${parsedDeals.length} deals from image`);
          } catch (parseError) {
            console.error('[FlyerService] Failed to parse OCR response:', parseError.message);
            // Continue with next image
          }
        }
      } catch (error) {
        console.error(`[FlyerService] OCR failed for ${imageUrl}:`, error.message);
        // Continue with other images
      }
    }

    console.log(`[FlyerService] Total deals extracted: ${deals.length}`);
    return deals;
  }

  /**
   * Save flyer and deals to database
   * @param {object} flyerData - Flyer metadata from API
   * @param {Array} deals - Array of deals extracted from OCR
   * @returns {Promise<object>} Saved flyer record
   */
  async saveFlyer(flyerData, deals = []) {
    const transaction = await sequelize.transaction();

    try {
      // Check if flyer already exists by flyerRunId
      const existingFlyer = await Flyer.findOne({
        where: { flyerRunId: flyerData.flyer_run_id }
      });

      if (existingFlyer) {
        // Update zipCode if it's different (fix for flyers saved with wrong ZIP)
        const newZipCode = (flyerData.postal_code || '').trim().replace(/[^0-9]/g, '').substring(0, 10);
        if (newZipCode && existingFlyer.zipCode !== newZipCode) {
          await existingFlyer.update({ zipCode: newZipCode }, { transaction });
          await transaction.commit();
          console.log(`[FlyerService] Updated flyer ${flyerData.flyer_run_id} ZIP from ${existingFlyer.zipCode} to ${newZipCode}`);
          return existingFlyer;
        }
        await transaction.rollback();
        console.log(`[FlyerService] Flyer ${flyerData.flyer_run_id} already exists - skipping`);
        return existingFlyer;
      }

      // Try to find matching store in database
      // Sanitize inputs to prevent SQL injection
      const sanitizedMerchant = (flyerData.merchant || '').trim().substring(0, 100);
      const sanitizedZipCode = (flyerData.postal_code || '').trim().replace(/[^0-9]/g, '').substring(0, 10);

      if (!sanitizedZipCode.match(/^\d{5}$/)) {
        console.warn('[FlyerService] Invalid ZIP code format:', flyerData.postal_code);
        // Create flyer record without store association
        const flyer = await Flyer.create({
          storeId: null,
          storeName: sanitizedMerchant,
          storeSlug: flyerData.merchant_slug,
          flyerRunId: flyerData.flyer_run_id,
          flyerName: flyerData.name,
          zipCode: sanitizedZipCode || '00000',
          validFrom: safeParseDate(flyerData.valid_from, 0),
          validTo: safeParseDate(flyerData.valid_to, 7),
          imageUrls: flyerData.imageUrls || [],
          flyerPath: flyerData.flyerPath,
          status: deals.length > 0 ? 'completed' : 'pending',
          processedAt: deals.length > 0 ? new Date() : null
        }, { transaction });

        await transaction.commit();
        console.log(`[FlyerService] Saved flyer ${flyer.id} for ${sanitizedMerchant} (invalid ZIP code)`);
        return flyer;
      }

      let storeId = null;
      const store = await Store.findOne({
        where: {
          [Op.or]: [
            { chainName: { [Op.iLike]: `%${sanitizedMerchant}%` } },
            { storeName: { [Op.iLike]: `%${sanitizedMerchant}%` } }
          ],
          zipCode: sanitizedZipCode
        }
      });

      if (store) {
        storeId = store.storeId;
      }

      // Create flyer record with sanitized values
      const flyer = await Flyer.create({
        storeId,
        storeName: sanitizedMerchant,
        storeSlug: flyerData.merchant_slug,
        flyerRunId: flyerData.flyer_run_id,
        flyerName: flyerData.name,
        zipCode: sanitizedZipCode,
        validFrom: safeParseDate(flyerData.valid_from, 0),
        validTo: safeParseDate(flyerData.valid_to, 7),
        imageUrls: flyerData.imageUrls || [],
        flyerPath: flyerData.flyerPath,
        status: deals.length > 0 ? 'completed' : 'pending',
        processedAt: deals.length > 0 ? new Date() : null
      }, { transaction });

      console.log(`[FlyerService] Saved flyer ${flyer.id} for ${sanitizedMerchant}`);

      // Save deals if any using bulkCreate for better performance
      if (deals.length > 0) {
        await Deal.bulkCreate(
          deals.map(deal => ({
            flyerId: flyer.id,
            storeName: sanitizedMerchant,
            zipCode: sanitizedZipCode,
            productName: deal.productName,
            productBrand: deal.productBrand || null,
            productCategory: deal.productCategory || null,
            salePrice: deal.salePrice,
            regularPrice: deal.regularPrice || null,
            unit: deal.unit || 'each',
            dealType: deal.dealType || 'sale',
            quantity: deal.quantity || null,
            validFrom: safeParseDate(flyerData.valid_from, 0),
            validTo: safeParseDate(flyerData.valid_to, 7),
            confidence: deal.confidence || 0.0,
            rawText: deal.rawText || null,
            imageUrl: deal.imageUrl || null
          })),
          { transaction }
        );

        console.log(`[FlyerService] Saved ${deals.length} deals for flyer ${flyer.id}`);
      }

      await transaction.commit();
      return flyer;
    } catch (error) {
      await transaction.rollback();
      // Log detailed error internally
      console.error('[FlyerService] Error saving flyer:', error.message, error.stack);

      // Return generic error to client
      throw new Error('Failed to save flyer data');
    }
  }

  /**
   * Main method: Process all flyers for a ZIP code
   * This is the primary entry point for flyer ingestion
   *
   * @param {string} zipCode - 5-digit ZIP code
   * @returns {Promise<object>} Summary of processing results
   */
  async processZipCode(zipCode) {
    return this.apiLimit(async () => {
      try {
        console.log(`[FlyerService] Processing ZIP code ${zipCode}...`);

      // Step 1: Fetch flyers from WeeklyAds2
      const allFlyers = await this.fetchFlyersForZip(zipCode);

      // Step 2: Filter to grocery stores
      const groceryFlyers = this.filterGroceryStores(allFlyers);

      if (groceryFlyers.length === 0) {
        console.log(`[FlyerService] No grocery flyers found for ZIP ${zipCode}`);
        return {
          success: true,
          zipCode,
          flyersFound: 0,
          flyersProcessed: 0,
          newFlyers: 0,
          totalDeals: 0,
          message: 'No grocery flyers available for this ZIP code'
        };
      }

      let flyersProcessed = 0;
      let newFlyers = 0;
      let totalDeals = 0;

      // Step 3: Process each flyer
      for (const flyerData of groceryFlyers) {
        try {
          // Check if flyer already exists
          const existingFlyer = await Flyer.findOne({
            where: { flyerRunId: flyerData.flyer_run_id }
          });

          if (existingFlyer) {
            console.log(`[FlyerService] Flyer ${flyerData.flyer_run_id} already exists - skipping`);
            flyersProcessed++;
            continue;
          }

          // Download images
          const imageUrls = await this.downloadFlyerImages(flyerData);

          // Upload to Cloudinary
          const cloudinaryUrls = await this.uploadToCloudinary(imageUrls, flyerData.flyer_run_id);

          // Extract deals with OCR
          const deals = await this.extractDealsWithOCR(cloudinaryUrls);

          // Enrich deals with product images from OpenFoodFacts
          const enrichedDeals = await this.enrichDealsWithImages(deals);

          // Save to database
          await this.saveFlyer({
            ...flyerData,
            imageUrls: cloudinaryUrls,
            flyerPath: this.parseFlyerPath(flyerData)
          }, enrichedDeals);

          flyersProcessed++;
          newFlyers++;
          totalDeals += deals.length;

          // Rate limiting: wait before next request
          await this.delay(this.requestDelay);
        } catch (error) {
          console.error(`[FlyerService] Error processing flyer ${flyerData.flyer_run_id}:`, error.message);
          // Continue with next flyer even if one fails
        }
      }

      console.log(`[FlyerService] Completed processing ZIP ${zipCode}: ${flyersProcessed} flyers, ${newFlyers} new, ${totalDeals} deals`);

      return {
        success: true,
        zipCode,
        flyersFound: groceryFlyers.length,
        flyersProcessed,
        newFlyers,
        totalDeals,
        message: `Successfully processed ${flyersProcessed} flyers (${newFlyers} new) with ${totalDeals} deals`
      };
    } catch (error) {
      console.error(`[FlyerService] Error processing ZIP code ${zipCode}:`, error.message);
      return {
        success: false,
        zipCode,
        flyersFound: 0,
        flyersProcessed: 0,
        newFlyers: 0,
        totalDeals: 0,
        message: error.message
      };
      }
    });
  }

  /**
   * Check for missing flyers and complete interrupted fetches
   * Compares available flyers from API with stored flyers in database
   *
   * @param {string} zipCode - 5-digit ZIP code
   * @returns {Promise<object>} Status report including missing flyers count
   */
  async checkAndCompleteFlyersForZip(zipCode) {
    try {
      console.log(`[FlyerService] Checking for missing flyers in ZIP ${zipCode}...`);

      // Step 1: Fetch all available flyers from API
      const allFlyers = await this.fetchFlyersForZip(zipCode);
      const groceryFlyers = this.filterGroceryStores(allFlyers);

      if (groceryFlyers.length === 0) {
        return {
          success: true,
          zipCode,
          availableFromApi: 0,
          storedInDb: 0,
          missingCount: 0,
          message: 'No grocery flyers available for this ZIP code'
        };
      }

      // Step 2: Get stored flyer run IDs from database
      const storedFlyers = await Flyer.findAll({
        where: { zipCode },
        attributes: ['flyerRunId', 'storeName', 'status']
      });

      const storedRunIds = new Set(storedFlyers.map(f => f.flyerRunId));

      // Step 3: Find missing flyers (in API but not in DB)
      const missingFlyers = groceryFlyers.filter(f => !storedRunIds.has(f.flyer_run_id));

      console.log(`[FlyerService] ZIP ${zipCode}: API has ${groceryFlyers.length}, DB has ${storedFlyers.length}, missing ${missingFlyers.length}`);

      if (missingFlyers.length === 0) {
        return {
          success: true,
          zipCode,
          availableFromApi: groceryFlyers.length,
          storedInDb: storedFlyers.length,
          missingCount: 0,
          message: 'All flyers are up to date'
        };
      }

      // Step 4: Process missing flyers
      let newFlyers = 0;
      let totalDeals = 0;
      const errors = [];

      for (const flyerData of missingFlyers) {
        try {
          console.log(`[FlyerService] Processing missing flyer: ${flyerData.merchant} (${flyerData.flyer_run_id})`);

          // Download images
          const imageUrls = await this.downloadFlyerImages(flyerData);

          // Upload to Cloudinary
          const cloudinaryUrls = await this.uploadToCloudinary(imageUrls, flyerData.flyer_run_id);

          // Extract deals with OCR
          const deals = await this.extractDealsWithOCR(cloudinaryUrls);

          // Enrich deals with product images
          const enrichedDeals = await this.enrichDealsWithImages(deals);

          // Save to database - override postal_code with the requested zipCode
          await this.saveFlyer({
            ...flyerData,
            postal_code: zipCode,  // Use the requested ZIP, not the API's postal_code
            imageUrls: cloudinaryUrls,
            flyerPath: this.parseFlyerPath(flyerData)
          }, enrichedDeals);

          newFlyers++;
          totalDeals += deals.length;

          // Rate limiting
          await this.delay(this.requestDelay);
        } catch (error) {
          console.error(`[FlyerService] Error processing missing flyer ${flyerData.merchant}:`, error.message);
          errors.push({ store: flyerData.merchant, error: error.message });
        }
      }

      const finalStoredCount = storedFlyers.length + newFlyers;

      return {
        success: true,
        zipCode,
        availableFromApi: groceryFlyers.length,
        storedInDb: finalStoredCount,
        missingCount: missingFlyers.length,
        newFlyersProcessed: newFlyers,
        newDeals: totalDeals,
        errors: errors.length > 0 ? errors : undefined,
        message: `Completed ${newFlyers}/${missingFlyers.length} missing flyers with ${totalDeals} deals`
      };
    } catch (error) {
      console.error(`[FlyerService] Error checking flyers for ZIP ${zipCode}:`, error.message);
      return {
        success: false,
        zipCode,
        availableFromApi: 0,
        storedInDb: 0,
        missingCount: 0,
        message: error.message
      };
    }
  }

  /**
   * Get flyer status for a ZIP code (API count vs DB count)
   * Fast method that only checks counts without processing
   *
   * @param {string} zipCode - 5-digit ZIP code
   * @returns {Promise<object>} Status report
   */
  async getFlyerStatusForZip(zipCode) {
    try {
      // Fetch from API
      const allFlyers = await this.fetchFlyersForZip(zipCode);
      const groceryFlyers = this.filterGroceryStores(allFlyers);

      // Count in database
      const storedCount = await Flyer.count({
        where: { zipCode }
      });

      const missingCount = Math.max(0, groceryFlyers.length - storedCount);
      const isComplete = missingCount === 0;

      return {
        zipCode,
        availableFromApi: groceryFlyers.length,
        storedInDb: storedCount,
        missingCount,
        isComplete,
        stores: groceryFlyers.map(f => f.merchant)
      };
    } catch (error) {
      console.error(`[FlyerService] Error getting flyer status for ZIP ${zipCode}:`, error.message);
      return {
        zipCode,
        availableFromApi: 0,
        storedInDb: 0,
        missingCount: 0,
        isComplete: true,
        error: error.message
      };
    }
  }

  /**
   * Helper: Delay execution for rate limiting
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = FlyerService;
