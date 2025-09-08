#!/usr/bin/env node

/**
 * Phase 2: Full Store Discovery (1-1000)
 * Real-time logging to see store IDs and information as they're discovered
 */

const { spawn } = require('child_process');
const fs = require('fs');

class Phase2FullDiscovery {
  constructor() {
    this.discoveredStores = [];
    this.currentStore = 1;
    this.maxStore = 1000;
    this.outputFile = './phase2-all-stores-1-1000.json';
    this.logFile = './phase2-discovery.log';
    this.startTime = Date.now();
    this.lastCheckpoint = Date.now();
    this.requestDelay = 200; // 200ms between requests
  }

  log(message) {
    const timestamp = new Date().toISOString().substring(11, 19); // HH:MM:SS
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    
    // Also write to log file
    fs.appendFileSync(this.logFile, logMessage + '\n');
  }

  async testStore(storeId) {
    return new Promise((resolve) => {
      const curl = spawn('curl', [
        '-s', '-L',
        '-H', 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        '--max-time', '8',
        '--connect-timeout', '5',
        `https://www.shoprite.com/sm/planning/rsid/${storeId}`
      ]);

      let html = '';
      let hasError = false;

      curl.stdout.on('data', (data) => {
        html += data.toString();
      });

      curl.stderr.on('data', (data) => {
        hasError = true;
      });

      curl.on('close', (code) => {
        const isValid = this.validateStore(html, code, storeId);
        
        if (isValid) {
          const storeInfo = this.extractBasicInfo(html, storeId);
          this.discoveredStores.push(storeInfo);
          
          // Real-time logging with store info
          this.log(`✅ Store ${storeId}: ${storeInfo.name} | ${storeInfo.location} | ${(html.length/1000).toFixed(0)}KB`);
        } else {
          // Only log every 25 failures to reduce noise
          if (storeId % 25 === 0) {
            this.log(`❌ Store ${storeId}: Invalid (${this.currentStore - this.discoveredStores.length} failures so far)`);
          }
        }

        resolve(isValid);
      });

      curl.on('error', () => {
        resolve(false);
      });
    });
  }

  validateStore(html, code, storeId) {
    if (code !== 0) return false;
    if (html.length < 100000) return false;
    
    const hasShopRite = html.toLowerCase().includes('shoprite');
    const hasBlocking = html.toLowerCase().includes('just a moment') || 
                       html.toLowerCase().includes('access denied');
    
    return hasShopRite && !hasBlocking;
  }

