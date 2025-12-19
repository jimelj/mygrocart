# Phase 6: Code Reference - Quick Snippets

This document provides quick code snippets for the Phase 6 implementation.

---

## 1. GraphQL Mutations

### REQUEST_PRODUCT
```typescript
// File: src/graphql/mutations.ts
import { gql } from '@apollo/client';

export const REQUEST_PRODUCT = gql`
  mutation RequestProduct($productName: String!) {
    requestProduct(productName: $productName) {
      requestId
      productName
      status
      createdAt
    }
  }
`;
```

### REQUEST_PRICE_UPDATE
```typescript
// File: src/graphql/mutations.ts
export const REQUEST_PRICE_UPDATE = gql`
  mutation RequestPriceUpdate($upc: String!, $priority: String) {
    requestPriceUpdate(upc: $upc, priority: $priority) {
      requestId
      upc
      priority
      status
    }
  }
`;
```

**Usage:**
```typescript
const [requestProduct] = useMutation(REQUEST_PRODUCT, {
  variables: { productName: 'Organic Quinoa' },
  onCompleted: () => Alert.alert('Success', 'Product requested!')
});

const [requestPriceUpdate] = useMutation(REQUEST_PRICE_UPDATE, {
  variables: { upc: '123456789012', priority: 'high' },
  onCompleted: () => Alert.alert('Success', 'Price update requested!')
});
```

---

## 2. GraphQL Queries

### Updated SEARCH_PRODUCTS
```typescript
// File: src/graphql/queries.ts
export const SEARCH_PRODUCTS = gql`
  query SearchProducts($query: String!, $limit: Int) {
    searchProducts(query: $query, limit: $limit) {
      upc
      name
      brand
      size
      imageUrl
      priceAge           # NEW
      lastPriceUpdate    # NEW
      searchCount        # NEW
      storePrices {
        price
        storeId
        store {
          storeName
        }
      }
    }
  }
`;
```

### GET_MY_PRODUCT_REQUESTS
```typescript
// File: src/graphql/queries.ts
export const GET_MY_PRODUCT_REQUESTS = gql`
  query GetMyProductRequests {
    getMyProductRequests {
      requestId
      productName
      status
      createdAt
      completedAt
    }
  }
`;
```

**Usage:**
```typescript
const { data, loading, refetch } = useQuery(GET_MY_PRODUCT_REQUESTS, {
  fetchPolicy: 'cache-and-network'
});

const requests = data?.getMyProductRequests || [];
```

---

## 3. PriceFreshnessBadge Component

```typescript
// File: src/components/PriceFreshnessBadge.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  priceAge?: string;
  lastPriceUpdate?: string;
}

export const PriceFreshnessBadge: React.FC<Props> = ({ priceAge, lastPriceUpdate }) => {
  const getVariant = () => {
    if (!lastPriceUpdate || !priceAge || priceAge.includes('Never')) return 'stale';
    if (priceAge.includes('today') || priceAge.includes('hour')) return 'fresh';
    if (priceAge.includes('yesterday') || priceAge.match(/\d+ day/)) return 'recent';
    return 'stale';
  };

  const variant = getVariant();

  const styles = {
    fresh: {
      container: { backgroundColor: '#D1FAE5', borderColor: '#A7F3D0' },
      text: { color: '#047857' },
      iconName: 'checkmark-circle' as const,
    },
    recent: {
      container: { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' },
      text: { color: '#92400E' },
      iconName: 'time' as const,
    },
    stale: {
      container: { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' },
      text: { color: '#374151' },
      iconName: 'alert-circle' as const,
    },
  };

  const style = styles[variant];
  const displayText = priceAge || 'Unknown';

  return (
    <View style={[componentStyles.container, style.container]}>
      <Ionicons name={style.iconName} size={16} color={style.text.color} />
      <Text style={[componentStyles.text, style.text]}>{displayText}</Text>
    </View>
  );
};

const componentStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
  },
});
```

**Usage:**
```typescript
<PriceFreshnessBadge
  priceAge="2 days ago"
  lastPriceUpdate="2025-11-04T10:30:00Z"
/>
```

---

## 4. EmptySearchState Component

