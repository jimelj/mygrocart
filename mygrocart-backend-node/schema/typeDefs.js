const { gql } = require('graphql-tag');

const typeDefs = gql`
  type User {
    id: ID!
    userId: ID!
    email: String!
    name: String
    address: String
    city: String
    state: String
    zipCode: String!
    latitude: Float
    longitude: Float
    travelRadiusMiles: Int!
    isAdmin: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  type PriceRange {
    min: Float
    max: Float
    savings: Float
  }

  type StoreBrandAlternative {
    product: Product!
    savings: Float!
    chain: String!
    similarity: Float!
  }

  type StoreBrandInfo {
    isStoreBrand: Boolean!
    chain: String
    chainId: String
    brand: String
    isExclusive: Boolean
    alternatives: [StoreBrandAlternative]
    bestAlternative: StoreBrandAlternative
  }

  type Product {
    upc: ID!
    name: String!
    brand: String
    size: String
    category: String
    imageUrl: String
    storePrices: [StorePrice]
    priceRange: PriceRange
    availableAt: Int
    lastPriceUpdate: String
    priceAge: String
    searchCount: Int
    timesInShoppingLists: Int
    updatePriority: String
    storeBrandInfo: StoreBrandInfo
    createdAt: String!
    updatedAt: String!
  }

  type Store {
    storeId: ID!
    chainName: String!
    storeName: String!
    address: String!
    city: String!
    state: String!
    zipCode: String!
    latitude: Float!
    longitude: Float!
    createdAt: String!
    updatedAt: String!
  }

  type StorePrice {
    priceId: ID!
    upc: String!
    storeId: String!
    price: Float!
    dealType: String
    lastUpdated: String!
    product: Product
    store: Store
  }

  type UserList {
    listItemId: ID!
    userId: String!
    upc: String!
    quantity: Int!
    product: Product
    createdAt: String!
    updatedAt: String!
  }

  type StorePriceComparison {
    store: Store!
    totalCost: Float!
    savings: Float!
    distance: Float!
    isCheapest: Boolean!
  }

  type MissingItem {
    name: String!
    upc: String!
    quantity: Int!
  }

  type StoreComparison {
    store: Store!
    totalCost: Float!
    itemCount: Int!
    totalItems: Int!
    completionPercentage: Float!
    missingItems: [MissingItem!]!
    isCheapest: Boolean!
    savings: Float!
    savingsPercentage: Float!
  }

  type PriceComparisonResult {
    userId: ID!
    stores: [StoreComparison!]!
    cheapestStore: String
    maxSavings: Float
    message: String
  }

  type PriceHistory {
    historyId: ID!
    upc: String!
    product: Product
    storeId: ID!
    store: Store
    zipCode: String
    price: Float!
    dealType: String
    inStock: Boolean
    scrapedAt: String!
    createdAt: String!
  }

  type StoreRequest {
    requestId: ID!
    userId: ID
    user: User
    storeName: String!
    storeChain: String
    address: String
    zipCode: String
    latitude: Float
    longitude: Float
    requestCount: Int!
    status: String!
    createdAt: String!
    updatedAt: String!
  }

  type ScrapingJob {
    jobId: ID!
    upc: String!
    zipCode: String!
    storeIds: [ID]
    userId: ID
    user: User
    status: String!
    priority: String!
    results: String
    errorMessage: String
    startedAt: String
    completedAt: String
    createdAt: String!
  }

  type ProductRequest {
    requestId: ID!
    productName: String!
    requestedBy: ID!
    status: String!
    attempts: Int!
    createdAt: String!
    completedAt: String
    errorMessage: String
    user: User
  }

  type PriceUpdateRequest {
    requestId: ID!
    upc: String!
    requestedBy: ID!
    priority: String!
    status: String!
    createdAt: String!
    completedAt: String
    user: User
    product: Product
  }

  type PriceHistoryConnection {
    priceHistory: [PriceHistory]
    totalCount: Int!
  }

  type ProductSearchResult {
    products: [Product!]!
    totalCount: Int!
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    currentPage: Int!
    totalPages: Int!
    limit: Int!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  # ===================================================================
  # NEW FLYER-BASED TYPES (Weekly Flyer OCR System)
  # ===================================================================

  type Flyer {
    id: ID!
    store: Store
    storeName: String!
    storeSlug: String!
    flyerRunId: Int!
    flyerName: String!
    zipCode: String!
    validFrom: String!
    validTo: String!
    imageUrls: [String!]!
    status: FlyerStatus!
    deals: [Deal!]!
    dealCount: Int
    processedAt: String
    createdAt: String!
  }

  enum FlyerStatus {
    PENDING
    PROCESSING
    COMPLETED
    FAILED
  }

  type Deal {
    id: ID!
    flyer: Flyer
    storeName: String!
    zipCode: String!
    productName: String!
    productBrand: String
    productCategory: String
    salePrice: Float!
    regularPrice: Float
    unit: String
    dealType: DealType!
    quantity: String
    validFrom: String!
    validTo: String!
    savings: Float
    savingsPercent: Float
    confidence: Float
    imageUrl: String
    createdAt: String!
  }

  enum DealType {
    SALE
    BOGO
    MULTI_BUY
    COUPON
    CLEARANCE
  }

  type UserListItem {
    id: ID!
    user: User!
    itemName: String!
    itemVariant: String
    category: String
    quantity: Int!
    checked: Boolean!
    matchingDeals: [Deal!]
    createdAt: String!
  }

  type DealMatch {
    deal: Deal!
    listItem: UserListItem!
    matchScore: Float!
    matchReason: String!
  }

  type UserNotification {
    id: ID!
    user: User!
    type: NotificationType!
    title: String!
    body: String!
    matchedDeals: [Deal!]
    sentAt: String!
    readAt: String
  }

  enum NotificationType {
    DAILY_DIGEST
    DEAL_ALERT
  }

  type DealConnection {
    deals: [Deal!]!
    totalCount: Int!
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    currentPage: Int!
    totalPages: Int!
  }

  # Store deals ranking for flyer-based comparison
  type StoreDealsRanking {
    storeName: String!
    matchedItemCount: Int!
    totalListItems: Int!
    matchPercentage: Float!
    totalSavings: Float!
    deals: [MatchedDealSummary!]!
    isBestValue: Boolean!
  }

  type MatchedDealSummary {
    listItemName: String!
    dealProductName: String!
    salePrice: Float!
    regularPrice: Float
    savings: Float
    savingsPercent: Float
  }

  type StoreDealsRankingResult {
    rankings: [StoreDealsRanking!]!
    bestStore: String
    totalPotentialSavings: Float!
    listItemCount: Int!
    message: String!
  }

  type Query {
    # User queries
    me: User

    # Product queries (DEPRECATED - replaced by deal-based search)
    searchProducts(query: String!, limit: Int, offset: Int): ProductSearchResult!
    getProductByUpc(upc: String!): Product

    # Grocery list queries (DEPRECATED - use getMyListWithDeals)
    getUserGroceryLists(userId: String!): [UserList!]!

    # Price comparison queries (DEPRECATED - use matchDealsToMyList)
    comparePrices(userId: String!): PriceComparisonResult!
    getStorePrices(storeId: String!, upcs: [String!]!): [StorePrice!]!

    # Price History queries (DEPRECATED)
    getPriceHistory(upc: String!, storeId: ID!, limit: Int): PriceHistoryConnection
    getProductPriceHistory(upc: String!, limit: Int): PriceHistoryConnection

    # Store Request queries (DEPRECATED)
    getStoreRequests(status: String, limit: Int): [StoreRequest]
    getMyStoreRequests(userId: ID!): [StoreRequest]

    # Scraping Job queries (DEPRECATED)
    getScrapingJobs(status: String, limit: Int): [ScrapingJob]
    getScrapingJob(jobId: ID!): ScrapingJob

    # Product Request queries (DEPRECATED)
    getMyProductRequests(status: String): [ProductRequest!]!
    getMyPriceUpdateRequests(status: String): [PriceUpdateRequest!]!

    # ===================================================================
    # NEW FLYER-BASED QUERIES
    # ===================================================================

    # Flyer queries
    getDealsNearMe(zipCode: String!, radiusMiles: Float, category: String, limit: Int, offset: Int): DealConnection!
    getDealsForStore(storeId: ID!, category: String, limit: Int, offset: Int): DealConnection!
    searchDeals(query: String!, zipCode: String!, limit: Int, offset: Int): DealConnection!
    getFlyer(flyerId: ID!): Flyer
    getCurrentFlyers(zipCode: String!, radiusMiles: Float): [Flyer!]!

    # Shopping list with deal matching
    getMyListWithDeals(userId: ID!): [UserListItem!]!
    matchDealsToMyList(userId: ID!): [DealMatch!]!

    # Store deals ranking (flyer-based comparison)
    getStoreDealsRanking(userId: ID!): StoreDealsRankingResult!

    # Notifications
    getMyNotifications(userId: ID!, limit: Int): [UserNotification!]!
  }

  type Mutation {
    # Authentication
    signup(
      email: String!
      password: String!
      name: String
      zipCode: String!
    ): AuthPayload!

    login(email: String!, password: String!): AuthPayload!

    # User settings
    updateTravelRadius(travelRadiusMiles: Int!): User!

    # Grocery list management (DEPRECATED - use new UserListItem mutations)
    addGroceryListItem(userId: String!, upc: String!, quantity: Int!): UserList!
    updateGroceryListItem(listItemId: String!, quantity: Int!): UserList
    removeGroceryListItem(listItemId: String!): Boolean!

    # Admin/Internal mutations (DEPRECATED)
    updateProductPrice(
      upc: String!
      storeId: String!
      price: Float!
      dealType: String
    ): StorePrice!

    # Store Request mutations (DEPRECATED)
    createStoreRequest(
      storeName: String!
      storeChain: String
      address: String
      zipCode: String
      latitude: Float
      longitude: Float
    ): StoreRequest

    updateStoreRequestStatus(requestId: ID!, status: String!): StoreRequest

    # Scraping Job mutations (DEPRECATED)
    createScrapingJob(
      upc: String!
      zipCode: String!
      storeIds: [ID]
      priority: String
    ): ScrapingJob

    updateScrapingJobStatus(
      jobId: ID!
      status: String!
      results: String
      errorMessage: String
    ): ScrapingJob

    # Product Request mutations (DEPRECATED)
    requestProduct(productName: String!): ProductRequest!
    requestPriceUpdate(upc: String!, priority: String): PriceUpdateRequest!

    # Price Discovery mutations (DEPRECATED)
    discoverPrices(
      userId: String!
      radiusMiles: Int
      maxStores: Int
      priorityChain: String
    ): PriceDiscoveryResult!

    # ===================================================================
    # NEW FLYER-BASED MUTATIONS
    # ===================================================================

    # Shopping list mutations (UserListItem-based)
    addListItem(itemName: String!, itemVariant: String, category: String, quantity: Int): UserListItem!
    updateListItem(id: ID!, quantity: Int, checked: Boolean): UserListItem!
    removeListItem(id: ID!): Boolean!

    # Notification mutations
    markNotificationRead(notificationId: ID!): UserNotification!

    # ===================================================================
    # ADMIN MUTATIONS (Flyer Queue Management)
    # ===================================================================

    # Trigger flyer fetch (frontend-compatible name)
    triggerFlyerFetch(zipCode: String!): FlyerFetchResult!

    # Trigger flyer fetch for a ZIP code (admin only)
    adminTriggerFlyerFetch(zipCode: String!, priority: String): FlyerJobResult!

    # Clear all flyers for a ZIP code (admin only)
    adminClearFlyersForZip(zipCode: String!): AdminActionResult!

    # Trigger weekly refresh for all user ZIP codes (admin only)
    adminTriggerWeeklyRefresh: WeeklyRefreshResult!

    # Refresh flyers that are expiring soon (admin only)
    adminRefreshExpiringFlyers: WeeklyRefreshResult!
  }

  type WeeklyRefreshResult {
    success: Boolean!
    message: String!
    zipsQueued: Int!
    totalZips: Int!
  }

  # ===================================================================
  # ADMIN TYPES (Flyer Queue Management)
  # ===================================================================

  type FlyerJobResult {
    success: Boolean!
    status: String!
    jobId: String
    message: String!
    flyersFound: Int
  }

  type FlyerFetchResult {
    jobId: String!
    status: String!
    message: String!
    flyersFound: Int!
  }

  type FlyerConnection {
    flyers: [Flyer!]!
    totalCount: Int!
  }

  type ProcessingJob {
    id: ID!
    type: String!
    zipCode: String!
    status: String!
    errorMessage: String
    createdAt: String!
    completedAt: String
  }

  type AdminStats {
    totalFlyers: Int!
    totalDeals: Int!
    activeStores: Int!
    processingJobs: Int!
    lastRefreshTime: String
    flyersByStore: [StoreFlyerCount!]!
    dealsByStore: [StoreDealCount!]!
  }

  type AdminActionResult {
    success: Boolean!
    message: String!
    affectedCount: Int
  }

  type FlyerQueueJob {
    id: String!
    zipCode: String!
    triggeredBy: String!
    addedAt: String
    startedAt: String
  }

  type FlyerQueueCounts {
    waiting: Int!
    active: Int!
    completed: Int!
    failed: Int!
  }

  type FlyerJobHistory {
    id: String!
    zipCode: String!
    triggeredBy: String!
    status: String!
    flyersProcessed: Int
    newFlyers: Int
    totalDeals: Int
    completedAt: String!
  }

  type FlyerQueueStatus {
    enabled: Boolean!
    message: String
    counts: FlyerQueueCounts
    activeJobs: [FlyerQueueJob!]
    waitingJobs: [FlyerQueueJob!]
    recentHistory: [FlyerJobHistory!]
    processingZips: [String!]
  }

  type FlyerStats {
    totalFlyers: Int!
    totalDeals: Int!
    flyersByStore: [StoreFlyerCount!]!
    dealsByStore: [StoreDealCount!]!
    lastRefreshTime: String
  }

  type StoreFlyerCount {
    storeName: String!
    count: Int!
  }

  type StoreDealCount {
    storeName: String!
    count: Int!
  }

  extend type Query {
    # Admin queries (frontend-compatible names)
    getAdminStats(zipCode: String): AdminStats!
    getProcessingJobs(status: String, limit: Int): [ProcessingJob!]!
    getAllFlyers(zipCode: String, limit: Int, offset: Int): FlyerConnection!

    # Admin queries (backend names for compatibility)
    adminGetQueueStatus: FlyerQueueStatus!
    adminGetFlyerStats(zipCode: String): FlyerStats!
    adminGetAllFlyers(zipCode: String, status: String, limit: Int, offset: Int): [Flyer!]!
  }

  # Price Discovery Types
  type PriceDiscoveryResult {
    success: Boolean!
    message: String!
    jobId: String!
    discoveryNeeds: DiscoveryNeeds
    summary: DiscoverySummary
  }

  type DiscoveryNeeds {
    stores: [StoreDiscoveryNeed!]!
    totalProducts: Int!
    totalStores: Int!
    storesNeedingDiscovery: Int!
    totalMissingPrices: Int!
  }

  type StoreDiscoveryNeed {
    store: NearbyStore!
    missingCount: Int!
    totalProducts: Int!
    coveragePercent: Int!
  }

  type NearbyStore {
    storeId: ID!
    chainName: String!
    storeName: String!
    externalStoreId: String
    distance: Float!
  }

  type DiscoverySummary {
    storesChecked: Int!
    pricesDiscovered: Int!
    pricesFailed: Int!
  }
`;

module.exports = typeDefs;

