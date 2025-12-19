"use client";

import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Search } from 'lucide-react';

// Pre-defined item suggestions
interface ItemSuggestion {
  category: string;
  variants: string[];
}

const ITEM_SUGGESTIONS: Record<string, ItemSuggestion> = {
  milk: {
    category: 'Dairy',
    variants: ['Any', 'Whole', '2%', 'Skim', 'Organic', 'Non-Dairy'],
  },
  chicken: {
    category: 'Meat',
    variants: ['Any', 'Breast', 'Thighs', 'Wings', 'Ground'],
  },
  bread: {
    category: 'Bakery',
    variants: ['Any', 'White', 'Wheat', 'Whole Grain'],
  },
  eggs: {
    category: 'Dairy',
    variants: ['Any', 'Large', 'Organic', 'Cage-Free'],
  },
  cheese: {
    category: 'Dairy',
    variants: ['Any', 'Cheddar', 'Mozzarella', 'American'],
  },
  yogurt: {
    category: 'Dairy',
    variants: ['Any', 'Greek', 'Regular', 'Non-Dairy'],
  },
  cereal: {
    category: 'Breakfast',
    variants: ['Any', 'Kids', 'Healthy', 'Granola'],
  },
  juice: {
    category: 'Beverages',
    variants: ['Any', 'Orange', 'Apple', 'Grape'],
  },
  soda: {
    category: 'Beverages',
    variants: ['Any', 'Cola', 'Lemon-Lime', 'Diet'],
  },
  chips: {
    category: 'Snacks',
    variants: ['Any', 'Potato', 'Tortilla', 'Pita'],
  },
  bananas: {
    category: 'Produce',
    variants: ['Any', 'Organic'],
  },
  apples: {
    category: 'Produce',
    variants: ['Any', 'Gala', 'Fuji', 'Granny Smith', 'Organic'],
  },
  rice: {
    category: 'Pantry',
    variants: ['Any', 'White', 'Brown', 'Jasmine', 'Basmati'],
  },
  pasta: {
    category: 'Pantry',
    variants: ['Any', 'Spaghetti', 'Penne', 'Fettuccine'],
  },
  tomatoes: {
    category: 'Produce',
    variants: ['Any', 'Roma', 'Cherry', 'Beefsteak', 'Organic'],
  },
};

interface SmartItemInputProps {
  onAddItem: (itemName: string, itemVariant?: string, category?: string) => void;
}

export function SmartItemInput({ onAddItem }: SmartItemInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);

  const matchingItems = useCallback(() => {
    if (!inputValue.trim()) return [];

    const query = inputValue.toLowerCase();
    return Object.keys(ITEM_SUGGESTIONS).filter((item) =>
      item.includes(query)
    );
  }, [inputValue]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setShowSuggestions(value.length > 0);
    setSelectedItem(null);
    setSelectedVariant(null);
  };

  const handleSelectItem = (itemName: string) => {
    setSelectedItem(itemName);
    setInputValue(itemName);
    setShowSuggestions(false);
  };

  const handleSelectVariant = (variant: string) => {
    setSelectedVariant(variant);
  };

  const handleAddItem = () => {
    if (!selectedItem && !inputValue.trim()) return;

    const itemName = selectedItem || inputValue.trim();
    const suggestion = ITEM_SUGGESTIONS[itemName.toLowerCase()];
    const category = suggestion?.category;
    const variant = selectedVariant === 'Any' || selectedVariant === null ? undefined : selectedVariant;

    onAddItem(itemName, variant, category);

    // Reset form
    setInputValue('');
    setSelectedItem(null);
    setSelectedVariant(null);
    setShowSuggestions(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !showSuggestions) {
      handleAddItem();
    }
  };

  const currentSuggestion = selectedItem
    ? ITEM_SUGGESTIONS[selectedItem.toLowerCase()]
    : null;

  const matches = matchingItems();

  return (
    <div className="space-y-4">
      {/* Search input */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Add item (e.g., milk, eggs, bread)"
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            className="pl-10"
          />
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && matches.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
            {matches.map((item) => (
              <button
                key={item}
                onClick={() => handleSelectItem(item)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b last:border-b-0 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium capitalize">{item}</span>
                  <Badge variant="outline" className="text-xs">
                    {ITEM_SUGGESTIONS[item].category}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Variant selection */}
      {currentSuggestion && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            Choose specificity:
          </p>
          <div className="flex flex-wrap gap-2">
            {currentSuggestion.variants.map((variant) => (
              <Badge
                key={variant}
                variant={selectedVariant === variant ? 'default' : 'outline'}
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => handleSelectVariant(variant)}
              >
                {variant}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Add button */}
      {(selectedItem || inputValue.trim()) && (
        <Button
          onClick={handleAddItem}
          className="w-full"
          disabled={selectedItem && !selectedVariant}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add {selectedItem ? `${selectedItem}${selectedVariant && selectedVariant !== 'Any' ? ` (${selectedVariant})` : ''}` : inputValue}
        </Button>
      )}
    </div>
  );
}
