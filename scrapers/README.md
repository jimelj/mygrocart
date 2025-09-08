# MyGroCart Store Scrapers

This directory contains the production-ready store discovery scrapers for MyGroCart.

## 🏪 Available Scrapers

### ShopRite Stores
- **Script**: `shoprite-store-discovery.js`  
- **Database**: `../databases/shoprite-stores-final.json`
- **Import**: `import-shoprite-to-mongodb.js`
- **Stores Found**: 304 stores
- **Method**: scrape.do API (bypasses Cloudflare)
- **Cost**: Paid API required

### ACME Markets Stores  
- **Script**: `acme-store-discovery.js`
- **Database**: `../databases/acme-stores-final.json`
- **Import**: `import-acme-to-mongodb.js`
- **Stores Found**: 159 stores
- **Method**: Direct HTTP requests (no blocking)
- **Cost**: Free

## 🚀 Usage

### Running Store Discovery

```bash
# Discover ShopRite stores (requires SCRAPE_DO_TOKEN)
cd scrapers
node shoprite-store-discovery.js

# Discover ACME stores (no API key needed)
node acme-store-discovery.js
```

### Importing to MongoDB

```bash
# Import ShopRite stores
node import-shoprite-to-mongodb.js

# Import ACME stores  
node import-acme-to-mongodb.js
```

## 📊 Store Coverage

| Chain | Stores | States | Method | Status |
|-------|--------|--------|---------|---------|
| ShopRite | 304 | NJ, NY, CT, PA, MD, DE | scrape.do | ✅ Production |
| ACME Markets | 159 | PA, NJ, NY, CT, MD, DE | Direct | ✅ Production |
| **Total** | **463** | **6 states** | Mixed | ✅ Ready |

## 🔧 Environment Variables

```bash
# Required for ShopRite scraping
SCRAPE_DO_TOKEN=your_scrape_do_api_token

# Required for MongoDB import
MONGODB_URI=mongodb://localhost:27017/mygrocart
```

## 📁 Output Structure

Store data includes:
- Store ID and name
- Full address with coordinates
- Phone number and hours
- State and city information
- Store-specific URLs

## 🎯 Next Steps

1. **Product Scraping**: Build product price scrapers for each chain
2. **Price Monitoring**: Set up automated price tracking
3. **API Integration**: Connect stores to MyGroCart backend
4. **Expansion**: Add more grocery chains (Walmart, Target, etc.)