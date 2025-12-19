/**
 * Migration: Add price discovery fields
 *
 * Adds:
 * - Store.externalStoreId
 * - Product.priceDiscoveryCount
 */

require('dotenv').config();
const { sequelize } = require('../config/database');

async function runMigration() {
  console.log('========================================');
  console.log('Running Migration: Add Discovery Fields');
  console.log('========================================\n');

  try {
    // Connect to database
    console.log('🔌 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Add externalStoreId to Stores table
    console.log('📝 Adding external StoreId column to Stores table...');
    try {
      await sequelize.query(`
        ALTER TABLE "Stores"
        ADD COLUMN IF NOT EXISTS "externalStoreId" VARCHAR(20);
      `);
      console.log('✅ Added externalStoreId column\n');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('⏭️  Column externalStoreId already exists\n');
      } else {
        throw error;
      }
    }

    // Add priceDiscoveryCount to Products table
    console.log('📝 Adding priceDiscoveryCount column to Products table...');
    try {
      await sequelize.query(`
        ALTER TABLE "Products"
        ADD COLUMN IF NOT EXISTS "priceDiscoveryCount" INTEGER DEFAULT 0 NOT NULL;
      `);
      console.log('✅ Added priceDiscoveryCount column\n');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('⏭️  Column priceDiscoveryCount already exists\n');
      } else {
        throw error;
      }
    }

    console.log('========================================');
    console.log('✅ Migration completed successfully!');
    console.log('========================================\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

runMigration();
