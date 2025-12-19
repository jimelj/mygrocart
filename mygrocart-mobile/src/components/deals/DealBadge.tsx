import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface DealBadgeProps {
  count: number;
}

export function DealBadge({ count }: DealBadgeProps) {
  if (count === 0) return null;

  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: '#FED7AA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    color: '#C2410C',
  },
});
