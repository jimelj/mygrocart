const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Deal = sequelize.define('Deal', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  flyerId: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Foreign key to Flyer table'
  },
  storeName: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Denormalized store name for easy queries'
  },
  zipCode: {
    type: DataTypes.STRING(10),
    allowNull: false,
    comment: 'Denormalized ZIP code for easy queries'
  },
  productName: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Product name extracted from flyer (e.g., "Organic Whole Milk")'
  },
  productBrand: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Product brand if identified (e.g., "Horizon")'
  },
  productCategory: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Product category for filtering (e.g., "Dairy", "Meat")'
  },
  salePrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: {
        args: [0.01],
        msg: 'Sale price must be at least $0.01'
      },
      max: {
        args: [9999.99],
        msg: 'Sale price cannot exceed $9999.99'
      },
      isDecimal: {
        msg: 'Sale price must be a valid decimal number'
      }
    },
    comment: 'Sale price of the product'
  },
  regularPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: {
        args: [0.01],
        msg: 'Regular price must be at least $0.01'
      },
      max: {
        args: [9999.99],
        msg: 'Regular price cannot exceed $9999.99'
      },
      isDecimal: {
        msg: 'Regular price must be a valid decimal number'
      }
    },
    comment: 'Regular price before discount (if shown in flyer)'
  },
  unit: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'each',
    comment: 'Unit of measurement (e.g., "each", "lb", "/oz")'
  },
  dealType: {
    type: DataTypes.ENUM('sale', 'bogo', 'multi_buy', 'coupon', 'clearance'),
    allowNull: false,
    defaultValue: 'sale',
    comment: 'Type of deal'
  },
  quantity: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Quantity requirements for deal (e.g., "2 for $5", "Buy 1 Get 1")'
  },
  validFrom: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Start date of deal validity'
  },
  validTo: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'End date of deal validity'
  },
  confidence: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 0.0,
    validate: {
      min: 0.0,
      max: 1.0
    },
    comment: 'OCR confidence score (0-1)'
  },
  rawText: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Original OCR text for debugging and quality assurance'
  },
  imageUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Product image URL from OpenFoodFacts or other sources'
  }
}, {
  timestamps: true,
  hooks: {
    beforeValidate: (deal) => {
      if (deal.regularPrice && deal.salePrice && parseFloat(deal.regularPrice) <= parseFloat(deal.salePrice)) {
        throw new Error('Regular price must be greater than sale price');
      }
    }
  },
  indexes: [
    {
      fields: ['zipCode', 'productCategory'],
      name: 'idx_deal_zip_category'
    },
    {
      fields: ['flyerId'],
      name: 'idx_deal_flyer'
    },
    {
      fields: ['validTo'],
      name: 'idx_deal_valid_to'
    },
    {
      fields: ['productName'],
      name: 'idx_deal_product_name'
    },
    {
      fields: ['storeName'],
      name: 'idx_deal_store_name'
    }
  ]
});

module.exports = Deal;
