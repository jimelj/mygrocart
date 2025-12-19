# Changelog

All notable changes to the MyGroCart project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2025-12-19

### Added

- **On-Demand Flyer Fetching** - Automatically fetches flyers for new ZIP codes when users sign up or log in
  - Checks if flyers exist for the ZIP code before fetching (prevents duplicate fetches)
  - Runs in background (non-blocking) so authentication stays fast
  - Logs progress: `[ensureFlyersForZip] ZIP 90210 fetch complete: { newFlyers: 12, totalDeals: 87 }`

- **OpenFoodFacts Image Enrichment** - Deals are enriched with product images from OpenFoodFacts API
  - `enrichDealsWithImages()` method in FlyerService
  - Searches by product name, returns food images when available
  - Coverage varies by product type (better for branded items)

### Fixed

- **Critical: Search Freeze Bug** - Fixed computer freeze when typing in search box
  - Root cause: ProgressiveDiscoveryService was triggering Playwright browsers for dozens of stores
  - Root cause: Redis infinite retry loop consuming resources
  - Fix: Disabled ProgressiveDiscoveryService in resolvers (legacy scraper system)
  - Fix: Limited Redis retries to 5 with `lazyConnect: true`

- **Redis Connection** - Fixed infinite retry loop to Upstash Redis
  - Added `lazyConnect: true` to prevent auto-connect
  - Added `retryStrategy` that returns `null` after 5 attempts
  - Added `reconnectOnError` that returns `false` to prevent auto-reconnect

- **Search Results** - Fixed search returning empty results
  - Changed `searchProducts` resolver to query Deals table (273 records) instead of empty Products table
  - Now returns actual deals from weekly flyers

- **Database Schema** - Added missing `imageUrl` column to Deals table
  - `ALTER TABLE "Deals" ADD COLUMN IF NOT EXISTS "imageUrl" VARCHAR(500)`

- **Authentication** - Fixed expired JWT token issue
  - Reset demo account password for testing

### Changed

- **Navigation** - Improved navigation UX
  - Hide nav items (Deals, Flyers, My List, Compare) when logged out
  - Removed "Home" link (logo already links to home)

### Housekeeping

- Moved 50+ internal documentation files to `documents/` folder
- Added `documents/` to `.gitignore`
- Files kept in repo: `README.md`, `DEPLOYMENT.md`, `CHANGELOG.md`, `CLAUDE.md`

---

## [0.2.0] - 2025-12 (Flyer OCR Pivot)

### Changed - MAJOR PIVOT: Web Scraping to Weekly Flyer OCR

**Summary:** Switched from real-time web scraping to weekly flyer OCR extraction. This is a fundamental architectural change that makes the project legally sound, sustainable, and scalable.

**Why the pivot?**
- Real-time web scraping violated store Terms of Service
- Risk of IP banning at scale
- Legal concerns and potential liability
- Unsustainable maintenance burden (scrapers breaking with site changes)
- Weekly flyers are **public marketing materials** stores WANT distributed

**New Architecture:**
- Data Source: WeeklyAds2 ZIP-based API for location-specific flyers
- OCR/Vision: GPT-4o Mini for deal extraction from flyer images
- Storage: Cloudinary for flyer image hosting
- Automation: Weekly cron job (Sundays 6 AM) + daily digest (8 AM)
- Cost: ~$17/month (vs. potential legal liability)

**Technical Changes:**
- User model: Now stores `zipCode` instead of `latitude`/`longitude`
- New models: `Flyer`, `Deal`, `UserNotification`
- Shopping list: Items now have `itemName` + optional `itemVariant` (e.g., "Milk - Organic")
- Deal matching: Fuzzy matching algorithm for list items to deals
- GraphQL schema: 7 new queries for flyer/deal retrieval

### Added

- **Flyer Model** (`models/Flyer.js`) - Weekly flyer metadata with processing status
- **Deal Model** (`models/Deal.js`) - Extracted deals with product name, price, dates, deal type
- **UserNotification Model** (`models/UserNotification.js`) - Daily digest notification tracking
- **FlyerService** (`services/FlyerService.js`) - ZIP-based flyer fetching from WeeklyAds2
- **DealMatcher** (`services/DealMatcher.js`) - Fuzzy matching for list items to deals
- **NotificationService** (`services/NotificationService.js`) - Daily digest logic
- **WeeklyAds2 Integration** - ZIP-based API for location-specific flyers
- **GPT-4o Mini OCR** - Deal extraction from flyer images
- **Cloudinary Integration** - Flyer image storage and CDN delivery
- **Smart Suggestions** (`utils/itemSuggestions.js`) - Pre-defined variants for 50+ common items
- **Weekly Automation** (`scripts/weekly_flyer_refresh.js`) - Sunday 6 AM cron job
- **Daily Digest** - Push notifications at 8 AM for matched deals

**New GraphQL Queries:**
- `getDealsNearMe(zipCode, radiusMiles, category?)` - Get all deals near user
- `getDealsForStore(storeId)` - Get deals for specific store
- `searchDeals(query, zipCode)` - Search deals by product name
- `getFlyer(flyerId)` - Get flyer with images
- `getCurrentFlyers(zipCode, radiusMiles)` - Get active flyers near user
- `matchDealsToMyList(userId)` - Match deals to user's shopping list

**New GraphQL Mutations:**
- `addGroceryListItem(itemName, itemVariant?, quantity)` - Add item with optional variant
- `updateUserProfile(name, zipCode, notificationsEnabled)` - Update user settings

