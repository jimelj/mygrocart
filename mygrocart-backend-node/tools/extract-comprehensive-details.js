#!/usr/bin/env node

/**
 * Extract Comprehensive Store Details
 * Phase 1: Extract names, addresses, cities, states, ZIP codes from discovered stores
 */

const { spawn } = require('child_process');
const fs = require('fs');

class StoreDetailExtractor {
  constructor() {
    this.extractedStores = [];
    this.confirmedStores = [
      // From our confirmed discoveries
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14,
      100, 101, 102, 103, 104, 105, 106, 107,
      500, 501, 502, 503, 504, 505, 506, 507, 508, 509,
      // Add your original working stores
      150, 162, 200, 250, 300, 400, 450, 522
    ];
    this.outputFile = './comprehensive-store-details.json';
  }

  async extractStoreDetails(storeId) {
    console.log(`🔍 Extracting Store ${storeId}...`);

    return new Promise((resolve) => {
      const curl = spawn('curl', [
        '-s', '-L',
        '-H', 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        '--max-time', '12',
        `https://www.shoprite.com/sm/planning/rsid/${storeId}`
      ]);

      let html = '';

      curl.stdout.on('data', (data) => {
        html += data.toString();
      });

      curl.on('close', (code) => {
        if (code === 0 && html.length > 100000) {
          const storeInfo = this.parseStoreDetails(html, storeId);
          console.log(`   ✅ ${storeInfo.displayName} | ${storeInfo.location}`);
          resolve(storeInfo);
        } else {
          console.log(`   ❌ Failed to extract`);
          resolve(null);
        }
      });

      curl.on('error', () => {
        console.log(`   ❌ Network error`);
        resolve(null);
      });
    });
  }

