const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { calculateDistance } = require('../utils/distance');
const sampleData = require('../utils/sampleData');
const { Op } = require('sequelize');

// Import Sequelize models for authentication only
const User = require('../models/User');

// Helper function to generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'fallback-secret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
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

    searchProducts: async (_, { query }) => {
      const searchTerm = query.toLowerCase();
      return sampleData.products.filter(product => 
        product.name.toLowerCase().includes(searchTerm) ||
        (product.brand && product.brand.toLowerCase().includes(searchTerm))
      );
    },

    getProductByUpc: async (_, { upc }) => {
      return sampleData.products.find(product => product.upc === upc);
    },

    getUserGroceryLists: async (_, { userId }) => {
      const userItems = sampleData.userLists.filter(item => item.userId === userId);
      return userItems.map(item => ({
        ...item,
        product: sampleData.products.find(p => p.upc === item.upc)
      }));
    },

    comparePrices: async (_, { userId }) => {
      let user;
      try {
        user = await User.findByPk(userId);
        if (!user) {
          // Fallback to sample data if not found in database
          user = sampleData.users.find(u => u.userId === userId);
        }
      } catch (error) {
        console.log('Database error, using sample data:', error.message);
        user = sampleData.users.find(u => u.userId === userId);
      }
      
      if (!user) throw new Error('User not found');

      let userItems = sampleData.userLists.filter(item => item.userId === userId);
      
      // If no items found for this user, create sample items for demonstration
      if (userItems.length === 0) {
        userItems = [
          {
            listItemId: `demo-item-1-${userId}`,
            userId: userId,
            upc: '123456789012', // Organic Bananas
            quantity: 2,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            listItemId: `demo-item-2-${userId}`,
            userId: userId,
            upc: '123456789013', // Whole Milk
            quantity: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            listItemId: `demo-item-3-${userId}`,
            userId: userId,
            upc: '123456789014', // Bread Loaf
            quantity: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ];
      }

      // Get nearby stores
      const nearbyStores = sampleData.stores.filter(store => {
        const distance = calculateDistance(
          user.latitude, user.longitude,
          store.latitude, store.longitude
        );
        return distance <= user.travelRadiusMiles;
      });

      // Calculate total cost per store
      const storeComparisons = [];
      let minTotal = Infinity;

      for (const store of nearbyStores) {
        let totalCost = 0;
        let itemsFound = 0;

        for (const item of userItems) {
          const priceRecord = sampleData.storePrices.find(
            price => price.upc === item.upc && price.storeId === store.storeId
          );

          if (priceRecord) {
            totalCost += priceRecord.price * item.quantity;
            itemsFound++;
          }
        }

        if (itemsFound > 0) {
          const distance = calculateDistance(
            user.latitude, user.longitude,
            store.latitude, store.longitude
          );

          storeComparisons.push({
            store,
            totalCost,
            distance,
            itemsFound
          });

          minTotal = Math.min(minTotal, totalCost);
        }
      }

      // Calculate savings and mark cheapest
      const maxTotal = Math.max(...storeComparisons.map(comp => comp.totalCost));
      
      return storeComparisons
        .map(comparison => ({
          store: comparison.store,
          totalCost: comparison.totalCost,
          savings: maxTotal - comparison.totalCost,
          distance: comparison.distance,
          isCheapest: comparison.totalCost === minTotal
        }))
        .sort((a, b) => a.totalCost - b.totalCost);
    },

    getStorePrices: async (_, { storeId, upcs }) => {
      return sampleData.storePrices
        .filter(price => price.storeId === storeId && upcs.includes(price.upc))
        .map(price => ({
          ...price,
          product: sampleData.products.find(p => p.upc === price.upc),
          store: sampleData.stores.find(s => s.storeId === price.storeId)
        }));
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

        // Return user without password
        const { password: userPassword, ...userWithoutPassword } = newUser.toJSON();
        return {
          token,
          user: userWithoutPassword
        };
      } catch (error) {
        console.log('Database error during signup:', error.message);
        throw error;
      }
    },

    login: async (_, { email, password }) => {
      try {
        const user = await User.findOne({ where: { email } });
        if (!user) {
          throw new Error('Invalid email or password');
        }

        const isValidPassword = await user.comparePassword(password);
        if (!isValidPassword) {
          throw new Error('Invalid email or password');
        }

        const token = generateToken(user.userId);
        const { password: userPassword, ...userWithoutPassword } = user.toJSON();

        return {
          token,
          user: userWithoutPassword
        };
      } catch (error) {
        console.log('Database error during login:', error.message);
        throw error;
      }
    },

    addGroceryListItem: async (_, { userId, upc, quantity }) => {
      // Check if item already exists
      const existingItemIndex = sampleData.userLists.findIndex(
        item => item.userId === userId && item.upc === upc
      );

      let listItem;

      if (existingItemIndex !== -1) {
        // Update existing item
        sampleData.userLists[existingItemIndex].quantity += quantity;
        sampleData.userLists[existingItemIndex].updatedAt = new Date().toISOString();
        listItem = sampleData.userLists[existingItemIndex];
      } else {
        // Create new item
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
    },

    updateGroceryListItem: async (_, { listItemId, quantity }) => {
      const itemIndex = sampleData.userLists.findIndex(
        item => item.listItemId === listItemId
      );

      if (itemIndex === -1) {
        throw new Error('List item not found');
      }

      if (quantity <= 0) {
        // Remove item if quantity is 0 or negative
        sampleData.userLists.splice(itemIndex, 1);
        return null;
      }

      // Update quantity
      sampleData.userLists[itemIndex].quantity = quantity;
      sampleData.userLists[itemIndex].updatedAt = new Date().toISOString();

      const updatedItem = sampleData.userLists[itemIndex];
      return {
        ...updatedItem,
        product: sampleData.products.find(p => p.upc === updatedItem.upc)
      };
    },

    removeGroceryListItem: async (_, { listItemId }) => {
      const itemIndex = sampleData.userLists.findIndex(
        item => item.listItemId === listItemId
      );

      if (itemIndex === -1) {
        return false;
      }

      sampleData.userLists.splice(itemIndex, 1);
      return true;
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
    }
  }
};

module.exports = resolvers;

