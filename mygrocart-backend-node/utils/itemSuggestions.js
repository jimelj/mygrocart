/**
 * Item Suggestions - Pre-defined suggestions for common grocery items
 *
 * This module provides smart suggestions for shopping list entry,
 * allowing users to quickly add items with variants.
 *
 * Based on SHOPPING_LIST_UX_DESIGN.md
 */

/**
 * Pre-defined item suggestions with categories and variants
 */
const ITEM_SUGGESTIONS = {
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

/**
 * Get suggestions for a search term
 *
 * @param {string} searchTerm - User's search input
 * @returns {Array} Array of matching item suggestions
 */
function getSuggestions(searchTerm) {
  if (!searchTerm || searchTerm.length < 2) {
    return [];
  }

  const term = searchTerm.toLowerCase().trim();
  const matches = [];

  for (const [itemName, data] of Object.entries(ITEM_SUGGESTIONS)) {
    if (itemName.includes(term)) {
      matches.push({
        itemName,
        category: data.category,
        variants: data.variants
      });
    }
  }

  // Sort by relevance (exact matches first, then starts-with, then contains)
  matches.sort((a, b) => {
    const aExact = a.itemName === term;
    const bExact = b.itemName === term;
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;

    const aStartsWith = a.itemName.startsWith(term);
    const bStartsWith = b.itemName.startsWith(term);
    if (aStartsWith && !bStartsWith) return -1;
    if (!aStartsWith && bStartsWith) return 1;

    return a.itemName.localeCompare(b.itemName);
  });

  return matches;
}

/**
 * Get all categories
 *
 * @returns {Array} Array of unique categories
 */
function getAllCategories() {
  const categories = new Set();

  for (const data of Object.values(ITEM_SUGGESTIONS)) {
    categories.add(data.category);
  }

  return Array.from(categories).sort();
}

/**
 * Get items by category
 *
 * @param {string} category - Category name
 * @returns {Array} Array of items in that category
 */
function getItemsByCategory(category) {
  const items = [];

  for (const [itemName, data] of Object.entries(ITEM_SUGGESTIONS)) {
    if (data.category === category) {
      items.push({
        itemName,
        category: data.category,
        variants: data.variants
      });
    }
  }

  return items.sort((a, b) => a.itemName.localeCompare(b.itemName));
}

module.exports = {
  ITEM_SUGGESTIONS,
  getSuggestions,
  getAllCategories,
  getItemsByCategory
};