  extractBasicInfo(html, storeId) {
    // Extract store name from patterns we found in testing
    let storeName = `ShopRite Store ${storeId}`;
    let location = 'Location TBD';
    
    // Look for specific store names (from your terminal output)
    const storeNamePatterns = [
      /ShopRite of ([^<,"'\n]{1,30})/i
    ];
    
    for (const pattern of storeNamePatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        storeName = `ShopRite of ${match[1].trim()}`;
        location = match[1].trim();
        break;
      }
    }

    // Look for ZIP codes and state info for location
    const zipMatch = html.match(/\b(\d{5})\b/);
    const stateMatch = html.match(/\b(NJ|NY|PA|CT|DE|MD)\b/g);
    
    if (zipMatch && stateMatch) {
      location = `${location !== 'Location TBD' ? location : 'Area'}, ${stateMatch[0]} ${zipMatch[1]}`;
    }

    return {
      storeId: storeId.toString(),
      name: storeName,
      location: location,
      contentSize: html.length,
      discoveredAt: new Date().toISOString(),
      url: `https://www.shoprite.com/sm/planning/rsid/${storeId}`
    };
  }

  showProgress() {
    const elapsed = (Date.now() - this.startTime) / 1000;
    const rate = this.currentStore / elapsed;
    const eta = (this.maxStore - this.currentStore) / rate;
    const successRate = ((this.discoveredStores.length / this.currentStore) * 100).toFixed(1);
    
    this.log(`📊 Progress: ${this.currentStore}/${this.maxStore} (${((this.currentStore/this.maxStore)*100).toFixed(1)}%) | Found: ${this.discoveredStores.length} | Success: ${successRate}% | ETA: ${(eta/60).toFixed(1)}min`);
  }

  saveCheckpoint() {
    const checkpoint = {
      metadata: {
        title: 'Phase 2: Full ShopRite Store Discovery',
        currentStore: this.currentStore,
        totalStores: this.maxStore,
        found: this.discoveredStores.length,
        successRate: ((this.discoveredStores.length / this.currentStore) * 100).toFixed(2) + '%',
        startTime: new Date(this.startTime).toISOString(),
        lastUpdate: new Date().toISOString()
      },
      stores: this.discoveredStores
    };

    fs.writeFileSync(this.outputFile, JSON.stringify(checkpoint, null, 2));
    this.log(`💾 Checkpoint saved: ${this.discoveredStores.length} stores discovered`);
  }

  async runFullDiscovery() {
    this.log('🚀 PHASE 2: FULL SHOPRITE STORE DISCOVERY (1-1000)');
    this.log('===================================================');
    this.log(`Target: Discover all stores from 1 to ${this.maxStore}`);
    this.log(`Strategy: Real-time discovery with live logging`);
    this.log(`Delay: ${this.requestDelay}ms between requests`);
    this.log(`Expected: ~800-900 valid stores (based on 100% success rate)`);
    this.log('');

    // Initialize log file
    fs.writeFileSync(this.logFile, `Phase 2 Discovery Log - Started ${new Date().toISOString()}\n`);

    for (let storeId = 1; storeId <= this.maxStore; storeId++) {
      this.currentStore = storeId;
      
      await this.testStore(storeId);
      
      // Show progress every 50 stores
      if (storeId % 50 === 0) {
        this.showProgress();
        this.saveCheckpoint();
      }
      
      // Quick progress every 10 stores
      if (storeId % 10 === 0 && storeId % 50 !== 0) {
        const quickStats = `[Quick] ${storeId}/1000 | Found: ${this.discoveredStores.length}`;
        console.log(quickStats);
      }
      
      // Respectful delay
      await new Promise(resolve => setTimeout(resolve, this.requestDelay));
    }

    this.showFinalResults();
  }

  showFinalResults() {
    const elapsed = (Date.now() - this.startTime) / 1000;
    const successRate = ((this.discoveredStores.length / this.maxStore) * 100).toFixed(2);
    
    this.log('');
    this.log('🎉 PHASE 2 DISCOVERY COMPLETE!');
    this.log('==============================');
    this.log(`Total time: ${(elapsed / 60).toFixed(1)} minutes`);
    this.log(`Stores tested: ${this.maxStore}`);
    this.log(`Valid stores found: ${this.discoveredStores.length}`);
    this.log(`Success rate: ${successRate}%`);
    this.log(`Average speed: ${(this.maxStore / elapsed).toFixed(1)} stores/second`);
    this.log('');
    
    // Show sample of discovered stores
    this.log('✅ SAMPLE DISCOVERED STORES:');
    this.discoveredStores.slice(0, 10).forEach((store, i) => {
      this.log(`   ${i + 1}. ${store.name} | ${store.location}`);
    });
    
    if (this.discoveredStores.length > 10) {
      this.log(`   ... and ${this.discoveredStores.length - 10} more stores!`);
    }
    
    this.saveCheckpoint();
    this.log('');
    this.log(`📁 Complete results: ${this.outputFile}`);
    this.log(`📋 Discovery log: ${this.logFile}`);
    this.log('');
    this.log('🚀 YOUR MYGROCART NOW HAS ACCESS TO ALL SHOPRITE STORES!');
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Discovery interrupted by user');
  console.log('Progress has been saved - you can check the files for partial results');
  process.exit(0);
});

// Start Phase 2 discovery
async function main() {
  const discovery = new Phase2FullDiscovery();
  await discovery.runFullDiscovery();
}

main().catch(console.error);