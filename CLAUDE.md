# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MyGroCart is a full-stack grocery deal comparison app that helps users find the best grocery deals across multiple supermarkets by analyzing weekly flyers. Users build shopping lists and the app matches their items to deals from weekly store flyers in their area.

**Core Value Proposition:**
> "See all the best grocery deals near you this week, matched to your shopping list"

**Tech Stack:**
- Frontend Web: Next.js 15 + React 19 + TailwindCSS 4 + Radix UI + Apollo Client
- Frontend Mobile: React Native + Expo
- Backend: Node.js + Express + Apollo Server 4 + GraphQL
- Database: PostgreSQL + Sequelize ORM
- Data Strategy: Weekly Flyer OCR (ZIP-based ingestion + GPT-4o Mini extraction)
- Flyer Source: WeeklyAds2 ZIP API + CDN image download
- OCR/Vision: GPT-4o Mini for deal extraction
- Storage: Cloudinary for flyer images
- Package Manager: pnpm 10.4.1+

## Development Commands

### Backend (mygrocart-backend-node/)
```bash
# Development with hot reload
pnpm dev

# Production start
pnpm start

# Weekly Flyer Processing
node scripts/fetch_flyers_by_zip.js 07001     # Fetch flyers for a ZIP code
node scripts/process_flyers_ocr.js            # Run OCR on pending flyers
node scripts/weekly_flyer_refresh.js          # Weekly cron job (Sundays 6 AM)

# Database seeding
node scripts/seed_stores.js                   # Seed store locations
```

### Frontend Web (mygrocart-web/)
```bash
# Development server (runs on http://localhost:3000)
pnpm dev

# Production build
pnpm build

# Start production server
pnpm start

# Lint code
pnpm lint
```

### Frontend Mobile (mygrocart-mobile/)
```bash
# Start Expo development server
pnpm start

# Run on iOS simulator
pnpm ios

# Run on Android emulator
pnpm android

# Run on web
pnpm web
```

### Important Ports
- Backend: `5000` (GraphQL endpoint at `/graphql`)
- Frontend Web: `3000` (Next.js dev server)
- Frontend Mobile: `8081` (Expo dev server)

## Architecture Overview

### Data Flow Architecture

**User → Frontend (React) → Apollo Client → GraphQL API → Resolvers → FlyerService/DealMatcher → Database**

The app uses Weekly Flyer OCR for efficient deal discovery:
1. **User authentication** uses PostgreSQL (User model with Sequelize)
2. **Store locations** seeded into database with geolocation data
3. **Weekly flyers** fetched from WeeklyAds2 ZIP API (location-specific)
4. **Flyer images** downloaded from CDN and stored in Cloudinary
5. **Deal extraction** using GPT-4o Mini OCR (structured JSON output)
6. **Deal matching** to user shopping lists via fuzzy matching algorithm
7. **Daily digest** notification when list items match current deals

### GraphQL Schema Design

The schema (`schema/typeDefs.js`) defines 7 main types:

**Core Types:**
- `User` - User accounts with ZIP code and notification preferences
- `Store` - Physical store locations with geolocation (lat/long)
- `Flyer` - Weekly flyer metadata (dates, images, store, processing status)
- `Deal` - Extracted deals from flyers (product, price, store, dates)
- `UserListItem` - Shopping list items (name + optional variant)
- `DealMatch` - Computed matches between list items and deals
- `UserNotification` - Daily digest notification records

**Key Queries:**
- `getDealsNearMe(zipCode, radiusMiles, category?)` - Get all deals near user
- `getDealsForStore(storeId)` - Get deals for specific store
- `searchDeals(query, zipCode)` - Search deals by product name
- `getFlyer(flyerId)` - Get flyer with images
- `getCurrentFlyers(zipCode, radiusMiles)` - Get active flyers near user
- `matchDealsToMyList(userId)` - Match deals to user's shopping list
- `getUserGroceryLists(userId)` - Fetch user's shopping list

**Key Mutations:**
- `signup/login` - Authentication with JWT
- `addGroceryListItem(itemName, itemVariant?, quantity)` - Add item to list
- `updateGroceryListItem(id, quantity)` - Update list item
- `removeGroceryListItem(id)` - Remove from list
- `updateUserProfile(name, zipCode, notificationsEnabled)` - Update user settings

### Resolver Implementation Pattern

Resolvers (`resolvers/index.js`) follow this pattern:

1. **Database-first with fallback:** Attempt PostgreSQL query, fall back to sample data on error
2. **Authentication context:** `{ user }` injected via middleware/auth.js
3. **Deal matching algorithm:**
   - Fuzzy match list item names to deal product names
   - Filter by optional variant (e.g., "organic", "whole", "2%")
   - Calculate match score (0-1) based on name similarity + variant match
   - Return deals sorted by match score descending

