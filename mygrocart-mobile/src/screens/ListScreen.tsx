import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@apollo/client/react';
import {
  GET_USER_GROCERY_LISTS,
  UPDATE_GROCERY_LIST_ITEM,
  REMOVE_GROCERY_LIST_ITEM,
} from '../graphql/queries';
import { useAuth } from '../context/AuthContext';

interface ListItem {
  listItemId: string;
  quantity: number;
  product: {
    upc: string;
    name: string;
    brand: string;
    size: string;
    imageUrl?: string;
  };
}

export default function ListScreen({ navigation }: any) {
  const { user } = useAuth();

  const { data, loading, error, refetch } = useQuery(GET_USER_GROCERY_LISTS, {
    variables: { userId: user?.userId },
    skip: !user,
  });

  const [updateQuantity] = useMutation(UPDATE_GROCERY_LIST_ITEM, {
    refetchQueries: [{ query: GET_USER_GROCERY_LISTS, variables: { userId: user?.userId } }],
  });

  const [removeItem] = useMutation(REMOVE_GROCERY_LIST_ITEM, {
    refetchQueries: [{ query: GET_USER_GROCERY_LISTS, variables: { userId: user?.userId } }],
  });

  const handleUpdateQuantity = async (listItemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    try {
      await updateQuantity({
        variables: {
          listItemId,
          quantity: newQuantity,
        },
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to update quantity. Please try again.');
    }
  };

  const handleRemoveItem = async (listItemId: string, productName: string) => {
    Alert.alert(
      'Remove Item',
      `Remove "${productName}" from your list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeItem({
                variables: { listItemId },
              });
            } catch (error) {
              Alert.alert('Error', 'Failed to remove item. Please try again.');
            }
          },
        },
      ]
    );
  };

  const renderListItem = ({ item }: { item: ListItem }) => (
    <View style={styles.listItem}>
      <View style={styles.imageContainer}>
        {item.product.imageUrl ? (
          <Image source={{ uri: item.product.imageUrl }} style={styles.productImage} />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="cube-outline" size={32} color="#9CA3AF" />
          </View>
        )}
      </View>

      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.product.name}
        </Text>
        <Text style={styles.productBrand}>{item.product.brand}</Text>
        <Text style={styles.productSize}>{item.product.size}</Text>
      </View>

      <View style={styles.controls}>
        <View style={styles.quantityContainer}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => handleUpdateQuantity(item.listItemId, item.quantity - 1)}
          >
            <Ionicons name="remove" size={20} color="#111827" />
          </TouchableOpacity>

          <Text style={styles.quantityText}>{item.quantity}</Text>

          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => handleUpdateQuantity(item.listItemId, item.quantity + 1)}
          >
            <Ionicons name="add" size={20} color="#111827" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleRemoveItem(item.listItemId, item.product.name)}
        >
          <Ionicons name="trash-outline" size={20} color="#DC2626" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="cart-outline" size={64} color="#9CA3AF" />
      <Text style={styles.emptyStateTitle}>Your list is empty</Text>
      <Text style={styles.emptyStateText}>
        Start adding products to compare prices
      </Text>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('Search')}
      >
        <Text style={styles.addButtonText}>Search Products</Text>
      </TouchableOpacity>
    </View>
  );

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="log-in-outline" size={64} color="#9CA3AF" />
          <Text style={styles.emptyStateTitle}>Login Required</Text>
          <Text style={styles.emptyStateText}>
            Please login to view your shopping list
          </Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#16A34A" />
        <Text style={styles.loadingText}>Loading your list...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="alert-circle-outline" size={64} color="#DC2626" />
        <Text style={styles.emptyStateTitle}>Error Loading List</Text>
        <Text style={styles.emptyStateText}>{error.message}</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => refetch()}>
          <Text style={styles.addButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const listItems = data?.getUserGroceryLists || [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Shopping List</Text>
        <Text style={styles.headerSubtitle}>
          {listItems.length} {listItems.length === 1 ? 'item' : 'items'}
        </Text>
      </View>

      <FlatList
        data={listItems}
        renderItem={renderListItem}
        keyExtractor={(item) => item.listItemId}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {listItems.length > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.compareButton}
            onPress={() => navigation.navigate('Comparison')}
          >
            <Ionicons name="analytics" size={24} color="#FFFFFF" />
            <Text style={styles.compareButtonText}>Compare Prices</Text>
          </TouchableOpacity>
        </View>
      )}
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
  listContainer: {
    padding: 16,
    flexGrow: 1,
  },
  listItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
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
  controls: {
    alignItems: 'center',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginBottom: 8,
  },
  quantityButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    minWidth: 32,
    textAlign: 'center',
  },
  deleteButton: {
    padding: 4,
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
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  addButton: {
    backgroundColor: '#16A34A',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  compareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A34A',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  compareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
});
