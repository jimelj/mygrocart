import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Text, ActivityIndicator } from 'react-native';
import { useQuery } from '@apollo/client';
import { GET_DEALS_NEAR_ME } from '../graphql/queries';
import { DealCard } from '../components/deals/DealCard';
import { useAuth } from '../context/AuthContext';

interface Deal {
  id: string;
  productName: string;
  productBrand?: string;
  salePrice: number;
  regularPrice?: number;
  storeName: string;
  dealType: string;
  savingsPercent?: number;
}

export default function DealsScreen() {
  const { user } = useAuth();
  const [category, setCategory] = useState<string | null>(null);

  const { data, loading, refetch } = useQuery(GET_DEALS_NEAR_ME, {
    variables: {
      zipCode: user?.zipCode || '07001',
      category,
      limit: 50,
    },
    skip: !user,
  });

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>Login Required</Text>
          <Text style={styles.emptyStateText}>
            Please login to view deals near you
          </Text>
        </View>
      </View>
    );
  }

  if (loading && !data) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#16A34A" />
        <Text style={styles.loadingText}>Loading deals...</Text>
      </View>
    );
  }

  const deals: Deal[] = data?.getDealsNearMe || [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Deals Near You</Text>
        <Text style={styles.headerSubtitle}>
          {deals.length} {deals.length === 1 ? 'deal' : 'deals'} this week
        </Text>
      </View>

      <FlatList
        data={deals}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <DealCard deal={item} />}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No Deals Found</Text>
            <Text style={styles.emptyStateText}>
              Check back later for new deals in your area
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 16,
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
  list: {
    padding: 16,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingVertical: 64,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
});
