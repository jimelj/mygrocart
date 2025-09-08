const { Sequelize } = require('sequelize');

// Simple configuration that works with Render
const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgresql://localhost:5432/mygrocart', {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production' ? {
      require: true,
      rejectUnauthorized: false
    } : false
  },
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
    console.log('Server will continue without database connection...');
    console.log('Authentication will use sample data until database is fixed');
  }
};

module.exports = { connectDB, sequelize };

