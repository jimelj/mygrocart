import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { RetryLink } from '@apollo/client/link/retry';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';

const httpLink = createHttpLink({
  uri: process.env.EXPO_PUBLIC_GRAPHQL_ENDPOINT || 'http://localhost:5001/graphql',
  // 30 second timeout for network requests
  fetchOptions: {
    timeout: 30000,
  },
});

const authLink = setContext(async (_, { headers }) => {
  // Use SecureStore to match AuthContext security implementation
  const token = await SecureStore.getItemAsync('token');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    }
  };
});

// Error handling link for network and GraphQL errors
const errorLink = onError(({ graphQLErrors, networkError, operation }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${JSON.stringify(locations)}, Path: ${path}`
      );

      // Show user-friendly error for auth failures
      if (message.includes('Unauthorized') || message.includes('Invalid token')) {
        Alert.alert(
          'Session Expired',
          'Please log in again to continue.',
          [{ text: 'OK' }]
        );
      }
    });
  }

  if (networkError) {
    console.error(`[Network error]: ${networkError.message}`);

    // Show user-friendly error for network issues
    if (networkError.message.includes('Failed to fetch') || networkError.message.includes('Network request failed')) {
      Alert.alert(
        'Connection Error',
        'Unable to connect to the server. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
    } else if (networkError.message.includes('timeout')) {
      Alert.alert(
        'Request Timeout',
        'The request took too long. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }
});

// Retry logic for failed network requests
const retryLink = new RetryLink({
  delay: {
    initial: 300,
    max: 3000,
    jitter: true,
  },
  attempts: {
    max: 3,
    retryIf: (error, _operation) => {
      // Retry on network errors but not on auth errors
      return !!error && !error.message.includes('Unauthorized');
    },
  },
});

export const client = new ApolloClient({
  link: from([errorLink, retryLink, authLink, httpLink]),
  cache: new InMemoryCache(),
  // Default error policy
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
    },
    query: {
      errorPolicy: 'all',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
});
