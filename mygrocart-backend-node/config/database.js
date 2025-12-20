const { Sequelize } = require('sequelize');
const pg = require('pg');

// Enforce SSL at the driver level ONLY in production
// This is required for providers that use self-signed certs (e.g., Render Postgres)
// In development, local PostgreSQL typically doesn't support SSL
if (process.env.NODE_ENV === 'production') {
  pg.defaults.ssl = { require: true, rejectUnauthorized: false };
}

// Handle DATABASE_URL with SSL parameters
const databaseUrl = process.env.DATABASE_URL || 'postgresql://localhost:5432/mygrocart';

// Parse URL and build a config object to avoid driver interpreting query params
let sequelize;
try {
  const parsed = new URL(databaseUrl);
  const username = decodeURIComponent(parsed.username || '');
  const password = decodeURIComponent(parsed.password || '');
  const host = parsed.hostname || 'localhost';
  const port = parsed.port ? Number(parsed.port) : 5432;
  const database = (parsed.pathname || '').replace(/^\//, '') || 'mygrocart';

  sequelize = new Sequelize(database, username, password, {
    host,
    port,
    dialect: 'postgres',
    dialectModule: pg,
    logging: false,
    dialectOptions: process.env.NODE_ENV === 'production' ? {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    } : {
      ssl: false
    },
    pool: {
      max: 20,     // Increased from 5 to support more concurrent requests
      min: 5,      // Increased from 0 to keep warm connections ready
      acquire: 30000,
      idle: 10000
    }
  });
} catch (e) {
  // Fallback to URL form if parsing fails
  sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    dialectModule: pg,
    logging: false,
    dialectOptions: process.env.NODE_ENV === 'production' ? {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    } : {
      ssl: false
    },
    pool: {
      max: 20,     // Increased from 5 to support more concurrent requests
      min: 5,      // Increased from 0 to keep warm connections ready
      acquire: 30000,
      idle: 10000
    }
  });
}

const connectDB = async () => {
  try {
    console.log('Attempting to connect to database...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
    console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
    console.log('Database URL being used:', (process.env.DATABASE_URL || '').replace(/\/\/.*@/, '//***:***@')); // Hide credentials in logs

    await sequelize.authenticate();
    console.log('PostgreSQL Connected');

    // Load all models before sync (ensures all models are registered)
    require('../models');

    // Check if Products table exists (if it does, schema is already set up)
    const [results] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'Products'
      );
    `);

    const tablesExist = results[0].exists;

    if (tablesExist) {
      console.log('Database schema already exists, skipping sync');
    } else {
      // Only sync if tables don't exist (fresh database)
      await sequelize.sync();
      console.log('Database synced');
    }

    // Ensure demo user is an admin (for testing/demo purposes)
    try {
      const User = require('../models/User');
      const [updated] = await User.update(
        { isAdmin: true },
        { where: { email: 'demo@mygrocart.com' } }
      );
      if (updated > 0) {
        console.log('Demo user set as admin');
      }
    } catch (adminErr) {
      console.log('Could not set demo user as admin:', adminErr.message);
    }
  } catch (error) {
    console.error('Database connection error:', error);
    console.error('Error details:', error.message);
    console.log('Database connection failed, using sample data for development');
    throw error; // Re-throw to let server handle gracefully
  }
};

module.exports = { connectDB, sequelize };

