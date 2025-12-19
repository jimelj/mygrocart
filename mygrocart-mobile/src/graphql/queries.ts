import { gql } from '@apollo/client';

// Product Queries
export const SEARCH_PRODUCTS = gql`
  query SearchProducts($query: String!, $limit: Int) {
    searchProducts(query: $query, limit: $limit) {
      upc
      name
      brand
      size
      category
      imageUrl
      priceAge
      lastPriceUpdate
      searchCount
      storePrices {
        priceId
        storeId
        price
        dealType
        lastUpdated
        store {
          storeId
          chainName
          storeName
          city
          state
        }
      }
    }
  }
`;

// Shopping List Queries
export const GET_USER_GROCERY_LISTS = gql`
  query GetUserGroceryLists($userId: ID!) {
    getUserGroceryLists(userId: $userId) {
      listItemId
      quantity
      product {
        upc
        name
        brand
        size
        imageUrl
      }
    }
  }
`;

// Shopping List Mutations
export const ADD_GROCERY_LIST_ITEM = gql`
  mutation AddGroceryListItem($userId: ID!, $upc: String!, $quantity: Int!) {
    addGroceryListItem(userId: $userId, upc: $upc, quantity: $quantity) {
      listItemId
      quantity
      product {
        upc
        name
        brand
        size
        imageUrl
      }
    }
  }
`;

export const UPDATE_GROCERY_LIST_ITEM = gql`
  mutation UpdateGroceryListItem($listItemId: ID!, $quantity: Int!) {
    updateGroceryListItem(listItemId: $listItemId, quantity: $quantity) {
      listItemId
      quantity
    }
  }
`;

export const REMOVE_GROCERY_LIST_ITEM = gql`
  mutation RemoveGroceryListItem($listItemId: ID!) {
    removeGroceryListItem(listItemId: $listItemId)
  }
`;

// Price Comparison Query
export const COMPARE_PRICES = gql`
  query ComparePrices($userId: ID!) {
    comparePrices(userId: $userId) {
      userId
      stores {
        store {
          storeId
          chainName
          storeName
          city
          state
          latitude
          longitude
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

// Product Request Queries
export const GET_MY_PRODUCT_REQUESTS = gql`
  query GetMyProductRequests {
    getMyProductRequests {
      requestId
      productName
      status
      createdAt
      completedAt
    }
  }
`;

export const GET_MY_PRICE_UPDATE_REQUESTS = gql`
  query GetMyPriceUpdateRequests {
    getMyPriceUpdateRequests {
      requestId
      upc
      priority
      status
      createdAt
      completedAt
    }
  }
`;

// NEW: Deals-based queries
export const GET_DEALS_NEAR_ME = gql`
  query GetDealsNearMe($zipCode: String!, $category: String, $limit: Int) {
    getDealsNearMe(zipCode: $zipCode, category: $category, limit: $limit) {
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
  }
`;

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
    }
  }
`;

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
        storeName
        dealType
        savingsPercent
      }
    }
  }
`;

export const MATCH_DEALS_TO_MY_LIST = gql`
  query MatchDealsToMyList($userId: ID!) {
    matchDealsToMyList(userId: $userId) {
      deal {
        id
        productName
        salePrice
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
