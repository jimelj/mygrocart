/**
 * Store Import Script
 *
 * Imports stores from JSON discovery files into the PostgreSQL database
 *
 * Source files:
 * - databases/shoprite-stores-final.json (304 stores)
 * - databases/acme-stores-final.json (159 stores)
 * - databases/lidl-stores-final.json (if exists)
 *
 * Usage: node scripts/import_stores.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { sequelize } = require('../config/database');
const Store = require('../models/Store');

// File paths
const DB_DIR = path.join(__dirname, '../databases');
const FILES = [
  { path: path.join(DB_DIR, 'shoprite-stores-final.json'), chainName: 'ShopRite' },
  { path: path.join(DB_DIR, 'acme-stores-final.json'), chainName: 'ACME' },
  { path: path.join(DB_DIR, 'lidl-stores-final.json'), chainName: 'Lidl' }
];

// Statistics
const stats = {
  total: 0,
  imported: 0,
  skipped: 0,
  errors: 0
};

/**
 * Import stores from a single JSON file
 * @param {string} filePath - Path to JSON file
 * @param {string} chainName - Chain name (ShopRite, ACME, Lidl)
 */
async function importStoresFromFile(filePath, chainName) {
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Skipping ${chainName}: File not found at ${filePath}`);
    return;
  }

  console.log(`\n📁 Importing ${chainName} stores from ${path.basename(filePath)}...`);

  try {
    // Read and parse JSON
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(fileContent);

    // Extract stores array (format: { validStores: [...] })
    const stores = data.validStores || data.stores || data;

    if (!Array.isArray(stores)) {
      console.error(`❌ Invalid JSON format: Expected array of stores`);
      return;
    }

    console.log(`   Found ${stores.length} ${chainName} stores in file`);

    let count = 0;
    for (const store of stores) {
      try {
        // Validate required fields
        if (!store.storeId || !store.name || !store.city || !store.state || !store.zip) {
          console.warn(`   ⚠️  Skipping store: Missing required fields`, store);
          stats.skipped++;
          continue;
        }

        // Map JSON fields to Store model
        const storeData = {
          chainName: chainName,
          storeName: store.name.trim(),
          address: (store.streetAddress || store.address || 'Address not available').trim(),
          city: store.city.trim(),
          state: store.state.trim(),
          zipCode: store.zip.toString().trim(),
          latitude: store.latitude || null,
          longitude: store.longitude || null,
          externalStoreId: store.storeId.toString()
        };

        // Use findOrCreate to avoid duplicates
        const [storeRecord, created] = await Store.findOrCreate({
          where: {
            chainName: chainName,
            externalStoreId: store.storeId.toString()
          },
          defaults: storeData
        });

        if (created) {
          stats.imported++;
          count++;

          // Show progress every 50 stores
          if (count % 50 === 0) {
            console.log(`   ✅ Imported ${count}/${stores.length} stores...`);
          }
        } else {
          stats.skipped++;
        }

        stats.total++;

      } catch (error) {
        console.error(`   ❌ Error importing store ${store.storeId}:`, error.message);
        stats.errors++;
      }
    }

    console.log(`   ✅ Completed ${chainName}: ${count} new stores imported`);

  } catch (error) {
    console.error(`❌ Error reading ${chainName} file:`, error.message);
    stats.errors++;
  }
}

/**
 * Main import function
 */
async function importAllStores() {
  console.log('========================================');
  console.log('Store Import Script');
  console.log('========================================\n');

  try {
    // Test database connection
    console.log('🔌 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected successfully\n');

    // Import stores from each file
    for (const file of FILES) {
      await importStoresFromFile(file.path, file.chainName);
    }

    // Print summary
    console.log('\n========================================');
    console.log('Import Summary');
    console.log('========================================');
    console.log(`Total stores processed: ${stats.total}`);
    console.log(`✅ Successfully imported: ${stats.imported}`);
    console.log(`⏭️  Skipped (already exist): ${stats.skipped}`);
    console.log(`❌ Errors: ${stats.errors}`);
    console.log('========================================\n');

    // Verify import
    const totalInDatabase = await Store.count();
    console.log(`📊 Total stores now in database: ${totalInDatabase}\n`);

  } catch (error) {
    console.error('❌ Import failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('✅ Database connection closed');
  }
}

// Run import
importAllStores();
