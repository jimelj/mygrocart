/**
 * Weekly Flyer Refresh Job
 * Run via cron: 0 6 * * 0 (Sundays at 6 AM)
 *
 * Process:
 * 1. Clean up expired flyers (validTo < now) and their deals
 * 2. Fetch new flyers from WeeklyAds2 API for each user's ZIP code
 * 3. Skip flyers that already exist (same flyerRunId)
 * 4. Download tiles from CDN, stitch into full pages, upload to Cloudinary
 * 5. Extract deals via OCR and save to database
 *
 * Images are served from Cloudinary CDN - no re-processing on user refresh
 *
 * Usage: node scripts/weekly_flyer_refresh.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { sequelize } = require('../config/database');
const { User, Flyer } = require('../models');
const { Op } = require('sequelize');
const FlyerService = require('../services/FlyerService');

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('[weekly_flyer_refresh] Unhandled Rejection:', reason);
  process.exit(1);
});

const flyerService = new FlyerService();

const main = async () => {
  try {
    await refreshFlyers();
  } catch (error) {
    console.error('[weekly_flyer_refresh] Fatal error:', error.message);
    process.exit(1);
  }
};

async function refreshFlyers() {
  console.log('=== Weekly Flyer Refresh Started ===');
  console.log(`Time: ${new Date().toISOString()}`);

  try {
    // Step 1: Clean up expired flyers (validTo < now)
    const Deal = require('../models/Deal');
    const expiredFlyers = await Flyer.findAll({
      where: { validTo: { [Op.lt]: new Date() } },
      attributes: ['id', 'storeName', 'validTo']
    });

    if (expiredFlyers.length > 0) {
      console.log(`\nCleaning up ${expiredFlyers.length} expired flyers...`);
      const expiredIds = expiredFlyers.map(f => f.id);

      // Delete deals first (foreign key constraint)
      const dealsDeleted = await Deal.destroy({
        where: { flyerId: { [Op.in]: expiredIds } }
      });

      // Delete expired flyers
      const flyersDeleted = await Flyer.destroy({
        where: { id: { [Op.in]: expiredIds } }
      });

      console.log(`  Deleted ${flyersDeleted} expired flyers and ${dealsDeleted} associated deals`);
    }

    // Step 2: Get unique ZIP codes from all users
    const users = await User.findAll({
      attributes: ['zipCode'],
      where: { zipCode: { [Op.ne]: null } },
      group: ['zipCode']
    });

    const zipCodes = users.map(u => u.zipCode).filter(Boolean);
    console.log(`Found ${zipCodes.length} unique ZIP codes`);

    const results = {
      processed: 0,
      newFlyers: 0,
      newDeals: 0,
      errors: []
    };

    for (const zipCode of zipCodes) {
      console.log(`\nProcessing ZIP: ${zipCode}`);

      try {
        const summary = await flyerService.processZipCode(zipCode);
        results.processed++;
        results.newFlyers += summary.newFlyers || 0;
        results.newDeals += summary.totalDeals || 0;

        console.log(`  - ${summary.newFlyers} new flyers, ${summary.totalDeals} deals`);
      } catch (error) {
        console.error(`  - Error: ${error.message}`);
        results.errors.push({ zipCode, error: error.message });
      }

      // Delay between ZIP codes to avoid rate limits
      await new Promise(r => setTimeout(r, 2000));
    }

    console.log('\n=== Weekly Flyer Refresh Complete ===');
    console.log(`Processed: ${results.processed} ZIP codes`);
    console.log(`New Flyers: ${results.newFlyers}`);
    console.log(`New Deals: ${results.newDeals}`);
    console.log(`Errors: ${results.errors.length}`);

    return results;

  } catch (error) {
    console.error('Fatal error:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { refreshFlyers };
