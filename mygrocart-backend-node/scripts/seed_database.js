#!/usr/bin/env node
/**
 * Database Seeding Script
 *
 * This script pre-populates the database with 1,000-2,000 common grocery products
 * by scraping Target and ShopRite stores. This is a ONE-TIME operation designed
 * to run overnight during initial setup.
 *
 * IMPORTANT RATE LIMITING:
 * - Target: 10 seconds between requests (~6 requests/minute)
 * - ShopRite: 15 seconds between requests (~4 requests/minute)
 * - Total estimated time: 8-10 hours for 1,500 products
 *
 * USAGE:
 *   node scripts/seed_database.js              # Run full seed
 *   node scripts/seed_database.js --resume     # Resume from last category
 *   node scripts/seed_database.js --test       # Test with 3 categories only
 *
 * PROGRESS TRACKING:
 * - Progress saved to: seed_progress.json (resume from interruption)
 * - Summary saved to: seed_summary.json (final results)
 * - Logs saved to: seed_log.txt (detailed activity log)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const fs = require('fs');
const { createLogger} = require('../utils/logger');
const ScrapingOrchestrator = require('../services/ScrapingOrchestrator');

// Parse command line arguments
const args = process.argv.slice(2);
const isResumeMode = args.includes('--resume');
const isTestMode = args.includes('--test');

// File paths for progress tracking
const PROGRESS_FILE = path.join(__dirname, 'seed_progress.json');
const SUMMARY_FILE = path.join(__dirname, 'seed_summary.json');
const LOG_FILE = path.join(__dirname, 'seed_log.txt');

// Logger setup
const logger = createLogger('SeedDatabase');

// Comprehensive product categories and search terms
// Designed to capture 80% of common grocery purchases
const SEED_CATEGORIES = {
  dairy: [
    'milk', 'whole milk', '2% milk', 'skim milk', 'almond milk',
    'cheese', 'cheddar cheese', 'mozzarella cheese', 'cream cheese',
    'yogurt', 'greek yogurt', 'butter', 'eggs', 'sour cream', 'cottage cheese'
  ],
  meat: [
    'chicken breast', 'chicken thighs', 'ground beef', 'ground turkey',
    'pork chops', 'bacon', 'sausage', 'ham', 'steak', 'beef roast'
  ],
  produce: [
    'bananas', 'apples', 'oranges', 'grapes', 'strawberries', 'blueberries',
    'lettuce', 'tomatoes', 'onions', 'potatoes', 'carrots', 'broccoli',
    'bell peppers', 'cucumbers', 'avocado', 'spinach', 'celery', 'garlic'
  ],
  bakery: [
    'bread', 'white bread', 'wheat bread', 'bagels', 'english muffins',
    'tortillas', 'dinner rolls', 'hamburger buns', 'hot dog buns', 'pita bread'
  ],
  pantry: [
    'pasta', 'spaghetti', 'penne pasta', 'rice', 'brown rice', 'white rice',
    'cereal', 'oatmeal', 'flour', 'sugar', 'olive oil', 'vegetable oil',
    'soup', 'tomato soup', 'chicken noodle soup', 'beans', 'black beans',
    'canned tomatoes', 'tomato sauce', 'peanut butter', 'jelly', 'jam'
  ],
  beverages: [
    'water', 'bottled water', 'sparkling water', 'soda', 'coca cola', 'pepsi',
    'juice', 'orange juice', 'apple juice', 'coffee', 'ground coffee', 'tea',
    'milk', 'sports drinks', 'energy drinks'
  ],
  frozen: [
    'ice cream', 'frozen pizza', 'frozen vegetables', 'frozen broccoli',
    'frozen peas', 'frozen french fries', 'frozen chicken nuggets',
    'frozen waffles', 'frozen fruit', 'frozen dinners', 'frozen fish'
  ],
  snacks: [
    'chips', 'potato chips', 'tortilla chips', 'crackers', 'cookies',
    'chocolate chip cookies', 'pretzels', 'popcorn', 'candy', 'chocolate',
    'granola bars', 'fruit snacks', 'nuts', 'mixed nuts', 'trail mix'
  ],
  condiments: [
    'ketchup', 'mustard', 'mayonnaise', 'salad dressing', 'ranch dressing',
    'bbq sauce', 'hot sauce', 'soy sauce', 'worcestershire sauce', 'vinegar',
    'pickles', 'relish', 'honey', 'maple syrup', 'salsa'
  ],
  breakfast: [
    'cereal', 'corn flakes', 'cheerios', 'pancake mix', 'syrup',
    'breakfast bars', 'pop tarts', 'instant oatmeal', 'breakfast sausage',
    'bacon', 'english muffins', 'bagels'
  ],
  canned_goods: [
    'canned soup', 'canned beans', 'canned corn', 'canned peas',
    'canned tuna', 'canned chicken', 'canned tomatoes', 'tomato paste',
    'canned fruit', 'canned peaches', 'canned pineapple'
  ]
};

// Test mode: only 3 categories
const TEST_CATEGORIES = {
  dairy: SEED_CATEGORIES.dairy.slice(0, 3),
  meat: SEED_CATEGORIES.meat.slice(0, 3),
  produce: SEED_CATEGORIES.produce.slice(0, 3)
};

/**
 * Append to log file
 */
