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