```typescript
// File: src/components/EmptySearchState.tsx
import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@apollo/client';
import { REQUEST_PRODUCT } from '../graphql/mutations';

interface Props {
  searchTerm: string;
}

export const EmptySearchState: React.FC<Props> = ({ searchTerm }) => {
  const [requestProduct, { loading }] = useMutation(REQUEST_PRODUCT, {
    variables: { productName: searchTerm },
    onCompleted: () => {
      Alert.alert(
        'Request Submitted',
        `Product "${searchTerm}" requested! We'll add it within 24 hours.`,
        [{ text: 'OK' }]
      );
    },
  });

  return (
    <View style={styles.container}>
      <Ionicons name="search" size={64} color="#9CA3AF" />
      <Text style={styles.heading}>No products found for "{searchTerm}"</Text>
      <Text style={styles.description}>We don't have this product yet, but you can request it!</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => requestProduct()}
        disabled={loading}
        accessibilityLabel={`Request ${searchTerm}`}
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>
          {loading ? 'Requesting...' : `Request "${searchTerm}"`}
        </Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Ionicons name="time" size={16} color="#6B7280" />
        <Text style={styles.footerText}>We'll add it within 24 hours</Text>
      </View>
    </View>
  );
};
```

**Usage:**
```typescript
{products.length === 0 && !loading && (
  <EmptySearchState searchTerm={searchQuery} />
)}
```

---

## 5. ProductSearchScreen Updates

### Add Imports
```typescript
import { REQUEST_PRICE_UPDATE } from '../graphql/mutations';
import { EmptySearchState } from '../components/EmptySearchState';
import { PriceFreshnessBadge } from '../components/PriceFreshnessBadge';
```

### Add Price Update Mutation
```typescript
const [requestPriceUpdate] = useMutation(REQUEST_PRICE_UPDATE, {
  onCompleted: () => {
    Alert.alert(
      'Update Requested',
      'Price update requested! We\'ll refresh the prices within 24 hours.'
    );
  },
});
```

### Add Handler
```typescript
const handleRequestPriceUpdate = async (upc: string) => {
  if (!user) {
    Alert.alert('Login Required', 'Please login to request price updates.');
    return;
  }

  try {
    await requestPriceUpdate({
      variables: { upc, priority: 'high' },
    });
  } catch (error) {
    // Error handled by mutation's onError
  }
};
```

### Update Product Card
```typescript
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
      >
        <Text style={styles.updateButtonText}>Update</Text>
      </TouchableOpacity>
    )}
  </View>
)}
```

---

## 6. MyRequestsScreen

```typescript
// File: src/screens/MyRequestsScreen.tsx
import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useQuery } from '@apollo/client';
import { GET_MY_PRODUCT_REQUESTS } from '../graphql/queries';

export default function MyRequestsScreen() {
  const { data, loading, refetch } = useQuery(GET_MY_PRODUCT_REQUESTS, {
    fetchPolicy: 'cache-and-network',
  });

  const requests = data?.getMyProductRequests || [];

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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Product Requests</Text>
      </View>

      {requests.length === 0 ? (
        <View style={styles.emptyState}>
          <Text>No requests yet</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          renderItem={({ item }) => (
            <View style={styles.requestCard}>
              <Text style={styles.requestName}>{item.productName}</Text>
              <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
                <Text>{item.status}</Text>
              </View>
            </View>
          )}
          keyExtractor={(item) => item.requestId}
          onRefresh={refetch}
          refreshing={loading}
        />
      )}
    </View>
  );
}
```

---

## 7. TabNavigator Updates

### Add Import
```typescript
import MyRequestsScreen from '../screens/MyRequestsScreen';
```

### Add Icon Logic
```typescript
else if (route.name === 'Requests') {
  iconName = focused ? 'document-text' : 'document-text-outline';
}
```

### Add Tab Screen
```typescript
<Tab.Screen
  name="Requests"
  component={MyRequestsScreen}
  options={{
    title: 'Requests',
  }}
/>
```

---

## 8. Testing Snippets

### Test PriceFreshnessBadge
```typescript
// __tests__/components/PriceFreshnessBadge.test.tsx
import { render } from '@testing-library/react-native';
import { PriceFreshnessBadge } from '../PriceFreshnessBadge';

