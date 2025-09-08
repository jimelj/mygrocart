#!/usr/bin/env node

/**
 * Simple Store Test - Test a few store IDs to see if discovery works
 * Uses curl with proper headers to bypass Cloudflare
 */

const { spawn } = require('child_process');
const fs = require('fs');

class SimpleStoreTest {
  constructor() {
    this.foundStores = [];
    this.testedStores = [];
  }

  async testStore(storeId) {
    console.log(`🧪 Testing Store ${storeId}...`);
    
    return new Promise((resolve) => {
      // Use curl with proper browser headers
      const curl = spawn('curl', [
        '-s', 
        '-L',
        '-H', 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        '-H', 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        '-H', 'Accept-Language: en-US,en;q=0.5',
        '--max-time', '15',
        `https://www.shoprite.com/sm/planning/rsid/${storeId}`
      ]);

      let html = '';
      let error = '';

      curl.stdout.on('data', (data) => {
        html += data.toString();
      });

      curl.stderr.on('data', (data) => {
        error += data.toString();
      });

      curl.on('close', (code) => {
        this.testedStores.push(storeId);
        
        if (code === 0 && html.length > 1000) {
          // Analyze the content
          const isValid = this.analyzeStore(html, storeId);
          if (isValid) {
            const storeInfo = this.extractBasicInfo(html, storeId);
            this.foundStores.push(storeInfo);
            console.log(`   ✅ FOUND: ${storeInfo.name} (${storeInfo.location})`);
          } else {
            console.log(`   ❌ Invalid store page`);
          }
        } else {
          console.log(`   ❌ Failed to fetch (code: ${code}, length: ${html.length})`);
        }
        
        resolve();
      });
    });
  }

  analyzeStore(html, storeId) {
    // Check if it's a valid ShopRite page (much more lenient)
    const invalidIndicators = [
      'Just a moment',
      'Access denied',
      'Error 403',
      'Cloudflare'
    ];

    // Check for blocking content first
    const hasInvalid = invalidIndicators.some(indicator => 
      html.toLowerCase().includes(indicator.toLowerCase())
    );

    if (hasInvalid) return false;

    // Basic ShopRite page indicators
    const basicIndicators = [
      'shoprite',
      'ShopRite',
      'grocery',
      'store'
    ];

    // Must have ShopRite content and be substantial
    const hasShopRite = basicIndicators.some(indicator => 
      html.toLowerCase().includes(indicator.toLowerCase())
    );

    // If it has ShopRite content and is a substantial page, it's valid
    return hasShopRite && html.length > 100000; // 100KB+ suggests real content
  }

  extractBasicInfo(html, storeId) {
    // Extract basic store information
    let name = 'ShopRite Store';
    let location = 'Unknown';

    // Try to find store name
    const nameMatch = html.match(/ShopRite of ([^<"]+)/i);
    if (nameMatch) {
      name = `ShopRite of ${nameMatch[1].trim()}`;
    }

    // Try to find location info
    const locationPatterns = [
      /([A-Z][a-z]+,\s*[A-Z]{2})/g,
      /(\d{5})/g
    ];

    for (const pattern of locationPatterns) {
      const match = html.match(pattern);
      if (match) {
        location = match[0];
        break;
      }
    }

    return {
      storeId: storeId.toString(),
      name: name,
      location: location,
      url: `https://www.shoprite.com/sm/planning/rsid/${storeId}`,
      discoveredAt: new Date().toISOString()
    };
  }

  async runTest(storeIds) {
    console.log('🚀 SIMPLE STORE DISCOVERY TEST');
    console.log('==============================');
    console.log(`Testing ${storeIds.length} stores: ${storeIds.join(', ')}`);
    console.log('');

    for (const storeId of storeIds) {
      await this.testStore(storeId);
      // Small delay to be respectful
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n🎯 RESULTS SUMMARY');
    console.log('==================');
    console.log(`Total tested: ${this.testedStores.length}`);
    console.log(`Valid stores found: ${this.foundStores.length}`);
    console.log(`Success rate: ${((this.foundStores.length / this.testedStores.length) * 100).toFixed(1)}%`);

    if (this.foundStores.length > 0) {
      console.log('\n✅ DISCOVERED STORES:');
      this.foundStores.forEach((store, i) => {
        console.log(`   ${i + 1}. Store ${store.storeId}: ${store.name} - ${store.location}`);
      });

      // Save results
      const outputFile = './discovered-stores-simple.json';
      fs.writeFileSync(outputFile, JSON.stringify(this.foundStores, null, 2));
      console.log(`\n📁 Results saved to: ${outputFile}`);
    }

    return this.foundStores.length > 0;
  }
}

// Test 10 more store IDs
async function main() {
  const tester = new SimpleStoreTest();
  
  // Test 10 more stores - mix of ranges to find hits
  const testStoreIds = [102, 150, 162, 200, 250, 300, 400, 450, 500, 522];
  
  const success = await tester.runTest(testStoreIds);
  
  if (success) {
    console.log('\n🎉 SUCCESS! Store discovery is working!');
    console.log('Ready to scale up to larger ranges.');
  } else {
    console.log('\n⚠️ No stores found. May need to adjust detection logic.');
  }
}

main().catch(console.error);