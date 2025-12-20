const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { User } = require('./models');

async function makeDemoAdmin() {
  try {
    // Update demo@mygrocart.com to be an admin
    const result = await User.update(
      { isAdmin: true },
      { where: { email: 'demo@mygrocart.com' } }
    );

    if (result[0] > 0) {
      console.log('✅ Successfully made demo@mygrocart.com an admin');
    } else {
      console.log('❌ No user found with email demo@mygrocart.com');

      // Try demo@test.com as fallback
      const result2 = await User.update(
        { isAdmin: true },
        { where: { email: 'demo@test.com' } }
      );

      if (result2[0] > 0) {
        console.log('✅ Successfully made demo@test.com an admin');
      } else {
        console.log('❌ No demo user found');
      }
    }

    // List all users to verify
    const users = await User.findAll({
      attributes: ['email', 'isAdmin']
    });
    console.log('\nAll users:');
    users.forEach(u => {
      console.log(`  ${u.email}: isAdmin=${u.isAdmin}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

makeDemoAdmin();
