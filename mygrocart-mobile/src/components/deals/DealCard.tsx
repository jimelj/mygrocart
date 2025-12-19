import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

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

interface DealCardProps {
  deal: Deal;
  onPress?: () => void;
}

export function DealCard({ deal, onPress }: DealCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.storeName}>{deal.storeName}</Text>
        <View style={styles.dealTypeBadge}>
          <Text style={styles.dealTypeText}>{deal.dealType}</Text>
        </View>
      </View>

      <Text style={styles.productName} numberOfLines={2}>
        {deal.productName}
      </Text>

      {deal.productBrand && (
        <Text style={styles.brand}>{deal.productBrand}</Text>
      )}

      <View style={styles.priceRow}>
        <Text style={styles.salePrice}>${deal.salePrice.toFixed(2)}</Text>
        {deal.regularPrice && (
          <Text style={styles.regularPrice}>${deal.regularPrice.toFixed(2)}</Text>
        )}
        {deal.savingsPercent && (
          <View style={styles.savingsBadge}>
            <Text style={styles.savingsText}>-{deal.savingsPercent}%</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  storeName: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  dealTypeBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dealTypeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginBottom: 4,
  },
  brand: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  salePrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10B981',
  },
  regularPrice: {
    fontSize: 14,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  savingsBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  savingsText: {
    color: '#D97706',
    fontSize: 12,
    fontWeight: '600',
  },
});