  parseStoreDetails(html, storeId) {
    // Initialize default values
    let storeName = `ShopRite Store ${storeId}`;
    let address = 'Address not found';
    let city = 'City not found';
    let state = 'State not found';
    let zipCode = 'ZIP not found';
    let phone = 'Phone not found';
    let hours = 'Hours not found';

    // Strategy 1: Look for JSON-LD structured data
    const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gis);
    if (jsonLdMatch) {
      for (const jsonScript of jsonLdMatch) {
        try {
          const jsonContent = jsonScript.replace(/<script[^>]*>|<\/script>/gi, '');
          const data = JSON.parse(jsonContent);
          
          if (data.name && data.name.includes('ShopRite')) {
            storeName = data.name;
            if (data.address) {
              address = data.address.streetAddress || address;
              city = data.address.addressLocality || city;
              state = data.address.addressRegion || state;
              zipCode = data.address.postalCode || zipCode;
            }
            if (data.telephone) phone = data.telephone;
            break;
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }

    // Strategy 2: Look for specific data attributes and patterns
    const patterns = {
      storeName: [
        /"storeName":\s*"([^"]+)"/i,
        /"name":\s*"(ShopRite[^"]+)"/i,
        /ShopRite of ([^<"'\n,]+)/i,
        /<title>([^<]*ShopRite[^<]*)</i,
        /data-store-name="([^"]+)"/i
      ],
      address: [
        /"streetAddress":\s*"([^"]+)"/i,
        /"address":\s*"([^"]+)"/i,
        /"addressLine1":\s*"([^"]+)"/i,
        /data-address="([^"]+)"/i
      ],
      city: [
        /"addressLocality":\s*"([^"]+)"/i,
        /"city":\s*"([^"]+)"/i,
        /data-city="([^"]+)"/i
      ],
      state: [
        /"addressRegion":\s*"([A-Z]{2})"/i,
        /"state":\s*"([A-Z]{2})"/i,
        /data-state="([A-Z]{2})"/i
      ],
      zipCode: [
        /"postalCode":\s*"(\d{5}(?:-\d{4})?)"/i,
        /"zipCode":\s*"(\d{5}(?:-\d{4})?)"/i,
        /data-zip="(\d{5}(?:-\d{4})?)"/i
      ],
      phone: [
        /"telephone":\s*"([^"]+)"/i,
        /"phone":\s*"([^"]+)"/i,
        /data-phone="([^"]+)"/i,
        /\((\d{3})\)\s*(\d{3})-(\d{4})/
      ]
    };

    // Apply patterns to extract data
    Object.keys(patterns).forEach(field => {
      for (const pattern of patterns[field]) {
        const match = html.match(pattern);
        if (match && match[1]) {
          let value = match[1].trim();
          
          // Clean up the value
          value = value.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
          
          // Special handling for phone
          if (field === 'phone' && match[3]) {
            value = `(${match[1]}) ${match[2]}-${match[3]}`;
          }
          
          // Special handling for store name
          if (field === 'storeName') {
            if (!value.includes('ShopRite')) {
              value = `ShopRite of ${value}`;
            }
            storeName = value;
          } else {
            eval(`${field} = value`);
          }
          break;
        }
      }
    });

    // Strategy 3: Fallback patterns for missing data
    if (city === 'City not found' || state === 'State not found') {
      // Look for city, state patterns in text
      const cityStateMatch = html.match(/([A-Za-z\s]+),\s*([A-Z]{2})\s+(\d{5})/);
      if (cityStateMatch) {
        if (city === 'City not found') city = cityStateMatch[1].trim();
        if (state === 'State not found') state = cityStateMatch[2];
        if (zipCode === 'ZIP not found') zipCode = cityStateMatch[3];
      }
    }

    // Clean up store name
    if (storeName.includes('ShopRite') && storeName.length > 50) {
      storeName = storeName.substring(0, 50) + '...';
    }

    return {
      storeId: storeId.toString(),
      storeName: storeName,
      displayName: storeName.replace('ShopRite of ', ''),
      address: address,
      city: city,
      state: state,
      zipCode: zipCode,
      phone: phone,
      hours: hours,
      location: `${city}, ${state} ${zipCode}`,
      url: `https://www.shoprite.com/sm/planning/rsid/${storeId}`,
      extractedAt: new Date().toISOString(),
      dataQuality: this.assessDataQuality(storeName, address, city, state, zipCode)
    };
  }

  assessDataQuality(storeName, address, city, state, zipCode) {
    let score = 0;
    if (storeName && !storeName.includes('not found')) score++;
    if (address && !address.includes('not found')) score++;
    if (city && !city.includes('not found')) score++;
    if (state && state.length === 2 && !state.includes('not found')) score++;
    if (zipCode && /^\d{5}(-\d{4})?$/.test(zipCode)) score++;

    if (score >= 4) return 'high';
    if (score >= 3) return 'medium';
    return 'low';
  }

  async extractAllStores() {
    console.log('🏪 COMPREHENSIVE STORE DETAIL EXTRACTION');
    console.log('========================================');
    console.log(`Processing ${this.confirmedStores.length} confirmed stores...`);
    console.log('');

    for (const storeId of this.confirmedStores) {
      const storeInfo = await this.extractStoreDetails(storeId);
      if (storeInfo) {
        this.extractedStores.push(storeInfo);
      }
      
      // Brief delay to be respectful
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    this.showResults();
    this.saveResults();
    this.generateMappings();
  }

  showResults() {
    console.log('\n📊 EXTRACTION RESULTS');
    console.log('=====================');
    console.log(`Total stores processed: ${this.confirmedStores.length}`);
    console.log(`Details extracted: ${this.extractedStores.length}`);
    console.log(`Success rate: ${((this.extractedStores.length / this.confirmedStores.length) * 100).toFixed(1)}%`);

    // Quality breakdown
    const quality = this.extractedStores.reduce((acc, store) => {
      acc[store.dataQuality] = (acc[store.dataQuality] || 0) + 1;
      return acc;
    }, {});

    console.log('\n📈 DATA QUALITY:');
    console.log(`High quality: ${quality.high || 0} stores`);
    console.log(`Medium quality: ${quality.medium || 0} stores`);
    console.log(`Low quality: ${quality.low || 0} stores`);

    console.log('\n✅ SAMPLE EXTRACTED STORES:');
    this.extractedStores.slice(0, 10).forEach((store, i) => {
      console.log(`   ${i + 1}. Store ${store.storeId}: ${store.displayName}`);
      console.log(`      📍 ${store.address}, ${store.location}`);
      console.log(`      📞 ${store.phone} | Quality: ${store.dataQuality}`);
      console.log('');
    });
  }

  saveResults() {
    fs.writeFileSync(this.outputFile, JSON.stringify(this.extractedStores, null, 2));
    console.log(`📁 Comprehensive results saved to: ${this.outputFile}`);
  }

  generateMappings() {
    console.log('\n🗺️ GENERATING ZIP CODE MAPPINGS');
    console.log('================================');
    
    const zipMappings = {};
    const storeMappings = {};
    const stateDistribution = {};

    this.extractedStores.forEach(store => {
      // ZIP to Store mapping
      if (store.zipCode && store.zipCode !== 'ZIP not found' && /^\d{5}(-\d{4})?$/.test(store.zipCode)) {
        const baseZip = store.zipCode.split('-')[0]; // Use base ZIP without +4
        zipMappings[baseZip] = store.storeId;
        console.log(`   ${baseZip} → Store ${store.storeId} (${store.displayName})`);
      }
      
      // Store mapping
      storeMappings[store.storeId] = {
        storeId: store.storeId,
        description: store.displayName,
        fullName: store.storeName,
        address: store.address,
        city: store.city,
        state: store.state,
        zipCode: store.zipCode !== 'ZIP not found' ? store.zipCode : null,
        phone: store.phone !== 'Phone not found' ? store.phone : null,
        region: `${store.city}, ${store.state}`,
        dataQuality: store.dataQuality
      };

      // State distribution
      if (store.state && store.state !== 'State not found') {
        stateDistribution[store.state] = (stateDistribution[store.state] || 0) + 1;
      }
    });

    const mappingData = {
      zipToStore: zipMappings,
      storeMappings: storeMappings,
      stateDistribution: stateDistribution,
      summary: {
        totalStores: this.extractedStores.length,
        zipMappings: Object.keys(zipMappings).length,
        states: Object.keys(stateDistribution).length,
        generatedAt: new Date().toISOString()
      }
    };

    fs.writeFileSync('./extracted-zip-mappings.json', JSON.stringify(mappingData, null, 2));
    
    console.log(`\n📊 MAPPING SUMMARY:`);
    console.log(`ZIP codes mapped: ${Object.keys(zipMappings).length}`);
    console.log(`States covered: ${Object.keys(stateDistribution).length}`);
    console.log(`Store distribution:`, stateDistribution);
    console.log('\n📁 ZIP mappings saved to: extracted-zip-mappings.json');
  }
}

// Start extraction
async function main() {
  const extractor = new StoreDetailExtractor();
  await extractor.extractAllStores();
  
  console.log('\n🎉 STORE DETAIL EXTRACTION COMPLETE!');
  console.log('====================================');
  console.log('✅ Phase 1 complete: Store details extracted');
  console.log('🎯 Next: Update shoprite-mappings.js with new data');
  console.log('🚀 Then: Test your scraper with location-based pricing!');
}

main().catch(console.error);