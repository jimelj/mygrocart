import { gql } from '@apollo/client';

// Product search query
export const SEARCH_PRODUCTS = gql`
  query SearchProducts($query: String!, $limit: Int, $offset: Int) {
    searchProducts(query: $query, limit: $limit, offset: $offset) {
      products {
        upc
        name
        brand
        size
        imageUrl
        category
        priceAge
        searchCount
        lastPriceUpdate
        storePrices {
          priceId
          upc
          storeId
          price
          dealType
          lastUpdated
          store {
            storeId
            chainName
            storeName
            address
            city
            state
            zipCode
          }
        }
      }
      totalCount
      hasNextPage
      hasPreviousPage
      currentPage
      totalPages
      limit
    }
  }
`;

// Get user grocery lists
export const GET_USER_GROCERY_LISTS = gql`
  query GetUserGroceryLists($userId: String!) {
    getUserGroceryLists(userId: $userId) {
      listItemId
      userId
      upc
      quantity
      product {
        upc
        name
        brand
        size
        category
        imageUrl
        storePrices {
          priceId
          upc
          storeId
          price
          dealType
          lastUpdated
          store {
            storeId
            chainName
            storeName
            address
            city
            state
            zipCode
          }
        }
      }
    }
  }
`;

// Compare prices
export const COMPARE_PRICES = gql`
  query ComparePrices($userId: String!) {
    comparePrices(userId: $userId) {
      userId
      stores {
        store {
          storeId
          chainName
          storeName
          address
          city
          state
          zipCode
        }
        totalCost
        itemCount
        totalItems
        completionPercentage
        missingItems {
          name
          upc
          quantity
        }
        isCheapest
        savings
      }
      cheapestStore
      maxSavings
      message
    }
  }
`;

// Authentication mutations
export const SIGNUP = gql`
  mutation Signup(
    $email: String!
    $password: String!
    $name: String
    $zipCode: String!
  ) {
    signup(
      email: $email
      password: $password
      name: $name
      zipCode: $zipCode
    ) {
      token
      user {
        userId
        email
        name
        zipCode
      }
    }
  }
`;

export const LOGIN = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user {
        userId
        email
        address
        city
        state
        zipCode
        travelRadiusMiles
      }
    }
  }
`;

// Grocery list mutations
export const ADD_GROCERY_LIST_ITEM = gql`
  mutation AddGroceryListItem($userId: String!, $upc: String!, $quantity: Int!) {
    addGroceryListItem(userId: $userId, upc: $upc, quantity: $quantity) {
      listItemId
      userId
      upc
      quantity
      product {
        upc
        name
        brand
        size
        category
        imageUrl
      }
    }
  }
`;

export const UPDATE_GROCERY_LIST_ITEM = gql`
  mutation UpdateGroceryListItem($listItemId: String!, $quantity: Int!) {
    updateGroceryListItem(listItemId: $listItemId, quantity: $quantity) {
      listItemId
      userId
      upc
      quantity
      product {
        upc
        name
        brand
        size
        category
        imageUrl
      }
    }
  }
`;

export const REMOVE_GROCERY_LIST_ITEM = gql`
  mutation RemoveGroceryListItem($listItemId: String!) {
    removeGroceryListItem(listItemId: $listItemId)
  }
`;

// Admin Dashboard Queries
export const GET_SCRAPING_JOBS = gql`
  query GetScrapingJobs($status: String, $limit: Int) {
    getScrapingJobs(status: $status, limit: $limit) {
      jobId
      upc
      zipCode
      storeIds
      userId
      status
      priority
      results
      errorMessage
      startedAt
      completedAt
      createdAt
    }
  }
`;

export const GET_SCRAPING_JOB = gql`
  query GetScrapingJob($jobId: ID!) {
    getScrapingJob(jobId: $jobId) {
      jobId
      upc
      zipCode
      storeIds
      userId
      status
      priority
      results
      errorMessage
      startedAt
      completedAt
      createdAt
    }
  }
`;

// Product request queries
export const GET_MY_PRODUCT_REQUESTS = gql`
  query GetMyProductRequests($status: String) {
    getMyProductRequests(status: $status) {
      requestId
      productName
      status
      createdAt
      completedAt
    }
  }
`;

// Admin Dashboard Mutations
export const CREATE_SCRAPING_JOB = gql`
  mutation CreateScrapingJob(
    $upc: String!
    $zipCode: String!
    $storeIds: [ID]
    $priority: String
  ) {
    createScrapingJob(
      upc: $upc
      zipCode: $zipCode
      storeIds: $storeIds
      priority: $priority
    ) {
      jobId
      upc
      zipCode
      storeIds
      status
      priority
      createdAt
    }
  }
`;

export const UPDATE_SCRAPING_JOB_STATUS = gql`
  mutation UpdateScrapingJobStatus(
    $jobId: ID!
    $status: String!
    $results: String
    $errorMessage: String
  ) {
    updateScrapingJobStatus(
      jobId: $jobId
      status: $status
      results: $results
      errorMessage: $errorMessage
    ) {
      jobId
      status
      results
      errorMessage
      completedAt
    }
  }
`;

// ===================================
// NEW DEAL-BASED QUERIES
// ===================================

// Get deals near user's location
export const GET_DEALS_NEAR_ME = gql`
  query GetDealsNearMe($zipCode: String!, $category: String, $limit: Int, $offset: Int) {
    getDealsNearMe(zipCode: $zipCode, category: $category, limit: $limit, offset: $offset) {
      deals {
        id
        productName
        productBrand
        productCategory
        salePrice
        regularPrice
        unit
        dealType
        quantity
        storeName
        savings
        savingsPercent
        validFrom
        validTo
      }
      totalCount
      hasNextPage
      hasPreviousPage
      currentPage
      totalPages
    }
  }
`;

// Get current flyers for user's location
export const GET_CURRENT_FLYERS = gql`
  query GetCurrentFlyers($zipCode: String!) {
    getCurrentFlyers(zipCode: $zipCode) {
      id
      storeName
      storeSlug
      flyerName
      imageUrls
      validFrom
      validTo
      status
    }
  }
`;

// Get shopping list with deal matches
export const GET_MY_LIST_WITH_DEALS = gql`
  query GetMyListWithDeals($userId: ID!) {
    getMyListWithDeals(userId: $userId) {
      id
      itemName
      itemVariant
      category
      quantity
      checked
      matchingDeals {
        id
        productName
        salePrice
        regularPrice
        storeName
        dealType
        savingsPercent
      }
    }
  }
`;

// Match deals to shopping list
export const MATCH_DEALS_TO_MY_LIST = gql`
  query MatchDealsToMyList($userId: ID!) {
    matchDealsToMyList(userId: $userId) {
      deal {
        id
        productName
        productBrand
        salePrice
        regularPrice
        storeName
        dealType
        savingsPercent
      }
      listItem {
        id
        itemName
        itemVariant
      }
      matchScore
      matchReason
    }
  }
`;

// Search deals by product name
export const SEARCH_DEALS = gql`
  query SearchDeals($query: String!, $zipCode: String!, $limit: Int) {
    searchDeals(query: $query, zipCode: $zipCode, limit: $limit) {
      id
      productName
      productBrand
      salePrice
      regularPrice
      storeName
      dealType
      savingsPercent
    }
  }
`;

// Get single flyer with deals
export const GET_FLYER = gql`
  query GetFlyer($flyerId: ID!) {
    getFlyer(flyerId: $flyerId) {
      id
      storeName
      flyerName
      imageUrls
      validFrom
      validTo
      deals {
        id
        productName
        salePrice
        dealType
      }
    }
  }
`;