function logToFile(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${message}\n`;
  fs.appendFileSync(LOG_FILE, logMessage);
  logger.info(message);
}

/**
 * Load progress from file (for resume functionality)
 */
function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const data = fs.readFileSync(PROGRESS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    logger.warn(`Failed to load progress file: ${error.message}`);
  }
  return {
    processedCategories: [],
    totalProductsAdded: 0,
    totalProductsSkipped: 0,
    totalErrors: 0,
    startTime: new Date().toISOString()
  };
}

/**
 * Save progress to file
 */
function saveProgress(progress) {
  try {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
  } catch (error) {
    logger.error(`Failed to save progress: ${error.message}`);
  }
}

/**
 * Save final summary
 */
function saveSummary(summary) {
  try {
    fs.writeFileSync(SUMMARY_FILE, JSON.stringify(summary, null, 2));
    logger.info(`Summary saved to ${SUMMARY_FILE}`);
  } catch (error) {
    logger.error(`Failed to save summary: ${error.message}`);
  }
}

/**
 * Calculate estimated completion time
 */
function calculateEstimatedTime(totalTerms) {
  // Average 20 products per term × 2 stores = 40 save operations
  // Target: 10s delay, ShopRite: 15s delay
  // Average delay per term: (10 + 15) / 2 = 12.5s
  // Plus 5s for processing = ~18s per term
  const secondsPerTerm = 18;
  const totalSeconds = totalTerms * secondsPerTerm;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return { hours, minutes, totalSeconds };
}

/**
 * Main seeding function
 */
async function seedDatabase() {
  logToFile('========================================');
  logToFile('DATABASE SEEDING STARTED');
  logToFile('========================================');

  const startTime = Date.now();
  const orchestrator = new ScrapingOrchestrator();

  // Select categories based on mode
  const categories = isTestMode ? TEST_CATEGORIES : SEED_CATEGORIES;

  // Load progress if resuming
  let progress = isResumeMode ? loadProgress() : {
    processedCategories: [],
    totalProductsAdded: 0,
    totalProductsSkipped: 0,
    totalErrors: 0,
    startTime: new Date().toISOString(),
    categoryResults: {}
  };

  // Calculate total search terms
  const allTerms = Object.values(categories).flat();
  const totalTerms = allTerms.length;

  logToFile(`Mode: ${isTestMode ? 'TEST' : isResumeMode ? 'RESUME' : 'FULL'}`);
  logToFile(`Total categories: ${Object.keys(categories).length}`);
  logToFile(`Total search terms: ${totalTerms}`);

  const estimate = calculateEstimatedTime(totalTerms);
  logToFile(`Estimated time: ${estimate.hours}h ${estimate.minutes}m`);
  logToFile(`Products per term: ~20 (×2 stores = ~40 products per term)`);
  logToFile(`Expected total: ${totalTerms * 20} products`);
  logToFile('');

  // Process each category
  for (const [categoryName, searchTerms] of Object.entries(categories)) {
    // Skip if already processed (resume mode)
    if (progress.processedCategories.includes(categoryName)) {
      logToFile(`Skipping already processed category: ${categoryName}`);
      continue;
    }

    logToFile(`========================================`);
    logToFile(`CATEGORY: ${categoryName.toUpperCase()}`);
    logToFile(`Terms: ${searchTerms.length}`);
    logToFile(`========================================`);

    const categoryResults = {
      termsProcessed: 0,
      productsAdded: 0,
      productsSkipped: 0,
      errors: 0,
      termDetails: {}
    };

    // Process each search term in category
    for (const searchTerm of searchTerms) {
      try {
        logToFile(`\nSearching: "${searchTerm}"...`);

        // Scrape from all stores (Target + ShopRite)
        const results = await orchestrator.searchProductsAllStores(searchTerm, {
          limit: 20, // Get top 20 products per term
          zipCode: '10001', // Default NYC ZIP
          targetStoreId: '2055', // Bridgewater NJ Target
          shopriteStoreId: '3000' // ShopRite store
        });

        // Log results
        const targetCount = results.sources?.target?.found || 0;
        const shopriteCount = results.sources?.shoprite?.found || 0;
        const totalFound = results.products?.length || 0;

        logToFile(`  Target: ${targetCount} products`);
        logToFile(`  ShopRite: ${shopriteCount} products`);
        logToFile(`  Total unique: ${totalFound} products`);

        // Update category results
        categoryResults.termsProcessed++;
        categoryResults.productsAdded += totalFound;
        categoryResults.termDetails[searchTerm] = {
          target: targetCount,
          shoprite: shopriteCount,
          total: totalFound,
          timestamp: new Date().toISOString()
        };

        // Update progress
        progress.totalProductsAdded += totalFound;

        // Log errors if any
        if (results.errors && results.errors.length > 0) {
          results.errors.forEach(err => {
            logToFile(`  ERROR: ${err.store || 'Unknown'} - ${err.error}`);
            categoryResults.errors++;
            progress.totalErrors++;
          });
        }

        // Save progress after each term
        progress.categoryResults[categoryName] = categoryResults;
        saveProgress(progress);

      } catch (error) {
        logToFile(`  ERROR processing "${searchTerm}": ${error.message}`);
        categoryResults.errors++;
        progress.totalErrors++;

        categoryResults.termDetails[searchTerm] = {
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }

      // Small delay between terms within same category (in addition to scraper delays)
      await sleep(5000);
    }

    // Mark category as complete
    progress.processedCategories.push(categoryName);
    progress.categoryResults[categoryName] = categoryResults;
    saveProgress(progress);

    logToFile(`\nCategory "${categoryName}" complete:`);
    logToFile(`  Terms processed: ${categoryResults.termsProcessed}`);
    logToFile(`  Products added: ${categoryResults.productsAdded}`);
    logToFile(`  Errors: ${categoryResults.errors}`);
    logToFile('');
  }

  // Calculate final statistics
  const endTime = Date.now();
  const durationSeconds = Math.floor((endTime - startTime) / 1000);
  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.floor((durationSeconds % 3600) / 60);
  const seconds = durationSeconds % 60;

  const summary = {
    mode: isTestMode ? 'TEST' : 'FULL',
    startTime: progress.startTime,
    endTime: new Date().toISOString(),
    duration: `${hours}h ${minutes}m ${seconds}s`,
    durationSeconds: durationSeconds,
    categoriesProcessed: progress.processedCategories.length,
    totalTermsProcessed: allTerms.length,
    totalProductsAdded: progress.totalProductsAdded,
    totalProductsSkipped: progress.totalProductsSkipped,
    totalErrors: progress.totalErrors,
    categoryResults: progress.categoryResults,
    averageProductsPerTerm: Math.round(progress.totalProductsAdded / allTerms.length),
    successRate: `${((1 - progress.totalErrors / allTerms.length) * 100).toFixed(1)}%`
  };

  // Save final summary
  saveSummary(summary);

  logToFile('');
  logToFile('========================================');
  logToFile('DATABASE SEEDING COMPLETE');
  logToFile('========================================');
  logToFile(`Duration: ${summary.duration}`);
  logToFile(`Categories: ${summary.categoriesProcessed}`);
  logToFile(`Search terms: ${summary.totalTermsProcessed}`);
  logToFile(`Products added: ${summary.totalProductsAdded}`);
  logToFile(`Errors: ${summary.totalErrors}`);
  logToFile(`Success rate: ${summary.successRate}`);
  logToFile(`Average products per term: ${summary.averageProductsPerTerm}`);
  logToFile('');
  logToFile(`Summary saved to: ${SUMMARY_FILE}`);
  logToFile(`Log saved to: ${LOG_FILE}`);
  logToFile('========================================');

  console.log('\n');
  console.log('========================================');
  console.log('SEED COMPLETE!');
  console.log('========================================');
  console.log(`Duration: ${summary.duration}`);
  console.log(`Products added: ${summary.totalProductsAdded}`);
  console.log(`Success rate: ${summary.successRate}`);
  console.log(`\nSummary: ${SUMMARY_FILE}`);
  console.log(`Log: ${LOG_FILE}`);
  console.log('========================================');

  // Clean up progress file on successful completion
  if (fs.existsSync(PROGRESS_FILE)) {
    fs.unlinkSync(PROGRESS_FILE);
    logToFile('Progress file cleaned up (seed completed successfully)');
  }

  process.exit(0);
}

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Handle errors and graceful shutdown
 */
process.on('SIGINT', () => {
  console.log('\n\nReceived SIGINT (Ctrl+C). Saving progress...');
  console.log('Run with --resume flag to continue from where you left off.');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  logToFile(`Unhandled Rejection: ${reason}`);
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

// Run the seed
if (require.main === module) {
  seedDatabase().catch(error => {
    logToFile(`FATAL ERROR: ${error.message}`);
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { seedDatabase };