### Sequelize Models

Located in `models/`, all use UUIDs:

- `User.js` - Automatic password hashing via beforeCreate/beforeUpdate hooks, includes `comparePassword()` instance method, stores ZIP code and notification preferences
- `Store.js` - Indexed on `[latitude, longitude]` for geospatial queries
- `Flyer.js` - Weekly flyer metadata with processing status (pending/processing/completed/failed)
- `Deal.js` - Extracted deals with product name, price, dates, deal type, confidence score
- `UserListItem.js` - Shopping list items with itemName + optional itemVariant
- `UserNotification.js` - Daily digest records with matched deal IDs

**Database Connection:** `config/database.js` parses `DATABASE_URL` to avoid SSL query parameter conflicts with `pg` driver. SSL is enforced at driver level (`pg.defaults.ssl`) for production (Render).

### Weekly Flyer OCR Architecture

**FlyerService** (`services/FlyerService.js`) coordinates flyer ingestion:

1. **Flyer Discovery** - Call WeeklyAds2 ZIP API to get location-specific flyers
2. **Image Download** - Extract CDN URLs and download flyer page images
3. **Storage** - Upload images to Cloudinary (organized by ZIP/store/date)
4. **OCR Processing** - Send images to GPT-4o Mini for deal extraction
5. **Deal Normalization** - Parse JSON response and store deals in database
6. **Daily Digest** - Match new deals to user shopping lists and send notifications

**WeeklyAds2 ZIP API:**
- **Endpoint:** `https://www.weeklyads2.com/wp-content/themes/wead/modules/flyers/flyer.php?zip={zipCode}`
- **Response:** Location-specific flyers with metadata (dates, store, flyer ID)
- **Regional Awareness:** Different stores and flyer versions per ZIP code
- **Rate Limiting:** 1 request/second to avoid blocking
- **Coverage:** 30+ stores including Target, Walmart, ShopRite, ACME, Stop & Shop, ALDI, Costco

**CDN Image Pattern:**
```javascript
// Tile-based pattern (for multi-page flyers)
https://weadflipp-957b.kxcdn.com/{fl1_path}{tile}_{col}_{row}.jpg

// Page-based pattern (alternative)
https://wead.nyc3.cdn.digitaloceanspaces.com/wp-content/uploads/weeklyads/{storeSlug}/{flyerSlug}/{pageNumber}.jpg
```

**GPT-4o Mini OCR:**
- **Model:** `gpt-4o-mini` (cost-effective for high-volume OCR)
- **Prompt:** Extract deals as structured JSON with product name, brand, price, deal type, unit
- **Response Format:** Array of deal objects with confidence scores
- **Rate Limiting:** 600ms delay between requests (100 requests/minute)
- **Cost:** ~$0.01-0.02 per flyer page (~$10/month for 15 stores)

**OCR Prompt Example:**
```
Analyze this grocery store flyer image and extract all deals.
For each deal, provide:
- product_name (required)
- brand (if visible)
- sale_price (required)
- regular_price (if shown)
- unit (each, lb, oz, etc.)
- deal_type (sale, BOGO, coupon, multi_buy)
- quantity_requirement (e.g., "2 for $5", "limit 4")

Return as JSON array. Only include clear, readable deals.
```

**Weekly Automation Flow:**
```
Sunday 6 AM (Cron Job)
     │
     ▼
Get unique ZIP codes from all users
     │
     ▼
For each ZIP: Call WeeklyAds2 API
     │
     ▼
Download new flyer images → Cloudinary
     │
     ▼
GPT-4o Mini OCR → Extract deals
     │
     ▼
Store deals in PostgreSQL
     │
     ▼
Match deals to user shopping lists
     │
     ▼
Send daily digest notifications (8 AM)
```

### Deal Matching Algorithm

Located in `services/DealMatcher.js`:

```javascript
function matchDealsToListItem(listItem, deals) {
  const matches = [];

  for (const deal of deals) {
    const dealText = deal.productName.toLowerCase();
    const itemName = listItem.itemName.toLowerCase();
    const variant = listItem.itemVariant?.toLowerCase();

    // Must contain the base item name
    if (!dealText.includes(itemName)) continue;

    // If variant specified, must also contain variant
    if (variant && !dealText.includes(variant)) continue;

    // Calculate match score
    let score = 0.5; // Base score for item match
    if (variant && dealText.includes(variant)) {
      score = 1.0; // Full score for variant match
    }

    matches.push({
      deal,
      score,
      matchReason: variant
        ? `Matches "${itemName}" + "${variant}"`
        : `Matches "${itemName}"`
    });
  }

  // Sort by score descending
  return matches.sort((a, b) => b.score - a.score);
}
```

