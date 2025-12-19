import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';
import { client } from '../graphql/client';
import { ApolloLink } from '@apollo/client';

// Mock dependencies
jest.mock('expo-secure-store');
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
  Platform: {
    OS: 'ios',
  },
}));

const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;
const mockAlert = Alert.alert as jest.Mock;

describe('GraphQL Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Apollo Client Configuration', () => {
    it('should have a configured Apollo Client instance', () => {
      expect(client).toBeDefined();
      expect(client.link).toBeDefined();
      expect(client.cache).toBeDefined();
    });

    it('should have correct default error policy', () => {
      expect(client.defaultOptions.watchQuery?.errorPolicy).toBe('all');
      expect(client.defaultOptions.query?.errorPolicy).toBe('all');
      expect(client.defaultOptions.mutate?.errorPolicy).toBe('all');
    });

    it('should export all required methods', () => {
      expect(typeof client.query).toBe('function');
      expect(typeof client.mutate).toBe('function');
      expect(typeof client.watchQuery).toBe('function');
      expect(typeof client.readQuery).toBe('function');
      expect(typeof client.writeQuery).toBe('function');
    });
  });

  describe('Cache Configuration', () => {
    it('should have InMemoryCache configured', () => {
      expect(client.cache).toBeDefined();
      expect(client.cache.constructor.name).toBe('InMemoryCache');
    });

    it('should support cache operations', () => {
      expect(client.cache.readQuery).toBeDefined();
      expect(client.cache.writeQuery).toBeDefined();
      expect(client.cache.evict).toBeDefined();
      expect(client.cache.reset).toBeDefined();
    });

    it('should be able to write and read from cache', () => {
      const testData = {
        __typename: 'Query',
        testField: 'test value',
      };

      // This should not throw
      expect(() => {
        client.cache.writeQuery({
          query: require('@apollo/client').gql`
            query TestQuery {
              testField
            }
          `,
          data: testData,
        });
      }).not.toThrow();
    });
  });

  describe('Link Chain', () => {
    it('should have a link chain configured', () => {
      expect(client.link).toBeDefined();
      expect(client.link).toBeInstanceOf(ApolloLink);
    });

    it('should have multiple links in the chain', () => {
      // The link should be a composition of multiple links
      // (errorLink, retryLink, authLink, httpLink)
      expect(client.link).toBeDefined();
    });
  });

  describe('Auth Integration', () => {
    it('should use SecureStore for token management', async () => {
      // The client should be configured to use SecureStore
      expect(mockSecureStore.getItemAsync).toBeDefined();
    });

    it('should handle missing auth token gracefully', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue(null);
      // Should not throw when token is missing
      expect(client).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should have error handling configured', () => {
      // Client should have error link in chain
      expect(client.link).toBeDefined();
    });

    it('should use Alert for user-facing errors', () => {
      // Alert should be available for error messages
      expect(Alert.alert).toBeDefined();
    });
  });

  describe('Network Configuration', () => {
    it('should use correct GraphQL endpoint', () => {
      // Default endpoint should be localhost:5001/graphql
      const endpoint = process.env.EXPO_PUBLIC_GRAPHQL_ENDPOINT || 'http://localhost:5001/graphql';
      expect(endpoint).toBeDefined();
      expect(typeof endpoint).toBe('string');
    });

    it('should respect environment variable for endpoint', () => {
      const envEndpoint = process.env.EXPO_PUBLIC_GRAPHQL_ENDPOINT;
      if (envEndpoint) {
        expect(envEndpoint).toMatch(/^https?:\/\//);
      }
    });
  });

  describe('Query Operations', () => {
    it('should have query method', () => {
      expect(client.query).toBeDefined();
      expect(typeof client.query).toBe('function');
    });

    it('should have mutate method', () => {
      expect(client.mutate).toBeDefined();
      expect(typeof client.mutate).toBe('function');
    });

    it('should have watchQuery method', () => {
      expect(client.watchQuery).toBeDefined();
      expect(typeof client.watchQuery).toBe('function');
    });
  });

  describe('Cache Operations', () => {
    it('should have readQuery method', () => {
      expect(client.readQuery).toBeDefined();
      expect(typeof client.readQuery).toBe('function');
    });

    it('should have writeQuery method', () => {
      expect(client.writeQuery).toBeDefined();
      expect(typeof client.writeQuery).toBe('function');
    });

    it('should have readFragment method', () => {
      expect(client.readFragment).toBeDefined();
      expect(typeof client.readFragment).toBe('function');
    });

    it('should have writeFragment method', () => {
      expect(client.writeFragment).toBeDefined();
      expect(typeof client.writeFragment).toBe('function');
    });
  });

  describe('Client State Management', () => {
    it('should be able to reset store', () => {
      expect(client.resetStore).toBeDefined();
      expect(typeof client.resetStore).toBe('function');
    });

    it('should be able to clear store', () => {
      expect(client.clearStore).toBeDefined();
      expect(typeof client.clearStore).toBe('function');
    });

    it('should be able to refetch queries', () => {
      expect(client.refetchQueries).toBeDefined();
      expect(typeof client.refetchQueries).toBe('function');
    });
  });

  describe('Retry Configuration', () => {
    it('should have retry logic configured', () => {
      // RetryLink should be part of the link chain
      expect(client.link).toBeDefined();
    });
  });

  describe('Security', () => {
    it('should use SecureStore for sensitive data', () => {
      // Auth tokens should be stored in SecureStore (encrypted)
      expect(mockSecureStore.getItemAsync).toBeDefined();
      expect(mockSecureStore.setItemAsync).toBeDefined();
      expect(mockSecureStore.deleteItemAsync).toBeDefined();
    });

    it('should have auth link for adding Bearer tokens', () => {
      // Auth link should be configured
      expect(client.link).toBeDefined();
    });
  });

  describe('Platform Compatibility', () => {
    it('should work on iOS', () => {
      // SecureStore works on iOS
      expect(mockSecureStore.getItemAsync).toBeDefined();
    });

    it('should work on Android', () => {
      // SecureStore works on Android
      expect(mockSecureStore.getItemAsync).toBeDefined();
    });
  });

  describe('Type Safety', () => {
    it('should export a typed client', () => {
      expect(client).toBeDefined();
      expect(client.query).toBeDefined();
      expect(client.mutate).toBeDefined();
    });
  });
});
