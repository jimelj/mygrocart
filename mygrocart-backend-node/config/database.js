const { Sequelize } = require('sequelize');
const pg = require('pg');

// Enforce SSL at the driver level without disabling global TLS checks
// This is required for providers that use self-signed certs (e.g., Render Postgres)
pg.defaults.ssl = { require: true, rejectUnauthorized: false };

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
    } : {},
    pool: {
      max: 5,
      min: 0,
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
    } : {},
    pool: {
      max: 5,
      min: 0,
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
    
    // Sync models (creates tables if they don't exist)
    await sequelize.sync({ alter: true });
    console.log('Database synced');
  } catch (error) {
    console.error('Database connection error:', error);
    console.error('Error details:', error.message);
    console.error('Failing to start server due to database connection error');
    process.exit(1);
  }
};

module.exports = { connectDB, sequelize };

