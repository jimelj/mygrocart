const { gql } = require('graphql-tag');

const typeDefs = gql`
  type User {
    userId: ID!
    email: String!
    address: String!
    city: String!
    state: String!
    zipCode: String!
    latitude: Float!
    longitude: Float!
    travelRadiusMiles: Int!
    createdAt: String!
    updatedAt: String!
  }

  type Product {
    upc: ID!
    name: String!
    brand: String
    size: String
    category: String
    imageUrl: String
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

  type AuthPayload {
    token: String!
    user: User!
  }

  type Query {
    # User queries
    me: User
    
    # Product queries
    searchProducts(query: String!): [Product!]!
    getProductByUpc(upc: String!): Product
    
    # Grocery list queries
    getUserGroceryLists(userId: String!): [UserList!]!
    
    # Price comparison queries
    comparePrices(userId: String!): [StorePriceComparison!]!
    getStorePrices(storeId: String!, upcs: [String!]!): [StorePrice!]!
  }

  type Mutation {
    # Authentication
    signup(
      email: String!
      password: String!
      address: String!
      city: String!
      state: String!
      zipCode: String!
      travelRadiusMiles: Int!
    ): AuthPayload!
    
    login(email: String!, password: String!): AuthPayload!
    
    # Grocery list management
    addGroceryListItem(userId: String!, upc: String!, quantity: Int!): UserList!
    updateGroceryListItem(listItemId: String!, quantity: Int!): UserList
    removeGroceryListItem(listItemId: String!): Boolean!
    
    # Admin/Internal mutations
    updateProductPrice(
      upc: String!
      storeId: String!
      price: Float!
      dealType: String
    ): StorePrice!
  }
`;

module.exports = typeDefs;

