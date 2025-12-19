/**
 * Daily Digest Notification Job
 * Run via cron: 0 8 * * * (Daily at 8 AM)
 *
 * Usage: node scripts/send_daily_digest.js
 */

require('dotenv').config();
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { User, UserListItem, Deal, UserNotification } = require('../models');
const { matchDealsToListItem } = require('../utils/DealMatcher');

async function sendDailyDigests() {
  console.log('=== Daily Digest Started ===');
  console.log(`Time: ${new Date().toISOString()}`);

  try {
    // Get users with notifications enabled and unchecked list items
    const users = await User.findAll({
      where: {
        notificationsEnabled: true,
        zipCode: { [Op.ne]: null }
      }
    });

    console.log(`Found ${users.length} users with notifications enabled`);

    let notificationsSent = 0;

    for (const user of users) {
      // Get user's unchecked list items
      const listItems = await UserListItem.findAll({
        where: { userId: user.id, checked: false }
      });

      if (listItems.length === 0) continue;

      // Get current deals for user's ZIP
      const deals = await Deal.findAll({
        where: {
          zipCode: user.zipCode,
          validTo: { [Op.gte]: new Date() }
        }
      });

      if (deals.length === 0) continue;

      // Match deals to list items
      const allMatches = [];
      for (const item of listItems) {
        const matches = matchDealsToListItem(item, deals);
        if (matches.length > 0) {
          allMatches.push({ item, matches });
        }
      }

      if (allMatches.length === 0) continue;

      // Create notification record
      const notification = await UserNotification.create({
        userId: user.id,
        type: 'daily_digest',
        title: `${allMatches.length} items on your list are on sale!`,
        body: allMatches.slice(0, 3).map(m => m.item.itemName).join(', ') +
              (allMatches.length > 3 ? ` + ${allMatches.length - 3} more` : ''),
        matchedDealIds: allMatches.flatMap(m => m.matches.slice(0, 3).map(match => match.deal.id)),
        sentAt: new Date()
      });

      // TODO: Send actual push notification via Expo
      // await sendExpoPushNotification(user.expoPushToken, notification);

      console.log(`  Notification created for user ${user.id}: ${allMatches.length} items matched`);
      notificationsSent++;
    }

    console.log('\n=== Daily Digest Complete ===');
    console.log(`Notifications sent: ${notificationsSent}`);

    return { notificationsSent };

  } catch (error) {
    console.error('Fatal error:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run if called directly
if (require.main === module) {
  sendDailyDigests()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { sendDailyDigests };
