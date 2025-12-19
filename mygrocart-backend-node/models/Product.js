const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Product = sequelize.define('Product', {
  upc: {
    type: DataTypes.STRING(50), // Increased from 12 to support pseudo-UPCs (e.g., TGT12955065) and real UPCs
    allowNull: false,
    unique: true,
    primaryKey: true,
    comment: 'UPC barcode - can be real UPC (12 digits) or pseudo-UPC (e.g., TGT{tcin} for Target products)'
  },
  tcin: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'Target Catalog Item Number (TCIN) - Target\'s internal product ID'
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  brand: {
    type: DataTypes.STRING
  },
  size: {
    type: DataTypes.STRING
  },
  category: {
    type: DataTypes.STRING
  },
  imageUrl: {
    type: DataTypes.STRING
  },
  isEnriched: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'True if product has been enriched with real UPC via OpenFoodFacts API'
  },
  lastPriceUpdate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp of when prices for this product were last scraped'
  },
  searchCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
    validate: {
      min: 0
    },
    comment: 'Number of times this product has been searched for'
  },
  timesInShoppingLists: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
    validate: {
      min: 0
    },
    comment: 'Number of times this product appears in shopping lists (popularity metric)'
  },
  priceDiscoveryCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
    validate: {
      min: 0
    },
    comment: 'Number of stores that have price data for this product'
  },
  updatePriority: {
    type: DataTypes.ENUM('high', 'medium', 'low'),
    defaultValue: 'medium',
    allowNull: false,
    comment: 'Priority level for scraping price updates (based on popularity and staleness)'
  }
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['name', 'brand']
    },
    {
      fields: ['tcin']
    },
    {
      name: 'idx_product_last_price_update',
      fields: ['lastPriceUpdate'],
      comment: 'Find products with stale prices'
    },
    {
      name: 'idx_product_search_count',
      fields: [{ name: 'searchCount', order: 'DESC' }],
      comment: 'Find most popular products'
    },
    {
      name: 'idx_product_update_priority',
      fields: ['updatePriority'],
      comment: 'Prioritized scraping queue'
    }
  ]
});

module.exports = Product;

