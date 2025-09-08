#!/usr/bin/env node

/**
 * Extract Store Details from Discovered Stores
 * Gets actual store names, addresses, cities, states, ZIP codes
 */

const { spawn } = require('child_process');
const fs = require('fs');

class StoreDetailExtractor {
  constructor() {
    this.discoveredStores = [];
    this.workingStores = [102, 150, 162, 200, 250, 300, 400, 450, 500, 522];
  }

  async extractStoreDetails(storeId) {
    console.log(`🔍 Extracting details for Store ${storeId}...`);

    return new Promise((resolve) => {
      const curl = spawn('curl', [
        '-s', '-L',
        '-H', 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        '--max-time', '10',
        `https://www.shoprite.com/sm/planning/rsid/${storeId}`
      ]);

      let html = '';

      curl.stdout.on('data', (data) => {
        html += data.toString();
      });

      curl.on('close', (code) => {
        if (code === 0 && html.length > 100000) {
          const storeInfo = this.parseStoreInfo(html, storeId);
          console.log(`   ✅ ${storeInfo.name} - ${storeInfo.city}, ${storeInfo.state} ${storeInfo.zipCode}`);
          resolve(storeInfo);
        } else {
          console.log(`   ❌ Failed to extract details`);
          resolve(null);
        }
      });

      curl.on('error', () => {
        resolve(null);
      });
    });
  }

  parseStoreInfo(html, storeId) {
    // Extract store information from HTML
    let storeName = `ShopRite Store ${storeId}`;
    let address = 'Unknown';
    let city = 'Unknown';
    let state = 'Unknown';
    let zipCode = 'Unknown';
    let phone = 'Unknown';

    // Try to find store name patterns
    const namePatterns = [
      /ShopRite of ([^<"'\\n]+)/i,
      /shoprite of ([^<"'\\n]+)/i,
      /"storeName":\s*"([^"]+)"/i,
      /"name":\s*"ShopRite of ([^"]+)"/i,
      /data-store-name="([^"]+)"/i
    ];

    for (const pattern of namePatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        storeName = match[1].includes('ShopRite') ? match[1] : `ShopRite of ${match[1]}`;
        storeName = storeName.replace(/&quot;/g, '"').replace(/&amp;/g, '&').trim();
        break;
      }
    }

    // Try to find address information
    const addressPatterns = [
      /"address":\s*"([^"]+)"/i,
      /"streetAddress":\s*"([^"]+)"/i,
      /"street":\s*"([^"]+)"/i,
      /data-address="([^"]+)"/i,
      /"addressLine1":\s*"([^"]+)"/i
    ];

    for (const pattern of addressPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        address = match[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').trim();
        break;
      }
    }

    // Try to find city
    const cityPatterns = [
      /"city":\s*"([^"]+)"/i,
      /"addressLocality":\s*"([^"]+)"/i,
      /data-city="([^"]+)"/i
    ];

    for (const pattern of cityPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        city = match[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').trim();
        break;
      }
    }

    // Try to find state
    const statePatterns = [
      /"state":\s*"([A-Z]{2})"/i,
      /"addressRegion":\s*"([A-Z]{2})"/i,
      /data-state="([A-Z]{2})"/i,
      /"stateCode":\s*"([A-Z]{2})"/i
    ];

    for (const pattern of statePatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        state = match[1].toUpperCase();
        break;
      }
    }

    // Try to find ZIP code
    const zipPatterns = [
      /"zipCode":\s*"(\d{5}(?:-\d{4})?)"/i,
      /"postalCode":\s*"(\d{5}(?:-\d{4})?)"/i,
      /data-zip="(\d{5}(?:-\d{4})?)"/i,
      /"zip":\s*"(\d{5}(?:-\d{4})?)"/i
    ];

    for (const pattern of zipPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        zipCode = match[1];
        break;
      }
    }

    // Try to find phone
    const phonePatterns = [
      /"phone":\s*"([^"]+)"/i,
      /"telephone":\s*"([^"]+)"/i,
      /data-phone="([^"]+)"/i
    ];

    for (const pattern of phonePatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        phone = match[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').trim();
        break;
      }
    }

    return {
      storeId: storeId.toString(),
      name: storeName,
      address: address,
      city: city,
      state: state,
      zipCode: zipCode,
      phone: phone,
      url: `https://www.shoprite.com/sm/planning/rsid/${storeId}`,
      discoveredAt: new Date().toISOString()
    };
  }

  async extractAllStores() {
    console.log('🏪 EXTRACTING STORE DETAILS');
    console.log('===========================');
    console.log(`Processing ${this.workingStores.length} discovered stores...`);
    console.log('');

    for (const storeId of this.workingStores) {
      const storeInfo = await this.extractStoreDetails(storeId);
      if (storeInfo) {
        this.discoveredStores.push(storeInfo);
      }
      
      // Delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n📊 EXTRACTION RESULTS');
    console.log('=====================');
    console.log(`Total stores processed: ${this.workingStores.length}`);
    console.log(`Details extracted: ${this.discoveredStores.length}`);
    console.log(`Success rate: ${((this.discoveredStores.length / this.workingStores.length) * 100).toFixed(1)}%`);

    if (this.discoveredStores.length > 0) {
      console.log('\n✅ STORE DETAILS:');
      this.discoveredStores.forEach((store, i) => {
        console.log(`   ${i + 1}. Store ${store.storeId}: ${store.name}`);
        console.log(`      📍 ${store.address}, ${store.city}, ${store.state} ${store.zipCode}`);
        console.log(`      📞 ${store.phone}`);
        console.log('');
      });

      // Save to file
      const outputFile = './discovered-stores-with-details.json';
      fs.writeFileSync(outputFile, JSON.stringify(this.discoveredStores, null, 2));
      console.log(`📁 Detailed results saved to: ${outputFile}`);

      // Generate ZIP mappings
      this.generateZipMappings();
    }

    return this.discoveredStores;
  }

  generateZipMappings() {
    console.log('\n🗺️ GENERATING ZIP TO STORE MAPPINGS');
    console.log('===================================');
    
    const zipMappings = {};
    const storeMappings = {};

    this.discoveredStores.forEach(store => {
      if (store.zipCode && store.zipCode !== 'Unknown') {
        zipMappings[store.zipCode] = store.storeId;
        console.log(`   ${store.zipCode} → Store ${store.storeId} (${store.city}, ${store.state})`);
      }
      
      storeMappings[store.storeId] = {
        storeId: store.storeId,
        description: store.name,
        zipCode: store.zipCode !== 'Unknown' ? store.zipCode : null,
        state: store.state !== 'Unknown' ? store.state : null,
        region: store.city !== 'Unknown' ? store.city : 'Unknown'
      };
    });

    const mappingData = {
      zipToStore: zipMappings,
      storeMappings: storeMappings,
      generatedAt: new Date().toISOString(),
      totalStores: this.discoveredStores.length
    };

    fs.writeFileSync('./generated-zip-mappings.json', JSON.stringify(mappingData, null, 2));
    console.log('\n📁 ZIP mappings saved to: generated-zip-mappings.json');
    console.log(`🎯 Generated ${Object.keys(zipMappings).length} ZIP code mappings!`);
  }
}

// Run the extraction
async function main() {
  const extractor = new StoreDetailExtractor();
  await extractor.extractAllStores();
  
  console.log('\n🎉 STORE DETAIL EXTRACTION COMPLETE!');
  console.log('Next step: Update your shoprite-mappings.js with the new data.');
}

main().catch(console.error);