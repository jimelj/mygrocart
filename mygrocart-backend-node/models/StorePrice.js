const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StorePrice = sequelize.define('StorePrice', {
  priceId: {
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
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  dealType: {
    type: DataTypes.ENUM('regular', 'sale', 'clearance', 'coupon'),
    defaultValue: 'regular'
  },
  lastUpdated: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  }
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['upc', 'storeId']
    },
    {
      fields: ['storeId', 'lastUpdated']
    }
  ]
});

module.exports = StorePrice;

