// Central export point for all Sequelize models
// This ensures all models are loaded and registered with Sequelize before sync

const User = require('./User');
const Product = require('./Product');
const Store = require('./Store');
const StorePrice = require('./StorePrice');
const UserList = require('./UserList');

// NEW: Flyer-based models (Weekly OCR system)
const Flyer = require('./Flyer');
const Deal = require('./Deal');
const UserListItem = require('./UserListItem');
const UserNotification = require('./UserNotification');

// Phase 2 models (DEPRECATED - see PIVOT_PLAN_FLYER_OCR.md)
const PriceHistory = require('./PriceHistory');
const StoreRequest = require('./StoreRequest');
const ScrapingJob = require('./ScrapingJob');

// Progressive Discovery models (DEPRECATED - see PIVOT_PLAN_FLYER_OCR.md)
const ProductRequest = require('./ProductRequest');
const PriceUpdateRequest = require('./PriceUpdateRequest');

// Define associations

// =============================================================================
// NEW FLYER-BASED ASSOCIATIONS
// =============================================================================

// Flyer associations
Flyer.belongsTo(Store, { foreignKey: 'storeId', as: 'store' });
Flyer.hasMany(Deal, { foreignKey: 'flyerId', as: 'deals' });

Store.hasMany(Flyer, { foreignKey: 'storeId', as: 'flyers' });

// Deal associations
Deal.belongsTo(Flyer, { foreignKey: 'flyerId', as: 'flyer' });

// UserListItem associations
UserListItem.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(UserListItem, { foreignKey: 'userId', as: 'listItems' });

// UserNotification associations
UserNotification.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(UserNotification, { foreignKey: 'userId', as: 'notifications' });

// =============================================================================
// DEPRECATED ASSOCIATIONS (kept for backward compatibility)
// =============================================================================

// PriceHistory associations
PriceHistory.belongsTo(Product, { foreignKey: 'upc', as: 'product' });
PriceHistory.belongsTo(Store, { foreignKey: 'storeId', as: 'store' });

Product.hasMany(PriceHistory, { foreignKey: 'upc', as: 'priceHistory' });
Store.hasMany(PriceHistory, { foreignKey: 'storeId', as: 'priceHistory' });

// StoreRequest associations
StoreRequest.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(StoreRequest, { foreignKey: 'userId', as: 'storeRequests' });

// ScrapingJob associations
ScrapingJob.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(ScrapingJob, { foreignKey: 'userId', as: 'scrapingJobs' });

// Existing associations (if not already defined)
UserList.belongsTo(User, { foreignKey: 'userId', as: 'user' });
UserList.belongsTo(Product, { foreignKey: 'upc', as: 'product' });

User.hasMany(UserList, { foreignKey: 'userId', as: 'groceryLists' });
Product.hasMany(UserList, { foreignKey: 'upc', as: 'userLists' });

// StorePrice associations
StorePrice.belongsTo(Product, { foreignKey: 'upc', as: 'product' });
StorePrice.belongsTo(Store, { foreignKey: 'storeId', as: 'store' });

Product.hasMany(StorePrice, { foreignKey: 'upc', as: 'storePrices' });
Store.hasMany(StorePrice, { foreignKey: 'storeId', as: 'storePrices' });

// ProductRequest associations
ProductRequest.belongsTo(User, { foreignKey: 'requestedBy', as: 'user' });
User.hasMany(ProductRequest, { foreignKey: 'requestedBy', as: 'productRequests' });

// PriceUpdateRequest associations
PriceUpdateRequest.belongsTo(User, { foreignKey: 'requestedBy', as: 'user' });
PriceUpdateRequest.belongsTo(Product, { foreignKey: 'upc', targetKey: 'upc', as: 'product' });
User.hasMany(PriceUpdateRequest, { foreignKey: 'requestedBy', as: 'priceUpdateRequests' });
Product.hasMany(PriceUpdateRequest, { foreignKey: 'upc', sourceKey: 'upc', as: 'priceUpdateRequests' });

module.exports = {
  // Core models
  User,
  Product,
  Store,
  StorePrice,
  UserList,

  // NEW: Flyer-based models
  Flyer,
  Deal,
  UserListItem,
  UserNotification,

  // DEPRECATED: Old scraping system models (kept for backward compatibility)
  PriceHistory,
  StoreRequest,
  ScrapingJob,
  ProductRequest,
  PriceUpdateRequest
};
