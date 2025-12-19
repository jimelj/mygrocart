/**
 * @deprecated This model is from the old real-time scraping system.
 * Kept for reference. See PIVOT_PLAN_FLYER_OCR.md for new approach.
 * New system uses Deal model with weekly flyer OCR instead.
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PriceHistory = sequelize.define('PriceHistory', {
  historyId: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  upc: {
    type: DataTypes.STRING(12),
    allowNull: false,
    references: {
      model: 'Products',
      key: 'upc'
    }
  },
  storeId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Stores',
      key: 'storeId'
    }
  },
  zipCode: {
    type: DataTypes.STRING(10)
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  dealType: {
    type: DataTypes.STRING(50),
    defaultValue: 'regular'
  },
  inStock: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  scrapedAt: {
    type: DataTypes.DATE,
    allowNull: false
  }
}, {
  tableName: 'PriceHistory',
  timestamps: true,
  updatedAt: false, // Only need createdAt for historical records
  indexes: [
    {
      fields: ['upc', 'storeId']
    },
    {
      fields: ['scrapedAt']
    },
    {
      fields: ['upc', 'storeId', 'zipCode', 'scrapedAt']
    }
  ]
});

module.exports = PriceHistory;
