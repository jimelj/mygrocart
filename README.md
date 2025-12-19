# MyGroCart - Smart Grocery Deal Finder

MyGroCart helps you save money on groceries by automatically matching your shopping list to the best deals at nearby stores. We analyze weekly store flyers using AI and show you exactly which stores have your items on sale.

**Core Value:** See all the best grocery deals near you this week, matched to your shopping list.

## Features

- **Smart Shopping Lists** - Add items with optional variants (e.g., "Milk - Organic" or just "Milk - Any")
- **Weekly Deal Discovery** - AI extracts deals from store flyers automatically
- **Location-Based Deals** - See deals at stores near your ZIP code
- **Deal Matching** - Instantly see which items on your list are on sale
- **Daily Digest** - Get notified when items on your list go on sale (8 AM daily)
- **Flyer Viewer** - Browse full weekly flyers from your favorite stores
- **Multi-Store Comparison** - Compare deals across ShopRite, Target, ACME, Stop & Shop, ALDI, Walmart, and more

## How It Works

1. **Add Items to Your List** - Type "milk" and choose variants like "Whole", "2%", "Organic", or "Any Milk"
2. **Weekly Flyer Ingestion** - Every Sunday, we fetch flyers for stores near you (based on your ZIP code)
3. **AI Deal Extraction** - GPT-4o Mini analyzes flyer images and extracts deals with prices
4. **Smart Matching** - Your list items are matched to current deals using fuzzy matching
5. **Daily Digest** - Each morning at 8 AM, you get notified about deals on your list

## Tech Stack

### Frontend
- **Web App:** Next.js 15 + React 19 + TailwindCSS 4 + Radix UI
- **Mobile App:** React Native + Expo
- **State Management:** Apollo Client + GraphQL

### Backend
- **API:** Node.js + Express + Apollo Server 4
- **Database:** PostgreSQL + Sequelize ORM
- **AI/OCR:** GPT-4o Mini for deal extraction from flyer images
- **Storage:** Cloudinary for flyer image hosting
- **Data Source:** WeeklyAds2 ZIP-based API for location-specific flyers

### Package Manager
- **pnpm** 10.4.1+ (faster, more efficient than npm)

## Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js**: Version 18.x or higher (includes npm)
- **pnpm**: Install via `npm install -g pnpm`
- **PostgreSQL**: Version 12+ (local or cloud-hosted like Render)

## Setup Instructions

### 1. Backend Setup

Navigate to the backend directory and install dependencies:

```bash
cd mygrocart-backend-node
pnpm install
```

Create a `.env` file in the `mygrocart-backend-node` directory:

```
PORT=5000
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d
DATABASE_URL=postgresql://localhost:5432/mygrocart
NODE_ENV=development
OPENAI_API_KEY=your_openai_api_key_here
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
```

**Important:**
- Replace `your_jwt_secret_key_here` with a strong, random secret
- Get an OpenAI API key from https://platform.openai.com/api-keys
- Sign up for Cloudinary (free tier) at https://cloudinary.com/

### 2. Frontend Web Setup

Navigate to the frontend directory and install dependencies:

```bash
cd mygrocart-web
pnpm install
```

Create a `.env.local` file:

```
NEXT_PUBLIC_GRAPHQL_ENDPOINT=http://localhost:5000/graphql
```

### 3. Frontend Mobile Setup (Optional)

Navigate to the mobile app directory and install dependencies:

```bash
cd mygrocart-mobile
pnpm install
```

Create a `.env` file:

```
EXPO_PUBLIC_GRAPHQL_ENDPOINT=http://localhost:5000/graphql
```

## Running the Application

### Start Backend Server

In the `mygrocart-backend-node` directory:

```bash
pnpm dev
```

This starts the GraphQL API server on `http://localhost:5000`.

**GraphQL Playground:** Access at `http://localhost:5000/graphql` to test queries.

### Start Web App

In the `mygrocart-web` directory:

```bash
pnpm dev
```

This starts the Next.js development server on `http://localhost:3000`.

### Start Mobile App (Optional)

In the `mygrocart-mobile` directory:

```bash
pnpm start
```

This starts the Expo development server. Use the Expo Go app on your phone or run on iOS Simulator/Android Emulator.

## Initial Data Seeding

To populate your database with store locations:

```bash
cd mygrocart-backend-node
node scripts/seed_stores.js
```

To fetch flyers for a specific ZIP code (e.g., 07001 - NJ):

```bash
node scripts/fetch_flyers_by_zip.js 07001
```

To process flyers with OCR and extract deals:

```bash
node scripts/process_flyers_ocr.js
```

## Sample Credentials

Create an account directly from the app's landing page, or use these demo credentials if you've seeded the database:

