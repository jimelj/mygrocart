import { ApolloClient, InMemoryCache, gql, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

// Create HTTP link
// Use environment variable for production, relative path for development
const httpLink = createHttpLink({
  uri: import.meta.env.VITE_GRAPHQL_ENDPOINT || '/graphql',
  fetchOptions: {
    mode: 'cors',
    credentials: 'omit',
  },
});

// Create auth link for JWT tokens
const authLink = setContext((_, { headers }) => {
  // Get the authentication token from local storage if it exists
  const token = localStorage.getItem('token');
  
  // Return the headers to the context so httpLink can read them
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    }
  }
});

// Create Apollo Client
const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'ignore',
    },
    query: {
      errorPolicy: 'all',
    },
  },
});

// GraphQL Queries
export const SEARCH_PRODUCTS = gql`
  query SearchProducts($query: String!) {
    searchProducts(query: $query) {
      upc
      name
      brand
      size
      category
      imageUrl
    }
  }
`;

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
      }
    }
  }
`;

export const COMPARE_PRICES = gql`
  query ComparePrices($userId: String!) {
    comparePrices(userId: $userId) {
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
      savings
      distance
      isCheapest
    }
  }
`;

// GraphQL Mutations
export const SIGNUP = gql`
  mutation Signup($email: String!, $password: String!, $address: String!, $city: String!, $state: String!, $zipCode: String!, $travelRadiusMiles: Int!) {
    signup(email: $email, password: $password, address: $address, city: $city, state: $state, zipCode: $zipCode, travelRadiusMiles: $travelRadiusMiles) {
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

export default client;

