import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLazyQuery, useMutation } from '@apollo/client/react';
import { SEARCH_PRODUCTS, ADD_GROCERY_LIST_ITEM } from '../graphql/queries';
import { REQUEST_PRICE_UPDATE } from '../graphql/mutations';
import { useAuth } from '../context/AuthContext';
import { EmptySearchState } from '../components/EmptySearchState';
import { PriceFreshnessBadge } from '../components/PriceFreshnessBadge';

// Debounce hook
function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

interface StorePrice {
  priceId: string;
  storeId: string;
  price: number;
  dealType?: string;
  lastUpdated: string;
  store: {
    storeId: string;
    chainName: string;
    storeName: string;
    city: string;
    state: string;
  };
}

interface Product {
  upc: string;
  name: string;
  brand: string;
  size: string;
  category?: string;
  imageUrl?: string;
  priceAge?: string;
  lastPriceUpdate?: string;
  searchCount?: number;
  storePrices?: StorePrice[];
}

// Popular search terms
const POPULAR_SEARCHES = [
  'milk', 'bread', 'eggs', 'chicken', 'rice', 'pasta',
  'cereal', 'coffee', 'butter', 'yogurt', 'cheese', 'beef'
];

export default function ProductSearchScreen({ navigation }: any) {
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const debouncedSearch = useDebounce(searchQuery, 500);
  const { user } = useAuth();

  const [searchProducts, { loading, error }] = useLazyQuery(SEARCH_PRODUCTS, {
    onCompleted: (data) => {
      setProducts(data.searchProducts || []);
    },
    onError: (err) => {
      Alert.alert('Error', 'Failed to search products. Please try again.');
    },
  });

  const [addToList] = useMutation(ADD_GROCERY_LIST_ITEM, {
    onCompleted: () => {
      Alert.alert('Success', 'Product added to your list!');
    },
    onError: (err) => {
      Alert.alert('Error', 'Failed to add product to list. Please try again.');
    },
  });

  const [requestPriceUpdate] = useMutation(REQUEST_PRICE_UPDATE, {
    onCompleted: () => {
      Alert.alert(
        'Update Requested',
        'Price update requested! We\'ll refresh the prices within 24 hours.',
        [{ text: 'OK' }]
      );
    },
    onError: (err) => {
      Alert.alert('Error', 'Failed to request price update. Please try again.');
    },
  });

  React.useEffect(() => {
    if (debouncedSearch.trim().length > 2) {
      searchProducts({
        variables: {
          query: debouncedSearch,
          limit: 20,
        },
      });
    } else {
      setProducts([]);
    }
  }, [debouncedSearch]);

  const handleAddToList = async (product: Product) => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to add items to your list.');
      return;
    }

    try {
      await addToList({
        variables: {
          userId: user.userId,
          upc: product.upc,
          quantity: 1,
        },
      });
    } catch (error) {
      // Error already handled by mutation's onError callback
    }
  };

  const handleRequestPriceUpdate = async (upc: string) => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to request price updates.');
      return;
    }

    try {
      await requestPriceUpdate({
        variables: {
          upc,
          priority: 'high',
        },
      });
    } catch (error) {
      // Error already handled by mutation's onError callback
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setProducts([]);
  };

  const renderProduct = ({ item }: { item: Product }) => {
    // Calculate lowest price and store count
    const lowestPrice = item.storePrices && item.storePrices.length > 0
      ? Math.min(...item.storePrices.map(sp => sp.price))
      : null;
    const storeCount = item.storePrices?.length || 0;
    const hasDeals = item.storePrices?.some(sp => sp.dealType) || false;

    return (
      <View style={styles.productCard}>
        <View style={styles.imageContainer}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.productImage} />
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="cube-outline" size={32} color="#9CA3AF" />
            </View>
          )}
        </View>

        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.productBrand} numberOfLines={1}>
            {item.brand}
          </Text>
          <Text style={styles.productSize}>{item.size}</Text>

          {/* Price Information */}
          <View style={styles.priceInfoContainer}>
            {lowestPrice !== null ? (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>From </Text>
                <Text style={styles.priceValue}>${lowestPrice.toFixed(2)}</Text>
                {hasDeals && (
                  <View style={styles.dealBadge}>
                    <Text style={styles.dealBadgeText}>DEAL</Text>
                  </View>
                )}
              </View>
            ) : (
              <Text style={styles.noPriceText}>Price not available</Text>
            )}
            {storeCount > 0 && (
              <Text style={styles.storeCountText}>
                {storeCount} store{storeCount > 1 ? 's' : ''}
              </Text>
            )}
          </View>

          {/* Price Freshness Badge */}
          {item.priceAge && (
            <View style={styles.freshnessRow}>
              <PriceFreshnessBadge
                priceAge={item.priceAge}
                lastPriceUpdate={item.lastPriceUpdate}
              />
              {item.priceAge.includes('ago') && (
                <TouchableOpacity
                  onPress={() => handleRequestPriceUpdate(item.upc)}
                  style={styles.updateButton}
                  accessibilityLabel="Request price update"
                  accessibilityRole="button"
                >
                  <Text style={styles.updateButtonText}>Update</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => handleAddToList(item)}
        >
          <Ionicons name="add-circle" size={28} color="#16A34A" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmptyState = () => {
    if (loading) return null;

    if (searchQuery.trim().length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="search" size={64} color="#9CA3AF" />
          <Text style={styles.emptyStateTitle}>Search for Products</Text>
          <Text style={styles.emptyStateText}>
            Enter a product name, brand, or category to start searching
          </Text>

          {/* Popular Searches */}
          <View style={styles.popularSearchContainer}>
            <Text style={styles.popularSearchTitle}>Popular Searches:</Text>
            <View style={styles.popularSearchGrid}>
              {POPULAR_SEARCHES.map((term) => (
                <TouchableOpacity
                  key={term}
                  style={styles.popularSearchChip}
                  onPress={() => setSearchQuery(term)}
                >
                  <Text style={styles.popularSearchText}>{term}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      );
    }

    if (searchQuery.trim().length > 0 && searchQuery.trim().length < 3) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="information-circle" size={64} color="#3B82F6" />
          <Text style={styles.emptyStateTitle}>Keep Typing...</Text>
          <Text style={styles.emptyStateText}>
            Enter at least 3 characters to search
          </Text>
        </View>
      );
    }

    if (products.length === 0 && !loading) {
      return <EmptySearchState searchTerm={searchQuery} />;
    }

    return null;
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons
            name="search"
            size={20}
            color="#6B7280"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading && products.length === 0 && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#16A34A" />
          <Text style={styles.loadingText}>Searching stores...</Text>
          <Text style={styles.loadingSubtext}>
            This may take 5-10 seconds while we check Target and ShopRite
          </Text>
        </View>
      )}

      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item.upc}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  clearButton: {
    padding: 4,
  },
  listContainer: {
    padding: 16,
    flexGrow: 1,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  imageContainer: {
    marginRight: 12,
  },
  productImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
  },
  placeholderImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    flex: 1,
    marginRight: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  productBrand: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  productSize: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  addButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
    marginTop: 12,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  priceInfoContainer: {
    marginTop: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  priceLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#16A34A',
  },
  dealBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  dealBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  storeCountText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  noPriceText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  popularSearchContainer: {
    marginTop: 32,
    width: '100%',
    paddingHorizontal: 16,
  },
  popularSearchTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'left',
  },
  popularSearchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  popularSearchChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  popularSearchText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  freshnessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  updateButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  updateButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
});
