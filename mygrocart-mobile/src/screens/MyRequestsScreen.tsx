import React from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@apollo/client';
import { GET_MY_PRODUCT_REQUESTS } from '../graphql/queries';

interface ProductRequest {
  requestId: string;
  productName: string;
  status: string;
  createdAt: string;
  completedAt?: string;
}

export default function MyRequestsScreen() {
  const { data, loading, error, refetch } = useQuery(GET_MY_PRODUCT_REQUESTS, {
    fetchPolicy: 'cache-and-network',
  });

  if (loading && !data) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#16A34A" />
        <Text style={styles.loadingText}>Loading requests...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={64} color="#DC2626" />
        <Text style={styles.errorTitle}>Error Loading Requests</Text>
        <Text style={styles.errorText}>{error.message}</Text>
      </View>
    );
  }

  const requests: ProductRequest[] = data?.getMyProductRequests || [];

  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return { backgroundColor: '#D1FAE5', color: '#047857' };
      case 'processing':
        return { backgroundColor: '#DBEAFE', color: '#1E40AF' };
      case 'failed':
        return { backgroundColor: '#FEE2E2', color: '#991B1B' };
      default:
        return { backgroundColor: '#FEF3C7', color: '#92400E' };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const renderRequest = ({ item }: { item: ProductRequest }) => {
    const statusStyle = getStatusStyle(item.status);

    return (
      <View style={styles.requestCard}>
        <View style={styles.requestInfo}>
          <Text style={styles.requestName}>{item.productName}</Text>
          <Text style={styles.requestDate}>
            Requested {formatDate(item.createdAt)}
          </Text>
          {item.completedAt && (
            <Text style={styles.completedDate}>
              Completed {formatDate(item.completedAt)}
            </Text>
          )}
        </View>
        <View
          style={[styles.statusBadge, { backgroundColor: statusStyle.backgroundColor }]}
        >
          <Text style={[styles.statusText, { color: statusStyle.color }]}>
            {item.status}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Product Requests</Text>
        {requests.length > 0 && (
          <Text style={styles.subtitle}>
            {requests.length} request{requests.length !== 1 ? 's' : ''}
          </Text>
        )}
      </View>

      {requests.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={64} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>No Requests Yet</Text>
          <Text style={styles.emptyText}>
            Search for products and request items that aren't in our database yet.
          </Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          renderItem={renderRequest}
          keyExtractor={(item) => item.requestId}
          contentContainerStyle={styles.listContainer}
          onRefresh={refetch}
          refreshing={loading}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  listContainer: {
    padding: 16,
  },
  requestCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  requestInfo: {
    flex: 1,
    marginRight: 12,
  },
  requestName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  requestDate: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  completedDate: {
    fontSize: 12,
    color: '#16A34A',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    textAlign: 'center',
  },
});
