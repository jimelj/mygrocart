const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserList = sequelize.define('UserList', {
  listItemId: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'userId'
    }
  },
  upc: {
    type: DataTypes.STRING(12),
    allowNull: false,
    references: {
      model: 'Products',
      key: 'upc'
    }
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: 1
    }
  }
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['userId', 'upc'],
      unique: true
    }
  ]
});

module.exports = UserList;

