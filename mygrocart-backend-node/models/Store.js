const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Store = sequelize.define('Store', {
  storeId: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  chainName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  storeName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  address: {
    type: DataTypes.STRING,
    allowNull: false
  },
  city: {
    type: DataTypes.STRING,
    allowNull: false
  },
  state: {
    type: DataTypes.STRING,
    allowNull: false
  },
  zipCode: {
    type: DataTypes.STRING,
    allowNull: false
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true
  },
  longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true
  },
  externalStoreId: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: "Store chain's internal ID (e.g., Target: '2055', ShopRite: '3000')"
  }
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['latitude', 'longitude']
    }
  ]
});

module.exports = Store;

