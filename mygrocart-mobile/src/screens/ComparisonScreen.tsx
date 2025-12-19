import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  FlatList,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@apollo/client';
import { COMPARE_PRICES } from '../graphql/queries';
import { useAuth } from '../context/AuthContext';

interface MissingItem {
  name: string;
  upc: string;
  quantity: number;
}

interface StoreComparison {
  store: {
    storeId: string;
    chainName: string;
    storeName: string;
    city: string;
    state: string;
    latitude: number;
    longitude: number;
  };
  totalCost: number;
  itemCount: number;
  totalItems: number;
  completionPercentage: number;
  missingItems: MissingItem[];
  isCheapest: boolean;
  savings: number;
}

export default function ComparisonScreen({ navigation }: any) {
  const { user } = useAuth();
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedStore, setSelectedStore] = useState<StoreComparison | null>(null);

  const { data, loading, error, refetch } = useQuery(COMPARE_PRICES, {
    variables: { userId: user?.userId },
    skip: !user,
  });

  const openStoreDetails = (store: StoreComparison) => {
    setSelectedStore(store);
    setDetailsModalVisible(true);
  };

  const closeDetailsModal = () => {
    setDetailsModalVisible(false);
    setSelectedStore(null);
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="log-in-outline" size={64} color="#9CA3AF" />
          <Text style={styles.emptyStateTitle}>Login Required</Text>
          <Text style={styles.emptyStateText}>
            Please login to compare prices
          </Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#16A34A" />
        <Text style={styles.loadingText}>Comparing prices...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="alert-circle-outline" size={64} color="#DC2626" />
        <Text style={styles.emptyStateTitle}>Error</Text>
        <Text style={styles.emptyStateText}>{error.message}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const comparisons: StoreComparison[] = data?.comparePrices?.stores || [];

  if (comparisons.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="storefront-outline" size={64} color="#9CA3AF" />
        <Text style={styles.emptyStateTitle}>No Stores Found</Text>
        <Text style={styles.emptyStateText}>
          Add items to your list to see price comparisons
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => navigation.navigate('List')}
        >
          <Text style={styles.retryButtonText}>Go to List</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const cheapestStore = comparisons.find((c) => c.isCheapest);
  const maxTotal = Math.max(...comparisons.map((c) => c.totalCost));
  const totalSavingsPossible = maxTotal - (cheapestStore?.totalCost || 0);

  return (
    <>
      <ScrollView style={styles.container}>
        {/* Savings Hero Card */}
        {cheapestStore && (
          <View style={styles.heroCard}>
            <View style={styles.heroContent}>
              <Text style={styles.heroLabel}>Best Deal Found</Text>
              <Text style={styles.heroPrice}>
                ${cheapestStore.totalCost.toFixed(2)}
              </Text>
              <Text style={styles.heroSubtext}>at {cheapestStore.store.chainName}</Text>
            </View>
            <View style={styles.heroSavings}>
              <Text style={styles.heroPotentialLabel}>Save Up To</Text>
              <Text style={styles.heroPotentialPrice}>
                ${totalSavingsPossible.toFixed(2)}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.header}>
          <Text style={styles.headerTitle}>Store Comparison</Text>
          <Text style={styles.headerSubtitle}>
            {comparisons.length} {comparisons.length === 1 ? 'store' : 'stores'} available
          </Text>
        </View>

        <View style={styles.cardsContainer}>
          {comparisons.map((comparison, index) => (
            <View
              key={comparison.store.storeId}
              style={[
                styles.storeCard,
                comparison.isCheapest && styles.cheapestCard,
              ]}
            >
              <View style={styles.storeHeader}>
                <View style={styles.storeHeaderLeft}>
                  <Text style={styles.storeName}>{comparison.store.chainName}</Text>
                  {comparison.isCheapest && (
                    <View style={styles.cheapestBadge}>
                      <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
                      <Text style={styles.cheapestBadgeText}>CHEAPEST</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.storeRank}>#{index + 1}</Text>
              </View>

              <View style={styles.distanceContainer}>
                <Ionicons name="location" size={16} color="#6B7280" />
                <Text style={styles.distanceText}>
                  {comparison.store.city}, {comparison.store.state}
                </Text>
              </View>

              <View style={styles.priceContainer}>
                <Text style={styles.priceLabel}>Total Cost</Text>
                <Text style={styles.priceValue}>
                  ${comparison.totalCost.toFixed(2)}
                </Text>
              </View>

              {comparison.savings > 0 ? (
                <View style={styles.savingsContainer}>
                  <Ionicons name="trending-down" size={16} color="#16A34A" />
                  <Text style={styles.savingsText}>
                    Save ${comparison.savings.toFixed(2)}
                  </Text>
                </View>
              ) : (
                <Text style={styles.noSavingsText}>Most expensive store</Text>
              )}

              <TouchableOpacity
                style={styles.viewDetailsButton}
                onPress={() => openStoreDetails(comparison)}
              >
                <Text style={styles.viewDetailsButtonText}>View Breakdown</Text>
                <Ionicons name="chevron-forward" size={18} color="#16A34A" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Details Modal */}
      <Modal
        visible={detailsModalVisible}
        animationType="slide"
        onRequestClose={closeDetailsModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeDetailsModal}>
              <Ionicons name="close" size={28} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>
              {selectedStore?.store.chainName}
            </Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Store Info */}
            <View style={styles.modalStoreInfo}>
              <View>
                <Text style={styles.modalStoreDistance}>
                  <Ionicons name="location" size={14} color="#6B7280" />
                  {selectedStore?.store.city}, {selectedStore?.store.state}
                </Text>
                <Text style={styles.modalStoreCompletion}>
                  {selectedStore?.itemCount} of {selectedStore?.totalItems} items available ({selectedStore?.completionPercentage.toFixed(0)}%)
                </Text>
              </View>
              <View style={styles.modalStoreCost}>
                <Text style={styles.modalStoreCostLabel}>Total Cost</Text>
                <Text style={styles.modalStoreCostValue}>
                  ${selectedStore?.totalCost.toFixed(2)}
                </Text>
              </View>
            </View>

            {/* Missing Items Breakdown */}
            {selectedStore && selectedStore.missingItems.length > 0 && (
              <View style={styles.breakdownSection}>
                <Text style={styles.breakdownTitle}>Missing Items ({selectedStore.missingItems.length})</Text>
                <Text style={styles.breakdownSubtitle}>
                  These items are not available at this store
                </Text>
                {selectedStore.missingItems.map((item, idx) => (
                  <View key={`${item.upc}-${idx}`} style={styles.breakdownItem}>
                    <View style={styles.breakdownItemInfo}>
                      <Text style={styles.breakdownItemName} numberOfLines={2}>
                        {item.name}
                      </Text>
                      <Text style={styles.breakdownItemQty}>Qty: {item.quantity}</Text>
                    </View>
                    <View style={styles.breakdownItemPrice}>
                      <Text style={styles.breakdownItemUnavailable}>
                        Not Available
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Summary */}
            <View style={styles.summarySection}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>
                  ${selectedStore?.totalCost.toFixed(2)}
                </Text>
              </View>
              {selectedStore?.savings ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Potential Savings</Text>
                  <Text style={styles.summaryValueGreen}>
                    -${selectedStore.savings.toFixed(2)}
                  </Text>
                </View>
              ) : null}
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={closeDetailsModal}
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  // Hero Card Styles
  heroCard: {
    flexDirection: 'row',
    backgroundColor: '#10B981',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 20,
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  heroContent: {
    flex: 1,
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroPrice: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'monospace',
  },
  heroSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  heroSavings: {
    alignItems: 'flex-end',
  },
  heroPotentialLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  heroPotentialPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'monospace',
  },
  // Header Styles
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  // Cards Container
  cardsContainer: {
    padding: 16,
  },
  storeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cheapestCard: {
    borderWidth: 2,
    borderColor: '#16A34A',
    backgroundColor: 'rgba(22, 163, 74, 0.02)',
  },
  storeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  storeHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  storeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginRight: 8,
  },
  storeRank: {
    fontSize: 18,
    fontWeight: '700',
    color: '#E5E7EB',
  },
  cheapestBadge: {
    flexDirection: 'row',
    backgroundColor: '#16A34A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignItems: 'center',
  },
  cheapestBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  distanceText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 6,
  },
  priceContainer: {
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
    fontWeight: '500',
  },
  priceValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'monospace',
  },
  savingsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  savingsText: {
    fontSize: 14,
    color: '#16A34A',
    marginLeft: 6,
    fontWeight: '600',
  },
  noSavingsText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 14,
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginTop: 12,
  },
  viewDetailsButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#16A34A',
    marginRight: 6,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalStoreInfo: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  modalStoreDistance: {
    fontSize: 14,
    color: '#6B7280',
  },
  modalStoreCompletion: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  modalStoreCost: {
    alignItems: 'flex-end',
  },
  modalStoreCostLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  modalStoreCostValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'monospace',
  },
  // Breakdown Styles
  breakdownSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  breakdownSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  breakdownItemInfo: {
    flex: 1,
    marginRight: 12,
  },
  breakdownItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  breakdownItemMeta: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  breakdownItemQty: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  breakdownItemPrice: {
    alignItems: 'flex-end',
  },
  breakdownItemPricePerUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  breakdownItemTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#16A34A',
    fontFamily: 'monospace',
  },
  breakdownItemUnavailable: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
  },
  // Summary Styles
  summarySection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'monospace',
  },
  summaryValueGreen: {
    fontSize: 16,
    fontWeight: '700',
    color: '#16A34A',
    fontFamily: 'monospace',
  },
  // Modal Footer
  modalFooter: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 32,
  },
  modalCloseButton: {
    backgroundColor: '#16A34A',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Loading & Empty States
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#F9FAFB',
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
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#16A34A',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
