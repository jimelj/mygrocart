#!/usr/bin/env node

/**
 * ShopRite Store Discovery Scraper
 * 
 * This tool programmatically discovers ShopRite stores by testing
 * rsid values from 1 to 1000+ without using external APIs like Scrape.do.
 * 
 * It directly hits ShopRite's store pages to find valid store IDs.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

class ShopRiteStoreDiscovery {
  constructor() {
    this.foundStores = [];
    this.failedStores = [];
    this.totalTested = 0;
    this.resultsFile = path.join(__dirname, 'discovered-stores.json');
    this.delay = 500; // 500ms delay between requests to be respectful
  }

  /**
   * Test a single store ID
   */
  async testStoreId(storeId) {
    const url = `https://www.shoprite.com/sm/planning/rsid/${storeId}`;
    
    return new Promise((resolve) => {
      const options = {
        hostname: 'www.shoprite.com',
        path: `/sm/planning/rsid/${storeId}`,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          this.totalTested++;
          
          // Check if the response indicates a valid store
          const isValidStore = this.analyzeStoreResponse(data, res.statusCode);
          
          if (isValidStore) {
            const storeInfo = this.extractStoreInfo(data, storeId);
            this.foundStores.push(storeInfo);
            console.log(`✅ Store ${storeId}: ${storeInfo.name} (${storeInfo.city}, ${storeInfo.state})`);
          } else {
            this.failedStores.push(storeId);
            // Debug info for troubleshooting
            const htmlLength = data.length;
            const hasShopRite = data.toLowerCase().includes('shoprite');
            console.log(`❌ Store ${storeId}: Not found (HTML: ${htmlLength} chars, hasShopRite: ${hasShopRite})`);
          }
          
          resolve(isValidStore);
        });
      });
      
      req.on('error', (err) => {
        console.log(`❌ Store ${storeId}: Error - ${err.message}`);
        this.failedStores.push(storeId);
        this.totalTested++;
        resolve(false);
      });
      
      // Set timeout
      req.setTimeout(10000, () => {
        req.destroy();
        console.log(`⏰ Store ${storeId}: Timeout`);
        this.failedStores.push(storeId);
        this.totalTested++;
        resolve(false);
      });
    });
  }

  /**
   * Analyze the response to determine if it's a valid store
   */
  analyzeStoreResponse(html, statusCode) {
    // Check status code first
    if (statusCode !== 200) {
      return false;
    }
    
    // Very short responses are likely errors
    if (html.length < 500) {
      return false;
    }
    
    // Check for error indicators first
    const errorIndicators = [
      '404',
      'Page Not Found', 
      'Store not found',
      'Error 404',
      'not found',
      'invalid store'
    ];
    
    const hasError = errorIndicators.some(error => 
      html.toLowerCase().includes(error.toLowerCase())
    );
    
    if (hasError) {
      return false;
    }
    
    // Look for indicators of a valid ShopRite store page
    const validIndicators = [
      // Store-specific content
      'ShopRite of',
      'shoprite of',
      'SHOPRITE OF',
      
      // Store page elements
      'store-info',
      'store-address', 
      'store-hours',
      'store-phone',
      'store-name',
      'Store Info',
      'store hours',
      'store location',
      
      // Address patterns
      'Bruckner Blvd', // Your example
      'NY ',
      'NJ ',
      'PA ',
      'CT ',
      
      // ShopRite specific
      'digital coupons',
      'shop aisles',
      'weekly ad',
      'pharmacy',
      'grocery',
      'fresh',
      
      // General store indicators
      'hours:',
      'phone:',
      'address:',
      'open ',
      'close ',
      'AM',
      'PM'
    ];
    
    // Count how many indicators we find
    const foundIndicators = validIndicators.filter(indicator => 
      html.toLowerCase().includes(indicator.toLowerCase())
    ).length;
    
    // If we find multiple indicators, it's likely a valid store
    return foundIndicators >= 3;
  }

  /**
   * Extract store information from the HTML
   */
  extractStoreInfo(html, storeId) {
    const storeInfo = {
      storeId: storeId,
      name: 'Unknown',
      address: 'Unknown',
      city: 'Unknown',
      state: 'Unknown',
      zipCode: 'Unknown',
      phone: 'Unknown',
      hours: 'Unknown'
    };

    try {
      // Extract store name (looking for "ShopRite of [Location]")
      const nameMatch = html.match(/ShopRite of ([^"<]+)/i);
      if (nameMatch) {
        storeInfo.name = `ShopRite of ${nameMatch[1].trim()}`;
      }

      // Extract address information
      const addressMatch = html.match(/(\d+[^,]+),\s*([^,]+),\s*([A-Z]{2})\s*(\d{5})/);
      if (addressMatch) {
        storeInfo.address = addressMatch[1].trim();
        storeInfo.city = addressMatch[2].trim();
        storeInfo.state = addressMatch[3].trim();
        storeInfo.zipCode = addressMatch[4].trim();
      }

      // Extract phone number
      const phoneMatch = html.match(/\((\d{3})\)\s*(\d{3})-(\d{4})/);
      if (phoneMatch) {
        storeInfo.phone = `(${phoneMatch[1]}) ${phoneMatch[2]}-${phoneMatch[3]}`;
      }

      // Extract basic hours info if available
      if (html.includes('AM') && html.includes('PM')) {
        storeInfo.hours = 'Available'; // Indicates hours are listed
      }

    } catch (error) {
      console.log(`⚠️ Error extracting info for store ${storeId}:`, error.message);
    }

    return storeInfo;
  }

  /**
   * Sleep function for rate limiting
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Save results to file
   */
  saveResults() {
    const results = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTested: this.totalTested,
        foundStores: this.foundStores.length,
        failedStores: this.failedStores.length,
        successRate: `${((this.foundStores.length / this.totalTested) * 100).toFixed(2)}%`
      },
      foundStores: this.foundStores,
      failedStoreIds: this.failedStores
    };

    fs.writeFileSync(this.resultsFile, JSON.stringify(results, null, 2));
    console.log(`\n📁 Results saved to: ${this.resultsFile}`);
  }

  /**
   * Load previous results if they exist
   */
  loadPreviousResults() {
    if (fs.existsSync(this.resultsFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.resultsFile, 'utf8'));
        console.log(`📂 Loaded previous results: ${data.foundStores?.length || 0} stores found`);
        return data;
      } catch (error) {
        console.log('⚠️ Could not load previous results');
      }
    }
    return null;
  }

  /**
   * Discover stores in a range
   */
  async discoverStores(startId = 1, endId = 1000, skipKnown = true) {
    console.log(`🔍 SHOPRITE STORE DISCOVERY`);
    console.log(`==========================`);
    console.log(`Testing store IDs: ${startId} to ${endId}`);
    console.log(`Delay between requests: ${this.delay}ms`);
    console.log('');

    // Load previous results to skip known stores
    const previousResults = skipKnown ? this.loadPreviousResults() : null;
    const knownStoreIds = previousResults ? 
      [...previousResults.foundStores.map(s => s.storeId), ...previousResults.failedStoreIds] : [];

    let processed = 0;
    const total = endId - startId + 1;

    for (let storeId = startId; storeId <= endId; storeId++) {
      // Skip if we already tested this store
      if (skipKnown && knownStoreIds.includes(storeId)) {
        console.log(`⏭️ Store ${storeId}: Already tested, skipping`);
        processed++;
        continue;
      }

      // Progress indicator
      processed++;
      const percentage = ((processed / total) * 100).toFixed(1);
      console.log(`\n[${percentage}%] Testing store ID: ${storeId}`);

      // Test the store
      await this.testStoreId(storeId);

      // Save results periodically (every 50 stores)
      if (processed % 50 === 0) {
        this.saveResults();
        console.log(`\n💾 Progress saved! Found ${this.foundStores.length} stores so far...`);
      }

      // Rate limiting delay
      await this.sleep(this.delay);
    }

    // Final save
    this.saveResults();
    this.printSummary();
  }

  /**
   * Print discovery summary
   */
  printSummary() {
    console.log(`\n🎯 DISCOVERY SUMMARY`);
    console.log(`===================`);
    console.log(`Total tested: ${this.totalTested}`);
    console.log(`Valid stores found: ${this.foundStores.length}`);
    console.log(`Failed/invalid: ${this.failedStores.length}`);
    console.log(`Success rate: ${((this.foundStores.length / this.totalTested) * 100).toFixed(2)}%`);
    
    if (this.foundStores.length > 0) {
      console.log(`\n🏪 DISCOVERED STORES:`);
      console.log(`====================`);
      this.foundStores.forEach(store => {
        console.log(`${store.storeId}: ${store.name} - ${store.city}, ${store.state}`);
      });
    }

    console.log(`\n📁 Full results saved to: ${this.resultsFile}`);
  }

  /**
   * Quick test method for a specific range
   */
  async quickTest(startId = 100, count = 10) {
    console.log(`🧪 QUICK TEST: Testing ${count} stores starting from ${startId}`);
    console.log('');
    
    for (let i = 0; i < count; i++) {
      const storeId = startId + i;
      console.log(`Testing store ${storeId}...`);
      await this.testStoreId(storeId);
      await this.sleep(this.delay);
    }
    
    this.printSummary();
  }
}