**New Scripts:**
- `scripts/fetch_flyers_by_zip.js` - Fetch flyers for a ZIP code
- `scripts/process_flyers_ocr.js` - Run OCR on pending flyers
- `scripts/weekly_flyer_refresh.js` - Weekly cron job
- `scripts/seed_stores.js` - Seed store locations

**Environment Variables:**
- `OPENAI_API_KEY` - For GPT-4o Mini OCR
- `CLOUDINARY_URL` - For flyer image storage

### Deprecated

The following systems are deprecated and moved to `/archive/`:

- **TargetScraper** (`scrapers/TargetScraper.js`) - Direct API scraper
- **ShopRiteScraper** (`scrapers/ShopRiteScraper.js`) - Playwright DOM scraper
- **AcmeScraper** (`scrapers/AcmeScraper.js`) - Playwright DOM scraper
- **ScrapingOrchestrator** (`services/ScrapingOrchestrator.js`) - Scraper coordinator
- **ProgressiveDiscoveryService** (`services/ProgressiveDiscoveryService.js`) - On-demand scraping
- **DynamicPriceDiscoveryService** (`services/DynamicPriceDiscoveryService.js`) - Real-time price updates
- **Product Model** - UPC-based products (replaced by deals)
- **StorePrice Model** - Junction table for product prices (replaced by deals)
- **PriceUpdateRequest Model** - User-requested price updates (no longer needed)
- **ProductRequest Model** - User-requested products (no longer needed)

**Deprecated GraphQL Queries:**
- `searchProducts(query)` - Replaced by `searchDeals(query, zipCode)`
- `comparePrices(userId)` - Replaced by `matchDealsToMyList(userId)`

**Deprecated GraphQL Mutations:**
- `updateProductPrice` - No longer needed
- `requestPriceUpdate` - No longer needed
- `requestProduct` - No longer needed

**Deprecated Package Scripts:**
- `pnpm scrape:target` - Replaced by flyer ingestion
- `pnpm scrape:shoprite` - Replaced by flyer ingestion
- `pnpm scrape:comprehensive` - Replaced by flyer ingestion
- `pnpm scrape:status` - No longer needed
- `pnpm seed:core` - Replaced by flyer ingestion

### Removed

- All `test_*_scraper.js` files (scraper test scripts)
- Real-time price comparison logic in resolvers
- Nightly scraper job (replaced by weekly flyer job)
- Progressive Discovery system
- UPC enrichment via OpenFoodFacts (no longer needed)
- Scraper commands from `package.json`

### Migration Notes

**For Developers:**

1. **Update Environment Variables:**
   ```bash
   # Add to .env
   OPENAI_API_KEY=your_openai_api_key_here
   CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
   ```

2. **Run Database Migrations:**
   ```bash
   # New models will auto-sync via Sequelize
   # In production, create proper migrations
   ```

3. **Seed Store Data:**
   ```bash
   node scripts/seed_stores.js
   ```

4. **Fetch Initial Flyers:**
   ```bash
   node scripts/fetch_flyers_by_zip.js 07001
   node scripts/process_flyers_ocr.js
   ```

5. **Update Frontend Code:**
   - Replace `searchProducts` queries with `searchDeals`
   - Replace `comparePrices` queries with `matchDealsToMyList`
   - Update shopping list UI to support variants
   - Add flyer viewer component

6. **Setup Cron Jobs:**
   ```bash
   # Weekly flyer refresh: Sundays 6 AM
   0 6 * * 0 cd /path/to/mygrocart-backend-node && node scripts/weekly_flyer_refresh.js

   # Daily digest: 8 AM
   0 8 * * * cd /path/to/mygrocart-backend-node && node scripts/send_daily_digest.js
   ```

**For Users:**

- Shopping lists now support item variants (e.g., "Milk - Organic")
- Daily digest notifications at 8 AM (opt-in)
- Browse weekly flyers from your favorite stores
- Deals update weekly (Sundays) instead of real-time

### Documentation Updates

- **CLAUDE.md** - Updated with flyer OCR architecture
- **README.md** - New project description, features, and setup instructions
- **PIVOT_PLAN_FLYER_OCR.md** - Detailed pivot plan and rationale
- **SHOPPING_LIST_UX_DESIGN.md** - UX design for shopping lists with variants
- **FLYER_SOURCE_RESEARCH.md** - Research on flyer data sources

### Cost Impact

**Before Pivot:**
- Render (Backend + DB): $7/month
- Risk of legal liability: Incalculable
- **Total: $7/month + legal risk**

**After Pivot:**
- Render (Backend + DB): $7/month
- OpenAI API (GPT-4o Mini): ~$10/month
- Cloudinary: $0 (free tier)
- Legal risk: None (public flyers)
- **Total: ~$17/month + no legal risk**

### Success Metrics (Target)

| Metric | Target |
|--------|--------|
| Stores covered | 15 in NY/NJ |
| Deals extracted/week | 500+ |
| OCR accuracy | >90% |
| User deal matches | >3 per shopping list |
| Weekly active users | 100 (MVP) |

---

## [0.1.0] - 2025-11

### Added
- Initial project setup with Next.js 15 + React 19
- GraphQL API with Apollo Server 4
- PostgreSQL database with Sequelize ORM
- User authentication with JWT
- Shopping list management
- Real-time web scraping (TargetScraper, ShopRiteScraper, AcmeScraper)
- Progressive Discovery system
- Mobile app with React Native + Expo
- CI/CD pipeline with GitHub Actions
- Deployment to Render (Backend + Web)

### Known Issues (Fixed in Unreleased)
- Web scraping violated store TOS
- IP banning risk
- Legal concerns
- Unsustainable maintenance

---

**Note:** Version 0.1.0 used web scraping and is now archived. Version 1.0.0 (when released) will use the new flyer OCR approach.
