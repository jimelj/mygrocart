/**
 * @deprecated This model is from the old real-time scraping system.
 * Kept for reference. See PIVOT_PLAN_FLYER_OCR.md for new approach.
 * New system uses weekly flyer OCR with Deal model instead.
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ProductRequest = sequelize.define('ProductRequest', {
  requestId: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  productName: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'The product name/search term that the user requested'
  },
  requestedBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'userId'
    },
    comment: 'User who requested this product'
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
    defaultValue: 'pending',
    allowNull: false,
    comment: 'Current status of the product request'
  },
  attempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
    validate: {
      min: 0
    },
    comment: 'Number of times we have attempted to scrape this product'
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp when the request was completed (successfully or failed)'
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Error message if the request failed'
  }
}, {
  tableName: 'ProductRequests',
  timestamps: true,
  indexes: [
    {
      name: 'idx_product_request_status',
      fields: ['status'],
      comment: 'Fast lookup for pending requests'
    },
    {
      name: 'idx_product_request_created_at',
      fields: ['createdAt'],
      comment: 'FIFO processing order'
    },
    {
      name: 'idx_product_request_user',
      fields: ['requestedBy'],
      comment: 'User request history lookup'
    },
    {
      name: 'idx_product_request_status_created',
      fields: ['status', 'createdAt'],
      comment: 'Composite index for efficient queue processing'
    }
  ]
});

module.exports = ProductRequest;