**Smart Suggestions for List Items:**

Pre-defined suggestions for common items (see `utils/itemSuggestions.js`):
- Milk → variants: ["Any Milk", "Whole", "2%", "Skim", "Organic", "Non-Dairy"]
- Chicken → variants: ["Any Chicken", "Breast", "Thighs", "Wings", "Ground"]
- Bread → variants: ["Any Bread", "White", "Wheat", "Whole Grain", "Sourdough"]
- And 50+ more common grocery items

### Frontend Architecture

**Web App (mygrocart-web/):**

- **Framework:** Next.js 15 with App Router
- **Main Pages:**
  - `app/page.js` - Home/landing page with hot deals feed
  - `app/list/page.js` - Shopping list management with deal badges
  - `app/deals/page.js` - Browse all deals near user
  - `app/flyers/page.js` - Flyer viewer with pagination
  - `app/comparison/page.js` - Deal comparison for shopping list
- **Context:** `context/AuthContext.js` - JWT token management, localStorage persistence
- **GraphQL:** Apollo Client configured in `lib/apollo-client.js` with auth link
- **UI Library:** Radix UI components (`components/ui/`) + TailwindCSS for styling
- **Routing:** Next.js App Router with file-based routing

**Mobile App (mygrocart-mobile/):**

- **Framework:** React Native + Expo
- **Navigation:** React Navigation (Stack Navigator)
- **GraphQL:** Apollo Client with custom HTTP link for bearer token authentication
- **Screens:**
  - `screens/HomeScreen.js` - Hot deals feed + daily digest
  - `screens/ListScreen.js` - Shopping list with deal badges
  - `screens/DealsScreen.js` - Browse deals by store/category
  - `screens/FlyerViewerScreen.js` - Swipeable flyer pages
  - `screens/ComparisonScreen.js` - Deal matches for list
- **UI:** Custom components with React Native Paper
- **Notifications:** Expo Notifications for daily digest

### Authentication Flow

1. User signs up/logs in via GraphQL mutations (SIGNUP/LOGIN)
2. Backend generates JWT with `userId` payload (expires in 7 days)
3. Frontend stores token in localStorage (web) or AsyncStorage (mobile)
4. Apollo Client's `authLink` adds `Authorization: Bearer <token>` header
5. Backend `middleware/auth.js` decodes JWT and injects `user` into GraphQL context

**Password Security:**
- Minimum 6 characters (enforced in User model validation)
- Hashed with bcryptjs (salt rounds: 12)
- Validation on both frontend and backend

### Environment Variables

**Backend (.env):**
```
DATABASE_URL=postgresql://localhost:5432/mygrocart
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
NODE_ENV=development
PORT=5000
OPENAI_API_KEY=your-openai-api-key
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
```

**Frontend Web (.env.local):**
```
NEXT_PUBLIC_GRAPHQL_ENDPOINT=http://localhost:5000/graphql
```

**Frontend Mobile (.env):**
```
EXPO_PUBLIC_GRAPHQL_ENDPOINT=http://localhost:5000/graphql
```

## Key Implementation Details

### Geolocation & Distance Calculation

Users have `zipCode` field, stores have `latitude`/`longitude` fields. Distance calculation uses Haversine formula (`utils/distance.js`). Queries filter stores/deals where `distance <= user.travelRadiusMiles` (default: 10 miles).

**ZIP to Lat/Long:** Use geocoding service (Google Maps API or Nominatim) to convert user ZIP code to coordinates for distance calculations.

### Daily Digest Notification Logic

Located in `services/NotificationService.js`:

```javascript
async function sendDailyDigests() {
  // Run at 8 AM daily
  const users = await User.findAll({ where: { notificationsEnabled: true } });

  for (const user of users) {
    // Get user's list items
    const listItems = await UserListItem.findAll({
      where: { userId: user.id, checked: false }
    });

    if (listItems.length === 0) continue;

    // Get current deals for user's ZIP
    const deals = await Deal.findAll({
      where: {
        zipCode: user.zipCode,
        validTo: { [Op.gte]: new Date() }
      }
    });

    // Match deals to list items
    const matches = [];
    for (const item of listItems) {
      const itemMatches = matchDealsToListItem(item, deals);
      if (itemMatches.length > 0) {
        matches.push({ item, deals: itemMatches });
      }
    }

    // Only send if there are matches
    if (matches.length === 0) continue;

    // Send push notification
    await sendPushNotification(user, {
      title: `${matches.length} items on your list are on sale!`,
      body: matches.slice(0, 3).map(m => m.item.itemName).join(', ') +
            (matches.length > 3 ? ` + ${matches.length - 3} more` : ''),
      data: { screen: 'DailyDigest' }
    });

    // Save notification record
    await UserNotification.create({
      userId: user.id,
      type: 'daily_digest',
      title: `${matches.length} deals found`,
      matchedDeals: matches.flatMap(m => m.deals.map(d => d.deal.id)),
      sentAt: new Date()
    });
  }
}
```

