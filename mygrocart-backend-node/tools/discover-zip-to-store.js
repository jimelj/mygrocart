#!/usr/bin/env node

/**
 * ZIP Code to Store ID Discovery Tool
 * 
 * This tool helps you systematically discover which ShopRite store IDs
 * correspond to which ZIP codes by automating the discovery process.
 */

const https = require('https');
const shopriteMappings = require('../config/shoprite-mappings');

/**
 * Test ZIP codes to discover store mappings
 */
const TEST_ZIP_CODES = [
  // New Jersey
  '07001', // Jersey City (known: store 522)
  '07002', // Bayonne  
  '07003', // Bloomfield
  '07030', // Hoboken
  '07070', // Rutherford
  '07092', // Mountainside
  '08701', // Lakewood
  '08807', // Bridgewater
  '08873', // Somerset
  
  // New York
  '10001', // Manhattan
  '10301', // Staten Island
  '11201', // Brooklyn
  '11368', // Corona, Queens
  
  // Pennsylvania  
  '19103', // Philadelphia
  '19606', // Reading
  '18101', // Allentown
  
  // Connecticut
  '06101', // Hartford
  '06901', // Stamford
  
  // Delaware
  '19801', // Wilmington
  '19934'  // Lewes
];

/**
 * Manual discovery method - generates test URLs
 */
function generateTestUrls() {
  console.log('🗺️ ZIP CODE TO STORE ID DISCOVERY');
  console.log('=================================');
  console.log('');
  console.log('🧪 TEST METHOD: Manual URL Testing');
  console.log('1. Go to https://www.shoprite.com/store-locator');
  console.log('2. Test each ZIP code below');
  console.log('3. Note the store ID (rsid) in the URL when you select a store');
  console.log('4. Add mappings to config/shoprite-mappings.js');
  console.log('');
  
  console.log('📍 ZIP CODES TO TEST:');
  console.log('=====================');
  
  TEST_ZIP_CODES.forEach((zip, index) => {
    const currentStore = shopriteMappings.getStoreIdByZip(zip);
    const known = zip === '07001' ? '✅ Known' : '❓ Unknown';
    console.log(`${index + 1}. ${zip} → Store ${currentStore} (${known})`);
  });
  
  console.log('');
  console.log('🔍 DISCOVERY PROCESS:');
  console.log('1. Visit: https://www.shoprite.com/store-locator');
  console.log('2. Enter ZIP code (e.g., 07002)');
  console.log('3. Click on a store from results');
  console.log('4. Look for URL pattern: ...rsid/XXX/...');
  console.log('5. Record: ZIP 07002 → Store XXX');
  console.log('6. Add to ZIP_TO_STORE mapping');
}

/**
 * Advanced discovery using ShopRite search URLs
 */
function testWithSearchUrls() {
  console.log('🔬 ADVANCED METHOD: Search URL Testing');
  console.log('=====================================');
  console.log('');
  console.log('Test different ZIP codes with your scraper:');
  console.log('');
  
  // Test a few ZIP codes with milk search
  const testZips = ['07001', '07002', '08701', '10301'];
  
  testZips.forEach(zip => {
    // Generate URL with current mapping (will default to 522 for unknown ZIPs)
    const currentUrl = shopriteMappings.buildShopRiteUrl('milk', zip);
    console.log(`ZIP ${zip}: ${currentUrl}`);
    
    // Show what we need to test
    console.log(`  🧪 Test store variations:`);
    ['522', '162', '1680', '500', '600'].forEach(storeId => {
      const testUrl = shopriteMappings.buildShopRiteUrl('milk', zip, storeId);
      console.log(`     Store ${storeId}: ${testUrl}`);
    });
    console.log('');
  });
  
  console.log('💡 HOW TO TEST:');
  console.log('1. Try each URL in browser');
  console.log('2. See which ones load successfully with products');
  console.log('3. If URL works → that store serves that ZIP');
  console.log('4. Add working combinations to ZIP_TO_STORE');
}

