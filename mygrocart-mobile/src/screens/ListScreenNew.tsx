import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@apollo/client/react';
import { GET_MY_LIST_WITH_DEALS } from '../graphql/queries';
import { ADD_LIST_ITEM, UPDATE_LIST_ITEM, REMOVE_LIST_ITEM } from '../graphql/mutations';
import { SmartItemInput } from '../components/list/SmartItemInput';
import { DealBadge } from '../components/deals/DealBadge';
import { useAuth } from '../context/AuthContext';

interface ListItem {
  id: string;
  itemName: string;
  itemVariant?: string;
  category?: string;
  quantity: number;
  checked: boolean;
  matchingDeals?: Array<{
    id: string;
    productName: string;
    salePrice: number;
    storeName: string;
    dealType: string;
    savingsPercent?: number;
  }>;
}

export default function ListScreenNew({ navigation }: any) {
  const { user } = useAuth();

  const { data, loading, error, refetch } = useQuery(GET_MY_LIST_WITH_DEALS, {
    variables: { userId: user?.userId },
    skip: !user,
  });

  const [addItem] = useMutation(ADD_LIST_ITEM, {
    refetchQueries: [{ query: GET_MY_LIST_WITH_DEALS, variables: { userId: user?.userId } }],
  });

  const [updateItem] = useMutation(UPDATE_LIST_ITEM, {
    refetchQueries: [{ query: GET_MY_LIST_WITH_DEALS, variables: { userId: user?.userId } }],
  });

  const [removeItem] = useMutation(REMOVE_LIST_ITEM, {
    refetchQueries: [{ query: GET_MY_LIST_WITH_DEALS, variables: { userId: user?.userId } }],
  });

  const handleAddItem = async (itemName: string, itemVariant?: string, category?: string) => {
    try {
      await addItem({
        variables: {
          itemName,
          itemVariant,
          category,
          quantity: 1,
        },
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to add item. Please try again.');
    }
  };

  const handleUpdateQuantity = async (id: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    try {
      await updateItem({
        variables: {
          id,
          quantity: newQuantity,
        },
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to update quantity. Please try again.');
    }
  };

  const handleToggleChecked = async (id: string, checked: boolean) => {
    try {
      await updateItem({
        variables: {
          id,
          checked: !checked,
        },
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to update item. Please try again.');
    }
  };

  const handleRemoveItem = async (id: string, itemName: string) => {
    Alert.alert(
      'Remove Item',
      `Remove "${itemName}" from your list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeItem({
                variables: { id },
              });
            } catch (error) {
              Alert.alert('Error', 'Failed to remove item. Please try again.');
            }
          },
        },
      ]
    );
  };

  const renderListItem = ({ item }: { item: ListItem }) => {
    const dealCount = item.matchingDeals?.length || 0;
    const displayName = item.itemVariant
      ? `${item.itemName} (${item.itemVariant})`
      : item.itemName;

    return (
      <View style={styles.listItem}>
        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => handleToggleChecked(item.id, item.checked)}
        >
          <Ionicons
            name={item.checked ? 'checkbox' : 'square-outline'}
            size={24}
            color={item.checked ? '#16A34A' : '#9CA3AF'}
          />
        </TouchableOpacity>

        <View style={styles.itemInfo}>
          <Text
            style={[
              styles.itemName,
              item.checked && styles.itemNameChecked,
            ]}
            numberOfLines={1}
          >
            {displayName}
          </Text>
          {item.category && (
            <Text style={styles.itemCategory}>{item.category}</Text>
          )}
        </View>

        <DealBadge count={dealCount} />

        <View style={styles.controls}>
          <View style={styles.quantityContainer}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => handleUpdateQuantity(item.id, item.quantity - 1)}
            >
              <Ionicons name="remove" size={20} color="#111827" />
            </TouchableOpacity>

            <Text style={styles.quantityText}>{item.quantity}</Text>

            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => handleUpdateQuantity(item.id, item.quantity + 1)}
            >
              <Ionicons name="add" size={20} color="#111827" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleRemoveItem(item.id, displayName)}
          >
            <Ionicons name="trash-outline" size={20} color="#DC2626" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="cart-outline" size={64} color="#9CA3AF" />
      <Text style={styles.emptyStateTitle}>Your list is empty</Text>
      <Text style={styles.emptyStateText}>
        Start adding items to find matching deals
      </Text>
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

  const listItems: ListItem[] = data?.getMyListWithDeals || [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Shopping List</Text>
        <Text style={styles.headerSubtitle}>
          {listItems.length} {listItems.length === 1 ? 'item' : 'items'}
        </Text>
      </View>

      <View style={styles.inputContainer}>
        <SmartItemInput onAddItem={handleAddItem} />
      </View>

      <FlatList
        data={listItems}
        renderItem={renderListItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {listItems.length > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.compareButton}
            onPress={() => navigation.navigate('DealMatching')}
          >
            <Ionicons name="pricetag" size={24} color="#FFFFFF" />
            <Text style={styles.compareButtonText}>View Matched Deals</Text>
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
  inputContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
  checkboxContainer: {
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  itemNameChecked: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  itemCategory: {
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
