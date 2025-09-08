const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Product = sequelize.define('Product', {
  upc: {
    type: DataTypes.STRING(12),
    allowNull: false,
    unique: true,
    primaryKey: true
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
  }
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['name', 'brand']
    }
  ]
});

module.exports = Product;