/**
 * Generate a template for updating the mappings
 */
function generateMappingTemplate() {
  console.log('📝 MAPPING UPDATE TEMPLATE');
  console.log('=========================');
  console.log('');
  console.log('Add discoveries to config/shoprite-mappings.js:');
  console.log('');
  console.log('const ZIP_TO_STORE = {');
  console.log("  '07001': '522', // Jersey City (confirmed)");
  
  TEST_ZIP_CODES.slice(1, 6).forEach(zip => {
    console.log(`  '${zip}': 'XXX', // TODO: Discover store ID`);
  });
  
  console.log('  // Add more as discovered...');
  console.log('};');
  console.log('');
  console.log('Example discoveries:');
  console.log("'07002': '523', // Bayonne ShopRite");
  console.log("'08701': '445', // Lakewood ShopRite");
  console.log("'10301': '162', // Staten Island ShopRite");
}

/**
 * Show current mapping status
 */
function showCurrentStatus() {
  console.log('📊 CURRENT ZIP TO STORE MAPPING STATUS');
  console.log('=====================================');
  console.log('');
  
  const knownZips = Object.keys(shopriteMappings.ZIP_TO_STORE || {});
  console.log(`✅ Known mappings: ${knownZips.length}`);
  knownZips.forEach(zip => {
    const storeId = shopriteMappings.getStoreIdByZip(zip);
    const storeInfo = shopriteMappings.getStoreInfo(storeId);
    console.log(`   ${zip} → Store ${storeId} (${storeInfo?.description || 'Unknown'})`);
  });
  
  console.log('');
  console.log(`❓ Unknown ZIP codes: Default to store 522`);
  console.log(`🎯 Goal: Map major ZIP codes in ShopRite service areas`);
}

/**
 * Practical testing command generator
 */
function generateTestCommands() {
  console.log('⚡ PRACTICAL TEST COMMANDS');
  console.log('=========================');
  console.log('');
  console.log('Test different store IDs for a ZIP code:');
  console.log('');
  
  const testZip = '07002'; // Bayonne example
  console.log(`# Testing ZIP ${testZip} with different stores:`);
  console.log('');
  
  ['522', '162', '445', '500', '523'].forEach(storeId => {
    console.log(`curl -s "https://www.shoprite.com/sm/planning/rsid/${storeId}/categories/dairy/milk-id-520592?f=Breadcrumb%3Agrocery%252Fdairy%252Fmilk" | grep -q "product" && echo "✅ Store ${storeId} works for ${testZip}" || echo "❌ Store ${storeId} failed for ${testZip}"`);
  });
  
  console.log('');
  console.log('🔧 Or test with your scraper:');
  console.log(`node -e "const s = require('./services/ScrapingService'); console.log(new s().buildShopRiteSearchUrl('milk', '${testZip}', 'XXX'));"`);
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'test':
      generateTestUrls();
      break;
      
    case 'advanced':
      testWithSearchUrls();
      break;
      
    case 'template':
      generateMappingTemplate();
      break;
      
    case 'status':
      showCurrentStatus();
      break;
      
    case 'commands':
      generateTestCommands();
      break;
      
    default:
      console.log('🗺️ ZIP TO STORE DISCOVERY TOOL');
      console.log('==============================');
      console.log('');
      console.log('Commands:');
      console.log('  node discover-zip-to-store.js status     # Show current mappings');
      console.log('  node discover-zip-to-store.js test       # Manual discovery method');
      console.log('  node discover-zip-to-store.js advanced   # URL testing method');
      console.log('  node discover-zip-to-store.js template   # Show mapping template');
      console.log('  node discover-zip-to-store.js commands   # Generate test commands');
      console.log('');
      console.log('Current limitation: Only ZIP 07001 is mapped!');
      showCurrentStatus();
      break;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  TEST_ZIP_CODES,
  generateTestUrls,
  testWithSearchUrls,
  generateMappingTemplate,
  showCurrentStatus
};