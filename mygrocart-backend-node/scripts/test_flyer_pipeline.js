/**
 * Test the full flyer pipeline
 * Usage: node scripts/test_flyer_pipeline.js 07001
 */

require('dotenv').config();
const FlyerService = require('../services/FlyerService');

const zipCode = process.argv[2] || '07001';

async function testPipeline() {
  console.log(`Testing flyer pipeline for ZIP: ${zipCode}\n`);

  const flyerService = new FlyerService();

  // Step 1: Fetch flyers
  console.log('1. Fetching flyers from WeeklyAds2...');
  const allFlyers = await flyerService.fetchFlyersForZip(zipCode);
  console.log(`   Found ${allFlyers.length} total flyers`);

  // Step 2: Filter grocery stores
  console.log('\n2. Filtering grocery stores...');
  const groceryFlyers = flyerService.filterGroceryStores(allFlyers);
  console.log(`   Found ${groceryFlyers.length} grocery flyers:`);
  groceryFlyers.slice(0, 5).forEach(f => {
    console.log(`   - ${f.merchant}: ${f.name}`);
  });

  // Step 3: Test image URL construction
  if (groceryFlyers.length > 0) {
    console.log('\n3. Testing image URL construction...');
    const testFlyer = groceryFlyers[0];
    const images = await flyerService.downloadFlyerImages(testFlyer);
    console.log(`   Generated ${images.length} image URLs for ${testFlyer.merchant}`);
    if (images.length > 0) {
      console.log(`   Sample URL: ${images[0].substring(0, 80)}...`);
    }

    // Step 4: Test OCR (if OPENAI_API_KEY is set)
    if (process.env.OPENAI_API_KEY && images.length > 0) {
      console.log('\n4. Testing OCR extraction (first image only)...');
      const deals = await flyerService.extractDealsWithOCR([images[0]]);
      console.log(`   Extracted ${deals.length} deals:`);
      deals.slice(0, 5).forEach(d => {
        console.log(`   - ${d.productName}: $${d.salePrice} (${d.dealType})`);
      });
    } else {
      console.log('\n4. Skipping OCR test (no OPENAI_API_KEY)');
    }
  }

  console.log('\n=== Pipeline Test Complete ===');
}

testPipeline().catch(console.error);
