/**
 * @deprecated This model is from the old real-time scraping system.
 * Kept for reference. See PIVOT_PLAN_FLYER_OCR.md for new approach.
 * New system processes weekly flyers on a schedule instead.
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PriceUpdateRequest = sequelize.define('PriceUpdateRequest', {
  requestId: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  upc: {
    type: DataTypes.STRING(50), // Match Product model (supports both real and pseudo UPCs)
    allowNull: false,
    references: {
      model: 'Products',
      key: 'upc'
    },
    comment: 'UPC of the product whose price needs updating'
  },
  requestedBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'userId'
    },
    comment: 'User who requested the price update'
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high'),
    defaultValue: 'medium',
    allowNull: false,
    comment: 'Priority level for processing this price update'
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed'),
    defaultValue: 'pending',
    allowNull: false,
    comment: 'Current status of the price update request'
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp when the price update was completed'
  }
}, {
  tableName: 'PriceUpdateRequests',
  timestamps: true,
  indexes: [
    {
      name: 'idx_price_update_status_priority',
      fields: ['status', 'priority'],
      comment: 'Efficient queue processing (fetch pending requests by priority)'
    },
    {
      name: 'idx_price_update_upc',
      fields: ['upc'],
      comment: 'Prevent duplicate requests for same product'
    },
    {
      name: 'idx_price_update_user',
      fields: ['requestedBy'],
      comment: 'User request history lookup'
    },
    {
      name: 'idx_price_update_created_at',
      fields: ['createdAt'],
      comment: 'Time-based ordering'
    }
  ]
});

module.exports = PriceUpdateRequest;
