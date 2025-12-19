#!/usr/bin/env node
/**
 * Database Migration: Clean Product Names
 *
 * Fixes the ShopRite product name duplication issue where products have
 * duplicated names with embedded prices.
 *
 * Example:
 * Before: "Organic Valley Milk, half gallon, $6.49 Organic Valley Milk, half gallon"
 * After:  "Organic Valley Milk, half gallon"
 *
 * This script only affects ShopRite products (UPCs starting with "999")
 * and leaves Target products unchanged.
 *
 * Usage:
 *   node scripts/clean_product_names.js
 *
 * Author: Backend API Agent
 * Date: 2025-11-06
 */

require('dotenv').config();
const { sequelize } = require('../config/database');
const { Product } = require('../models');

/**
 * Clean product name by removing duplicates and price information
 * @param {string} name - Original product name
 * @returns {string} - Cleaned product name
 */
function cleanProductName(name) {
  if (!name) return '';

  let cleaned = name;

  // Step 1: Remove price information (e.g., "$6.49", "$12.99")
  cleaned = cleaned.replace(/,?\s*\$\d+\.\d{2}/g, '');

  // Step 2: Check for exact duplicate pattern (no space between duplicates)
  // Pattern: "Text A, size, TextA, size" or "TextATextA"
  const halfLength = Math.floor(cleaned.length / 2);

  if (halfLength > 10) {
    const firstHalf = cleaned.substring(0, halfLength);
    const secondHalf = cleaned.substring(halfLength);

    // If first and second half are identical (ignoring case), keep only first half
    if (firstHalf.toLowerCase() === secondHalf.toLowerCase()) {
      cleaned = firstHalf;
    }
  }

  // Step 3: Check for duplicated text patterns with word boundaries
  const words = cleaned.split(/\s+/);
  const wordHalfLength = Math.floor(words.length / 2);

  if (words.length > 6 && wordHalfLength > 0) {
    const firstHalf = words.slice(0, wordHalfLength).join(' ').toLowerCase();
    const secondHalf = words.slice(wordHalfLength).join(' ').toLowerCase();

    // If first and second half are identical or very similar, keep only first half
    if (firstHalf === secondHalf || secondHalf.startsWith(firstHalf)) {
      cleaned = words.slice(0, wordHalfLength).join(' ');
    }
  }

  // Step 4: Clean up whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // Step 5: Remove trailing commas or periods
  cleaned = cleaned.replace(/[,.]$/, '');

  return cleaned;
}

/**
 * Main migration function
 */
async function cleanAllProductNames() {
  console.log('\n' + '='.repeat(80));
  console.log('Database Migration: Clean Product Names');
  console.log('='.repeat(80));
  console.log('\nStarting product name cleanup...\n');

  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established\n');

    // Get all ShopRite products (UPCs starting with "999")
    const products = await Product.findAll({
      where: {
        upc: {
          [sequelize.Sequelize.Op.like]: '999%'
        }
      },
      order: [['createdAt', 'DESC']]
    });

    console.log(`Found ${products.length} ShopRite products to check\n`);

    if (products.length === 0) {
      console.log('No ShopRite products found in database.');
      console.log('Migration complete (nothing to do).\n');
      return;
    }

    let cleanedCount = 0;
    let unchangedCount = 0;
    let errors = 0;
    const errorDetails = [];

    console.log('Processing products...\n');

    for (const product of products) {
      const originalName = product.name;

      try {
        // Clean the name
        const cleanedName = cleanProductName(originalName);

        // Update if changed
        if (cleanedName !== originalName) {
          await product.update({ name: cleanedName });

          console.log(`✅ Cleaned UPC: ${product.upc}`);
          console.log(`   Before: ${originalName.substring(0, 100)}${originalName.length > 100 ? '...' : ''}`);
          console.log(`   After:  ${cleanedName}\n`);

          cleanedCount++;
        } else {
          unchangedCount++;
        }
      } catch (error) {
        console.error(`❌ Error updating UPC ${product.upc}: ${error.message}\n`);
        errors++;
        errorDetails.push({
          upc: product.upc,
          name: originalName,
          error: error.message
        });
      }
    }

    // Print summary
    console.log('='.repeat(80));
    console.log('MIGRATION SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total products checked:     ${products.length}`);
    console.log(`Products cleaned:           ${cleanedCount}`);
    console.log(`Products unchanged:         ${unchangedCount}`);
    console.log(`Errors:                     ${errors}`);
    console.log('='.repeat(80));

    if (errors > 0) {
      console.log('\nERROR DETAILS:');
      errorDetails.forEach((err, idx) => {
        console.log(`\n${idx + 1}. UPC: ${err.upc}`);
        console.log(`   Name: ${err.name.substring(0, 80)}...`);
        console.log(`   Error: ${err.error}`);
      });
    }

    if (cleanedCount > 0) {
      console.log('\n✅ Database migration completed successfully!');
      console.log(`   ${cleanedCount} product names have been cleaned.\n`);
    } else {
      console.log('\n✅ All product names are already clean.');
      console.log('   No changes were needed.\n');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    // Close database connection
    await sequelize.close();
    console.log('Database connection closed.\n');
  }
}

// Run migration
cleanAllProductNames()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
