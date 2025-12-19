const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserNotification = sequelize.define('UserNotification', {
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
  type: {
    type: DataTypes.ENUM('daily_digest', 'deal_alert'),
    allowNull: false,
    comment: 'Type of notification sent to user'
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Notification title/subject'
  },
  body: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Notification body/message'
  },
  matchedDealIds: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
    comment: 'Array of Deal IDs that triggered this notification'
  },
  sentAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Timestamp when notification was sent'
  },
  readAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp when user read/acknowledged notification'
  }
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['userId', 'sentAt'],
      name: 'idx_notification_user_sent'
    },
    {
      fields: ['type'],
      name: 'idx_notification_type'
    },
    {
      fields: ['readAt'],
      name: 'idx_notification_read'
    }
  ]
});

module.exports = UserNotification;
