const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * UserListItem - New shopping list model for flyer-based deal matching
 * Replaces UPC-based UserList with flexible item name + variant approach
 */
const UserListItem = sequelize.define('UserListItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Foreign key to User table'
  },
  itemName: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Base item name (e.g., "Milk", "Chicken")'
  },
  itemVariant: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Optional variant specification (e.g., "organic", "whole", null for "any")'
  },
  category: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Product category for grouping (e.g., "Dairy", "Meat", "Produce")'
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: 1
    },
    comment: 'Quantity of items needed'
  },
  checked: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether item has been checked off the list'
  }
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['userId'],
      name: 'idx_userlistitem_user'
    },
    {
      fields: ['itemName'],
      name: 'idx_userlistitem_name'
    },
    {
      fields: ['category'],
      name: 'idx_userlistitem_category'
    }
  ]
});

module.exports = UserListItem;
