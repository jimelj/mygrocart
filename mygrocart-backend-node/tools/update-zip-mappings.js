#!/usr/bin/env node

/**
 * ZIP Code Mapping Generator
 * 
 * This tool takes discovered store data and automatically generates
 * ZIP code to store ID mappings for your scraper configuration.
 */

const fs = require('fs');
const path = require('path');

class ZipMappingGenerator {
  constructor() {
    this.discoveredStoresFile = path.join(__dirname, 'discovered-stores.json');
    this.mappingsFile = path.join(__dirname, '../config/shoprite-mappings.js');
  }

  /**
   * Load discovered stores
   */
  loadDiscoveredStores() {
    if (!fs.existsSync(this.discoveredStoresFile)) {
      console.log('❌ No discovered stores file found. Run store discovery first.');
      return null;
    }

    try {
      const data = JSON.parse(fs.readFileSync(this.discoveredStoresFile, 'utf8'));
      console.log(`📂 Loaded ${data.foundStores?.length || 0} discovered stores`);
      return data.foundStores || [];
    } catch (error) {
      console.log('❌ Error loading discovered stores:', error.message);
      return null;
    }
  }

  /**
   * Generate ZIP code mappings from store data
   */
  generateZipMappings(stores) {
    const zipMappings = {};
    const storeDetails = {};

    stores.forEach(store => {
      if (store.zipCode && store.zipCode !== 'Unknown') {
        zipMappings[store.zipCode] = store.storeId.toString();
        
        // Also store detailed info for the store mappings
        storeDetails[store.storeId.toString()] = {
          storeId: store.storeId.toString(),
          description: store.name,
          zipCode: store.zipCode,
          city: store.city,
          state: store.state,
          region: this.determineRegion(store.state)
        };
      }
    });

    return { zipMappings, storeDetails };
  }

  /**
   * Determine region based on state
   */
  determineRegion(state) {
    const regions = {
      'NJ': 'New Jersey',
      'NY': 'New York',
      'PA': 'Pennsylvania',
      'CT': 'Connecticut',
      'DE': 'Delaware',
      'MD': 'Maryland'
    };
    
    return regions[state] || 'Unknown';
  }

  /**
   * Update the shoprite-mappings.js file
   */
  updateMappingsFile(zipMappings, storeDetails) {
    try {
      // Read current mappings file
      let mappingsContent = fs.readFileSync(this.mappingsFile, 'utf8');
      
      // Generate new store mappings section
      const newStoreMappings = this.generateStoreMappingsCode(storeDetails);
      
      // Generate new ZIP mappings section
      const newZipMappings = this.generateZipMappingsCode(zipMappings);
      
      // Replace the STORE_MAPPINGS section
      mappingsContent = mappingsContent.replace(
        /const STORE_MAPPINGS = {[\s\S]*?};/,
        newStoreMappings
      );
      
      // Replace the ZIP_TO_STORE section
      mappingsContent = mappingsContent.replace(
        /const ZIP_TO_STORE = {[\s\S]*?};/,
        newZipMappings
      );
      
      // Write updated content
      fs.writeFileSync(this.mappingsFile, mappingsContent);
      
      console.log(`✅ Updated ${this.mappingsFile} with discovered stores`);
      
    } catch (error) {
      console.log('❌ Error updating mappings file:', error.message);
    }
  }

  /**
   * Generate store mappings code
   */
  generateStoreMappingsCode(storeDetails) {
    const entries = Object.entries(storeDetails).map(([storeId, details]) => {
      return `  '${storeId}': {
    storeId: '${storeId}',
    description: '${details.description}',
    zipCode: '${details.zipCode}',
    city: '${details.city}',
    state: '${details.state}',
    region: '${details.region}'
  }`;
    }).join(',\n');

    return `const STORE_MAPPINGS = {
${entries}
};`;
  }

  /**
   * Generate ZIP mappings code
   */
  generateZipMappingsCode(zipMappings) {
    const entries = Object.entries(zipMappings)
      .sort() // Sort ZIP codes
      .map(([zip, storeId]) => `  '${zip}': '${storeId}'`)
      .join(',\n');

    return `const ZIP_TO_STORE = {
${entries}
};`;
  }

  /**
   * Show current mappings status
   */
  showMappingsStatus(stores) {
    console.log('\n📊 MAPPING GENERATION ANALYSIS');
    console.log('==============================');
    
    const withZip = stores.filter(s => s.zipCode && s.zipCode !== 'Unknown');
    const withoutZip = stores.filter(s => !s.zipCode || s.zipCode === 'Unknown');
    
    console.log(`Total discovered stores: ${stores.length}`);
    console.log(`Stores with ZIP codes: ${withZip.length}`);
    console.log(`Stores without ZIP codes: ${withoutZip.length}`);
    
    if (withZip.length > 0) {
      console.log('\n🗺️ ZIP Code Coverage:');
      const zipsByState = {};
      withZip.forEach(store => {
        if (!zipsByState[store.state]) zipsByState[store.state] = [];
        zipsByState[store.state].push(store.zipCode);
      });
      
      Object.entries(zipsByState).forEach(([state, zips]) => {
        console.log(`  ${state}: ${zips.length} ZIP codes`);
      });
    }
    
    if (withoutZip.length > 0) {
      console.log('\n⚠️ Stores missing ZIP codes:');
      withoutZip.slice(0, 5).forEach(store => {
        console.log(`  Store ${store.storeId}: ${store.name}`);
      });
      if (withoutZip.length > 5) {
        console.log(`  ... and ${withoutZip.length - 5} more`);
      }
    }
  }

  /**
   * Main execution method
   */
  async run() {
    console.log('🗺️ SHOPRITE ZIP MAPPING GENERATOR');
    console.log('=================================');
    
    // Load discovered stores
    const stores = this.loadDiscoveredStores();
    if (!stores || stores.length === 0) {
      console.log('No stores to process. Run store discovery first.');
      return;
    }
    
    // Show analysis
    this.showMappingsStatus(stores);
    
    // Generate mappings
    const { zipMappings, storeDetails } = this.generateZipMappings(stores);
    
    console.log(`\n📝 Generated mappings for ${Object.keys(zipMappings).length} ZIP codes`);
    console.log(`📝 Generated details for ${Object.keys(storeDetails).length} stores`);
    
    // Preview mappings
    console.log('\n🔍 Sample ZIP mappings:');
    Object.entries(zipMappings).slice(0, 5).forEach(([zip, storeId]) => {
      const store = storeDetails[storeId];
      console.log(`  ${zip} → Store ${storeId} (${store.description})`);
    });
    
    if (Object.keys(zipMappings).length > 5) {
      console.log(`  ... and ${Object.keys(zipMappings).length - 5} more`);
    }
    
    // Update mappings file
    this.updateMappingsFile(zipMappings, storeDetails);
    
    console.log('\n✅ ZIP code mappings have been generated and updated!');
    console.log('🎯 Your scraper can now automatically route to the correct stores.');
  }
}

// CLI Interface
function main() {
  const generator = new ZipMappingGenerator();
  generator.run();
}

if (require.main === module) {
  main();
}

module.exports = ZipMappingGenerator;