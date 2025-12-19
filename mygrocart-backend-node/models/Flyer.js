const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Flyer = sequelize.define('Flyer', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  storeId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Foreign key to Store table (nullable for now during migration)'
  },
  storeName: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Store chain name (e.g., "Target", "ShopRite")'
  },
  storeSlug: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'URL-friendly store identifier (e.g., "target", "shoprite")'
  },
  flyerRunId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    comment: 'Unique identifier from WeeklyAds2 API'
  },
  flyerName: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Flyer type name (e.g., "Weekly Circular", "Bonus Savings")'
  },
  zipCode: {
    type: DataTypes.STRING(10),
    allowNull: false,
    comment: 'ZIP code this flyer applies to'
  },
  imageUrls: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    comment: 'Array of Cloudinary URLs for flyer pages'
  },
  flyerPath: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Original path from WeeklyAds2 API (for reference)'
  },
  validFrom: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Start date of flyer validity period'
  },
  validTo: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'End date of flyer validity period'
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
    allowNull: false,
    defaultValue: 'pending',
    comment: 'Processing status of the flyer'
  },
  processedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp when OCR processing completed'
  }
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['zipCode', 'storeName'],
      name: 'idx_flyer_zip_store'
    },
    {
      fields: ['flyerRunId'],
      unique: true,
      name: 'idx_flyer_run_id'
    },
    {
      fields: ['validTo'],
      name: 'idx_flyer_valid_to'
    },
    {
      fields: ['storeId'],
      name: 'idx_flyer_store_id'
    }
  ]
});

module.exports = Flyer;
