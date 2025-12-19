import React, { useState, useMemo } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';

const ITEM_SUGGESTIONS = {
  milk: { category: 'Dairy', variants: ['Any', 'Whole', '2%', 'Skim', 'Organic', 'Non-Dairy'] },
  chicken: { category: 'Meat', variants: ['Any', 'Breast', 'Thighs', 'Wings', 'Ground'] },
  bread: { category: 'Bakery', variants: ['Any', 'White', 'Wheat', 'Whole Grain'] },
  eggs: { category: 'Dairy', variants: ['Any', 'Large', 'Organic', 'Cage-Free'] },
  cheese: { category: 'Dairy', variants: ['Any', 'Cheddar', 'Mozzarella', 'American'] },
  yogurt: { category: 'Dairy', variants: ['Any', 'Greek', 'Regular', 'Non-Dairy'] },
  cereal: { category: 'Breakfast', variants: ['Any', 'Kids', 'Healthy', 'Granola'] },
  juice: { category: 'Beverages', variants: ['Any', 'Orange', 'Apple', 'Grape'] },
  soda: { category: 'Beverages', variants: ['Any', 'Cola', 'Lemon-Lime', 'Diet'] },
  chips: { category: 'Snacks', variants: ['Any', 'Potato', 'Tortilla', 'Veggie'] },
  bananas: { category: 'Produce', variants: ['Any'] },
  apples: { category: 'Produce', variants: ['Any', 'Gala', 'Fuji', 'Granny Smith'] },
  tomatoes: { category: 'Produce', variants: ['Any', 'Roma', 'Cherry', 'Grape'] },
  rice: { category: 'Grains', variants: ['Any', 'White', 'Brown', 'Jasmine'] },
  pasta: { category: 'Grains', variants: ['Any', 'Spaghetti', 'Penne', 'Whole Wheat'] },
  beef: { category: 'Meat', variants: ['Any', 'Ground', 'Steak', 'Roast'] },
  pork: { category: 'Meat', variants: ['Any', 'Chops', 'Ribs', 'Ground'] },
  butter: { category: 'Dairy', variants: ['Any', 'Salted', 'Unsalted', 'Organic'] },
  coffee: { category: 'Beverages', variants: ['Any', 'Ground', 'Whole Bean', 'Instant'] },
  tea: { category: 'Beverages', variants: ['Any', 'Black', 'Green', 'Herbal'] },
};

interface SmartItemInputProps {
  onAddItem: (itemName: string, itemVariant?: string, category?: string) => void;
}

export function SmartItemInput({ onAddItem }: SmartItemInputProps) {
  const [query, setQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const suggestions = useMemo(() => {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    return Object.keys(ITEM_SUGGESTIONS).filter(item => item.includes(q));
  }, [query]);

  const handleSelectItem = (itemName: string) => {
    setSelectedItem(itemName);
    setQuery(itemName);
  };

  const handleSelectVariant = (variant: string) => {
    if (!selectedItem) return;
    const item = ITEM_SUGGESTIONS[selectedItem as keyof typeof ITEM_SUGGESTIONS];
    onAddItem(
      selectedItem,
      variant === 'Any' ? undefined : variant.toLowerCase(),
      item.category
    );
    setQuery('');
    setSelectedItem(null);
  };

  const selectedItemData = selectedItem ? ITEM_SUGGESTIONS[selectedItem as keyof typeof ITEM_SUGGESTIONS] : null;

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={query}
        onChangeText={(text) => {
          setQuery(text);
          setSelectedItem(null);
        }}
        placeholder="Add item (e.g., milk, chicken)..."
        placeholderTextColor="#999"
      />

      {suggestions.length > 0 && !selectedItem && (
        <View style={styles.suggestions}>
          {suggestions.map(item => (
            <TouchableOpacity
              key={item}
              style={styles.suggestionItem}
              onPress={() => handleSelectItem(item)}
            >
              <Text style={styles.suggestionText}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {selectedItemData && (
        <View style={styles.variants}>
          <Text style={styles.variantsLabel}>Select type:</Text>
          <View style={styles.variantChips}>
            {selectedItemData.variants.map(variant => (
              <TouchableOpacity
                key={variant}
                style={styles.variantChip}
                onPress={() => handleSelectVariant(variant)}
              >
                <Text style={styles.variantText}>{variant}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  suggestions: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  suggestionText: {
    fontSize: 16,
    textTransform: 'capitalize',
  },
  variants: {
    marginTop: 12,
  },
  variantsLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  variantChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  variantChip: {
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  variantText: {
    color: '#4F46E5',
    fontWeight: '500',
  },
});
