// Sample data for development (in-memory storage)
// Updated for Atlanta pilot - ZIP 30132 (Dallas, GA)
const sampleData = {
  users: [
    // Sample user for fallback testing - Atlanta pilot area
    {
      userId: 'sample-user-1',
      email: 'sample@example.com',
      password: 'hashed-password',
      address: '154 W Memorial Dr',
      city: 'Dallas',
      state: 'GA',
      zipCode: '30132',
      latitude: 33.9237,
      longitude: -84.8407,
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
      imageUrl: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      upc: '123456789013',
      name: 'Whole Milk',
      brand: 'Dairy Best',
      size: '1 gallon',
      category: 'Dairy',
      imageUrl: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      upc: '123456789014',
      name: 'Bread Loaf',
      brand: "Baker's Choice",
      size: '20 oz',
      category: 'Bakery',
      imageUrl: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      upc: '123456789015',
      name: 'Ground Beef',
      brand: 'Premium Meat',
      size: '1 lb',
      category: 'Meat',
      imageUrl: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  // Atlanta pilot stores near ZIP 30132 (Dallas, GA)
  stores: [
    {
      storeId: 'store-1',
      chainName: 'Food Depot',
      storeName: 'Food Depot #1 Dallas',
      address: '154 W Memorial Dr',
      city: 'Dallas',
      state: 'GA',
      zipCode: '30132',
      latitude: 33.9237,
      longitude: -84.8407,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      storeId: 'store-2',
      chainName: 'Kroger',
      storeName: 'Kroger Dallas - Merchants Dr',
      address: '401 Merchants Dr',
      city: 'Dallas',
      state: 'GA',
      zipCode: '30132',
      latitude: 33.9213,
      longitude: -84.8465,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      storeId: 'store-3',
      chainName: 'Publix',
      storeName: 'Publix Dallas - Merchants Dr',
      address: '90 Merchants Dr',
      city: 'Dallas',
      state: 'GA',
      zipCode: '30132',
      latitude: 33.9205,
      longitude: -84.8450,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  storePrices: [
    // Organic Bananas
    { priceId: 'price-1', upc: '123456789012', storeId: 'store-1', price: 1.49, dealType: 'sale', lastUpdated: new Date().toISOString() },
    { priceId: 'price-2', upc: '123456789012', storeId: 'store-2', price: 1.79, dealType: 'regular', lastUpdated: new Date().toISOString() },
    { priceId: 'price-3', upc: '123456789012', storeId: 'store-3', price: 1.99, dealType: 'regular', lastUpdated: new Date().toISOString() },

    // Whole Milk
    { priceId: 'price-4', upc: '123456789013', storeId: 'store-1', price: 2.99, dealType: 'sale', lastUpdated: new Date().toISOString() },
    { priceId: 'price-5', upc: '123456789013', storeId: 'store-2', price: 3.49, dealType: 'regular', lastUpdated: new Date().toISOString() },
    { priceId: 'price-6', upc: '123456789013', storeId: 'store-3', price: 3.29, dealType: 'regular', lastUpdated: new Date().toISOString() },

    // Bread Loaf
    { priceId: 'price-7', upc: '123456789014', storeId: 'store-1', price: 1.79, dealType: 'sale', lastUpdated: new Date().toISOString() },
    { priceId: 'price-8', upc: '123456789014', storeId: 'store-2', price: 2.49, dealType: 'regular', lastUpdated: new Date().toISOString() },
    { priceId: 'price-9', upc: '123456789014', storeId: 'store-3', price: 2.29, dealType: 'regular', lastUpdated: new Date().toISOString() },

    // Ground Beef
    { priceId: 'price-10', upc: '123456789015', storeId: 'store-1', price: 4.99, dealType: 'sale', lastUpdated: new Date().toISOString() },
    { priceId: 'price-11', upc: '123456789015', storeId: 'store-2', price: 5.99, dealType: 'regular', lastUpdated: new Date().toISOString() },
    { priceId: 'price-12', upc: '123456789015', storeId: 'store-3', price: 6.49, dealType: 'regular', lastUpdated: new Date().toISOString() }
  ],
  userLists: [
    // Sample user list items for testing price comparison
    {
      listItemId: 'list-item-1',
      userId: 'sample-user-1',
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

