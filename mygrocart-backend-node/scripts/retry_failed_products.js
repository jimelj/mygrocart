#!/usr/bin/env node
/**
 * Retry Failed Products from Seed
 *
 * This script extracts failed product names from the seed log and retries
 * scraping them now that the enum and UPC length issues are fixed.
 *
 * Usage: node scripts/retry_failed_products.js <log_file>
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const fs = require('fs');
const ScrapingOrchestrator = require('../services/ScrapingOrchestrator');
const { createLogger } = require('../utils/logger');

const logger = createLogger('RetryFailed');

async function retryFailedProducts(logFilePath) {
  try {
    if (!logFilePath || !fs.existsSync(logFilePath)) {
      console.error('❌ Log file not found:', logFilePath);
      console.log('\nUsage: node scripts/retry_failed_products.js <path/to/seed_log.txt>');
      process.exit(1);
    }

    logger.info('Reading seed log:', logFilePath);
    const logContent = fs.readFileSync(logFilePath, 'utf8');

    // Extract failed product names
    const failedProductRegex = /Error saving Target product (.+?):/g;
    const matches = [...logContent.matchAll(failedProductRegex)];
    const failedProducts = [...new Set(matches.map(m => m[1]))]; // Remove duplicates

    logger.info(`Found ${failedProducts.length} unique failed products\n`);

    if (failedProducts.length === 0) {
      logger.info('✅ No failed products to retry!');
      return;
    }

    const orchestrator = new ScrapingOrchestrator();
    let successCount = 0;
    let failCount = 0;

    // Retry each failed product
    for (const productName of failedProducts) {
      try {
        logger.info(`Retrying: "${productName}"`);

        // Search for product at both stores
        const results = await orchestrator.searchProductsAllStores(productName, {
          limit: 5, // Fewer results for retry
          zipCode: '10001',
          targetStoreId: '2055',
          shopriteStoreId: '3000'
        });

        const totalFound = results.products?.length || 0;
        if (totalFound > 0) {
          logger.info(`  ✅ Found ${totalFound} products`);
          successCount++;
        } else {
          logger.warn(`  ⚠️  No products found`);
          failCount++;
        }

        // Small delay between retries
        await new Promise(resolve => setTimeout(resolve, 3000));

      } catch (error) {
        logger.error(`  ❌ Error: ${error.message}`);
        failCount++;
      }
    }

    logger.info('\n========================================');
    logger.info('RETRY COMPLETE');
    logger.info('========================================');
    logger.info(`Total attempted: ${failedProducts.length}`);
    logger.info(`Successful: ${successCount}`);
    logger.info(`Failed: ${failCount}`);
    logger.info('========================================\n');

  } catch (error) {
    logger.error('Fatal error:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

// Parse command line args
const logFile = process.argv[2] || path.join(__dirname, 'seed_log.txt');

// Run retry
if (require.main === module) {
  retryFailedProducts(logFile).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { retryFailedProducts };
