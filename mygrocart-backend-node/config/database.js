const { Sequelize } = require('sequelize');

// Parse DATABASE_URL to handle SSL properly
const databaseUrl = process.env.DATABASE_URL || 'postgresql://localhost:5432/mygrocart';
const isProduction = process.env.NODE_ENV === 'production';

const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  logging: false, // Set to console.log to see SQL queries
  dialectOptions: isProduction ? {
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

const connectDB = async () => {
  try {
    console.log('Attempting to connect to database...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
    console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
    
    await sequelize.authenticate();
    console.log('PostgreSQL Connected');
    
    // Sync models (creates tables if they don't exist)
    await sequelize.sync({ alter: true });
    console.log('Database synced');
  } catch (error) {
    console.error('Database connection error:', error);
    console.error('Error details:', error.message);
    if (process.env.NODE_ENV === 'production') {
      console.error('Failing to start server due to database connection error');
      process.exit(1);
    } else {
      console.log('Continuing with in-memory data for development...');
    }
  }
};

module.exports = { connectDB, sequelize };

