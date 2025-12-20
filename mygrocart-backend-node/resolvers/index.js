const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { calculateDistance } = require('../utils/distance');
const sampleData = require('../utils/sampleData');
const { Op, fn, col, literal } = require('sequelize');

// Import Sequelize models
const User = require('../models/User');
const { Product, StorePrice, Store, Flyer, Deal, UserListItem, UserNotification } = require('../models');
const { enrichWithStoreBrandInfo } = require('../utils/StoreBrandMatcher');

// Import services
const DynamicPriceDiscoveryService = require('../services/DynamicPriceDiscoveryService');
const discoveryService = new DynamicPriceDiscoveryService();
const ProgressiveDiscoveryService = require('../services/ProgressiveDiscoveryService');
const progressiveDiscoveryService = new ProgressiveDiscoveryService();
const FlyerService = require('../services/FlyerService');
const flyerService = new FlyerService();
const flyerQueue = require('../services/FlyerQueue');

/**
 * Check if flyers exist for a ZIP code, and fetch them if not.
 * Uses the job queue for controlled processing (non-blocking).
 * @param {string} zipCode - The ZIP code to check
 */
async function ensureFlyersForZip(zipCode) {
  if (!zipCode) return;

  try {
    // Check if we have any non-expired flyers for this ZIP
    const existingFlyers = await Flyer.count({
      where: {
        zipCode,
        validTo: { [Op.gte]: new Date() }
      }
    });

    if (existingFlyers === 0) {
      // No flyers for this ZIP - add to queue for processing
      console.log(`[ensureFlyersForZip] No flyers for ZIP ${zipCode}, adding to processing queue...`);

      const result = await flyerQueue.addJob(zipCode, {
        triggeredBy: 'user-auth',
        priority: 'normal'
      });

      console.log(`[ensureFlyersForZip] ZIP ${zipCode} queue status: ${result.status} - ${result.message}`);
      return;
    }

    // We have some flyers - check if there are missing ones (interrupted fetch)
    console.log(`[ensureFlyersForZip] ZIP ${zipCode} has ${existingFlyers} active flyers, checking for missing...`);

    // Run the completion check in the background (non-blocking)
    setImmediate(async () => {
      try {
        const status = await flyerService.getFlyerStatusForZip(zipCode);

        if (status.missingCount > 0) {
          console.log(`[ensureFlyersForZip] ZIP ${zipCode} has ${status.missingCount} missing flyers (${status.storedInDb}/${status.availableFromApi}), triggering completion...`);

          // Use checkAndCompleteFlyersForZip to fetch missing flyers
          const result = await flyerService.checkAndCompleteFlyersForZip(zipCode);
          console.log(`[ensureFlyersForZip] Completion result for ZIP ${zipCode}: ${result.message}`);
        } else {
          console.log(`[ensureFlyersForZip] ZIP ${zipCode} has all ${status.storedInDb} flyers, no action needed`);
        }
      } catch (completionError) {
        console.error(`[ensureFlyersForZip] Completion check failed for ZIP ${zipCode}:`, completionError.message);
      }
    });

  } catch (error) {
    console.error(`[ensureFlyersForZip] Error checking flyers for ZIP ${zipCode}:`, error.message);
  }
}

// Helper function to generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'fallback-secret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// Helper function to require admin access
const requireAdmin = (user) => {
  if (!user) {
    throw new Error('Authentication required');
  }
  if (!user.isAdmin) {
    throw new Error('Admin access required');
  }
};

// Helper function to mock geocoding (in production, use Google Maps API)
const mockGeocode = (address, city, state, zipCode) => {
  // Return NYC coordinates as default
  return {
    latitude: 40.7128 + (Math.random() - 0.5) * 0.1, // Add some variation
    longitude: -74.0060 + (Math.random() - 0.5) * 0.1
  };
};

