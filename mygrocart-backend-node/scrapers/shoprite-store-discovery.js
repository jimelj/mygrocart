#!/usr/bin/env node

const { spawn } = require('child_process');
const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

class ComprehensiveStoreDiscovery {
  constructor() {
    this.validStores = [];
    this.invalidStores = [];
    this.current = 0;
    this.startTime = Date.now();
    this.outputFile = 'comprehensive-store-database-1-1000.json';
  }

  async testAndExtractStore(storeId) {
    return new Promise((resolve) => {
      // Add a longer delay to avoid overwhelming the server
      setTimeout(() => {
        const curl = spawn('curl', [
          '-s', '-L',
          '-H', 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          '-H', 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          '-H', 'Accept-Language: en-US,en;q=0.9',
          '-H', 'Accept-Encoding: gzip, deflate, br',
          '-H', 'Cache-Control: no-cache',
          '-H', 'Pragma: no-cache',
          '-H', 'Sec-Ch-Ua: "Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
          '-H', 'Sec-Ch-Ua-Mobile: ?0',
          '-H', 'Sec-Ch-Ua-Platform: "macOS"',
          '-H', 'Sec-Fetch-Dest: document',
          '-H', 'Sec-Fetch-Mode: navigate',
          '-H', 'Sec-Fetch-Site: none',
          '-H', 'Sec-Fetch-User: ?1',
          '-H', 'Upgrade-Insecure-Requests: 1',
          '--max-time', '20',
          '--retry', '3',
          '--retry-delay', '2',
          '--compressed',
          `https://www.shoprite.com/sm/planning/rsid/${storeId}`
        ]);

        let html = '';

        curl.stdout.on('data', (data) => {
          html += data.toString();
        });

        curl.on('close', (code) => {
          if (code === 0 && html.length > 30000) {
            const validationResult = this.validateAndExtractStore(html, storeId);
            
            if (validationResult.isValid) {
              this.validStores.push(validationResult.store);
              console.log(`✅ Store ${storeId.toString().padStart(3, ' ')}: ${validationResult.store.name}`);
              console.log(`   📍 Address: ${validationResult.store.fullAddress}`);
              console.log(`   📞 Phone: ${validationResult.store.phone || 'Phone TBD'}`);
              console.log(`   🕒 Hours: ${validationResult.store.hours || 'Hours TBD'}`);
            } else {
              this.invalidStores.push({
                storeId: storeId.toString(),
                reason: validationResult.reason,
                url: `https://www.shoprite.com/sm/planning/rsid/${storeId}`
              });
              console.log(`❌ Store ${storeId.toString().padStart(3, ' ')}: ${validationResult.reason}`);
            }
          } else {
            this.invalidStores.push({
              storeId: storeId.toString(),
              reason: code !== 0 ? 'Network error' : 'Content too small',
              url: `https://www.shoprite.com/sm/planning/rsid/${storeId}`
            });
            console.log(`❌ Store ${storeId.toString().padStart(3, ' ')}: Failed to fetch`);
          }

          resolve();
        });

        curl.on('error', () => {
          this.invalidStores.push({
            storeId: storeId.toString(),
            reason: 'Curl error',
            url: `https://www.shoprite.com/sm/planning/rsid/${storeId}`
          });
          console.log(`❌ Store ${storeId.toString().padStart(3, ' ')}: Network error`);
          resolve();
        });
      }, 500); // 500ms delay to be more respectful
    });
  }

