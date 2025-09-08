#!/usr/bin/env node

/**
 * ShopRite ID Discovery Tool
 * 
 * This tool helps you systematically discover:
 * 1. New store IDs (rsid) for different locations
 * 2. New category IDs for different product types
 * 3. Mapping between ZIP codes and store IDs
 */

const shopriteMappings = require('../config/shoprite-mappings');

function showCurrentMappings() {
  console.log('🏪 CURRENT STORE MAPPINGS:');
  console.log('=========================');
  const stores = shopriteMappings.getAvailableStores();
  stores.forEach(storeId => {
    const info = shopriteMappings.getStoreInfo(storeId);
    console.log(`  • Store ${storeId}: ${info.description} (${info.region})`);
  });
  
  console.log('\n🛒 CURRENT CATEGORY MAPPINGS:');
  console.log('=============================');
  console.log('  Dairy: milk, cheese, yogurt, butter, eggs');
  console.log('  Bakery: bread');
  console.log('  Meat: meat, chicken, beef');  
  console.log('  Produce: fruit, vegetables, apples, bananas');
  console.log('  Pantry: cereal, pasta, rice');
  
  console.log('\n📍 ZIP CODE MAPPINGS:');
  console.log('=====================');
  console.log('  07001 → Store 522');
  console.log('  (Add more as discovered)');
}

function showDiscoveryGuide() {
  console.log('\n🔍 HOW TO DISCOVER NEW IDs:');
  console.log('===========================');
  
  console.log('\n📍 Finding New Store IDs (rsid):');
  console.log('1. Go to https://www.shoprite.com/store-locator');
  console.log('2. Enter different ZIP codes');
  console.log('3. Select a store and note the URL changes');
  console.log('4. Look for rsid/XXX in the URL');
  console.log('5. Test the URL with your scraper');
  
  console.log('\n🛒 Finding New Category IDs:');
  console.log('1. Navigate to https://www.shoprite.com');
  console.log('2. Browse different product categories');
  console.log('3. Look for URLs like: categories/section/product-id-XXXXXX');
  console.log('4. Note the pattern: section/category-id-number');
  console.log('5. Test with your scraper');
  
  console.log('\n💡 Pro Tips:');
  console.log('• Use browser dev tools (Network tab) to see API calls');
  console.log('• Check for JSON responses with store/category metadata');
  console.log('• Look for patterns in URL parameters');
  console.log('• Test discovered IDs with the test tool below');
}

function generateTestCommand(searchTerm, zipCode, storeId) {
  const url = shopriteMappings.buildShopRiteUrl(searchTerm, zipCode, storeId);
  console.log(`\n🧪 TEST COMMAND:`);
  console.log(`node -e "`);
  console.log(`const { buildShopRiteUrl } = require('./config/shoprite-mappings');`);
  console.log(`console.log('Generated URL:', buildShopRiteUrl('${searchTerm}', '${zipCode}', '${storeId}'));`);
  console.log(`console.log('Test this URL in your scraper!');`);
  console.log(`"`);
  console.log(`\nGenerated URL: ${url}`);
}

function testNewMapping(searchTerm, categoryId, storeId) {
  console.log(`\n🧪 TESTING NEW MAPPING:`);
  console.log(`Search Term: ${searchTerm}`);
  console.log(`Category ID: ${categoryId}`);
  console.log(`Store ID: ${storeId}`);
  
  // This would generate a test URL for manual verification
  const testUrl = `https://www.shoprite.com/sm/planning/rsid/${storeId}/categories/${categoryId}`;
  console.log(`Test URL: ${testUrl}`);
  console.log(`\n✅ If this URL works in browser:`);
  console.log(`1. Add to CATEGORY_MAPPINGS in config/shoprite-mappings.js`);
  console.log(`2. Add to STORE_MAPPINGS if it's a new store`);
  console.log(`3. Test with your scraper`);
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  console.log('🆔 SHOPRITE ID DISCOVERY TOOL');
  console.log('==============================');
  
  switch (command) {
    case 'show':
      showCurrentMappings();
      break;
      
    case 'guide':
      showDiscoveryGuide();
      break;
      
    case 'test':
      const searchTerm = args[1] || 'milk';
      const zipCode = args[2] || '07001';
      const storeId = args[3] || null;
      generateTestCommand(searchTerm, zipCode, storeId);
      break;
      
    case 'new':
      const newSearchTerm = args[1];
      const newCategoryId = args[2];
      const newStoreId = args[3] || '522';
      if (!newSearchTerm || !newCategoryId) {
        console.log('Usage: node discover-shoprite-ids.js new <searchTerm> <categoryId> [storeId]');
        console.log('Example: node discover-shoprite-ids.js new soup pantry/soup-id-520625 522');
        return;
      }
      testNewMapping(newSearchTerm, newCategoryId, newStoreId);
      break;
      
    default:
      console.log('Usage:');
      console.log('  node discover-shoprite-ids.js show       # Show current mappings');
      console.log('  node discover-shoprite-ids.js guide      # Show discovery guide');
      console.log('  node discover-shoprite-ids.js test [term] [zip] [store]  # Test URL generation');
      console.log('  node discover-shoprite-ids.js new <term> <categoryId> [store]  # Test new mapping');
      console.log('');
      console.log('Examples:');
      console.log('  node discover-shoprite-ids.js test milk 07001 522');
      console.log('  node discover-shoprite-ids.js new soup pantry/soup-id-520625');
      showCurrentMappings();
      break;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  showCurrentMappings,
  showDiscoveryGuide,
  generateTestCommand,
  testNewMapping
};