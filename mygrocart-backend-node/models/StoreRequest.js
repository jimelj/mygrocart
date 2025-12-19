const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StoreRequest = sequelize.define('StoreRequest', {
  requestId: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true, // Allow null for anonymous requests
    references: {
      model: 'Users',
      key: 'userId'
    }
  },
  storeName: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  storeChain: {
    type: DataTypes.STRING(100)
  },
  address: {
    type: DataTypes.TEXT
  },
  zipCode: {
    type: DataTypes.STRING(10)
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 8)
  },
  longitude: {
    type: DataTypes.DECIMAL(11, 8)
  },
  requestCount: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  status: {
    type: DataTypes.STRING(50),
    defaultValue: 'pending',
    validate: {
      isIn: [['pending', 'approved', 'rejected', 'completed']]
    }
  }
}, {
  tableName: 'StoreRequests',
  timestamps: true,
  indexes: [
    {
      fields: ['status']
    },
    {
      fields: ['userId']
    },
    {
      fields: ['zipCode']
    }
  ]
});

module.exports = StoreRequest;
