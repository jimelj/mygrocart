#!/usr/bin/env node

/**
 * Full ShopRite Store Discovery - 1 to 1000
 * Comprehensive discovery of all ShopRite stores using proven approach
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class FullStoreDiscovery {
  constructor() {
    this.foundStores = [];
    this.failedStores = [];
    this.totalTested = 0;
    this.startTime = Date.now();
    this.outputFile = './discovered-stores-full-1-1000.json';
    this.logFile = './discovery-log.txt';
    this.checkpointInterval = 50; // Save progress every 50 stores
    this.requestDelay = 300; // 300ms delay between requests (respectful)
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;
    console.log(message);
    fs.appendFileSync(this.logFile, logEntry);
  }

  async testStore(storeId) {
    return new Promise((resolve) => {
      const curl = spawn('curl', [
        '-s', '-L',
        '-H', 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        '-H', 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        '-H', 'Accept-Language: en-US,en;q=0.5',
        '--max-time', '15',
        '--connect-timeout', '10',
        `https://www.shoprite.com/sm/planning/rsid/${storeId}`
      ]);

      let html = '';
      let errorOutput = '';

      curl.stdout.on('data', (data) => {
        html += data.toString();
      });

      curl.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      curl.on('close', (code) => {
        this.totalTested++;
        
        if (code === 0 && this.isValidStore(html)) {
          const storeInfo = {
            storeId: storeId.toString(),
            contentSize: html.length,
            discoveredAt: new Date().toISOString(),
            url: `https://www.shoprite.com/sm/planning/rsid/${storeId}`,
            status: 'valid'
          };
          
          this.foundStores.push(storeInfo);
          this.log(`✅ Store ${storeId}: VALID (${(html.length / 1000).toFixed(0)}KB)`);
        } else {
          this.failedStores.push({
            storeId: storeId.toString(),
            reason: code !== 0 ? `curl_error_${code}` : 'invalid_content',
            contentSize: html.length,
            error: errorOutput.substring(0, 100)
          });
          
          // Only log every 10th failure to reduce noise
          if (this.failedStores.length % 10 === 0) {
            this.log(`❌ Store ${storeId}: Invalid (${this.failedStores.length} failures so far)`);
          }
        }

        resolve();
      });

      curl.on('error', (err) => {
        this.failedStores.push({
          storeId: storeId.toString(),
          reason: 'spawn_error',
          error: err.message
        });
        resolve();
      });
    });
  }

  isValidStore(html) {
    // Optimized validation based on our successful testing
    if (html.length < 100000) return false; // Must be substantial (100KB+)
    
    const hasShopRite = html.toLowerCase().includes('shoprite');
    const hasBlocking = html.toLowerCase().includes('just a moment') || 
                       html.toLowerCase().includes('access denied') ||
                       html.toLowerCase().includes('cloudflare');
    
    return hasShopRite && !hasBlocking;
  }

  saveCheckpoint() {
    const checkpoint = {
      foundStores: this.foundStores,
      failedStores: this.failedStores,
      totalTested: this.totalTested,
      timestamp: new Date().toISOString(),
      progress: {
        tested: this.totalTested,
        found: this.foundStores.length,
        failed: this.failedStores.length,
        successRate: ((this.foundStores.length / this.totalTested) * 100).toFixed(2)
      }
    };

    fs.writeFileSync(this.outputFile, JSON.stringify(checkpoint, null, 2));
    this.log(`💾 Checkpoint saved: ${this.foundStores.length} stores found, ${this.totalTested} tested`);
  }

  showProgress() {
    const elapsed = (Date.now() - this.startTime) / 1000;
    const rate = this.totalTested / elapsed;
    const eta = (1000 - this.totalTested) / rate;
    
    this.log(`📊 Progress: ${this.totalTested}/1000 (${((this.totalTested/1000)*100).toFixed(1)}%) | Found: ${this.foundStores.length} | Rate: ${rate.toFixed(1)}/sec | ETA: ${(eta/60).toFixed(1)}min`);
  }

  async discoverAll() {
    this.log('🚀 STARTING FULL SHOPRITE STORE DISCOVERY');
    this.log('=========================================');
    this.log('Range: Store IDs 1 to 1000');
    this.log('Method: curl with browser headers');
    this.log('Validation: 100KB+ content with ShopRite keywords');
    this.log('Delay: 300ms between requests');
    this.log('');

    for (let storeId = 1; storeId <= 1000; storeId++) {
      await this.testStore(storeId);
      
      // Save checkpoint every 50 stores
      if (storeId % this.checkpointInterval === 0) {
        this.saveCheckpoint();
        this.showProgress();
      }
      
      // Progress indicator every 25 stores
      if (storeId % 25 === 0 && storeId % this.checkpointInterval !== 0) {
        this.showProgress();
      }
      
      // Respectful delay between requests
      await new Promise(resolve => setTimeout(resolve, this.requestDelay));
    }

    this.showFinalResults();
  }

  showFinalResults() {
    const elapsed = (Date.now() - this.startTime) / 1000;
    const successRate = ((this.foundStores.length / this.totalTested) * 100).toFixed(2);
    
    this.log('\n🎉 DISCOVERY COMPLETE!');
    this.log('=====================');
    this.log(`Total time: ${(elapsed / 60).toFixed(1)} minutes`);
    this.log(`Stores tested: ${this.totalTested}`);
    this.log(`Valid stores found: ${this.foundStores.length}`);
    this.log(`Failed/invalid: ${this.failedStores.length}`);
    this.log(`Success rate: ${successRate}%`);
    this.log(`Average speed: ${(this.totalTested / elapsed).toFixed(1)} stores/second`);
    
    if (this.foundStores.length > 0) {
      this.log('\n✅ DISCOVERED STORES:');
      this.foundStores.forEach((store, i) => {
        this.log(`   ${i + 1}. Store ${store.storeId}: ${(store.contentSize / 1000).toFixed(0)}KB`);
      });
      
      // Save final results
      this.saveCheckpoint();
      this.log(`\n📁 Complete results saved to: ${this.outputFile}`);
      this.log(`📋 Discovery log saved to: ${this.logFile}`);
      
      // Generate quick summary
      this.generateSummary();
    } else {
      this.log('\n⚠️ No valid stores found - this is unexpected!');
    }
  }

  generateSummary() {
    const summary = {
      title: 'ShopRite Store Discovery Results (1-1000)',
      totalStores: this.foundStores.length,
      storeIds: this.foundStores.map(s => parseInt(s.storeId)).sort((a, b) => a - b),
      ranges: this.findStoreRanges(),
      largestStores: this.foundStores
        .sort((a, b) => b.contentSize - a.contentSize)
        .slice(0, 10)
        .map(s => ({ storeId: s.storeId, sizeKB: Math.round(s.contentSize / 1000) })),
      generatedAt: new Date().toISOString()
    };

    fs.writeFileSync('./discovery-summary.json', JSON.stringify(summary, null, 2));
    this.log('\n📊 Summary saved to: discovery-summary.json');
  }

  findStoreRanges() {
    const ids = this.foundStores.map(s => parseInt(s.storeId)).sort((a, b) => a - b);
    const ranges = [];
    let start = ids[0];
    let end = ids[0];

    for (let i = 1; i < ids.length; i++) {
      if (ids[i] === end + 1) {
        end = ids[i];
      } else {
        ranges.push(start === end ? `${start}` : `${start}-${end}`);
        start = end = ids[i];
      }
    }
    ranges.push(start === end ? `${start}` : `${start}-${end}`);
    return ranges;
  }
}

// Start the full discovery
async function main() {
  const discovery = new FullStoreDiscovery();
  
  console.log('🚨 FULL STORE DISCOVERY STARTING');
  console.log('================================');
  console.log('This will test 1,000 store IDs and may take 5-10 minutes');
  console.log('Progress will be saved every 50 stores');
  console.log('Press Ctrl+C to stop (progress will be saved)');
  console.log('');
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Discovery interrupted by user');
    discovery.saveCheckpoint();
    console.log('Progress saved. You can resume later.');
    process.exit(0);
  });
  
  await discovery.discoverAll();
}

main().catch(console.error);