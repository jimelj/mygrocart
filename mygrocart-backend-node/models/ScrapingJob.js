/**
 * @deprecated This model is from the old real-time scraping system.
 * Kept for reference. See PIVOT_PLAN_FLYER_OCR.md for new approach.
 * New system uses scheduled flyer ingestion instead of on-demand scraping.
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ScrapingJob = sequelize.define('ScrapingJob', {
  jobId: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  upc: {
    type: DataTypes.STRING(12),
    allowNull: false
  },
  zipCode: {
    type: DataTypes.STRING(10),
    allowNull: false
  },
  storeIds: {
    type: DataTypes.ARRAY(DataTypes.UUID),
    allowNull: true,
    comment: 'Array of store IDs to scrape',
    validate: {
      isArrayOfUUIDs(value) {
        if (!value) return; // null is allowed

        if (!Array.isArray(value)) {
          throw new Error('storeIds must be an array');
        }

        // Validate each element is a valid UUID v4
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        value.forEach((id, index) => {
          if (!uuidRegex.test(id)) {
            throw new Error(`Invalid UUID at index ${index}: ${id}`);
          }
        });
      }
    }
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true, // Allow null for system-initiated jobs
    references: {
      model: 'Users',
      key: 'userId'
    }
  },
  status: {
    type: DataTypes.STRING(50),
    defaultValue: 'pending',
    validate: {
      isIn: [['pending', 'in_progress', 'completed', 'failed', 'cancelled']]
    }
  },
  priority: {
    type: DataTypes.STRING(20),
    defaultValue: 'normal',
    validate: {
      isIn: [['low', 'normal', 'high', 'urgent']]
    }
  },
  results: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'JSON object containing scraping results'
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  startedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'ScrapingJobs',
  timestamps: true,
  updatedAt: false, // Only need createdAt
  indexes: [
    {
      fields: ['status']
    },
    {
      fields: ['upc', 'zipCode']
    },
    {
      fields: ['userId']
    },
    {
      fields: ['priority', 'status']
    },
    {
      fields: ['createdAt']
    }
  ]
});

module.exports = ScrapingJob;
