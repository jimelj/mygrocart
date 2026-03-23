/**
 * Deal Calculator Utility
 * Handles complex deal calculations including BOGO, multi-buy, and savings
 */

/**
 * Calculate savings percentage
 * @param {number} regularPrice - Original price
 * @param {number} salePrice - Sale price
 * @returns {number|null} Savings percentage (0-100) or null if can't calculate
 */
function calculateSavingsPercent(regularPrice, salePrice) {
  if (!regularPrice || regularPrice <= 0 || !salePrice || salePrice < 0) {
    return null;
  }

  if (salePrice >= regularPrice) {
    return 0;
  }

  const percent = ((regularPrice - salePrice) / regularPrice) * 100;
  return Math.round(percent); // Round to nearest integer
}

/**
 * Calculate savings amount
 * @param {number} regularPrice - Original price
 * @param {number} salePrice - Sale price
 * @returns {number|null} Savings amount or null
 */
function calculateSavingsAmount(regularPrice, salePrice) {
  if (!regularPrice || regularPrice <= 0 || !salePrice || salePrice < 0) {
    return null;
  }

  const savings = regularPrice - salePrice;
  return savings > 0 ? parseFloat(savings.toFixed(2)) : null;
}

/**
 * Parse multi-buy deal string and extract quantity and total price
 * @param {string} quantityStr - String like "2 for $5", "3 for $10", etc.
 * @returns {Object|null} { quantity, totalPrice, perUnitPrice } or null
 */
function parseMultiBuyDeal(quantityStr) {
  if (!quantityStr || typeof quantityStr !== 'string') {
    return null;
  }

  // Match patterns like "2 for $5", "3 for $10.00", "2/$5"
  const patterns = [
    /(\d+)\s*for\s*\$?([\d.]+)/i,
    /(\d+)\s*\/\s*\$?([\d.]+)/i,
    /buy\s*(\d+)\s*get\s*(\d+)/i // BOGO pattern
  ];

  for (const pattern of patterns) {
    const match = quantityStr.match(pattern);
    if (match) {
      // Check if it's a BOGO pattern
      if (pattern.source.includes('buy') && pattern.source.includes('get')) {
        const buyQty = parseInt(match[1], 10);
        const getQty = parseInt(match[2], 10);
        return {
          type: 'bogo',
          buyQuantity: buyQty,
          freeQuantity: getQty,
          totalQuantity: buyQty + getQty
        };
      }

      const quantity = parseInt(match[1], 10);
      const totalPrice = parseFloat(match[2]);

      if (quantity > 0 && totalPrice > 0) {
        return {
          type: 'multi_buy',
          quantity,
          totalPrice,
          perUnitPrice: parseFloat((totalPrice / quantity).toFixed(2))
        };
      }
    }
  }

  return null;
}

/**
 * Calculate effective price for BOGO deals
 * @param {number} regularPrice - Regular unit price
 * @param {number} quantity - Number of items user wants
 * @returns {Object} { totalCost, effectivePerUnit, freeItems }
 */
function calculateBOGOPrice(regularPrice, quantity) {
  if (!regularPrice || regularPrice <= 0 || !quantity || quantity <= 0) {
    return { totalCost: 0, effectivePerUnit: 0, freeItems: 0 };
  }

  // BOGO: For every 2 items, pay for 1
  const paidItems = Math.ceil(quantity / 2);
  const freeItems = quantity - paidItems;
  const totalCost = parseFloat((paidItems * regularPrice).toFixed(2));
  const effectivePerUnit = parseFloat((totalCost / quantity).toFixed(2));

  return {
    totalCost,
    effectivePerUnit,
    freeItems,
    paidItems
  };
}

/**
 * Calculate total cost for a shopping list item considering deal type
 * @param {Object} deal - Deal object with dealType, salePrice, regularPrice, quantity
 * @param {number} userQuantity - Number of items user wants
 * @returns {Object} { totalCost, savings, dealApplied, explanation }
 */
