#!/usr/bin/env node
/**
 * seed_atlanta_stores.js
 *
 * Seeds real store locations near ZIP 30132 (Dallas, GA) for the
 * MyGroCart Atlanta pilot program.
 *
 * Stores included:
 *   - Food Depot (2 locations)
 *   - Kroger (2 locations)
 *   - Publix (2 locations)
 *
 * Safe to run multiple times — uses upsert to avoid duplicates.
 *
 * Usage:
 *   node scripts/seed_atlanta_stores.js
 */

'use strict';

// Load environment variables
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { v4: uuidv4 } = require('uuid');

// ---------------------------------------------------------------------------
// Atlanta-area store data
// ---------------------------------------------------------------------------

const ATLANTA_STORES = [
  // ---- Food Depot ----------------------------------------------------------
  {
    chainName: 'Food Depot',
    storeName: 'Food Depot #1 Dallas',
    address: '154 W Memorial Dr',
    city: 'Dallas',
    state: 'GA',
    zipCode: '30132',
    latitude: 33.9237,
    longitude: -84.8407
  },
  {
    chainName: 'Food Depot',
    storeName: 'Food Depot #2 Hiram',
    address: '4355 Jimmy Lee Smith Pkwy',
    city: 'Hiram',
    state: 'GA',
    zipCode: '30141',
    latitude: 33.8753,
    longitude: -84.7634
  },

  // ---- Kroger --------------------------------------------------------------
  {
    chainName: 'Kroger',
    storeName: 'Kroger Dallas - Merchants Dr',
    address: '401 Merchants Dr',
    city: 'Dallas',
    state: 'GA',
    zipCode: '30132',
    latitude: 33.9213,
    longitude: -84.8465
  },
  {
    chainName: 'Kroger',
    storeName: 'Kroger Dallas - Nathan Dean Blvd',
    address: '463 Nathan Dean Blvd',
    city: 'Dallas',
    state: 'GA',
    zipCode: '30132',
    latitude: 33.9150,
    longitude: -84.8380
  },

  // ---- Publix --------------------------------------------------------------
  {
    chainName: 'Publix',
    storeName: 'Publix Dallas - Merchants Dr',
    address: '90 Merchants Dr',
    city: 'Dallas',
    state: 'GA',
    zipCode: '30132',
    latitude: 33.9205,
    longitude: -84.8450
  },
  {
    chainName: 'Publix',
    storeName: 'Publix Acworth - Hwy 92',
    address: '3100 Hwy 92',
    city: 'Acworth',
    state: 'GA',
    zipCode: '30102',
    latitude: 34.0489,
    longitude: -84.6897
  }
];

// ---------------------------------------------------------------------------
// Database setup
// ---------------------------------------------------------------------------

async function connectDatabase() {
  // Require database config after env vars are loaded
  const { sequelize } = require('../config/database');

  try {
    await sequelize.authenticate();
    console.log('Database connection established.');
    return sequelize;
  } catch (error) {
    console.error('Failed to connect to database:', error.message);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Upsert helper
// ---------------------------------------------------------------------------

/**
 * Upsert a single store record.
 * Match on (chainName + address + city) to avoid duplicates across runs.
 *
 * @param {object} Store - Sequelize Store model
 * @param {object} storeData - Plain store data object
 * @returns {Promise<{store: object, created: boolean}>}
 */
async function upsertStore(Store, storeData) {
  const { chainName, address, city, state, zipCode, latitude, longitude, storeName } = storeData;

  // Look for existing record by chain + address + city
  const [store, created] = await Store.findOrCreate({
    where: {
      chainName,
      address,
      city
    },
    defaults: {
      storeId: uuidv4(),
      chainName,
      storeName,
      address,
      city,
      state,
      zipCode,
      latitude,
      longitude
    }
  });

  if (!created) {
    // Update fields that might have changed (coordinates, storeName, zipCode)
    await store.update({
      storeName,
      state,
      zipCode,
      latitude,
      longitude
    });
  }

  return { store, created };
}

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------

async function seedAtlantaStores() {
  let sequelize;

  try {
    sequelize = await connectDatabase();
    const Store = require('../models/Store');

    console.log('\nSeeding Atlanta-area stores for ZIP 30132 pilot...\n');

    let created = 0;
    let updated = 0;
    let errors = 0;

    for (const storeData of ATLANTA_STORES) {
      try {
        const result = await upsertStore(Store, storeData);

        if (result.created) {
          created++;
          console.log(`  [CREATED] ${result.store.chainName} - ${result.store.storeName}`);
          console.log(`            ${result.store.address}, ${result.store.city}, ${result.store.state} ${result.store.zipCode}`);
          console.log(`            Lat: ${result.store.latitude}, Lng: ${result.store.longitude}`);
          console.log(`            ID: ${result.store.storeId}`);
        } else {
          updated++;
          console.log(`  [EXISTS]  ${result.store.chainName} - ${result.store.storeName} (updated coordinates/fields)`);
        }
      } catch (err) {
        errors++;
        console.error(`  [ERROR]   ${storeData.chainName} at ${storeData.address}: ${err.message}`);
      }
    }

    console.log('\n--- Seed Results ---');
    console.log(`  Created:  ${created} store(s)`);
    console.log(`  Updated:  ${updated} store(s)`);
    console.log(`  Errors:   ${errors}`);
    console.log(`  Total:    ${ATLANTA_STORES.length} store(s) processed`);

    // Summary by chain
    console.log('\n--- Stores by Chain ---');
    const chains = [...new Set(ATLANTA_STORES.map(s => s.chainName))];
    for (const chain of chains) {
      const count = ATLANTA_STORES.filter(s => s.chainName === chain).length;
      console.log(`  ${chain}: ${count} location(s)`);
    }

    console.log('\nAtlanta store seed complete.\n');

  } catch (error) {
    console.error('\nSeed failed:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exitCode = 1;
  } finally {
    if (sequelize) {
      await sequelize.close();
    }
  }
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

seedAtlantaStores();
