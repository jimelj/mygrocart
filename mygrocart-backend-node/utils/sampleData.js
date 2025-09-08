// Sample data for development (in-memory storage)
const sampleData = {
  users: [
    // Sample user for fallback testing
    {
      userId: 'sample-user-1',
      email: 'sample@example.com',
      password: 'hashed-password',
      address: '123 Sample St',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      latitude: 40.7128,
      longitude: -74.0060,
      travelRadiusMiles: 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  products: [
    {
      upc: '123456789012',
      name: 'Organic Bananas',
      brand: 'Fresh Market',
      size: '2 lbs',
      category: 'Produce',
      imageUrl: '🍌',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      upc: '123456789013',
      name: 'Whole Milk',
      brand: 'Dairy Best',
      size: '1 gallon',
      category: 'Dairy',
      imageUrl: '🥛',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      upc: '123456789014',
      name: 'Bread Loaf',
      brand: 'Baker\'s Choice',
      size: '20 oz',
      category: 'Bakery',
      imageUrl: '🍞',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      upc: '123456789015',
      name: 'Ground Beef',
      brand: 'Premium Meat',
      size: '1 lb',
      category: 'Meat',
      imageUrl: '🥩',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  stores: [
    {
      storeId: 'store-1',
      chainName: 'ShopRite',
      storeName: 'ShopRite of Main St',
      address: '123 Main St',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      latitude: 40.7128,
      longitude: -74.0060,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      storeId: 'store-2',
      chainName: 'Stop & Shop',
      storeName: 'Stop & Shop Broadway',
      address: '456 Broadway',
      city: 'New York',
      state: 'NY',
      zipCode: '10002',
      latitude: 40.7589,
      longitude: -73.9851,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      storeId: 'store-3',
      chainName: 'Acme',
      storeName: 'Acme Markets',
      address: '789 Park Ave',
      city: 'New York',
      state: 'NY',
      zipCode: '10003',
      latitude: 40.7831,
      longitude: -73.9712,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  storePrices: [
    // Organic Bananas
    { priceId: 'price-1', upc: '123456789012', storeId: 'store-1', price: 2.99, dealType: 'regular', lastUpdated: new Date().toISOString() },
    { priceId: 'price-2', upc: '123456789012', storeId: 'store-2', price: 3.29, dealType: 'regular', lastUpdated: new Date().toISOString() },
    { priceId: 'price-3', upc: '123456789012', storeId: 'store-3', price: 3.49, dealType: 'regular', lastUpdated: new Date().toISOString() },
    
    // Whole Milk
    { priceId: 'price-4', upc: '123456789013', storeId: 'store-1', price: 3.49, dealType: 'regular', lastUpdated: new Date().toISOString() },
    { priceId: 'price-5', upc: '123456789013', storeId: 'store-2', price: 3.79, dealType: 'regular', lastUpdated: new Date().toISOString() },
    { priceId: 'price-6', upc: '123456789013', storeId: 'store-3', price: 3.99, dealType: 'regular', lastUpdated: new Date().toISOString() },
    
    // Bread Loaf
    { priceId: 'price-7', upc: '123456789014', storeId: 'store-1', price: 2.79, dealType: 'regular', lastUpdated: new Date().toISOString() },
    { priceId: 'price-8', upc: '123456789014', storeId: 'store-2', price: 2.99, dealType: 'regular', lastUpdated: new Date().toISOString() },
    { priceId: 'price-9', upc: '123456789014', storeId: 'store-3', price: 3.19, dealType: 'regular', lastUpdated: new Date().toISOString() },
    
    // Ground Beef
    { priceId: 'price-10', upc: '123456789015', storeId: 'store-1', price: 6.99, dealType: 'regular', lastUpdated: new Date().toISOString() },
    { priceId: 'price-11', upc: '123456789015', storeId: 'store-2', price: 7.49, dealType: 'regular', lastUpdated: new Date().toISOString() },
    { priceId: 'price-12', upc: '123456789015', storeId: 'store-3', price: 7.99, dealType: 'regular', lastUpdated: new Date().toISOString() }
  ],
  userLists: [
    // Sample user list items for testing price comparison
    {
      listItemId: 'list-item-1',
      userId: 'sample-user-1', // This will be replaced with real user IDs
      upc: '123456789012', // Organic Bananas
      quantity: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      listItemId: 'list-item-2',
      userId: 'sample-user-1',
      upc: '123456789013', // Whole Milk
      quantity: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      listItemId: 'list-item-3',
      userId: 'sample-user-1',
      upc: '123456789014', // Bread Loaf
      quantity: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ]
};

module.exports = sampleData;