function calculateDealCost(deal, userQuantity) {
  if (!deal || !userQuantity || userQuantity <= 0) {
    return { totalCost: 0, savings: 0, dealApplied: false, explanation: 'Invalid input' };
  }

  const { dealType, salePrice, regularPrice, quantity: dealQuantity } = deal;

  // Default: regular sale price
  if (!dealType || dealType === 'sale' || dealType === 'clearance') {
    const totalCost = parseFloat((salePrice * userQuantity).toFixed(2));
    const regularTotal = regularPrice ? regularPrice * userQuantity : totalCost;
    const savings = parseFloat((regularTotal - totalCost).toFixed(2));

    return {
      totalCost,
      savings: savings > 0 ? savings : 0,
      dealApplied: true,
      explanation: `${userQuantity} × $${salePrice.toFixed(2)} = $${totalCost.toFixed(2)}`
    };
  }

  // BOGO deals
  if (dealType === 'bogo') {
    const result = calculateBOGOPrice(salePrice || regularPrice, userQuantity);
    const regularTotal = (regularPrice || salePrice) * userQuantity;
    const savings = parseFloat((regularTotal - result.totalCost).toFixed(2));

    return {
      totalCost: result.totalCost,
      savings: savings > 0 ? savings : 0,
      dealApplied: true,
      freeItems: result.freeItems,
      explanation: `Buy ${result.paidItems}, get ${result.freeItems} free = $${result.totalCost.toFixed(2)}`
    };
  }

  // Multi-buy deals (e.g., "2 for $5")
  if (dealType === 'multi_buy') {
    const parsed = parseMultiBuyDeal(dealQuantity);

    if (parsed && parsed.type === 'multi_buy') {
      const { quantity: minQty, totalPrice, perUnitPrice } = parsed;

      // How many complete multi-buy sets can the user get?
      const completeSets = Math.floor(userQuantity / minQty);
      const remainingItems = userQuantity % minQty;

      // Cost for complete sets
      const setsCost = completeSets * totalPrice;

      // Cost for remaining items (at per-unit price or regular price)
      const remainingCost = remainingItems * (perUnitPrice || salePrice);

      const totalCost = parseFloat((setsCost + remainingCost).toFixed(2));
      const regularTotal = regularPrice ? regularPrice * userQuantity : salePrice * userQuantity;
      const savings = parseFloat((regularTotal - totalCost).toFixed(2));

      return {
        totalCost,
        savings: savings > 0 ? savings : 0,
        dealApplied: completeSets > 0,
        explanation: completeSets > 0
          ? `${completeSets} × (${minQty} for $${totalPrice.toFixed(2)})${remainingItems > 0 ? ` + ${remainingItems} @ $${perUnitPrice.toFixed(2)}` : ''} = $${totalCost.toFixed(2)}`
          : `${userQuantity} × $${perUnitPrice.toFixed(2)} = $${totalCost.toFixed(2)} (need ${minQty} for full deal)`
      };
    }
  }

  // Fallback to simple sale calculation
  const totalCost = parseFloat((salePrice * userQuantity).toFixed(2));
  return {
    totalCost,
    savings: 0,
    dealApplied: false,
    explanation: `${userQuantity} × $${salePrice.toFixed(2)} = $${totalCost.toFixed(2)}`
  };
}

/**
 * Calculate total shopping list cost with deal optimization
 * @param {Array} items - Array of { deal, quantity } objects
 * @returns {Object} { totalCost, totalSavings, breakdown }
 */
function calculateShoppingListTotal(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return { totalCost: 0, totalSavings: 0, breakdown: [] };
  }

  let totalCost = 0;
  let totalSavings = 0;
  const breakdown = [];

  for (const item of items) {
    const { deal, quantity } = item;
    const result = calculateDealCost(deal, quantity);

    totalCost += result.totalCost;
    totalSavings += result.savings;
    breakdown.push({
      productName: deal.productName,
      quantity,
      ...result
    });
  }

  return {
    totalCost: parseFloat(totalCost.toFixed(2)),
    totalSavings: parseFloat(totalSavings.toFixed(2)),
    breakdown
  };
}

module.exports = {
  calculateSavingsPercent,
  calculateSavingsAmount,
  parseMultiBuyDeal,
  calculateBOGOPrice,
  calculateDealCost,
  calculateShoppingListTotal
};