### Sample Data Structure

`utils/sampleData.js` contains mock data for development:
- 4 stores (ShopRite, Stop & Shop, ACME, Target)
- 2 flyers (ShopRite Weekly Ad, Target Weekly Circular)
- 20 sample deals (produce, dairy, meat, bakery)
- Demo users with shopping lists

This allows frontend development without a fully populated database.

## Common Development Patterns

### Adding a New GraphQL Query

1. Define type in `schema/typeDefs.js` under `type Query { ... }`
2. Implement resolver in `resolvers/index.js` → `Query: { ... }`
3. Add query definition in Apollo Client setup (`mygrocart-web/lib/apollo-client.js` or `mygrocart-mobile/graphql/client.js`)
4. Use with `useQuery()` hook in React components

### Adding a New Sequelize Model

1. Create model file in `models/` following existing patterns
2. Define schema with DataTypes, indexes, and hooks
3. Import in resolvers if needed
4. Database tables auto-sync via `sequelize.sync({ alter: true })` in `config/database.js`

### Processing a New Flyer Type

1. Add store to `utils/storeConfig.js` with slug and flyer pattern
2. Update `FlyerService.js` to handle store-specific flyer format
3. Test OCR extraction accuracy with sample flyer
4. Add store to WeeklyAds2 API filter if not already included

### SSL/Database Configuration

**Critical:** PostgreSQL connections require SSL in production (Render). The database config:
- Parses `DATABASE_URL` to separate connection parameters
- Sets SSL at driver level: `pg.defaults.ssl = { require: true, rejectUnauthorized: false }`
- Avoids passing `?sslmode=require` in connection string (causes driver conflicts)

## Important Notes

- **CORS:** Backend allows `localhost:3000` (Next.js), `localhost:8081` (Expo), and production domains
- **GraphQL Playground:** Available at `http://localhost:5000/graphql` for testing queries
- **Database migrations:** Use `sequelize.sync({ alter: true })` for development. For production, implement proper migrations.
- **Error handling:** Resolvers gracefully fall back to sample data if database fails
- **Rate limiting:** WeeklyAds2 API: 1 req/sec, OpenAI OCR: 100 req/min
- **Flyer storage:** Cloudinary free tier (25GB storage/bandwidth) sufficient for MVP
- **Mobile Testing:** Use Expo Go app on physical device or iOS Simulator/Android Emulator
- **Cost:** ~$17/month (OpenAI $10 + Render $7, Cloudinary free)

## Deployment

See `DEPLOYMENT.md` for full deployment guide.

**Key points:**
- Backend: Docker deployment via `Dockerfile` (Render)
- Frontend Web: Render deployment (Next.js static export)
- Frontend Mobile: Expo EAS Build & Submit (App Store/Google Play)
- Database: PostgreSQL on Render (free tier: 1GB)
- Storage: Cloudinary (free tier: 25GB)
- Environment variables configured in respective dashboards
- Weekly cron job: Render Cron Jobs (Sundays 6 AM EST)

## Archived Systems (No Longer Used)

The following systems were part of the previous real-time scraping approach and are now archived in `/archive/`:

- `scrapers/TargetScraper.js` - Direct API scraper (replaced by flyer OCR)
- `scrapers/ShopRiteScraper.js` - Playwright DOM scraper (replaced by flyer OCR)
- `scrapers/AcmeScraper.js` - Playwright DOM scraper (replaced by flyer OCR)
- `services/ScrapingOrchestrator.js` - Scraper coordinator (replaced by FlyerService)
- `services/ProgressiveDiscoveryService.js` - On-demand scraping (no longer needed)
- `services/DynamicPriceDiscoveryService.js` - Real-time price updates (no longer needed)
- All `test_*_scraper.js` files - Scraper test scripts

**Reason for pivot:** Real-time web scraping violated store TOS, risked IP banning, was legally questionable, and was unsustainable to maintain. Weekly flyers are public marketing materials stores WANT distributed, making this approach legally sound and sustainable.

See `PIVOT_PLAN_FLYER_OCR.md` for full details on the architectural pivot.