**Email:** `demo@mygrocart.com`
**Password:** `password123`
**ZIP Code:** `07001`

## Project Structure

```
MyGroCart/
├── mygrocart-backend-node/    # GraphQL API + OCR processing
│   ├── models/                # Sequelize models (User, Store, Flyer, Deal, etc.)
│   ├── resolvers/             # GraphQL resolvers
│   ├── schema/                # GraphQL type definitions
│   ├── services/              # FlyerService, DealMatcher, NotificationService
│   ├── scripts/               # Flyer fetching, OCR processing, weekly cron jobs
│   └── utils/                 # Helpers (distance calc, item suggestions, etc.)
├── mygrocart-web/             # Next.js web app
│   ├── app/                   # Next.js App Router pages
│   ├── components/            # React components + Radix UI
│   └── lib/                   # Apollo Client config
├── mygrocart-mobile/          # Expo mobile app
│   ├── screens/               # React Native screens
│   └── components/            # Mobile components
└── archive/                   # Archived scrapers (no longer used)
```

## API Documentation

### GraphQL Queries

```graphql
# Get deals near user's ZIP code
query GetDealsNearMe {
  getDealsNearMe(zipCode: "07001", radiusMiles: 10) {
    id
    productName
    salePrice
    regularPrice
    dealType
    store { name }
  }
}

# Match deals to user's shopping list
query MatchDealsToList {
  matchDealsToMyList(userId: "user-id-here") {
    deal {
      productName
      salePrice
      store { name }
    }
    listItem {
      itemName
      itemVariant
    }
    matchScore
  }
}

# Get current flyers for ZIP code
query GetFlyers {
  getCurrentFlyers(zipCode: "07001", radiusMiles: 10) {
    id
    store { name }
    weekStartDate
    weekEndDate
    imageUrls
  }
}
```

### GraphQL Mutations

```graphql
# Add item to shopping list
mutation AddToList {
  addGroceryListItem(
    itemName: "Milk"
    itemVariant: "Organic"
    quantity: 1
  ) {
    id
    itemName
    itemVariant
  }
}

# Sign up new user
mutation SignUp {
  signup(
    email: "user@example.com"
    password: "password123"
    name: "John Doe"
    zipCode: "07001"
  ) {
    token
    user {
      id
      email
      name
    }
  }
}
```

## How We Get Flyer Data

MyGroCart uses a **legal and sustainable approach** to get weekly flyer data:

1. **WeeklyAds2 ZIP API** - Fetch location-specific flyers based on user ZIP codes
2. **Public CDN Images** - Download flyer page images from publicly accessible CDNs
3. **GPT-4o Mini OCR** - Extract deals (product names, prices, dates) from images
4. **Store in Database** - Save deals with confidence scores and metadata

**Why This Approach?**
- Weekly flyers are **public marketing materials** stores want distributed
- No web scraping of protected/authenticated content
- No violation of store Terms of Service
- Sustainable and scalable

**Previous Approach (Archived):**
We previously used real-time web scraping of store websites, but this was unsustainable due to:
- Violating store Terms of Service
- Risk of IP banning at scale
- Legal concerns
- Maintenance burden (scrapers breaking with site changes)

See `/archive/` for old scraper code and `PIVOT_PLAN_FLYER_OCR.md` for details.

## Deployment

### Backend (Render)
- Platform: Render (Docker deployment)
- Database: PostgreSQL on Render
- Cron Jobs: Weekly flyer refresh (Sundays 6 AM EST)

### Frontend Web (Render)
- Platform: Render (Next.js static export)
- Build Command: `pnpm build`
- Environment: Production

### Mobile (Expo)
- Platform: Expo Application Services (EAS)
- Build: `eas build --platform all`
- Submit: `eas submit --platform all`

See `DEPLOYMENT.md` for detailed deployment instructions.

## Cost Breakdown (Monthly)

| Service | Plan | Cost |
|---------|------|------|
| Render (Backend + DB) | Free/Starter | $7 |
| OpenAI API (GPT-4o Mini) | Pay-as-you-go | ~$10 |
| Cloudinary | Free Tier | $0 |
| **Total** | | **~$17/month** |

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Documentation

- **CLAUDE.md** - Comprehensive codebase documentation for AI assistants
- **PIVOT_PLAN_FLYER_OCR.md** - Architecture pivot from scraping to flyer OCR
- **SHOPPING_LIST_UX_DESIGN.md** - UX design for shopping lists and deal matching
- **FLYER_SOURCE_RESEARCH.md** - Research on flyer data sources
- **DEPLOYMENT.md** - Deployment guide for all platforms

## License

MIT License - see LICENSE file for details

## Support

For issues, questions, or feature requests, please open an issue on GitHub.

---

**Enjoy saving money on groceries with MyGroCart!**