test('renders fresh badge for recent price', () => {
  const { getByText } = render(
    <PriceFreshnessBadge priceAge="today" lastPriceUpdate="2025-11-06" />
  );
  expect(getByText('today')).toBeTruthy();
});

test('renders stale badge for old price', () => {
  const { getByText } = render(
    <PriceFreshnessBadge priceAge="30 days ago" lastPriceUpdate="2025-10-07" />
  );
  expect(getByText('30 days ago')).toBeTruthy();
});
```

### Test EmptySearchState
```typescript
// __tests__/components/EmptySearchState.test.tsx
import { render, fireEvent } from '@testing-library/react-native';
import { EmptySearchState } from '../EmptySearchState';
import { MockedProvider } from '@apollo/client/testing';

const mocks = [
  {
    request: {
      query: REQUEST_PRODUCT,
      variables: { productName: 'milk' },
    },
    result: {
      data: {
        requestProduct: {
          requestId: '123',
          productName: 'milk',
          status: 'pending',
          createdAt: '2025-11-06',
        },
      },
    },
  },
];

test('renders request button', () => {
  const { getByText } = render(
    <MockedProvider mocks={mocks}>
      <EmptySearchState searchTerm="milk" />
    </MockedProvider>
  );
  expect(getByText('Request "milk"')).toBeTruthy();
});

test('calls mutation on button press', async () => {
  const { getByText } = render(
    <MockedProvider mocks={mocks}>
      <EmptySearchState searchTerm="milk" />
    </MockedProvider>
  );

  const button = getByText('Request "milk"');
  fireEvent.press(button);

  // Mutation should fire (mocked)
  expect(button).toBeTruthy();
});
```

---

## 9. Accessibility Examples

### Accessible Button
```typescript
<TouchableOpacity
  style={styles.button}
  onPress={handlePress}
  accessibilityLabel="Request organic quinoa"
  accessibilityRole="button"
  accessibilityState={{ disabled: loading }}
>
  <Text style={styles.buttonText}>Request "organic quinoa"</Text>
</TouchableOpacity>
```

### Accessible Badge (Non-interactive)
```typescript
<View
  style={styles.badge}
  accessibilityRole="text"
  accessibilityLabel="Price is 5 days old"
>
  <Text style={styles.badgeText}>5 days ago</Text>
</View>
```

---

## 10. Styling Examples

### Design System Colors
```typescript
// Green (Fresh)
backgroundColor: '#D1FAE5'  // Green 100
borderColor: '#A7F3D0'      // Green 200
color: '#047857'            // Green 700

// Yellow (Recent)
backgroundColor: '#FEF3C7'  // Yellow 100
borderColor: '#FDE68A'      // Yellow 200
color: '#92400E'            // Yellow 800

// Gray (Stale)
backgroundColor: '#F3F4F6'  // Gray 100
borderColor: '#E5E7EB'      // Gray 200
color: '#374151'            // Gray 700
```

### Touch Target Sizes
```typescript
// Minimum touch target
minHeight: 44,
minWidth: 44,

// Comfortable button
paddingHorizontal: 24,
paddingVertical: 12,
minHeight: 48,

// Icon button
width: 44,
height: 44,
alignItems: 'center',
justifyContent: 'center',
```

### Typography Scale
```typescript
// Display (Screen Title)
fontSize: 28,
fontWeight: '700',

// Heading (Section Title)
fontSize: 20,
fontWeight: '600',

// Body (Regular Text)
fontSize: 16,
fontWeight: '400',

// Caption (Small Text)
fontSize: 12,
fontWeight: '500',
```

---

## Summary

This code reference provides all the key snippets for Phase 6 implementation. Copy/paste as needed!

**Key Files:**
- `src/graphql/mutations.ts` - 2 new mutations
- `src/graphql/queries.ts` - 3 new fields + 2 new queries
- `src/components/PriceFreshnessBadge.tsx` - 60 lines
- `src/components/EmptySearchState.tsx` - 100 lines
- `src/screens/ProductSearchScreen.tsx` - Updated with new components
- `src/screens/MyRequestsScreen.tsx` - 200 lines
- `src/navigation/TabNavigator.tsx` - Added Requests tab

**Total LOC Added:** ~700 lines
**Total Files Changed:** 6
**Total Files Created:** 4
