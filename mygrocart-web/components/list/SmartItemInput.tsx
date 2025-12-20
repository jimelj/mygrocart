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
  // Dairy
  milk: {
    category: 'Dairy',
    variants: ['Any', 'Whole', '2%', 'Skim', 'Organic', 'Non-Dairy', 'Almond', 'Oat', 'Soy']
  },
  cheese: {
    category: 'Dairy',
    variants: ['Any', 'Cheddar', 'Mozzarella', 'American', 'Swiss', 'Parmesan', 'String Cheese']
  },
  yogurt: {
    category: 'Dairy',
    variants: ['Any', 'Greek', 'Regular', 'Non-Dairy', 'Kids', 'Vanilla', 'Strawberry']
  },
  eggs: {
    category: 'Dairy',
    variants: ['Any', 'Large', 'Extra Large', 'Organic', 'Cage-Free', 'Brown', 'White']
  },
  butter: {
    category: 'Dairy',
    variants: ['Any', 'Salted', 'Unsalted', 'Organic', 'European']
  },

  // Meat & Seafood
  chicken: {
    category: 'Meat',
    variants: ['Any', 'Breast', 'Thighs', 'Wings', 'Drumsticks', 'Ground', 'Whole', 'Organic']
  },
  beef: {
    category: 'Meat',
    variants: ['Any', 'Ground', 'Steak', 'Roast', 'Stew Meat', 'Grass-Fed', 'Organic']
  },
  pork: {
    category: 'Meat',
    variants: ['Any', 'Chops', 'Tenderloin', 'Ground', 'Bacon', 'Sausage', 'Ribs']
  },
  turkey: {
    category: 'Meat',
    variants: ['Any', 'Ground', 'Breast', 'Deli Slices', 'Whole']
  },
  fish: {
    category: 'Seafood',
    variants: ['Any', 'Salmon', 'Tuna', 'Cod', 'Tilapia', 'Shrimp', 'Frozen', 'Fresh']
  },

  // Produce
  bananas: {
    category: 'Produce',
    variants: ['Any', 'Organic']
  },
  apples: {
    category: 'Produce',
    variants: ['Any', 'Gala', 'Fuji', 'Honeycrisp', 'Granny Smith', 'Organic']
  },
  oranges: {
    category: 'Produce',
    variants: ['Any', 'Navel', 'Mandarin', 'Clementines', 'Organic']
  },
  berries: {
    category: 'Produce',
    variants: ['Any', 'Strawberries', 'Blueberries', 'Raspberries', 'Blackberries', 'Organic']
  },
  lettuce: {
    category: 'Produce',
    variants: ['Any', 'Iceberg', 'Romaine', 'Mixed Greens', 'Spinach', 'Organic']
  },
  tomatoes: {
    category: 'Produce',
    variants: ['Any', 'Roma', 'Cherry', 'Grape', 'Heirloom', 'Organic']
  },
  potatoes: {
    category: 'Produce',
    variants: ['Any', 'Russet', 'Red', 'Gold', 'Sweet', 'Organic']
  },
  onions: {
    category: 'Produce',
    variants: ['Any', 'Yellow', 'White', 'Red', 'Sweet', 'Organic']
  },
  carrots: {
    category: 'Produce',
    variants: ['Any', 'Baby', 'Regular', 'Organic']
  },
  broccoli: {
    category: 'Produce',
    variants: ['Any', 'Fresh', 'Frozen', 'Organic']
  },

  // Bakery
  bread: {
    category: 'Bakery',
    variants: ['Any', 'White', 'Wheat', 'Whole Grain', 'Multigrain', 'Sourdough', 'Gluten-Free']
  },
  bagels: {
    category: 'Bakery',
    variants: ['Any', 'Plain', 'Everything', 'Whole Wheat', 'Cinnamon Raisin']
  },
  tortillas: {
    category: 'Bakery',
    variants: ['Any', 'Flour', 'Corn', 'Whole Wheat', 'Low-Carb']
  },
  rolls: {
    category: 'Bakery',
    variants: ['Any', 'Dinner', 'Hot Dog', 'Hamburger', 'Ciabatta']
  },

  // Breakfast
  cereal: {
    category: 'Breakfast',
    variants: ['Any', 'Kids', 'Healthy', 'Granola', 'Oatmeal', 'High-Fiber']
  },
  oatmeal: {
    category: 'Breakfast',
    variants: ['Any', 'Quick', 'Steel-Cut', 'Instant', 'Flavored']
  },
  pancakes: {
    category: 'Breakfast',
    variants: ['Any', 'Mix', 'Frozen', 'Whole Grain', 'Gluten-Free']
  },

  // Beverages
  juice: {
    category: 'Beverages',
    variants: ['Any', 'Orange', 'Apple', 'Grape', 'Cranberry', 'Pineapple', 'No Sugar Added']
  },
  soda: {
    category: 'Beverages',
    variants: ['Any', 'Cola', 'Lemon-Lime', 'Root Beer', 'Orange', 'Diet', 'Zero Sugar']
  },
  coffee: {
    category: 'Beverages',
    variants: ['Any', 'Ground', 'Whole Bean', 'K-Cups', 'Instant', 'Decaf']
  },
  tea: {
    category: 'Beverages',
    variants: ['Any', 'Black', 'Green', 'Herbal', 'Iced', 'Bags', 'Loose Leaf']
  },
  water: {
    category: 'Beverages',
    variants: ['Any', 'Bottled', 'Sparkling', 'Flavored', 'Gallon']
  },

  // Snacks
  chips: {
    category: 'Snacks',
    variants: ['Any', 'Potato', 'Tortilla', 'Pita', 'Veggie', 'Baked', 'Kettle']
  },
  crackers: {
    category: 'Snacks',
    variants: ['Any', 'Saltines', 'Graham', 'Wheat', 'Cheese']
  },
  cookies: {
    category: 'Snacks',
    variants: ['Any', 'Chocolate Chip', 'Oreo', 'Graham', 'Sandwich']
  },
  popcorn: {
    category: 'Snacks',
    variants: ['Any', 'Microwave', 'Kernels', 'Ready-to-Eat', 'Butter', 'Caramel']
  },

  // Pantry
  rice: {
    category: 'Pantry',
    variants: ['Any', 'White', 'Brown', 'Jasmine', 'Basmati', 'Instant']
  },
  pasta: {
    category: 'Pantry',
    variants: ['Any', 'Spaghetti', 'Penne', 'Macaroni', 'Whole Wheat', 'Gluten-Free']
  },
  sauce: {
    category: 'Pantry',
    variants: ['Any', 'Marinara', 'Alfredo', 'Tomato', 'Pesto', 'Soy']
  },
  soup: {
    category: 'Pantry',
    variants: ['Any', 'Chicken Noodle', 'Tomato', 'Vegetable', 'Cream of Mushroom']
  },
  beans: {
    category: 'Pantry',
    variants: ['Any', 'Black', 'Pinto', 'Kidney', 'Chickpeas', 'Refried', 'Canned', 'Dried']
  },

  // Frozen
  pizza: {
    category: 'Frozen',
    variants: ['Any', 'Pepperoni', 'Cheese', 'Supreme', 'Thin Crust', 'Gluten-Free']
  },
  vegetables: {
    category: 'Frozen',
    variants: ['Any', 'Mixed', 'Broccoli', 'Peas', 'Corn', 'Green Beans', 'Organic']
  },
  'ice cream': {
    category: 'Frozen',
    variants: ['Any', 'Vanilla', 'Chocolate', 'Strawberry', 'Cookies & Cream', 'Low-Fat']
  },

  // Personal Care
  toothpaste: {
    category: 'Personal Care',
    variants: ['Any', 'Whitening', 'Sensitive', 'Fluoride', 'Kids']
  },
  soap: {
    category: 'Personal Care',
    variants: ['Any', 'Bar', 'Body Wash', 'Hand Soap', 'Antibacterial', 'Moisturizing']
  },
  shampoo: {
    category: 'Personal Care',
    variants: ['Any', 'Regular', 'Dry Hair', 'Oily Hair', '2-in-1', 'Kids']
  },

  // Household
  'paper towels': {
    category: 'Household',
    variants: ['Any', 'Select-A-Size', 'Mega Roll', 'Recycled']
  },
  'toilet paper': {
    category: 'Household',
    variants: ['Any', 'Double Roll', 'Mega Roll', 'Ultra Soft', 'Recycled']
  },
  detergent: {
    category: 'Household',
    variants: ['Any', 'Liquid', 'Pods', 'Powder', 'HE', 'Free & Clear']
  }
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
          disabled={!!(selectedItem && !selectedVariant)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add {selectedItem ? `${selectedItem}${selectedVariant && selectedVariant !== 'Any' ? ` (${selectedVariant})` : ''}` : inputValue}
        </Button>
      )}
    </div>
  );
}