const resolvers = {
  Query: {
    me: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      try {
        const dbUser = await User.findByPk(user.userId);
        return dbUser || sampleData.users.find(u => u.userId === user.userId);
      } catch (error) {
        console.log('Database error, using sample data:', error.message);
        return sampleData.users.find(u => u.userId === user.userId);
      }
    },

    searchProducts: async (_, { query, limit = 20, offset = 0 }, context) => {
      // Authentication required
      if (!context.user) {
        throw new Error('Authentication required');
      }

      try {
        const searchTerm = query.toLowerCase();

        // Get user context for zipCode and radius (if authenticated)
        let zipCode = '10001'; // Default NYC ZIP
        let radius = 10; // Default 10 miles

        if (context.user) {
          try {
            const user = await User.findByPk(context.user.userId);
            if (user) {
              zipCode = user.zipCode;
              radius = user.travelRadiusMiles;
              console.log(`[searchProducts] Using user's location: ZIP ${zipCode}, radius ${radius} miles`);
            }
          } catch (error) {
            console.warn('[searchProducts] Could not fetch user location, using defaults:', error.message);
          }
        } else {
          console.log('[searchProducts] No authenticated user, using default location');
        }

        // Search the Deals table (populated by Weekly Flyer OCR)
        // The Products table is empty - all data comes from flyer deals
        console.log('[searchProducts] Searching Deals table for:', searchTerm);

        const { count, rows } = await Deal.findAndCountAll({
          where: {
            [Op.and]: [
              {
                [Op.or]: [
                  { productName: { [Op.iLike]: `%${searchTerm}%` } },
                  { productBrand: { [Op.iLike]: `%${searchTerm}%` } }
                ]
              },
              // Only show currently valid deals
              { validTo: { [Op.gte]: new Date() } }
            ]
          },
          limit,
          offset,
          order: [['productName', 'ASC']]
        });

        const totalPages = Math.ceil(count / limit);
        const currentPage = Math.floor(offset / limit) + 1;

        // Transform Deals to Product format for frontend compatibility
        const products = rows.map(deal => {
          const plainDeal = deal.get({ plain: true });
          return {
            upc: plainDeal.id, // Use deal ID as UPC placeholder
            name: plainDeal.productName,
            brand: plainDeal.productBrand || 'Unknown',
            size: plainDeal.unit || null,
            category: plainDeal.productCategory || null,
            imageUrl: plainDeal.imageUrl || null,
            // Create a storePrices array with the deal's store/price
            storePrices: [{
              price: parseFloat(plainDeal.salePrice),
              regularPrice: plainDeal.regularPrice ? parseFloat(plainDeal.regularPrice) : null,
              store: {
                storeId: plainDeal.storeName.toLowerCase().replace(/\s+/g, '-'),
                chainName: plainDeal.storeName,
                name: plainDeal.storeName
              },
              lastUpdated: plainDeal.updatedAt
            }],
            createdAt: plainDeal.createdAt,
            updatedAt: plainDeal.updatedAt
          };
        });

        console.log(`[searchProducts] Found ${count} deals matching "${searchTerm}"`);

        return {
          products,
          totalCount: count,
          hasNextPage: offset + limit < count,
          hasPreviousPage: offset > 0,
          currentPage,
          totalPages,
          limit
        };
      } catch (error) {
        console.error('[searchProducts] Error:', error);
        console.error(error.stack);
        // Return empty results on error instead of crashing
        return {
          products: [],
          totalCount: 0,
          hasNextPage: false,
          hasPreviousPage: false,
          currentPage: 1,
          totalPages: 0,
          limit
        };
      }
    },

    getProductByUpc: async (_, { upc }, { user }) => {
      if (!user) {
        throw new Error('Authentication required');
      }
      return sampleData.products.find(product => product.upc === upc);
    },

    getUserGroceryLists: async (_, { userId }, { user }) => {
      // Authentication and authorization required
      if (!user) {
        throw new Error('Authentication required');
      }
      if (user.userId !== userId) {
        throw new Error('Unauthorized: Cannot access another user\'s shopping list');
      }

      try {
        // Query database for user's shopping list items
        const UserList = require('../models/UserList');
        const userItems = await UserList.findAll({
          where: { userId },
          include: [{ model: Product, as: 'product', required: false }],
          order: [['createdAt', 'DESC']]
        });

        // Return database results with plain objects
        return userItems.map(item => item.get({ plain: true }));
      } catch (error) {
        console.error('Error fetching grocery lists from database:', error.message);
        // Fallback to sample data
        const userItems = sampleData.userLists.filter(item => item.userId === userId);
        return userItems.map(item => ({
          ...item,
          product: sampleData.products.find(p => p.upc === item.upc)
        }));
      }
    },

    comparePrices: async (_, { userId }, { user }) => {
      // Authentication and authorization required
      if (!user) {
        throw new Error('Authentication required');
      }
      if (user.userId !== userId) {
        throw new Error('Unauthorized: Cannot compare prices for another user');
      }

      try {
        // 1. Get user from database
        const dbUser = await User.findByPk(userId);
        if (!dbUser) throw new Error('User not found');

        // 2. Get user's shopping list items from database
        const UserList = require('../models/UserList');
        const userItems = await UserList.findAll({
          where: { userId },
          include: [{ model: Product, as: 'product' }]
        });

        if (userItems.length === 0) {
          // Return empty comparison if no items in list
          return {
            userId,
            stores: [],
            cheapestStore: null,
            maxSavings: 0,
            message: 'No items in shopping list'
          };
        }

        const totalItems = userItems.length;

        // 3. Get all stores from database
        const allStores = await Store.findAll();

        // 4. Filter stores within travel radius
        const nearbyStores = allStores.filter(store => {
          const distance = calculateDistance(
            dbUser.latitude, dbUser.longitude,
            store.latitude, store.longitude
          );
          return distance <= dbUser.travelRadiusMiles;
        });

        if (nearbyStores.length === 0) {
          // No stores in range
          return {
            userId,
            stores: [],
            cheapestStore: null,
            maxSavings: 0,
            message: 'No stores within travel radius'
          };
        }

        // 5. Get UPCs from shopping list
        const upcsInList = userItems.map(item => item.upc);

        // 6. Get all prices for these products at nearby stores
        const storePrices = await StorePrice.findAll({
          where: {
            upc: upcsInList,
            storeId: nearbyStores.map(s => s.storeId)
          },
          include: [
            { model: Product, as: 'product' },
            { model: Store, as: 'store' }
          ]
        });

        // 7. Calculate total cost per store
        const storeComparisons = [];
        let minTotal = Infinity;

        for (const store of nearbyStores) {
          let totalCost = 0;
          let itemCount = 0;
          const missingItems = [];

          for (const item of userItems) {
            const priceRecord = storePrices.find(
              price => price.upc === item.upc && price.storeId === store.storeId
            );

            if (priceRecord) {
              totalCost += parseFloat(priceRecord.price) * item.quantity;
              itemCount++;
            } else {
              // Track missing items
              missingItems.push({
                name: item.product ? item.product.name : 'Unknown Product',
                upc: item.upc,
                quantity: item.quantity
              });
            }
          }

          // Only include stores that have at least one item in stock
          if (itemCount > 0) {
            const completionPercentage = (itemCount / totalItems) * 100;

            storeComparisons.push({
              store: store.get({ plain: true }),
              totalCost: parseFloat(totalCost.toFixed(2)),
              itemCount,
              totalItems,
              completionPercentage: parseFloat(completionPercentage.toFixed(2)),
              missingItems
            });

            minTotal = Math.min(minTotal, totalCost);
          }
        }

        if (storeComparisons.length === 0) {
          // No stores have pricing for any items
          return {
            userId,
            stores: [],
            cheapestStore: null,
            maxSavings: 0,
            message: 'No pricing data available for your items'
          };
        }

        // 8. Calculate savings and mark cheapest
        const maxTotal = Math.max(...storeComparisons.map(comp => comp.totalCost));

        const stores = storeComparisons
          .map(comparison => {
            const savings = maxTotal - comparison.totalCost;
            const savingsPercentage = maxTotal > 0 ? (savings / maxTotal) * 100 : 0;

            return {
              store: comparison.store,
              totalCost: comparison.totalCost,
              itemCount: comparison.itemCount,
              totalItems: comparison.totalItems,
              completionPercentage: comparison.completionPercentage,
              missingItems: comparison.missingItems,
              isCheapest: comparison.totalCost === minTotal,
              savings: parseFloat(savings.toFixed(2)),
              savingsPercentage: parseFloat(savingsPercentage.toFixed(2))
            };
          })
          .sort((a, b) => a.totalCost - b.totalCost);

        // Find cheapest store
        const cheapestStore = stores.find(s => s.isCheapest);

        return {
          userId,
          stores,
          cheapestStore: cheapestStore ? cheapestStore.store.storeName : null,
          maxSavings: parseFloat((maxTotal - minTotal).toFixed(2)),
          message: `Found ${stores.length} stores with pricing for your items`
        };

      } catch (error) {
        console.error('Error in comparePrices:', error.message);
        console.error(error.stack);

        // Fallback to sample data if database fails
        let user;
        try {
          user = await User.findByPk(userId);
          if (!user) {
            user = sampleData.users.find(u => u.userId === userId);
          }
        } catch (error) {
          user = sampleData.users.find(u => u.userId === userId);
        }

        if (!user) throw new Error('User not found');

        let userItems = sampleData.userLists.filter(item => item.userId === userId);

        if (userItems.length === 0) {
          userItems = [
            { listItemId: `demo-item-1-${userId}`, userId, upc: '123456789012', quantity: 2, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
            { listItemId: `demo-item-2-${userId}`, userId, upc: '123456789013', quantity: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
            { listItemId: `demo-item-3-${userId}`, userId, upc: '123456789014', quantity: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
          ];
        }

        const totalItems = userItems.length;
        const nearbyStores = sampleData.stores.filter(store => {
          const distance = calculateDistance(user.latitude, user.longitude, store.latitude, store.longitude);
          return distance <= user.travelRadiusMiles;
        });

        const storeComparisons = [];
        let minTotal = Infinity;

        for (const store of nearbyStores) {
          let totalCost = 0;
          let itemCount = 0;
          const missingItems = [];

          for (const item of userItems) {
            const priceRecord = sampleData.storePrices.find(price => price.upc === item.upc && price.storeId === store.storeId);
            if (priceRecord) {
              totalCost += priceRecord.price * item.quantity;
              itemCount++;
            } else {
              const product = sampleData.products.find(p => p.upc === item.upc);
              missingItems.push({
                name: product ? product.name : 'Unknown Product',
                upc: item.upc,
                quantity: item.quantity
              });
            }
          }

          if (itemCount > 0) {
            const distance = calculateDistance(user.latitude, user.longitude, store.latitude, store.longitude);
            const completionPercentage = (itemCount / totalItems) * 100;
            storeComparisons.push({
              store,
              totalCost,
              itemCount,
              totalItems,
              completionPercentage: parseFloat(completionPercentage.toFixed(2)),
              missingItems
            });
            minTotal = Math.min(minTotal, totalCost);
          }
        }

        const maxTotal = Math.max(...storeComparisons.map(comp => comp.totalCost));
        const stores = storeComparisons
          .map(comparison => {
            const savings = maxTotal - comparison.totalCost;
            const savingsPercentage = maxTotal > 0 ? (savings / maxTotal) * 100 : 0;
            return {
              store: comparison.store,
              totalCost: comparison.totalCost,
              itemCount: comparison.itemCount,
              totalItems: comparison.totalItems,
              completionPercentage: comparison.completionPercentage,
              missingItems: comparison.missingItems,
              isCheapest: comparison.totalCost === minTotal,
              savings: parseFloat(savings.toFixed(2)),
              savingsPercentage: parseFloat(savingsPercentage.toFixed(2))
            };
          })
          .sort((a, b) => a.totalCost - b.totalCost);

        const cheapestStore = stores.find(s => s.isCheapest);
        return {
          userId,
          stores,
          cheapestStore: cheapestStore ? cheapestStore.store.storeName : null,
          maxSavings: parseFloat((maxTotal - minTotal).toFixed(2)),
          message: `Found ${stores.length} stores (using sample data)`
        };
      }
    },

    getStorePrices: async (_, { storeId, upcs }, { user }) => {
      if (!user) {
        throw new Error('Authentication required');
      }
      return sampleData.storePrices
        .filter(price => price.storeId === storeId && upcs.includes(price.upc))
        .map(price => ({
          ...price,
          product: sampleData.products.find(p => p.upc === price.upc),
          store: sampleData.stores.find(s => s.storeId === price.storeId)
        }));
    },

    // ===================================================================
    // NEW FLYER-BASED QUERIES
    // ===================================================================

    getDealsNearMe: async (_, { zipCode, radiusMiles = 10, category, limit = 20, offset = 0 }, { user }) => {
      try {
        if (!user) {
          throw new Error('Authentication required');
        }

        const where = {
          zipCode,
          validTo: { [Op.gte]: new Date() }
        };

        if (category) {
          where.productCategory = category;
        }

        // Cap limit at 100 to prevent excessive queries
        const cappedLimit = Math.min(limit, 100);

        const { count, rows } = await Deal.findAndCountAll({
          where,
          include: [
            {
              model: Flyer,
              as: 'flyer',
              include: [{ model: Store, as: 'store', required: false }]
            }
          ],
          order: [['salePrice', 'ASC']],
          limit: cappedLimit,
          offset
        });

        const totalPages = Math.ceil(count / cappedLimit);
        const currentPage = Math.floor(offset / cappedLimit) + 1;

        // Transform dealType to uppercase to match GraphQL enum
        const dealTypeMap = {
          'sale': 'SALE',
          'bogo': 'BOGO',
          'multi_buy': 'MULTI_BUY',
          'coupon': 'COUPON',
          'clearance': 'CLEARANCE'
        };

        const deals = rows.map(deal => {
          const plainDeal = deal.get({ plain: true });
          return {
            ...plainDeal,
            dealType: dealTypeMap[plainDeal.dealType?.toLowerCase()] || 'SALE',
            // Ensure dates are ISO strings for GraphQL
            validFrom: plainDeal.validFrom ? new Date(plainDeal.validFrom).toISOString() : null,
            validTo: plainDeal.validTo ? new Date(plainDeal.validTo).toISOString() : null,
            savings: plainDeal.regularPrice
              ? parseFloat((plainDeal.regularPrice - plainDeal.salePrice).toFixed(2))
              : null,
            savingsPercent: plainDeal.regularPrice
              ? parseFloat((((plainDeal.regularPrice - plainDeal.salePrice) / plainDeal.regularPrice) * 100).toFixed(0))
              : null
          };
        });

        return {
          deals,
          totalCount: count,
          hasNextPage: offset + rows.length < count,
          hasPreviousPage: offset > 0,
          currentPage,
          totalPages
        };
      } catch (error) {
        console.error('[getDealsNearMe] Error:', error.message);
        throw new Error('Failed to fetch deals');
      }
    },

    getDealsForStore: async (_, { storeId, category, limit = 20, offset = 0 }, { user }) => {
      try {
        if (!user) {
          throw new Error('Authentication required');
        }

        const where = {
          validTo: { [Op.gte]: new Date() }
        };

        if (category) {
          where.productCategory = category;
        }

        // Cap limit at 100 to prevent excessive queries
        const cappedLimit = Math.min(limit, 100);

        const { count, rows } = await Deal.findAndCountAll({
          include: [
            {
              model: Flyer,
              as: 'flyer',
              where: { storeId },
              include: [{ model: Store, as: 'store' }]
            }
          ],
          where,
          order: [['salePrice', 'ASC']],
          limit: cappedLimit,
          offset
        });

        const totalPages = Math.ceil(count / cappedLimit);
        const currentPage = Math.floor(offset / cappedLimit) + 1;

        const dealTypeMap = {
          'sale': 'SALE',
          'bogo': 'BOGO',
          'multi_buy': 'MULTI_BUY',
          'coupon': 'COUPON',
          'clearance': 'CLEARANCE'
        };

        const deals = rows.map(deal => {
          const plainDeal = deal.get({ plain: true });
          return {
            ...plainDeal,
            dealType: dealTypeMap[plainDeal.dealType?.toLowerCase()] || 'SALE',
            validFrom: plainDeal.validFrom ? new Date(plainDeal.validFrom).toISOString() : null,
            validTo: plainDeal.validTo ? new Date(plainDeal.validTo).toISOString() : null,
            savings: plainDeal.regularPrice
              ? parseFloat((plainDeal.regularPrice - plainDeal.salePrice).toFixed(2))
              : null,
            savingsPercent: plainDeal.regularPrice
              ? parseFloat((((plainDeal.regularPrice - plainDeal.salePrice) / plainDeal.regularPrice) * 100).toFixed(0))
              : null
          };
        });

        return {
          deals,
          totalCount: count,
          hasNextPage: offset + rows.length < count,
          hasPreviousPage: offset > 0,
          currentPage,
          totalPages
        };
      } catch (error) {
        console.error('[getDealsForStore] Error:', error.message, error.stack);
        throw new Error('Failed to fetch deals for store');
      }
    },

    searchDeals: async (_, { query, zipCode, limit = 20, offset = 0 }, { user }) => {
      try {
        if (!user) {
          throw new Error('Authentication required');
        }

        const searchTerm = query.toLowerCase();

        // Cap limit at 100 to prevent excessive queries
        const cappedLimit = Math.min(limit, 100);

        const { count, rows } = await Deal.findAndCountAll({
          where: {
            zipCode,
            productName: { [Op.iLike]: `%${searchTerm}%` },
            validTo: { [Op.gte]: new Date() }
          },
          include: [
            {
              model: Flyer,
              as: 'flyer',
              include: [{ model: Store, as: 'store', required: false }]
            }
          ],
          order: [['salePrice', 'ASC']],
          limit: cappedLimit,
          offset
        });

        const totalPages = Math.ceil(count / cappedLimit);
        const currentPage = Math.floor(offset / cappedLimit) + 1;

        const dealTypeMap = {
          'sale': 'SALE',
          'bogo': 'BOGO',
          'multi_buy': 'MULTI_BUY',
          'coupon': 'COUPON',
          'clearance': 'CLEARANCE'
        };

        const deals = rows.map(deal => {
          const plainDeal = deal.get({ plain: true });
          return {
            ...plainDeal,
            dealType: dealTypeMap[plainDeal.dealType?.toLowerCase()] || 'SALE',
            validFrom: plainDeal.validFrom ? new Date(plainDeal.validFrom).toISOString() : null,
            validTo: plainDeal.validTo ? new Date(plainDeal.validTo).toISOString() : null,
            savings: plainDeal.regularPrice
              ? parseFloat((plainDeal.regularPrice - plainDeal.salePrice).toFixed(2))
              : null,
            savingsPercent: plainDeal.regularPrice
              ? parseFloat((((plainDeal.regularPrice - plainDeal.salePrice) / plainDeal.regularPrice) * 100).toFixed(0))
              : null
          };
        });

        return {
          deals,
          totalCount: count,
          hasNextPage: offset + rows.length < count,
          hasPreviousPage: offset > 0,
          currentPage,
          totalPages
        };
      } catch (error) {
        console.error('[searchDeals] Error:', error.message, error.stack);
        throw new Error('Failed to search deals');
      }
    },

    getFlyer: async (_, { flyerId }, { user }) => {
      try {
        if (!user) {
          throw new Error('Authentication required');
        }

        const flyer = await Flyer.findByPk(flyerId, {
          include: [
            { model: Store, as: 'store', required: false },
            {
              model: Deal,
              as: 'deals',
              where: { validTo: { [Op.gte]: new Date() } },
              required: false
            }
          ]
        });

        return flyer ? flyer.get({ plain: true }) : null;
      } catch (error) {
        // Log detailed error internally
        console.error('[getFlyer] Error:', error.message, error.stack);

        // Return generic error to client
        return null;
      }
    },

    getCurrentFlyers: async (_, { zipCode, radiusMiles = 10 }, { user }) => {
      try {
        if (!user) {
          throw new Error('Authentication required');
        }

        const flyers = await Flyer.findAll({
          where: {
            zipCode,
            validTo: { [Op.gte]: new Date() },
            status: 'completed'
          },
          include: [
            { model: Store, as: 'store', required: false },
            {
              model: Deal,
              as: 'deals',
              required: false
            }
          ],
          order: [['validFrom', 'DESC']]
        });

        // Transform status to uppercase for GraphQL enum
        const statusMap = {
          'pending': 'PENDING',
          'processing': 'PROCESSING',
          'completed': 'COMPLETED',
          'failed': 'FAILED'
        };

        return flyers.map(flyer => {
          const plainFlyer = flyer.get({ plain: true });
          return {
            ...plainFlyer,
            status: statusMap[plainFlyer.status?.toLowerCase()] || 'COMPLETED'
          };
        });
      } catch (error) {
        // Log detailed error internally
        console.error('[getCurrentFlyers] Error:', error.message, error.stack);

        // Return generic error to client
        return [];
      }
    },

    getMyListWithDeals: async (_, { userId }, { user }) => {
      try {
        if (!user || user.userId !== userId) {
          throw new Error('Unauthorized');
        }

        const listItems = await UserListItem.findAll({
          where: { userId, checked: false },
          include: [{ model: User, as: 'user' }],
          order: [['createdAt', 'ASC']]
        });

        return listItems.map(item => item.get({ plain: true }));
      } catch (error) {
        // Log detailed error internally
        console.error('[getMyListWithDeals] Error:', error.message, error.stack);

        // Return generic error to client
        return [];
      }
    },

    matchDealsToMyList: async (_, { userId }, { user }) => {
      try {
        if (!user || user.userId !== userId) {
          throw new Error('Unauthorized');
        }

        const dbUser = await User.findByPk(userId);
        if (!dbUser) {
          throw new Error('User not found');
        }

        const listItems = await UserListItem.findAll({
          where: { userId, checked: false }
        });

        if (listItems.length === 0) {
          return [];
        }

        const deals = await Deal.findAll({
          where: {
            zipCode: dbUser.zipCode,
            validTo: { [Op.gte]: new Date() }
          },
          include: [
            {
              model: Flyer,
              as: 'flyer',
              include: [{ model: Store, as: 'store', required: false }]
            }
          ]
        });

        const matches = [];

        for (const item of listItems) {
          const itemPlain = item.get({ plain: true });

          for (const deal of deals) {
            const dealPlain = deal.get({ plain: true });
            const dealText = dealPlain.productName.toLowerCase();
            const itemName = itemPlain.itemName.toLowerCase();
            const variant = itemPlain.itemVariant?.toLowerCase();

            if (!dealText.includes(itemName)) continue;
            if (variant && !dealText.includes(variant)) continue;

            const score = variant && dealText.includes(variant) ? 1.0 : 0.5;

            matches.push({
              deal: {
                ...dealPlain,
                // Convert dealType to uppercase for GraphQL enum
                dealType: (dealPlain.dealType || 'sale').toUpperCase(),
                savings: dealPlain.regularPrice
                  ? parseFloat((dealPlain.regularPrice - dealPlain.salePrice).toFixed(2))
                  : null,
                savingsPercent: dealPlain.regularPrice
                  ? parseFloat((((dealPlain.regularPrice - dealPlain.salePrice) / dealPlain.regularPrice) * 100).toFixed(0))
                  : null
              },
              listItem: itemPlain,
              matchScore: score,
              matchReason: variant
                ? `Matches "${itemName}" + "${variant}"`
                : `Matches "${itemName}"`
            });
          }
        }

        return matches.sort((a, b) => b.matchScore - a.matchScore);
      } catch (error) {
        // Log detailed error internally
        console.error('[matchDealsToMyList] Error:', error.message, error.stack);

        // Return generic error to client
        return [];
      }
    },

    // Store deals ranking - ranks stores by how many list items have deals
    getStoreDealsRanking: async (_, { userId }, { user }) => {
      try {
        if (!user || user.userId !== userId) {
          throw new Error('Unauthorized');
        }

        const dbUser = await User.findByPk(userId);
        if (!dbUser) {
          throw new Error('User not found');
        }

        // Get user's unchecked list items
        const listItems = await UserListItem.findAll({
          where: { userId, checked: false }
        });

        if (listItems.length === 0) {
          return {
            rankings: [],
            bestStore: null,
            totalPotentialSavings: 0,
            listItemCount: 0,
            message: 'Add items to your shopping list to see store rankings'
          };
        }

        // Get current deals for user's ZIP
        const deals = await Deal.findAll({
          where: {
            zipCode: dbUser.zipCode,
            validTo: { [Op.gte]: new Date() }
          }
        });

        if (deals.length === 0) {
          return {
            rankings: [],
            bestStore: null,
            totalPotentialSavings: 0,
            listItemCount: listItems.length,
            message: 'No current deals available for your area'
          };
        }

        // Step 1: For each list item, find all matching deals and track best price per item
        const itemDealsMap = new Map(); // itemId -> { itemName, deals: [{ storeName, salePrice, ... }] }
        const storeDealsMap = new Map(); // storeName -> { deals: [], totalCost: 0 }

        for (const item of listItems) {
          const itemName = item.itemName.toLowerCase();
          const variant = item.itemVariant?.toLowerCase();
          const itemKey = item.id;

          if (!itemDealsMap.has(itemKey)) {
            itemDealsMap.set(itemKey, {
              itemName: item.itemName + (item.itemVariant ? ` (${item.itemVariant})` : ''),
              deals: []
            });
          }

          for (const deal of deals) {
            const dealPlain = deal.get({ plain: true });
            const dealText = dealPlain.productName.toLowerCase();

            // Check if deal matches this list item
            if (!dealText.includes(itemName)) continue;
            if (variant && !dealText.includes(variant)) continue;

            // Track this deal for the item
            itemDealsMap.get(itemKey).deals.push({
              storeName: dealPlain.storeName,
              productName: dealPlain.productName,
              salePrice: dealPlain.salePrice,
              regularPrice: dealPlain.regularPrice
            });
          }
        }

        // Step 2: Find the lowest price for each item across all stores
        const lowestPricePerItem = new Map(); // itemId -> lowestPrice
        for (const [itemId, itemData] of itemDealsMap) {
          if (itemData.deals.length > 0) {
            const prices = itemData.deals.map(d => d.salePrice).filter(p => p != null && !isNaN(p));
            if (prices.length > 0) {
              const lowestPrice = Math.min(...prices);
              lowestPricePerItem.set(itemId, lowestPrice);
            }
          }
        }

        // Step 3: Build store data with total cost and savings vs lowest
        for (const [itemId, itemData] of itemDealsMap) {
          const lowestPrice = lowestPricePerItem.get(itemId) || 0;

          for (const deal of itemData.deals) {
            // Skip deals without valid sale price
            if (deal.salePrice == null || isNaN(deal.salePrice)) continue;

            const storeName = deal.storeName || 'Unknown Store';

            if (!storeDealsMap.has(storeName)) {
              storeDealsMap.set(storeName, {
                storeName,
                matchedItems: new Map(), // itemId -> deal info (use best price per item per store)
                totalCost: 0
              });
            }

            const storeData = storeDealsMap.get(storeName);

            // Only keep the best (lowest) price per item per store
            const existingDeal = storeData.matchedItems.get(itemId);
            if (!existingDeal || deal.salePrice < existingDeal.salePrice) {
              const salePrice = parseFloat(deal.salePrice) || 0;
              const regularPrice = deal.regularPrice ? parseFloat(deal.regularPrice) : null;

              storeData.matchedItems.set(itemId, {
                listItemName: itemData.itemName,
                dealProductName: deal.productName || 'Unknown Product',
                salePrice: salePrice,
                regularPrice: regularPrice,
                lowestPrice: lowestPrice,
                // Savings vs regular price (if available)
                savings: regularPrice ? parseFloat((regularPrice - salePrice).toFixed(2)) : null,
                savingsPercent: regularPrice
                  ? parseFloat((((regularPrice - salePrice) / regularPrice) * 100).toFixed(0))
                  : null,
                // Is this the lowest price across all stores?
                isBestPrice: salePrice === lowestPrice
              });
            }
          }
        }

        // Step 4: Calculate totals for each store
        for (const storeData of storeDealsMap.values()) {
          storeData.totalCost = 0;
          for (const deal of storeData.matchedItems.values()) {
            storeData.totalCost += deal.salePrice;
          }
        }

        // Step 5: Find the store with lowest total cost (among stores with full coverage)
        const storesWithFullCoverage = Array.from(storeDealsMap.values())
          .filter(s => s.matchedItems.size === listItems.length);

        let lowestTotalCost = null;
        if (storesWithFullCoverage.length > 0) {
          lowestTotalCost = Math.min(...storesWithFullCoverage.map(s => s.totalCost));
        } else if (storeDealsMap.size > 0) {
          // If no store has full coverage, use lowest cost among all
          lowestTotalCost = Math.min(...Array.from(storeDealsMap.values()).map(s => s.totalCost));
        }

        // Step 6: Convert map to array and calculate rankings
        const rankings = Array.from(storeDealsMap.values())
          .map(store => {
            const deals = Array.from(store.matchedItems.values());
            const totalSavings = deals.reduce((sum, d) => sum + (d.savings || 0), 0);
            const totalCost = store.totalCost || 0;

            return {
              storeName: store.storeName,
              matchedItemCount: store.matchedItems.size,
              totalListItems: listItems.length,
              matchPercentage: parseFloat(((store.matchedItems.size / listItems.length) * 100).toFixed(0)) || 0,
              totalCost: parseFloat(totalCost.toFixed(2)) || 0,
              totalSavings: parseFloat(totalSavings.toFixed(2)) || 0, // Savings vs regular prices
              deals: deals,
              isBestValue: false // Will be set below
            };
          })
          // Sort by: 1) matched items (desc), 2) lowest total cost (asc)
          .sort((a, b) => {
            if (b.matchedItemCount !== a.matchedItemCount) {
              return b.matchedItemCount - a.matchedItemCount;
            }
            return a.totalCost - b.totalCost; // Lower cost is better
          });

        // Mark best value store (most matches + lowest cost)
        if (rankings.length > 0) {
          rankings[0].isBestValue = true;
        }

        // Calculate total potential savings = lowest total cost store's savings
        const totalPotentialSavings = rankings.length > 0 ? (rankings[0].totalSavings || 0) : 0;

        return {
          rankings,
          bestStore: rankings.length > 0 ? rankings[0].storeName : null,
          totalPotentialSavings: parseFloat((totalPotentialSavings || 0).toFixed(2)),
          listItemCount: listItems.length,
          message: rankings.length > 0
            ? `Found deals at ${rankings.length} stores for your list`
            : 'No matching deals found for your list items'
        };
      } catch (error) {
        console.error('[getStoreDealsRanking] Error:', error.message, error.stack);
        return {
          rankings: [],
          bestStore: null,
          totalPotentialSavings: 0,
          listItemCount: 0,
          message: 'Error loading store rankings'
        };
      }
    },

    getMyNotifications: async (_, { userId, limit = 20 }, { user }) => {
      try {
        if (!user || user.userId !== userId) {
          throw new Error('Unauthorized');
        }

        const notifications = await UserNotification.findAll({
          where: { userId },
          include: [{ model: User, as: 'user' }],
          order: [['sentAt', 'DESC']],
          limit
        });

        return notifications.map(notif => notif.get({ plain: true }));
      } catch (error) {
        // Log detailed error internally
        console.error('[getMyNotifications] Error:', error.message, error.stack);

        // Return generic error to client
        return [];
      }
    },

    // ===================================================================
    // ADMIN QUERIES
    // ===================================================================

    // Admin stats query (expected by frontend)
    getAdminStats: async (_, { zipCode }, { user }) => {
      try {
        requireAdmin(user);

        const where = {};
        if (zipCode) {
          where.zipCode = zipCode;
        }

        // Get total flyers count
        const totalFlyers = await Flyer.count({ where });

        // Get total deals count
        const dealWhere = zipCode ? { zipCode } : {};
        const totalDeals = await Deal.count({ where: dealWhere });

        // Get processing jobs count (from queue status)
        let processingJobs = 0;
        try {
          const queueStatus = await flyerQueue.getQueueStatus();
          if (queueStatus.enabled && queueStatus.counts) {
            processingJobs = queueStatus.counts.active + queueStatus.counts.waiting;
          }
        } catch (err) {
          console.warn('[getAdminStats] Could not get queue status:', err.message);
        }

        // Get active stores (stores with valid flyers)
        const activeStoresResult = await Flyer.findAll({
          where: {
            ...where,
            validTo: { [Op.gte]: new Date() }
          },
          attributes: [[literal('COUNT(DISTINCT "storeName")'), 'count']],
          raw: true
        });
        const activeStores = parseInt(activeStoresResult[0]?.count) || 0;

        // Get flyers grouped by store
        const flyersByStore = await Flyer.findAll({
          where,
          attributes: [
            'storeName',
            [fn('COUNT', col('id')), 'count']
          ],
          group: ['storeName'],
          raw: true
        });

        // Get deals grouped by store
        const dealsByStore = await Deal.findAll({
          where: dealWhere,
          attributes: [
            'storeName',
            [fn('COUNT', col('id')), 'count']
          ],
          group: ['storeName'],
          raw: true
        });

        return {
          totalFlyers,
          totalDeals,
          activeStores: parseInt(activeStores),
          processingJobs,
          lastRefreshTime: new Date().toISOString(),
          flyersByStore: flyersByStore.map(f => ({ storeName: f.storeName, count: parseInt(f.count) })),
          dealsByStore: dealsByStore.map(d => ({ storeName: d.storeName, count: parseInt(d.count) }))
        };
      } catch (error) {
        console.error('[getAdminStats] Error:', error.message, error.stack);
        throw new Error('Failed to fetch admin stats');
      }
    },

    // Processing jobs query (expected by frontend)
    getProcessingJobs: async (_, { status, limit = 50 }, { user }) => {
      try {
        requireAdmin(user);

        // Query FlyerQueue job history
        const queueStatus = await flyerQueue.getQueueStatus();

        if (!queueStatus.enabled) {
          return [];
        }

        // Combine active, waiting, and recent history
        const jobs = [];

        // Active jobs
        if (queueStatus.activeJobs) {
          queueStatus.activeJobs.forEach(job => {
            jobs.push({
              id: job.id || `active-${job.zipCode}`,
              type: 'flyer-fetch',
              zipCode: job.zipCode,
              status: 'processing',
              errorMessage: null,
              createdAt: job.addedAt || new Date().toISOString(),
              completedAt: null
            });
          });
        }

        // Waiting jobs
        if (queueStatus.waitingJobs) {
          queueStatus.waitingJobs.forEach(job => {
            jobs.push({
              id: job.id || `waiting-${job.zipCode}`,
              type: 'flyer-fetch',
              zipCode: job.zipCode,
              status: 'queued',
              errorMessage: null,
              createdAt: job.addedAt || new Date().toISOString(),
              completedAt: null
            });
          });
        }

        // Recent history
        if (queueStatus.recentHistory) {
          queueStatus.recentHistory.forEach(job => {
            jobs.push({
              id: job.id || `history-${job.zipCode}`,
              type: 'flyer-fetch',
              zipCode: job.zipCode,
              status: job.status,
              errorMessage: job.result?.error || null,
              createdAt: job.completedAt || new Date().toISOString(),
              completedAt: job.completedAt
            });
          });
        }

        // Filter by status if requested
        let filtered = jobs;
        if (status) {
          filtered = jobs.filter(j => j.status === status);
        }

        // Apply limit
        return filtered.slice(0, limit);
      } catch (error) {
        console.error('[getProcessingJobs] Error:', error.message, error.stack);
        return [];
      }
    },

    // Get all flyers (expected by frontend with totalCount)
    getAllFlyers: async (_, { zipCode, limit = 50, offset = 0 }, { user }) => {
      try {
        requireAdmin(user);

        const where = {};
        if (zipCode) {
          where.zipCode = zipCode;
        }

        const { count, rows } = await Flyer.findAndCountAll({
          where,
          include: [
            { model: Store, as: 'store', required: false },
            { model: Deal, as: 'deals', required: false }
          ],
          order: [['createdAt', 'DESC']],
          limit,
          offset
        });

        // Transform status to uppercase for GraphQL enum
        const statusMap = {
          'pending': 'PENDING',
          'processing': 'PROCESSING',
          'completed': 'COMPLETED',
          'failed': 'FAILED'
        };

        const flyers = rows.map(flyer => {
          const plainFlyer = flyer.get({ plain: true });
          return {
            ...plainFlyer,
            status: statusMap[plainFlyer.status?.toLowerCase()] || 'COMPLETED',
            dealCount: plainFlyer.deals?.length || 0,
            processedAt: plainFlyer.updatedAt || plainFlyer.createdAt
          };
        });

        return {
          flyers,
          totalCount: count
        };
      } catch (error) {
        console.error('[getAllFlyers] Error:', error.message, error.stack);
        return {
          flyers: [],
          totalCount: 0
        };
      }
    },

    // Check flyer completion status for a ZIP code
    getFlyerCompletionStatus: async (_, { zipCode }, { user }) => {
      try {
        requireAdmin(user);

        // Validate ZIP code
        if (!zipCode || !/^\d{5}$/.test(zipCode)) {
          return {
            zipCode: zipCode || '',
            availableFromApi: 0,
            storedInDb: 0,
            missingCount: 0,
            isComplete: true,
            stores: []
          };
        }

        const result = await flyerService.getFlyerStatusForZip(zipCode);

        return {
          zipCode: result.zipCode,
          availableFromApi: result.availableFromApi || 0,
          storedInDb: result.storedInDb || 0,
          missingCount: result.missingCount || 0,
          isComplete: result.isComplete !== false,
          stores: result.stores || []
        };
      } catch (error) {
        console.error('[getFlyerCompletionStatus] Error:', error.message, error.stack);
        return {
          zipCode,
          availableFromApi: 0,
          storedInDb: 0,
          missingCount: 0,
          isComplete: true,
          stores: []
        };
      }
    },

    adminGetQueueStatus: async (_, __, { user }) => {
      try {
        requireAdmin(user);

        // Get queue status from FlyerQueue
        const status = await flyerQueue.getQueueStatus();
        return status;
      } catch (error) {
        console.error('[adminGetQueueStatus] Error:', error.message);
        return {
          enabled: false,
          message: error.message
        };
      }
    },

    adminGetFlyerStats: async (_, { zipCode }, { user }) => {
      try {
        requireAdmin(user);

        const where = {};
        if (zipCode) {
          where.zipCode = zipCode;
        }

        // Get total flyers count
        const totalFlyers = await Flyer.count({ where });

        // Get total deals count
        const dealWhere = zipCode ? { zipCode } : {};
        const totalDeals = await Deal.count({ where: dealWhere });

        // Get flyers grouped by store
        const flyersByStore = await Flyer.findAll({
          where,
          attributes: [
            'storeName',
            [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
          ],
          group: ['storeName'],
          raw: true
        });

        // Get deals grouped by store
        const dealsByStore = await Deal.findAll({
          where: dealWhere,
          attributes: [
            'storeName',
            [fn('COUNT', col('id')), 'count']
          ],
          group: ['storeName'],
          raw: true
        });

        return {
          totalFlyers,
          totalDeals,
          flyersByStore: flyersByStore.map(f => ({ storeName: f.storeName, count: parseInt(f.count) })),
          dealsByStore: dealsByStore.map(d => ({ storeName: d.storeName, count: parseInt(d.count) })),
          lastRefreshTime: new Date().toISOString()
        };
      } catch (error) {
        console.error('[adminGetFlyerStats] Error:', error.message, error.stack);
        throw new Error('Failed to fetch flyer stats');
      }
    },

    adminGetAllFlyers: async (_, { zipCode, status, limit = 50, offset = 0 }, { user }) => {
      try {
        requireAdmin(user);

        const where = {};
        if (zipCode) {
          where.zipCode = zipCode;
        }
        if (status) {
          where.status = status.toLowerCase();
        }

        const flyers = await Flyer.findAll({
          where,
          include: [
            { model: Store, as: 'store', required: false },
            { model: Deal, as: 'deals', required: false }
          ],
          order: [['createdAt', 'DESC']],
          limit,
          offset
        });

        // Transform status to uppercase for GraphQL enum
        const statusMap = {
          'pending': 'PENDING',
          'processing': 'PROCESSING',
          'completed': 'COMPLETED',
          'failed': 'FAILED'
        };

        return flyers.map(flyer => {
          const plainFlyer = flyer.get({ plain: true });
          return {
            ...plainFlyer,
            status: statusMap[plainFlyer.status?.toLowerCase()] || 'COMPLETED'
          };
        });
      } catch (error) {
        console.error('[adminGetAllFlyers] Error:', error.message, error.stack);
        return [];
      }
    }
  },

  Mutation: {
    signup: async (_, { email, password, address, city, state, zipCode, travelRadiusMiles }) => {
      try {
        // Check if user already exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
          throw new Error('User with this email already exists');
        }

        // Mock geocoding
        const { latitude, longitude } = mockGeocode(address, city, state, zipCode);

        // Create new user (password will be hashed by the model hook)
        const newUser = await User.create({
          email,
          password,
          address,
          city,
          state,
          zipCode,
          latitude,
          longitude,
          travelRadiusMiles
        });

        // Generate token
        const token = generateToken(newUser.userId);

        // Trigger flyer fetch for this ZIP code if none exist (runs in background)
        ensureFlyersForZip(zipCode);

        // Return user without password
        const { password: userPassword, ...userWithoutPassword } = newUser.toJSON();
        return {
          token,
          user: userWithoutPassword
        };
      } catch (error) {
        console.error('Signup error:', error.message);
        
        // Handle validation errors
        if (error.name === 'SequelizeValidationError') {
          const messages = error.errors.map(err => err.message).join(', ');
          throw new Error(messages);
        }
        
        // Handle unique constraint errors
        if (error.name === 'SequelizeUniqueConstraintError') {
          throw new Error('An account with this email already exists');
        }
        
        // Re-throw other errors
        throw error;
      }
    },

    login: async (_, { email, password }) => {
      const user = await User.findOne({ where: { email } });
      if (!user) {
        throw new Error('Invalid email or password');
      }

      const isValidPassword = await user.comparePassword(password);
      if (!isValidPassword) {
        throw new Error('Invalid email or password');
      }

      const token = generateToken(user.userId);

      // Trigger flyer fetch for this ZIP code if none exist (runs in background)
      ensureFlyersForZip(user.zipCode);

      const { password: userPassword, ...userWithoutPassword } = user.toJSON();

      return {
        token,
        user: userWithoutPassword
      };
    },

    updateTravelRadius: async (_, { travelRadiusMiles }, context) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      // Validate radius is between 5 and 15 miles
      if (travelRadiusMiles < 5 || travelRadiusMiles > 15) {
        throw new Error('Travel radius must be between 5 and 15 miles');
      }

      const user = await User.findOne({ where: { userId: context.user.userId } });
      if (!user) {
        throw new Error('User not found');
      }

      user.travelRadiusMiles = travelRadiusMiles;
      await user.save();

      const { password, ...userWithoutPassword } = user.toJSON();
      return userWithoutPassword;
    },

    addGroceryListItem: async (_, { userId, upc, quantity }) => {
      try {
        const UserList = require('../models/UserList');

        // Check if item already exists in database
        const existingItem = await UserList.findOne({
          where: { userId, upc },
          include: [{ model: Product, as: 'product' }]
        });

        let listItem;

        if (existingItem) {
          // Update existing item quantity
          existingItem.quantity += quantity;
          await existingItem.save();
          listItem = existingItem;
        } else {
          // Create new item in database
          listItem = await UserList.create({
            userId,
            upc,
            quantity
          });

          // Fetch with product relation
          listItem = await UserList.findOne({
            where: { listItemId: listItem.listItemId },
            include: [{ model: Product, as: 'product' }]
          });
        }

        // Return plain object
        return listItem.get({ plain: true });
      } catch (error) {
        console.error('Error adding grocery list item to database:', error.message);

        // Fallback to sample data if database fails
        const existingItemIndex = sampleData.userLists.findIndex(
          item => item.userId === userId && item.upc === upc
        );

        let listItem;

        if (existingItemIndex !== -1) {
          sampleData.userLists[existingItemIndex].quantity += quantity;
          sampleData.userLists[existingItemIndex].updatedAt = new Date().toISOString();
          listItem = sampleData.userLists[existingItemIndex];
        } else {
          listItem = {
            listItemId: uuidv4(),
            userId,
            upc,
            quantity,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          sampleData.userLists.push(listItem);
        }

        return {
          ...listItem,
          product: sampleData.products.find(p => p.upc === listItem.upc)
        };
      }
    },

    updateGroceryListItem: async (_, { listItemId, quantity }) => {
      try {
        const UserList = require('../models/UserList');

        // Find item in database
        const listItem = await UserList.findOne({
          where: { listItemId },
          include: [{ model: Product, as: 'product' }]
        });

        if (!listItem) {
          throw new Error('List item not found');
        }

        if (quantity <= 0) {
          // Remove item if quantity is 0 or negative
          await listItem.destroy();
          return null;
        }

        // Update quantity
        listItem.quantity = quantity;
        await listItem.save();

        return listItem.get({ plain: true });
      } catch (error) {
        console.error('Error updating grocery list item in database:', error.message);

        // Fallback to sample data
        const itemIndex = sampleData.userLists.findIndex(
          item => item.listItemId === listItemId
        );

        if (itemIndex === -1) {
          throw new Error('List item not found');
        }

        if (quantity <= 0) {
          sampleData.userLists.splice(itemIndex, 1);
          return null;
        }

        sampleData.userLists[itemIndex].quantity = quantity;
        sampleData.userLists[itemIndex].updatedAt = new Date().toISOString();

        const updatedItem = sampleData.userLists[itemIndex];
        return {
          ...updatedItem,
          product: sampleData.products.find(p => p.upc === updatedItem.upc)
        };
      }
    },

    removeGroceryListItem: async (_, { listItemId }) => {
      try {
        const UserList = require('../models/UserList');

        // Find item in database
        const listItem = await UserList.findOne({
          where: { listItemId }
        });

        if (!listItem) {
          return false;
        }

        // Delete from database
        await listItem.destroy();
        return true;
      } catch (error) {
        console.error('Error removing grocery list item from database:', error.message);

        // Fallback to sample data
        const itemIndex = sampleData.userLists.findIndex(
          item => item.listItemId === listItemId
        );

        if (itemIndex === -1) {
          return false;
        }

        sampleData.userLists.splice(itemIndex, 1);
        return true;
      }
    },

    updateProductPrice: async (_, { upc, storeId, price, dealType = 'regular' }) => {
      const existingPriceIndex = sampleData.storePrices.findIndex(
        p => p.upc === upc && p.storeId === storeId
      );

      let priceRecord;

      if (existingPriceIndex !== -1) {
        // Update existing price
        sampleData.storePrices[existingPriceIndex] = {
          ...sampleData.storePrices[existingPriceIndex],
          price,
          dealType,
          lastUpdated: new Date().toISOString()
        };
        priceRecord = sampleData.storePrices[existingPriceIndex];
      } else {
        // Create new price record
        priceRecord = {
          priceId: uuidv4(),
          upc,
          storeId,
          price,
          dealType,
          lastUpdated: new Date().toISOString()
        };
        sampleData.storePrices.push(priceRecord);
      }

      return {
        ...priceRecord,
        product: sampleData.products.find(p => p.upc === priceRecord.upc),
        store: sampleData.stores.find(s => s.storeId === priceRecord.storeId)
      };
    },

    // Price Discovery mutation (DEPRECATED)
    discoverPrices: async (_, { userId, radiusMiles = 10, maxStores = 5, priorityChain = null }) => {
      try {
        console.log(`Discovering prices for user ${userId}...`);

        // Get user location
        const user = await User.findByPk(userId);
        if (!user) {
          return {
            success: false,
            message: 'User not found',
            jobId: '',
            discoveryNeeds: null,
            summary: null
          };
        }

        // Trigger price discovery
        const result = await discoveryService.discoverPricesForUserLocation(userId, {
          userLat: user.latitude,
          userLon: user.longitude,
          radiusMiles,
          maxStores,
          priorityChain
        });

        return result;
      } catch (error) {
        console.error('Error in discoverPrices mutation:', error.message);
        return {
          success: false,
          message: error.message,
          jobId: '',
          discoveryNeeds: null,
          summary: null
        };
      }
    },

    // ===================================================================
    // NEW FLYER-BASED MUTATIONS
    // ===================================================================

    addListItem: async (_, { itemName, itemVariant, category, quantity = 1 }, { user }) => {
      try {
        if (!user) {
          throw new Error('Authentication required');
        }

        const listItem = await UserListItem.create({
          userId: user.userId,
          itemName,
          itemVariant: itemVariant || null,
          category: category || null,
          quantity,
          checked: false
        });

        const createdItem = await UserListItem.findByPk(listItem.id, {
          include: [{ model: User, as: 'user' }]
        });

        return createdItem.get({ plain: true });
      } catch (error) {
        // Log detailed error internally
        console.error('[addListItem] Error:', error.message, error.stack);

        // Return generic error to client
        throw new Error('Failed to add item to your list. Please try again.');
      }
    },

    updateListItem: async (_, { id, quantity, checked }, { user }) => {
      try {
        if (!user) {
          throw new Error('Authentication required');
        }

        const [rowsUpdated, [updatedItem]] = await UserListItem.update(
          {
            ...(quantity !== undefined && quantity !== null && { quantity }),
            ...(checked !== undefined && checked !== null && { checked })
          },
          {
            where: { id, userId: user.userId },
            returning: true
          }
        );

        if (rowsUpdated === 0) {
          throw new Error('List item not found or unauthorized');
        }

        return updatedItem.get({ plain: true });
      } catch (error) {
        // Log detailed error internally
        console.error('[updateListItem] Error:', error.message, error.stack);

        // Return generic error to client
        throw new Error('Failed to update item in your list. Please try again.');
      }
    },

    removeListItem: async (_, { id }, { user }) => {
      try {
        if (!user) {
          throw new Error('Authentication required');
        }

        const listItem = await UserListItem.findOne({
          where: { id, userId: user.userId }
        });

        if (!listItem) {
          return false;
        }

        await listItem.destroy();
        return true;
      } catch (error) {
        console.error('[removeListItem] Error:', error.message);
        return false;
      }
    },

    markNotificationRead: async (_, { notificationId }, { user }) => {
      try {
        if (!user) {
          throw new Error('Authentication required');
        }

        const notification = await UserNotification.findOne({
          where: { id: notificationId, userId: user.userId }
        });

        if (!notification) {
          throw new Error('Notification not found or unauthorized');
        }

        notification.readAt = new Date();
        await notification.save();

        const updatedNotification = await UserNotification.findByPk(notificationId, {
          include: [{ model: User, as: 'user' }]
        });

        return updatedNotification.get({ plain: true });
      } catch (error) {
        // Log detailed error internally
        console.error('[markNotificationRead] Error:', error.message, error.stack);

        // Return generic error to client
        throw new Error('Failed to mark notification as read. Please try again.');
      }
    },

    // ===================================================================
    // ADMIN MUTATIONS
    // ===================================================================

    // Frontend-compatible mutation (alias for adminTriggerFlyerFetch)
    triggerFlyerFetch: async (_, { zipCode }, { user }) => {
      try {
        requireAdmin(user);

        // Check how many flyers exist for this ZIP already
        const existingFlyers = await Flyer.count({
          where: {
            zipCode,
            validTo: { [Op.gte]: new Date() }
          }
        });

        // Add job to queue
        const result = await flyerQueue.addJob(zipCode, {
          triggeredBy: 'user',
          priority: 'normal',
          force: false // Don't force if recently processed
        });

        return {
          jobId: result.jobId || '',
          status: result.status,
          message: result.message,
          flyersFound: existingFlyers // Current count
        };
      } catch (error) {
        console.error('[triggerFlyerFetch] Error:', error.message, error.stack);
        return {
          jobId: '',
          status: 'error',
          message: error.message,
          flyersFound: 0
        };
      }
    },

    adminTriggerFlyerFetch: async (_, { zipCode, priority = 'normal' }, { user }) => {
      try {
        requireAdmin(user);

        // Check how many flyers exist for this ZIP already
        const existingFlyers = await Flyer.count({
          where: {
            zipCode,
            validTo: { [Op.gte]: new Date() }
          }
        });

        // Add job to queue
        const result = await flyerQueue.addJob(zipCode, {
          triggeredBy: 'admin',
          priority,
          force: true // Force reprocessing even if recently done
        });

        return {
          success: result.success,
          status: result.status,
          jobId: result.jobId || null,
          message: result.message,
          flyersFound: existingFlyers
        };
      } catch (error) {
        console.error('[adminTriggerFlyerFetch] Error:', error.message, error.stack);
        return {
          success: false,
          status: 'error',
          jobId: null,
          message: error.message,
          flyersFound: 0
        };
      }
    },

    adminClearFlyersForZip: async (_, { zipCode }, { user }) => {
      try {
        requireAdmin(user);

        // Validate ZIP code
        if (!zipCode || !/^\d{5}$/.test(zipCode)) {
          return {
            success: false,
            message: 'Invalid ZIP code format',
            affectedCount: 0
          };
        }

        // Delete deals for this ZIP code first (due to foreign key)
        const deletedDeals = await Deal.destroy({
          where: { zipCode }
        });

        // Delete flyers for this ZIP code
        const deletedFlyers = await Flyer.destroy({
          where: { zipCode }
        });

        console.log(`[adminClearFlyersForZip] Deleted ${deletedFlyers} flyers and ${deletedDeals} deals for ZIP ${zipCode}`);

        return {
          success: true,
          message: `Cleared ${deletedFlyers} flyers and ${deletedDeals} deals for ZIP ${zipCode}`,
          affectedCount: deletedFlyers + deletedDeals
        };
      } catch (error) {
        console.error('[adminClearFlyersForZip] Error:', error.message, error.stack);
        return {
          success: false,
          message: error.message,
          affectedCount: 0
        };
      }
    },

    // Trigger weekly refresh for all user ZIP codes
    adminTriggerWeeklyRefresh: async (_, __, { user }) => {
      try {
        requireAdmin(user);

        console.log('[adminTriggerWeeklyRefresh] Manually triggering weekly refresh...');

        const result = await flyerQueue.processWeeklyRefresh();

        return {
          success: true,
          message: `Weekly refresh triggered: ${result.zipsProcessed} ZIP codes queued`,
          zipsQueued: result.zipsProcessed || 0,
          totalZips: result.totalZips || 0
        };
      } catch (error) {
        console.error('[adminTriggerWeeklyRefresh] Error:', error.message, error.stack);
        return {
          success: false,
          message: error.message,
          zipsQueued: 0,
          totalZips: 0
        };
      }
    },

    // Refresh flyers that are expiring soon
    adminRefreshExpiringFlyers: async (_, __, { user }) => {
      try {
        requireAdmin(user);

        console.log('[adminRefreshExpiringFlyers] Checking for expiring flyers...');

        const result = await flyerQueue.refreshExpiringFlyers();

        return {
          success: true,
          message: `Expiring flyer refresh: ${result.refreshed} ZIP codes queued`,
          zipsQueued: result.refreshed || 0,
          totalZips: result.total || 0
        };
      } catch (error) {
        console.error('[adminRefreshExpiringFlyers] Error:', error.message, error.stack);
        return {
          success: false,
          message: error.message,
          zipsQueued: 0,
          totalZips: 0
        };
      }
    },

    // Complete missing flyers for a ZIP code
    completeMissingFlyers: async (_, { zipCode }, { user }) => {
      try {
        requireAdmin(user);

        // Validate ZIP code
        if (!zipCode || !/^\d{5}$/.test(zipCode)) {
          return {
            success: false,
            zipCode: zipCode || '',
            availableFromApi: 0,
            storedInDb: 0,
            missingCount: 0,
            message: 'Invalid ZIP code format'
          };
        }

        console.log(`[completeMissingFlyers] Checking and completing flyers for ZIP ${zipCode}...`);

        const result = await flyerService.checkAndCompleteFlyersForZip(zipCode);

        return {
          success: result.success,
          zipCode: result.zipCode,
          availableFromApi: result.availableFromApi || 0,
          storedInDb: result.storedInDb || 0,
          missingCount: result.missingCount || 0,
          newFlyersProcessed: result.newFlyersProcessed || 0,
          newDeals: result.newDeals || 0,
          message: result.message
        };
      } catch (error) {
        console.error('[completeMissingFlyers] Error:', error.message, error.stack);
        return {
          success: false,
          zipCode,
          availableFromApi: 0,
          storedInDb: 0,
          missingCount: 0,
          message: error.message
        };
      }
    },

    reprocessFlyers: async (_, { zipCode }, { user }) => {
      try {
        requireAdmin(user);

        // Validate ZIP code
        if (!zipCode || !/^\d{5}$/.test(zipCode)) {
          return {
            success: false,
            zipCode: zipCode || '',
            previouslyDeleted: 0,
            flyersProcessed: 0,
            newFlyers: 0,
            totalDeals: 0,
            message: 'Invalid ZIP code format'
          };
        }

        console.log(`[reprocessFlyers] Force re-processing all flyers for ZIP ${zipCode}...`);

        const result = await flyerService.reprocessFlyersForZip(zipCode);

        return {
          success: result.success,
          zipCode: result.zipCode,
          previouslyDeleted: result.previouslyDeleted || 0,
          flyersProcessed: result.flyersProcessed || 0,
          newFlyers: result.newFlyers || 0,
          totalDeals: result.totalDeals || 0,
          message: result.message
        };
      } catch (error) {
        console.error('[reprocessFlyers] Error:', error.message, error.stack);
        return {
          success: false,
          zipCode,
          previouslyDeleted: 0,
          flyersProcessed: 0,
          newFlyers: 0,
          totalDeals: 0,
          message: error.message
        };
      }
    }
  },

  // Field resolvers
  Product: {
    storePrices: async (parent) => {
      // If storePrices already loaded (from eager loading), return them
      if (parent.storePrices !== undefined) {
        return parent.storePrices;
      }

      // Otherwise, query for them
      try {
        const prices = await StorePrice.findAll({
          where: { upc: parent.upc },
          include: [{ model: Store, as: 'store' }]
        });
        return prices.map(p => p.get({ plain: true }));
      } catch (error) {
        console.error(`Error fetching storePrices for ${parent.upc}:`, error.message);
        return [];
      }
    }
  },

  // Deal field resolver to convert dealType to uppercase for GraphQL enum
  Deal: {
    dealType: (parent) => {
      // Database stores lowercase, GraphQL enum expects uppercase
      return (parent.dealType || 'sale').toUpperCase();
    }
  },

  // UserListItem field resolver for matching deals
  UserListItem: {
    matchingDeals: async (parent) => {
      try {
        // Get the user to find their ZIP code
        const user = await User.findByPk(parent.userId);
        if (!user) return [];

        // Get current deals for user's ZIP
        const deals = await Deal.findAll({
          where: {
            zipCode: user.zipCode,
            validTo: { [Op.gte]: new Date() }
          }
        });

        const itemName = parent.itemName.toLowerCase();
        const variant = parent.itemVariant?.toLowerCase();

        // Match deals to this list item
        const matched = deals
          .filter(deal => {
            const dealText = deal.productName.toLowerCase();
            if (!dealText.includes(itemName)) return false;
            if (variant && !dealText.includes(variant)) return false;
            return true;
          })
          .map(deal => {
            const dealPlain = deal.get({ plain: true });
            return {
              ...dealPlain,
              // Convert dealType to uppercase for GraphQL enum
              dealType: (dealPlain.dealType || 'sale').toUpperCase(),
              savings: dealPlain.regularPrice
                ? parseFloat((dealPlain.regularPrice - dealPlain.salePrice).toFixed(2))
                : null,
              savingsPercent: dealPlain.regularPrice
                ? parseFloat((((dealPlain.regularPrice - dealPlain.salePrice) / dealPlain.regularPrice) * 100).toFixed(0))
                : null
            };
          });

        return matched;
      } catch (error) {
        console.error('[UserListItem.matchingDeals] Error:', error.message);
        return [];
      }
    }
  }
};

module.exports = resolvers;

