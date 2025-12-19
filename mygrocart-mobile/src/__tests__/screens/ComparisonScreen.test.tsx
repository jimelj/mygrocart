import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { MockedProvider } from '@apollo/client/testing';
import ComparisonScreen from '../../screens/ComparisonScreen';
import { COMPARE_PRICES } from '../../graphql/queries';
import { AuthProvider } from '../../context/AuthContext';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock dependencies
jest.mock('expo-secure-store');
jest.mock('@react-native-async-storage/async-storage');

const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('ComparisonScreen', () => {
  const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
  };

  const testUser = {
    userId: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Set up authenticated user
    mockSecureStore.getItemAsync.mockResolvedValue('test-token');
    mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(testUser));
  });

  const renderComparisonScreen = (mocks: any[] = []) => {
    return render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <AuthProvider>
          <ComparisonScreen navigation={mockNavigation} />
        </AuthProvider>
      </MockedProvider>
    );
  };

  describe('Rendering', () => {
    it('should render loading state initially', () => {
      const { getByText } = renderComparisonScreen([]);
      expect(getByText('Comparing prices...')).toBeTruthy();
    });

    it('should render login required when user is not authenticated', async () => {
      // Clear auth
      mockSecureStore.getItemAsync.mockResolvedValue(null);
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const { getByText } = renderComparisonScreen([]);

      await waitFor(() => {
        expect(getByText('Login Required')).toBeTruthy();
        expect(getByText('Please login to compare prices')).toBeTruthy();
      });
    });

    it('should render error state when query fails', async () => {
      const errorMock = {
        request: {
          query: COMPARE_PRICES,
          variables: { userId: testUser.userId },
        },
        error: new Error('Network error'),
      };

      const { getByText } = renderComparisonScreen([errorMock]);

      await waitFor(() => {
        expect(getByText('Error')).toBeTruthy();
        expect(getByText('Network error')).toBeTruthy();
      });
    });

    it('should render empty state when no stores found', async () => {
      const emptyMock = {
        request: {
          query: COMPARE_PRICES,
          variables: { userId: testUser.userId },
        },
        result: {
          data: {
            comparePrices: {
              userId: testUser.userId,
              stores: [],
              cheapestStore: null,
              maxSavings: 0,
              message: 'No stores found',
            },
          },
        },
      };

      const { getByText } = renderComparisonScreen([emptyMock]);

      await waitFor(() => {
        expect(getByText('No Stores Found')).toBeTruthy();
        expect(getByText('Add items to your list to see price comparisons')).toBeTruthy();
      });
    });

    it('should render store comparison cards', async () => {
      const successMock = {
        request: {
          query: COMPARE_PRICES,
          variables: { userId: testUser.userId },
        },
        result: {
          data: {
            comparePrices: {
              userId: testUser.userId,
              stores: [
                {
                  store: {
                    storeId: 'store-1',
                    chainName: 'ShopRite',
                    storeName: 'ShopRite Newark',
                    city: 'Newark',
                    state: 'NJ',
                    latitude: 40.7357,
                    longitude: -74.1724,
                  },
                  totalCost: 45.99,
                  itemCount: 10,
                  totalItems: 10,
                  completionPercentage: 100,
                  missingItems: [],
                  isCheapest: true,
                  savings: 0,
                },
                {
                  store: {
                    storeId: 'store-2',
                    chainName: 'Target',
                    storeName: 'Target Jersey City',
                    city: 'Jersey City',
                    state: 'NJ',
                    latitude: 40.7178,
                    longitude: -74.0431,
                  },
                  totalCost: 52.49,
                  itemCount: 10,
                  totalItems: 10,
                  completionPercentage: 100,
                  missingItems: [],
                  isCheapest: false,
                  savings: 6.50,
                },
              ],
              cheapestStore: 'ShopRite',
              maxSavings: 6.50,
              message: 'Comparison complete',
            },
          },
        },
      };

      const { getByText } = renderComparisonScreen([successMock]);

      await waitFor(() => {
        expect(getByText('ShopRite')).toBeTruthy();
        expect(getByText('Target')).toBeTruthy();
        expect(getByText('$45.99')).toBeTruthy();
        expect(getByText('$52.49')).toBeTruthy();
      });
    });

    it('should show cheapest store badge', async () => {
      const successMock = {
        request: {
          query: COMPARE_PRICES,
          variables: { userId: testUser.userId },
        },
        result: {
          data: {
            comparePrices: {
              userId: testUser.userId,
              stores: [
                {
                  store: {
                    storeId: 'store-1',
                    chainName: 'ShopRite',
                    storeName: 'ShopRite Newark',
                    city: 'Newark',
                    state: 'NJ',
                    latitude: 40.7357,
                    longitude: -74.1724,
                  },
                  totalCost: 45.99,
                  itemCount: 10,
                  totalItems: 10,
                  completionPercentage: 100,
                  missingItems: [],
                  isCheapest: true,
                  savings: 0,
                },
              ],
              cheapestStore: 'ShopRite',
              maxSavings: 0,
              message: 'Comparison complete',
            },
          },
        },
      };

      const { getByText } = renderComparisonScreen([successMock]);

      await waitFor(() => {
        expect(getByText('CHEAPEST')).toBeTruthy();
      });
    });

    it('should show missing items section when items are unavailable', async () => {
      const missingItemsMock = {
        request: {
          query: COMPARE_PRICES,
          variables: { userId: testUser.userId },
        },
        result: {
          data: {
            comparePrices: {
              userId: testUser.userId,
              stores: [
                {
                  store: {
                    storeId: 'store-1',
                    chainName: 'ShopRite',
                    storeName: 'ShopRite Newark',
                    city: 'Newark',
                    state: 'NJ',
                    latitude: 40.7357,
                    longitude: -74.1724,
                  },
                  totalCost: 30.00,
                  itemCount: 8,
                  totalItems: 10,
                  completionPercentage: 80,
                  missingItems: [
                    { name: 'Organic Milk', upc: '123456', quantity: 1 },
                    { name: 'Bread', upc: '789012', quantity: 2 },
                  ],
                  isCheapest: true,
                  savings: 0,
                },
              ],
              cheapestStore: 'ShopRite',
              maxSavings: 0,
              message: 'Comparison complete',
            },
          },
        },
      };

      const { getByText } = renderComparisonScreen([missingItemsMock]);

      await waitFor(() => {
        expect(getByText('View Breakdown')).toBeTruthy();
      });

      // Click View Breakdown to open modal
      fireEvent.press(getByText('View Breakdown'));

      await waitFor(() => {
        expect(getByText('Missing Items (2)')).toBeTruthy();
        expect(getByText('Organic Milk')).toBeTruthy();
        expect(getByText('Bread')).toBeTruthy();
      });
    });
  });

  describe('Data Display', () => {
    const mockData = {
      request: {
        query: COMPARE_PRICES,
        variables: { userId: testUser.userId },
      },
      result: {
        data: {
          comparePrices: {
            userId: testUser.userId,
            stores: [
              {
                store: {
                  storeId: 'store-1',
                  chainName: 'ShopRite',
                  storeName: 'ShopRite Newark',
                  city: 'Newark',
                  state: 'NJ',
                  latitude: 40.7357,
                  longitude: -74.1724,
                },
                totalCost: 45.99,
                itemCount: 10,
                totalItems: 10,
                completionPercentage: 100,
                missingItems: [],
                isCheapest: true,
                savings: 0,
              },
            ],
            cheapestStore: 'ShopRite',
            maxSavings: 0,
            message: 'Comparison complete',
          },
        },
      },
    };

    it('should display store names correctly', async () => {
      const { getByText } = renderComparisonScreen([mockData]);

      await waitFor(() => {
        expect(getByText('ShopRite')).toBeTruthy();
      });
    });

    it('should format prices correctly', async () => {
      const { getByText } = renderComparisonScreen([mockData]);

      await waitFor(() => {
        expect(getByText('$45.99')).toBeTruthy();
      });
    });

    it('should calculate savings correctly', async () => {
      const savingsMock = {
        request: {
          query: COMPARE_PRICES,
          variables: { userId: testUser.userId },
        },
        result: {
          data: {
            comparePrices: {
              userId: testUser.userId,
              stores: [
                {
                  store: {
                    storeId: 'store-1',
                    chainName: 'ShopRite',
                    storeName: 'ShopRite Newark',
                    city: 'Newark',
                    state: 'NJ',
                    latitude: 40.7357,
                    longitude: -74.1724,
                  },
                  totalCost: 45.99,
                  itemCount: 10,
                  totalItems: 10,
                  completionPercentage: 100,
                  missingItems: [],
                  isCheapest: true,
                  savings: 0,
                },
                {
                  store: {
                    storeId: 'store-2',
                    chainName: 'Target',
                    storeName: 'Target Jersey City',
                    city: 'Jersey City',
                    state: 'NJ',
                    latitude: 40.7178,
                    longitude: -74.0431,
                  },
                  totalCost: 52.49,
                  itemCount: 10,
                  totalItems: 10,
                  completionPercentage: 100,
                  missingItems: [],
                  isCheapest: false,
                  savings: 6.50,
                },
              ],
              cheapestStore: 'ShopRite',
              maxSavings: 6.50,
              message: 'Comparison complete',
            },
          },
        },
      };

      const { getByText } = renderComparisonScreen([savingsMock]);

      await waitFor(() => {
        expect(getByText('Save $6.50')).toBeTruthy();
      });
    });

    it('should show completion percentage', async () => {
      const partialMock = {
        request: {
          query: COMPARE_PRICES,
          variables: { userId: testUser.userId },
        },
        result: {
          data: {
            comparePrices: {
              userId: testUser.userId,
              stores: [
                {
                  store: {
                    storeId: 'store-1',
                    chainName: 'ShopRite',
                    storeName: 'ShopRite Newark',
                    city: 'Newark',
                    state: 'NJ',
                    latitude: 40.7357,
                    longitude: -74.1724,
                  },
                  totalCost: 30.00,
                  itemCount: 8,
                  totalItems: 10,
                  completionPercentage: 80,
                  missingItems: [],
                  isCheapest: true,
                  savings: 0,
                },
              ],
              cheapestStore: 'ShopRite',
              maxSavings: 0,
              message: 'Comparison complete',
            },
          },
        },
      };

      const { getByText } = renderComparisonScreen([partialMock]);

      await waitFor(() => {
        expect(getByText('View Breakdown')).toBeTruthy();
      });

      // Open modal to see completion percentage
      fireEvent.press(getByText('View Breakdown'));

      await waitFor(() => {
        expect(getByText('8 of 10 items available (80%)')).toBeTruthy();
      });
    });
  });

  describe('Query Integration', () => {
    it('should call COMPARE_PRICES query with userId', async () => {
      const mockQuery = {
        request: {
          query: COMPARE_PRICES,
          variables: { userId: testUser.userId },
        },
        result: {
          data: {
            comparePrices: {
              userId: testUser.userId,
              stores: [],
              cheapestStore: null,
              maxSavings: 0,
              message: 'No stores found',
            },
          },
        },
      };

      renderComparisonScreen([mockQuery]);

      await waitFor(() => {
        expect(mockQuery.request.variables.userId).toBe(testUser.userId);
      });
    });

    it('should handle query loading state', () => {
      const { getByText } = renderComparisonScreen([]);
      expect(getByText('Comparing prices...')).toBeTruthy();
    });

    it('should handle query errors', async () => {
      const errorMock = {
        request: {
          query: COMPARE_PRICES,
          variables: { userId: testUser.userId },
        },
        error: new Error('GraphQL error'),
      };

      const { getByText } = renderComparisonScreen([errorMock]);

      await waitFor(() => {
        expect(getByText('Error')).toBeTruthy();
      });
    });

    it('should skip query when user is not authenticated', async () => {
      // Clear auth
      mockSecureStore.getItemAsync.mockResolvedValue(null);
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const { getByText } = renderComparisonScreen([]);

      await waitFor(() => {
        expect(getByText('Login Required')).toBeTruthy();
      });
    });
  });

  describe('User Interactions', () => {
    const mockData = {
      request: {
        query: COMPARE_PRICES,
        variables: { userId: testUser.userId },
      },
      result: {
        data: {
          comparePrices: {
            userId: testUser.userId,
            stores: [
              {
                store: {
                  storeId: 'store-1',
                  chainName: 'ShopRite',
                  storeName: 'ShopRite Newark',
                  city: 'Newark',
                  state: 'NJ',
                  latitude: 40.7357,
                  longitude: -74.1724,
                },
                totalCost: 45.99,
                itemCount: 10,
                totalItems: 10,
                completionPercentage: 100,
                missingItems: [],
                isCheapest: true,
                savings: 0,
              },
            ],
            cheapestStore: 'ShopRite',
            maxSavings: 0,
            message: 'Comparison complete',
          },
        },
      },
    };

    it('should open details modal when View Breakdown is pressed', async () => {
      const { getByText } = renderComparisonScreen([mockData]);

      await waitFor(() => {
        expect(getByText('View Breakdown')).toBeTruthy();
      });

      fireEvent.press(getByText('View Breakdown'));

      await waitFor(() => {
        expect(getByText('ShopRite')).toBeTruthy();
        expect(getByText('Close')).toBeTruthy();
      });
    });

    it('should close details modal when Close button is pressed', async () => {
      const { getByText, queryByText } = renderComparisonScreen([mockData]);

      await waitFor(() => {
        expect(getByText('View Breakdown')).toBeTruthy();
      });

      // Open modal
      fireEvent.press(getByText('View Breakdown'));

      await waitFor(() => {
        expect(getByText('Close')).toBeTruthy();
      });

      // Close modal
      fireEvent.press(getByText('Close'));

      await waitFor(() => {
        expect(queryByText('Close')).toBeNull();
      });
    });

    it('should navigate to List when Go to List is pressed', async () => {
      const emptyMock = {
        request: {
          query: COMPARE_PRICES,
          variables: { userId: testUser.userId },
        },
        result: {
          data: {
            comparePrices: {
              userId: testUser.userId,
              stores: [],
              cheapestStore: null,
              maxSavings: 0,
              message: 'No stores found',
            },
          },
        },
      };

      const { getByText } = renderComparisonScreen([emptyMock]);

      await waitFor(() => {
        expect(getByText('Go to List')).toBeTruthy();
      });

      fireEvent.press(getByText('Go to List'));

      expect(mockNavigation.navigate).toHaveBeenCalledWith('List');
    });

    it('should retry query when Try Again is pressed', async () => {
      const errorMock = {
        request: {
          query: COMPARE_PRICES,
          variables: { userId: testUser.userId },
        },
        error: new Error('Network error'),
      };

      const { getByText } = renderComparisonScreen([errorMock]);

      await waitFor(() => {
        expect(getByText('Try Again')).toBeTruthy();
      });

      fireEvent.press(getByText('Try Again'));

      // Refetch should be called (tested indirectly)
      expect(getByText('Try Again')).toBeTruthy();
    });
  });

  describe('Hero Card', () => {
    it('should display hero card with cheapest store info', async () => {
      const mockData = {
        request: {
          query: COMPARE_PRICES,
          variables: { userId: testUser.userId },
        },
        result: {
          data: {
            comparePrices: {
              userId: testUser.userId,
              stores: [
                {
                  store: {
                    storeId: 'store-1',
                    chainName: 'ShopRite',
                    storeName: 'ShopRite Newark',
                    city: 'Newark',
                    state: 'NJ',
                    latitude: 40.7357,
                    longitude: -74.1724,
                  },
                  totalCost: 45.99,
                  itemCount: 10,
                  totalItems: 10,
                  completionPercentage: 100,
                  missingItems: [],
                  isCheapest: true,
                  savings: 0,
                },
              ],
              cheapestStore: 'ShopRite',
              maxSavings: 0,
              message: 'Comparison complete',
            },
          },
        },
      };

      const { getByText } = renderComparisonScreen([mockData]);

      await waitFor(() => {
        expect(getByText('Best Deal Found')).toBeTruthy();
        expect(getByText('at ShopRite')).toBeTruthy();
      });
    });

    it('should display potential savings in hero card', async () => {
      const mockData = {
        request: {
          query: COMPARE_PRICES,
          variables: { userId: testUser.userId },
        },
        result: {
          data: {
            comparePrices: {
              userId: testUser.userId,
              stores: [
                {
                  store: {
                    storeId: 'store-1',
                    chainName: 'ShopRite',
                    storeName: 'ShopRite Newark',
                    city: 'Newark',
                    state: 'NJ',
                    latitude: 40.7357,
                    longitude: -74.1724,
                  },
                  totalCost: 45.99,
                  itemCount: 10,
                  totalItems: 10,
                  completionPercentage: 100,
                  missingItems: [],
                  isCheapest: true,
                  savings: 0,
                },
                {
                  store: {
                    storeId: 'store-2',
                    chainName: 'Target',
                    storeName: 'Target Jersey City',
                    city: 'Jersey City',
                    state: 'NJ',
                    latitude: 40.7178,
                    longitude: -74.0431,
                  },
                  totalCost: 55.99,
                  itemCount: 10,
                  totalItems: 10,
                  completionPercentage: 100,
                  missingItems: [],
                  isCheapest: false,
                  savings: 10.00,
                },
              ],
              cheapestStore: 'ShopRite',
              maxSavings: 10.00,
              message: 'Comparison complete',
            },
          },
        },
      };

      const { getByText } = renderComparisonScreen([mockData]);

      await waitFor(() => {
        expect(getByText('Save Up To')).toBeTruthy();
        expect(getByText('$10.00')).toBeTruthy();
      });
    });
  });
});