  validateAndExtractStore(html, storeId) {
    // First check basic requirements
    const hasShopRite = html.toLowerCase().includes('shoprite');
    const hasCloudflare = html.toLowerCase().includes('just a moment');
    
    if (!hasShopRite) {
      return { isValid: false, reason: 'No ShopRite content' };
    }
    
    if (hasCloudflare) {
      return { isValid: false, reason: 'Cloudflare challenge' };
    }

    // Check for clear generic page indicators (these are definitive signs it's NOT a store page)
    const hasSelectStore = html.includes('Select Store Location') || html.includes('to begin shopping');
    const hasWelcomeChoose = html.includes('Welcome') && html.includes('Choose what you\'d like to do');
    const hasBrowseToShop = html.includes('Browse to Shop in Store');
    const isEmptyTitle = html.includes('<title></title>');
    
    // Additional check: if it has "Select Store Location" it's definitely not a specific store
    if (hasSelectStore) {
      return { isValid: false, reason: 'Select Store Location (no store selected)' };
    }
    
    // First check if there's actual store data - if yes, it's likely a valid store even with some generic elements
    const hasActualStoreData = html.match(/ShopRite of [A-Za-z\s&'-]{2,40}/) && html.match(/"addressLine1":"([^"]{10,})"/);
    
    // Only check for welcome popup if there's NO actual store data
    if (!hasActualStoreData) {
      const hasWelcomePopup = html.includes('Welcome') && html.includes('Choose how you\'d like to shop');
      const hasShoppingModePopup = html.includes('In Store') && html.includes('Pickup') && html.includes('Delivery') && html.includes('Order Express');
      
      // If it has the welcome popup AND no store data, it's definitely not a valid store page
      if (hasWelcomePopup || hasShoppingModePopup) {
        return { isValid: false, reason: 'Welcome popup (invalid store ID)' };
      }
    }
    
    // If it has multiple generic indicators, it's definitely not a store page
    const genericIndicators = [hasSelectStore, hasWelcomeChoose, hasBrowseToShop, isEmptyTitle].filter(Boolean).length;
    
    if (genericIndicators >= 2) {
      return { isValid: false, reason: 'Generic homepage (multiple indicators)' };
    }

    // Extract store information
    const storeInfo = this.extractComprehensiveStoreInfo(html, storeId);
    
    // Validate that we have actual store-specific content
    if (!storeInfo.name || storeInfo.name.includes('Store ' + storeId)) {
      return { isValid: false, reason: 'No specific store name found' };
    }

    // Check for store-specific content indicators
    const hasRealAddress = storeInfo.streetAddress && storeInfo.streetAddress.length > 10;
    const hasRealPhone = storeInfo.phone && storeInfo.phone.match(/\(\d{3}\)\s?\d{3}-\d{4}/);
    const hasOperatingHours = storeInfo.hours && storeInfo.hours.length > 10;
    const hasValidZip = storeInfo.zip && this.isValidZipCode(storeInfo.zip);
    
    // Must have at least name + 2 other real indicators
    const validIndicators = [hasRealAddress, hasRealPhone, hasOperatingHours, hasValidZip].filter(Boolean).length;
    
    if (validIndicators < 2) {
      return { isValid: false, reason: 'Insufficient store details' };
    }

    return { isValid: true, store: storeInfo };
  }

  extractComprehensiveStoreInfo(html, storeId) {
    let storeName = `ShopRite Store ${storeId}`;
    let city = '';
    let state = '';
    let zip = '';
    let streetAddress = '';
    let phone = '';
    let hours = '';
    let latitude = '';
    let longitude = '';

    // DIRECT INDIVIDUAL FIELD EXTRACTION (Skip JSON parsing - use proven patterns)
    // These exact patterns worked perfectly in json-data-extraction.js
    
    const nameAddressMatch = html.match(/"name":"ShopRite of ([^"]+)","addressLine1":"([^"]*)/);
    if (nameAddressMatch) {
      storeName = `ShopRite of ${nameAddressMatch[1]}`;
      streetAddress = nameAddressMatch[2];
      city = nameAddressMatch[1];
      console.log(`   ✅ Found name+address: ${storeName} at ${streetAddress}`);
    }
    
    // Individual field extraction (proven to work)
    const addressLine1Match = html.match(/"addressLine1":"([^"]+)"/);
    const cityFieldMatch = html.match(/"city":"([^"]+)"/);
    const stateFieldMatch = html.match(/"countyProvinceState":"([^"]+)"/);
    const zipFieldMatch = html.match(/"postCode":"([^"]+)"/);
    const phoneFieldMatch = html.match(/"phone":"(\([^)]+\)[^"]+)"/);
    // Fixed patterns based on actual HTML structure analysis
    // Find the store-specific data block with coordinates and hours together
    const storeDataBlockMatch = html.match(/"openingHours":"([^"]*(?:\\.[^"]*)*)","location":\s*{\s*"longitude":\s*([^,}]+),\s*"latitude":\s*([^,}]+)\s*}/);
    
    let hoursFieldMatch, coordinatesMatch, latFieldMatch, lonFieldMatch;
    
    if (storeDataBlockMatch) {
      // Found the complete store data block with hours and coordinates
      hoursFieldMatch = [null, storeDataBlockMatch[1]];
      coordinatesMatch = [null, storeDataBlockMatch[2], storeDataBlockMatch[3]]; // [full, lng, lat]
      latFieldMatch = [null, storeDataBlockMatch[3]];
      lonFieldMatch = [null, storeDataBlockMatch[2]];
    } else {
      // Fallback to individual pattern matching
      hoursFieldMatch = html.match(/"openingHours":"([^"]*(?:\\.[^"]*)*)"/);
      coordinatesMatch = html.match(/"location":\s*{\s*"longitude":\s*([^,}]+),\s*"latitude":\s*([^,}]+)\s*}/);
      latFieldMatch = coordinatesMatch ? [null, coordinatesMatch[2]] : html.match(/"latitude":\s*([^,}]+)/);
      lonFieldMatch = coordinatesMatch ? [null, coordinatesMatch[1]] : html.match(/"longitude":\s*([^,}]+)/);
    }
    
    if (addressLine1Match && !streetAddress) {
      streetAddress = addressLine1Match[1];
      console.log(`   📍 Found addressLine1: ${streetAddress}`);
    }
    if (cityFieldMatch) {
      city = cityFieldMatch[1];
      // Fix the store name to use the actual city instead of the generic "Lodi"
      if (storeName.includes('Lodi') && city !== 'Lodi') {
        storeName = `ShopRite of ${city}`;
        console.log(`   🔧 Corrected store name to: ${storeName}`);
      }
      console.log(`   🏙️ Found city: ${city}`);
    }
    if (stateFieldMatch) {
      state = stateFieldMatch[1];
      console.log(`   🏛️ Found state: ${state}`);
    }
    if (zipFieldMatch) {
      zip = zipFieldMatch[1];
      console.log(`   📮 Found ZIP: ${zip}`);
    }
    if (phoneFieldMatch) {
      phone = phoneFieldMatch[1];
      console.log(`   📞 Found phone: ${phone}`);
    }
    if (hoursFieldMatch) {
      hours = hoursFieldMatch[1]
        .replace(/\\n/g, ', ')  // Replace escaped newlines
        .replace(/\n/g, ', ')   // Replace actual newlines
        .replace(/\\/g, '')     // Remove remaining backslashes
        .trim();                // Remove extra whitespace
      
      if (hours) {
        console.log(`   🕒 Found hours: ${hours}`);
      } else {
        console.log(`   🕒 Found hours (empty after processing): "${hoursFieldMatch[1]}"`);
      }
    }
    if (latFieldMatch && lonFieldMatch) {
      latitude = parseFloat(latFieldMatch[1]);
      longitude = parseFloat(lonFieldMatch[1]);
      console.log(`   🗺️ Found coordinates: ${latitude}, ${longitude}`);
    } else if (coordinatesMatch) {
      longitude = parseFloat(coordinatesMatch[1]);
      latitude = parseFloat(coordinatesMatch[2]);
      console.log(`   🗺️ Found coordinates from location object: ${latitude}, ${longitude}`);
    }
    
    console.log(`   ✅ Direct extraction completed for ${storeName || `Store ${storeId}`}`);

    // Fallback: If activeStoreDetails not found, try the pattern we found earlier
    if (!streetAddress || streetAddress.includes('Store')) {
      const nameAddressMatch = html.match(/"name":"ShopRite of ([^"]+)","addressLine1":"([^"]*)/);
      if (nameAddressMatch) {
        storeName = `ShopRite of ${nameAddressMatch[1]}`;
        streetAddress = nameAddressMatch[2];
        city = nameAddressMatch[1];
      }
    }

    // OLD EXTRACTION CODE REMOVED - Our fallback extraction above already found the correct data!
    // Don't override the good data with bad patterns

    // OLD STATE/ZIP/HOURS EXTRACTION REMOVED - Our fallback extraction above already found all the correct data!
    // The fallback extraction correctly found: state=NJ, zip=07109, phone=(973) 302-8600, address=726 Washington Ave

    // Build full address
    const addressParts = [streetAddress, city, state, zip].filter(Boolean);
    const fullAddress = addressParts.join(', ');

    return {
      storeId: storeId.toString(),
      name: storeName,
      city: city || 'Unknown',
      state: state || 'Unknown',
      zip: zip || 'Unknown',
      streetAddress: streetAddress || 'Unknown',
      fullAddress: fullAddress || 'Address TBD',
      phone: phone || 'Unknown',
      hours: hours || 'Unknown',
      latitude: latitude || null,
      longitude: longitude || null,
      contentSize: html.length,
      url: `https://www.shoprite.com/sm/planning/rsid/${storeId}`,
      discoveredAt: new Date().toISOString()
    };
  }

  isValidZipCode(zip) {
    if (!zip || zip.length !== 5) return false;
    
    const zipNum = parseInt(zip);
    // Valid ZIP ranges for ShopRite states
    return (zipNum >= 7000 && zipNum <= 8999) ||   // NJ
           (zipNum >= 10000 && zipNum <= 14999) ||  // NY
           (zipNum >= 15000 && zipNum <= 19999) ||  // PA
           (zipNum >= 6000 && zipNum <= 6999) ||    // CT
           (zipNum >= 19700 && zipNum <= 19999) ||  // DE
           (zipNum >= 20600 && zipNum <= 21999);    // MD
  }

  showProgress(current, total) {
    const elapsed = (Date.now() - this.startTime) / 1000;
    const rate = current / elapsed;
    const eta = (total - current) / rate;
    const successRate = ((this.validStores.length / current) * 100).toFixed(1);
    
    console.log(`\n📊 Progress: ${current}/${total} (${((current/total)*100).toFixed(1)}%) | Valid: ${this.validStores.length} | Invalid: ${this.invalidStores.length} | Success: ${successRate}% | Rate: ${rate.toFixed(1)}/sec | ETA: ${(eta/60).toFixed(1)}min\n`);
  }

  saveResults() {
    const data = {
      metadata: {
        totalTested: this.current,
        validStores: this.validStores.length,
        invalidStores: this.invalidStores.length,
        successRate: ((this.validStores.length / this.current) * 100).toFixed(2) + '%',
        timestamp: new Date().toISOString(),
        validationCriteria: [
          'Must contain ShopRite content',
          'Must not be Cloudflare challenge',
          'Must not have multiple generic page indicators',
          'Must have specific store name (not generic)',
          'Must have at least 2 of: real address, phone, hours, valid ZIP'
        ]
      },
      validStores: this.validStores,
      invalidStores: this.invalidStores.slice(0, 20) // Only keep first 20 invalid for reference
    };

    fs.writeFileSync(this.outputFile, JSON.stringify(data, null, 2));
    console.log(`\n💾 Results saved to ${this.outputFile}`);
  }

  async runComprehensiveDiscovery(startId = 1, endId = 50) {
    console.log('🚀 COMPREHENSIVE SHOPRITE STORE DISCOVERY & EXTRACTION');
    console.log('======================================================');
    console.log(`🎯 Testing stores ${startId} to ${endId} with full detail extraction...\n`);

    for (let storeId = startId; storeId <= endId; storeId++) {
      this.current = storeId - startId + 1;
      
      await this.testAndExtractStore(storeId);
      await new Promise(resolve => setTimeout(resolve, 150)); // Faster rate limiting
      
      if (this.current % 25 === 0 || this.current === (endId - startId + 1)) {
        this.showProgress(this.current, endId - startId + 1);
      }
    }

    this.saveResults();
    
    console.log('\n🎯 FINAL SUMMARY:');
    console.log('=================');
    console.log(`Tested: ${this.current} stores`);
    console.log(`Valid stores found: ${this.validStores.length}`);
    console.log(`Invalid stores: ${this.invalidStores.length}`);
    console.log(`Success rate: ${((this.validStores.length / this.current) * 100).toFixed(1)}%`);
    
    if (this.validStores.length > 0) {
      console.log('\n🏪 VALID STORES WITH FULL DETAILS:');
      console.log('==================================');
      this.validStores.forEach(store => {
        console.log(`\n📍 ${store.name} (ID: ${store.storeId})`);
        console.log(`   Address: ${store.fullAddress}`);
        console.log(`   Phone: ${store.phone}`);
        console.log(`   Hours: ${store.hours}`);
      });
    }
  }
}

// Main execution
async function main() {
  const discovery = new ComprehensiveStoreDiscovery();
  
  // Run the full comprehensive discovery with improved validation
  await discovery.runComprehensiveDiscovery(1, 1000);
}

main().catch(console.error);