// CLI Interface
function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const discovery = new ShopRiteStoreDiscovery();
  
  switch (command) {
    case 'quick':
      const startId = parseInt(args[1]) || 100;
      const count = parseInt(args[2]) || 10;
      discovery.quickTest(startId, count);
      break;
      
    case 'range':
      const rangeStart = parseInt(args[1]) || 1;
      const rangeEnd = parseInt(args[2]) || 1000;
      discovery.discoverStores(rangeStart, rangeEnd);
      break;
      
    case 'continue':
      // Continue from where we left off
      discovery.discoverStores(1, 1000, true);
      break;
      
    case 'results':
      // Show previous results
      const results = discovery.loadPreviousResults();
      if (results) {
        console.log('📊 PREVIOUS DISCOVERY RESULTS:');
        console.log('==============================');
        console.log(`Found ${results.foundStores.length} valid stores:`);
        results.foundStores.forEach(store => {
          console.log(`  ${store.storeId}: ${store.name} - ${store.city}, ${store.state}`);
        });
      } else {
        console.log('No previous results found.');
      }
      break;
      
    default:
      console.log('🔍 SHOPRITE STORE DISCOVERY TOOL');
      console.log('================================');
      console.log('');
      console.log('Commands:');
      console.log('  node discover-all-stores.js quick [start] [count]     # Quick test (default: 100, 10)');
      console.log('  node discover-all-stores.js range [start] [end]       # Test range (default: 1, 1000)');
      console.log('  node discover-all-stores.js continue                  # Continue previous discovery');
      console.log('  node discover-all-stores.js results                   # Show previous results');
      console.log('');
      console.log('Examples:');
      console.log('  node discover-all-stores.js quick 100 20              # Test stores 100-119');
      console.log('  node discover-all-stores.js range 1 500               # Test stores 1-500');
      console.log('  node discover-all-stores.js continue                  # Resume discovery');
      break;
  }
}

if (require.main === module) {
  main();
}

module.exports = ShopRiteStoreDiscovery;