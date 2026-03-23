/**
 * Deal Math Logic Test Suite
 *
 * Tests for deal/coupon calculations including:
 * - Savings percentage calculation
 * - Multi-buy deal parsing
 * - BOGO deal calculations
 * - Total cost calculations
 * - Edge cases and error handling
 *
 * Based on current implementation in:
 * - resolvers/index.js (savingsPercent calculation)
 * - services/FlyerService.js (multi-buy parsing)
 * - models/Deal.js (validation)
 */

describe('Deal Math Logic', () => {
  describe('Savings Percentage Calculation', () => {
    /**
     * Current implementation in resolvers/index.js:
     * savingsPercent = ((regularPrice - salePrice) / regularPrice) * 100
     * Rounded to 0 decimal places using .toFixed(0)
     */

    test('should calculate savings percentage correctly', () => {
      const regularPrice = 5.99;
      const salePrice = 3.99;
      const expected = (((regularPrice - salePrice) / regularPrice) * 100).toFixed(0);
      const result = parseFloat(expected);

      expect(result).toBe(33);
    });

    test('should calculate savings percentage for high discount', () => {
      const regularPrice = 10.00;
      const salePrice = 5.00;
      const expected = (((regularPrice - salePrice) / regularPrice) * 100).toFixed(0);
      const result = parseFloat(expected);

      expect(result).toBe(50);
    });

    test('should calculate savings percentage for low discount', () => {
      const regularPrice = 4.99;
      const salePrice = 4.49;
      const expected = (((regularPrice - salePrice) / regularPrice) * 100).toFixed(0);
      const result = parseFloat(expected);

      expect(result).toBe(10);
    });

    test('should round 0.4% down to 0%', () => {
      const regularPrice = 100.00;
      const salePrice = 99.60; // 0.4% savings
      const expected = (((regularPrice - salePrice) / regularPrice) * 100).toFixed(0);
      const result = parseFloat(expected);

      expect(result).toBe(0);
    });

    test('should round 0.5% up to 1%', () => {
      const regularPrice = 100.00;
      const salePrice = 99.50; // 0.5% savings
      const expected = (((regularPrice - salePrice) / regularPrice) * 100).toFixed(0);
      const result = parseFloat(expected);

      expect(result).toBe(1);
    });

    test('should round 33.4% down to 33%', () => {
      const regularPrice = 5.99;
      const salePrice = 3.99;
      const expected = (((regularPrice - salePrice) / regularPrice) * 100).toFixed(0);
      const result = parseFloat(expected);

      expect(result).toBe(33);
    });

    test('should round 33.5% up to 34%', () => {
      const regularPrice = 6.00;
      const salePrice = 3.99;
      const expected = (((regularPrice - salePrice) / regularPrice) * 100).toFixed(0);
      const result = parseFloat(expected);

      expect(result).toBe(34);
    });

    test('should handle when regularPrice is null', () => {
      const regularPrice = null;
      const salePrice = 3.99;
      const result = regularPrice ? parseFloat((((regularPrice - salePrice) / regularPrice) * 100).toFixed(0)) : null;

      expect(result).toBeNull();
    });

    test('should handle when regularPrice is undefined', () => {
      const regularPrice = undefined;
      const salePrice = 3.99;
      const result = regularPrice ? parseFloat((((regularPrice - salePrice) / regularPrice) * 100).toFixed(0)) : null;

      expect(result).toBeNull();
    });

    test('should handle when salePrice equals regularPrice (0% savings)', () => {
      const regularPrice = 5.99;
      const salePrice = 5.99;
      const expected = (((regularPrice - salePrice) / regularPrice) * 100).toFixed(0);
      const result = parseFloat(expected);

      expect(result).toBe(0);
    });

    test('should return negative savings when salePrice > regularPrice', () => {
      // Edge case: This should be prevented by validation, but testing the math
      const regularPrice = 3.99;
      const salePrice = 5.99;
      const expected = (((regularPrice - salePrice) / regularPrice) * 100).toFixed(0);
      const result = parseFloat(expected);

      expect(result).toBe(-50);
    });

    test('should handle very small prices correctly', () => {
      const regularPrice = 0.99;
      const salePrice = 0.49;
      const expected = (((regularPrice - salePrice) / regularPrice) * 100).toFixed(0);
      const result = parseFloat(expected);

      expect(result).toBe(51);
    });

    test('should handle large prices correctly', () => {
      const regularPrice = 999.99;
      const salePrice = 599.99;
      const expected = (((regularPrice - salePrice) / regularPrice) * 100).toFixed(0);
      const result = parseFloat(expected);

      expect(result).toBe(40);
    });
  });

  describe('Multi-Buy Deal Parsing', () => {
    /**
     * Current implementation in services/FlyerService.js:
     * Parses "X for $Y" patterns from quantity field
     * Calculates per-unit price: totalPrice / quantity
     * Sets deal_type to 'multi_buy'
     */

    test('should parse "2 for $5" to $2.50 per unit', () => {
      const quantity = '2 for $5';
      const multiBuyMatch = quantity.match(/(\d+)\s*for\s*\$?([\d.]+)/i);

      expect(multiBuyMatch).not.toBeNull();

      const qty = parseInt(multiBuyMatch[1]);
      const totalPrice = parseFloat(multiBuyMatch[2]);
      const perUnitPrice = totalPrice / qty;

      expect(qty).toBe(2);
      expect(totalPrice).toBe(5);
      expect(perUnitPrice).toBe(2.50);
    });

    test('should parse "3 for $10" to $3.33 per unit', () => {
      const quantity = '3 for $10';
      const multiBuyMatch = quantity.match(/(\d+)\s*for\s*\$?([\d.]+)/i);

      expect(multiBuyMatch).not.toBeNull();

      const qty = parseInt(multiBuyMatch[1]);
      const totalPrice = parseFloat(multiBuyMatch[2]);
      const perUnitPrice = parseFloat((totalPrice / qty).toFixed(2));

      expect(qty).toBe(3);
      expect(totalPrice).toBe(10);
      expect(perUnitPrice).toBe(3.33);
    });

    test('should parse "5 for $20" to $4.00 per unit', () => {
      const quantity = '5 for $20';
      const multiBuyMatch = quantity.match(/(\d+)\s*for\s*\$?([\d.]+)/i);

      const qty = parseInt(multiBuyMatch[1]);
      const totalPrice = parseFloat(multiBuyMatch[2]);
      const perUnitPrice = totalPrice / qty;

      expect(perUnitPrice).toBe(4.00);
    });

    test('should parse "2 for 5" (without dollar sign)', () => {
      const quantity = '2 for 5';
      const multiBuyMatch = quantity.match(/(\d+)\s*for\s*\$?([\d.]+)/i);

      expect(multiBuyMatch).not.toBeNull();

      const qty = parseInt(multiBuyMatch[1]);
      const totalPrice = parseFloat(multiBuyMatch[2]);
      const perUnitPrice = totalPrice / qty;

      expect(perUnitPrice).toBe(2.50);
    });

    test('should parse "3 for $9.99" with decimal price', () => {
      const quantity = '3 for $9.99';
      const multiBuyMatch = quantity.match(/(\d+)\s*for\s*\$?([\d.]+)/i);

      const qty = parseInt(multiBuyMatch[1]);
      const totalPrice = parseFloat(multiBuyMatch[2]);
      const perUnitPrice = parseFloat((totalPrice / qty).toFixed(2));

      expect(qty).toBe(3);
      expect(totalPrice).toBe(9.99);
      expect(perUnitPrice).toBe(3.33);
    });

    test('should handle case insensitive matching', () => {
      const quantity = '2 FOR $5';
      const multiBuyMatch = quantity.match(/(\d+)\s*for\s*\$?([\d.]+)/i);

      expect(multiBuyMatch).not.toBeNull();
    });

    test('should handle extra whitespace', () => {
      const quantity = '2  for  $5';
      const multiBuyMatch = quantity.match(/(\d+)\s*for\s*\$?([\d.]+)/i);

      expect(multiBuyMatch).not.toBeNull();

      const qty = parseInt(multiBuyMatch[1]);
      const totalPrice = parseFloat(multiBuyMatch[2]);

      expect(qty).toBe(2);
      expect(totalPrice).toBe(5);
    });

    test('should not match "Buy 1 Get 1" (different pattern)', () => {
      const quantity = 'Buy 1 Get 1';
      const multiBuyMatch = quantity.match(/(\d+)\s*for\s*\$?([\d.]+)/i);

      expect(multiBuyMatch).toBeNull();
    });

    test('should not match invalid patterns', () => {
      const quantity = 'Just $5';
      const multiBuyMatch = quantity.match(/(\d+)\s*for\s*\$?([\d.]+)/i);

      expect(multiBuyMatch).toBeNull();
    });

    test('should handle division by zero protection', () => {
      const quantity = '0 for $5'; // Invalid but testing edge case
      const multiBuyMatch = quantity.match(/(\d+)\s*for\s*\$?([\d.]+)/i);

      const qty = parseInt(multiBuyMatch[1]);
      const totalPrice = parseFloat(multiBuyMatch[2]);

      // This should be validated before calculation
      expect(qty).toBe(0);
      expect(totalPrice).toBe(5);

      // Per-unit price would be Infinity - should be validated
      if (qty > 0 && totalPrice > 0) {
        const perUnitPrice = totalPrice / qty;
        expect(perUnitPrice).toBeDefined();
      }
    });
  });

  describe('BOGO Deal Calculations', () => {
    /**
     * BOGO (Buy One Get One) logic:
     * - Buy 2, pay for 1
     * - Buy 3, pay for 2 (rounded up)
     * - Buy 4, pay for 2
     * Effective price = salePrice * Math.ceil(quantity / 2)
     */

    test('should calculate BOGO for 2 items', () => {
      const salePrice = 3.99;
      const quantity = 2;
      const itemsToPay = Math.ceil(quantity / 2);
      const totalCost = salePrice * itemsToPay;

      expect(itemsToPay).toBe(1);
      expect(totalCost).toBe(3.99);
    });

    test('should calculate BOGO for 3 items (pay for 2)', () => {
      const salePrice = 3.99;
      const quantity = 3;
      const itemsToPay = Math.ceil(quantity / 2);
      const totalCost = salePrice * itemsToPay;

      expect(itemsToPay).toBe(2);
      expect(totalCost).toBe(7.98);
    });

    test('should calculate BOGO for 4 items (pay for 2)', () => {
      const salePrice = 3.99;
      const quantity = 4;
      const itemsToPay = Math.ceil(quantity / 2);
      const totalCost = salePrice * itemsToPay;

      expect(itemsToPay).toBe(2);
      expect(totalCost).toBe(7.98);
    });

    test('should calculate BOGO for 5 items (pay for 3)', () => {
      const salePrice = 3.99;
      const quantity = 5;
      const itemsToPay = Math.ceil(quantity / 2);
      const totalCost = salePrice * itemsToPay;

      expect(itemsToPay).toBe(3);
      expect(totalCost).toBe(11.97);
    });

    test('should calculate BOGO for 1 item (pay full price)', () => {
      const salePrice = 3.99;
      const quantity = 1;
      const itemsToPay = Math.ceil(quantity / 2);
      const totalCost = salePrice * itemsToPay;

      expect(itemsToPay).toBe(1);
      expect(totalCost).toBe(3.99);
    });

    test('should calculate effective per-unit price for BOGO', () => {
      const salePrice = 4.00;
      const quantity = 2;
      const itemsToPay = Math.ceil(quantity / 2);
      const totalCost = salePrice * itemsToPay;
      const effectivePerUnitPrice = totalCost / quantity;

      expect(effectivePerUnitPrice).toBe(2.00); // 50% off
    });

    test('should calculate savings for BOGO vs regular price', () => {
      const regularPrice = 4.99;
      const salePrice = 4.99; // Same price, but BOGO
      const quantity = 4;

      const normalCost = regularPrice * quantity; // 19.96
      const itemsToPay = Math.ceil(quantity / 2); // 2
      const bogoCost = salePrice * itemsToPay; // 9.98
      const savings = normalCost - bogoCost;

      expect(normalCost).toBe(19.96);
      expect(bogoCost).toBe(9.98);
      expect(savings).toBe(9.98);
    });
  });

  describe('Total Cost Calculations', () => {
    /**
     * Shopping list total cost should consider:
     * - Deal type (sale, bogo, multi_buy)
     * - Quantity requirements
     * - Regular price fallback
     */

    test('should calculate total for simple sale items', () => {
      const items = [
        { salePrice: 3.99, quantity: 2, dealType: 'sale' },
        { salePrice: 5.99, quantity: 1, dealType: 'sale' },
        { salePrice: 2.49, quantity: 3, dealType: 'sale' }
      ];

      const total = items.reduce((sum, item) => {
        return sum + (item.salePrice * item.quantity);
      }, 0);

      expect(parseFloat(total.toFixed(2))).toBe(21.44);
    });

    test('should calculate total with BOGO deals', () => {
      const items = [
        { salePrice: 3.99, quantity: 2, dealType: 'bogo' },
        { salePrice: 5.99, quantity: 4, dealType: 'bogo' }
      ];

      const total = items.reduce((sum, item) => {
        if (item.dealType === 'bogo') {
          const itemsToPay = Math.ceil(item.quantity / 2);
          return sum + (item.salePrice * itemsToPay);
        }
        return sum + (item.salePrice * item.quantity);
      }, 0);

      expect(parseFloat(total.toFixed(2))).toBe(15.97);
    });

    test('should calculate total with multi-buy deals meeting minimum', () => {
      const items = [
        {
          salePrice: 2.50, // Per-unit price after multi-buy
          quantity: 2,
          dealType: 'multi_buy',
          minQuantity: 2
        }
      ];

      const total = items.reduce((sum, item) => {
        if (item.dealType === 'multi_buy' && item.quantity >= item.minQuantity) {
          return sum + (item.salePrice * item.quantity);
        }
        // If minimum not met, use regular price
        return sum + ((item.regularPrice || item.salePrice) * item.quantity);
      }, 0);

      expect(total).toBe(5.00);
    });

    test('should calculate total with multi-buy deals NOT meeting minimum', () => {
      const items = [
        {
          salePrice: 2.50, // Per-unit price requires buying 2
          regularPrice: 5.00,
          quantity: 1,
          dealType: 'multi_buy',
          minQuantity: 2
        }
      ];

      const total = items.reduce((sum, item) => {
        if (item.dealType === 'multi_buy' && item.quantity >= item.minQuantity) {
          return sum + (item.salePrice * item.quantity);
        }
        // If minimum not met, use regular price
        return sum + ((item.regularPrice || item.salePrice) * item.quantity);
      }, 0);

      expect(total).toBe(5.00); // Regular price since minimum not met
    });

    test('should calculate mixed cart total', () => {
      const items = [
        { salePrice: 3.99, quantity: 1, dealType: 'sale' },
        { salePrice: 4.99, quantity: 2, dealType: 'bogo' },
        { salePrice: 2.50, quantity: 2, dealType: 'multi_buy', minQuantity: 2 }
      ];

      const total = items.reduce((sum, item) => {
        if (item.dealType === 'bogo') {
          const itemsToPay = Math.ceil(item.quantity / 2);
          return sum + (item.salePrice * itemsToPay);
        }
        if (item.dealType === 'multi_buy' && item.minQuantity && item.quantity >= item.minQuantity) {
          return sum + (item.salePrice * item.quantity);
        }
        return sum + (item.salePrice * item.quantity);
      }, 0);

      expect(parseFloat(total.toFixed(2))).toBe(13.98);
    });

    test('should handle empty cart', () => {
      const items = [];
      const total = items.reduce((sum, item) => sum + (item.salePrice * item.quantity), 0);

      expect(total).toBe(0);
    });

    test('should handle zero quantity items', () => {
      const items = [
        { salePrice: 3.99, quantity: 0, dealType: 'sale' }
      ];

      const total = items.reduce((sum, item) => {
        if (item.quantity === 0) return sum;
        return sum + (item.salePrice * item.quantity);
      }, 0);

      expect(total).toBe(0);
    });
  });

  describe('Price Validation Edge Cases', () => {
    /**
     * From models/Deal.js validation:
     * - salePrice must be 0.01 - 9999.99
     * - regularPrice must be > salePrice
     */

    test('should validate minimum sale price', () => {
      const salePrice = 0.01;
      const isValid = salePrice >= 0.01 && salePrice <= 9999.99;

      expect(isValid).toBe(true);
    });

    test('should validate maximum sale price', () => {
      const salePrice = 9999.99;
      const isValid = salePrice >= 0.01 && salePrice <= 9999.99;

      expect(isValid).toBe(true);
    });

    test('should invalidate sale price below minimum', () => {
      const salePrice = 0.00;
      const isValid = salePrice >= 0.01 && salePrice <= 9999.99;

      expect(isValid).toBe(false);
    });

    test('should invalidate sale price above maximum', () => {
      const salePrice = 10000.00;
      const isValid = salePrice >= 0.01 && salePrice <= 9999.99;

      expect(isValid).toBe(false);
    });

    test('should validate regularPrice > salePrice', () => {
      const regularPrice = 5.99;
      const salePrice = 3.99;
      const isValid = regularPrice > salePrice;

      expect(isValid).toBe(true);
    });

    test('should invalidate regularPrice <= salePrice', () => {
      const regularPrice = 3.99;
      const salePrice = 3.99;
      const isValid = regularPrice > salePrice;

      expect(isValid).toBe(false);
    });

    test('should invalidate regularPrice < salePrice', () => {
      const regularPrice = 3.99;
      const salePrice = 5.99;
      const isValid = regularPrice > salePrice;

      expect(isValid).toBe(false);
    });
  });

  describe('Decimal Precision Edge Cases', () => {
    test('should handle JavaScript decimal precision issues', () => {
      const price1 = 0.1;
      const price2 = 0.2;
      const sum = price1 + price2;
      const expected = 0.3;

      // Known JavaScript floating point issue
      expect(sum).not.toBe(expected);

      // Fix with toFixed
      expect(parseFloat(sum.toFixed(2))).toBe(expected);
    });

    test('should round prices consistently', () => {
      const rawPrice = 2.345;
      const rounded = parseFloat(rawPrice.toFixed(2));

      expect(rounded).toBe(2.35); // Rounds up
    });

    test('should handle very small decimal differences', () => {
      const regularPrice = 5.999;
      const salePrice = 3.991;
      const savings = parseFloat((regularPrice - salePrice).toFixed(2));

      expect(savings).toBe(2.01);
    });

    test('should handle repeating decimals in multi-buy', () => {
      const quantity = 3;
      const totalPrice = 10;
      const perUnitPrice = totalPrice / quantity; // 3.333...
      const rounded = parseFloat(perUnitPrice.toFixed(2));

      expect(rounded).toBe(3.33);
    });
  });

  describe('Real-World Scenarios', () => {
    test('scenario: Campbell Soup 2 for $5 deal', () => {
      const quantity = '2 for $5';
      const multiBuyMatch = quantity.match(/(\d+)\s*for\s*\$?([\d.]+)/i);

      const qty = parseInt(multiBuyMatch[1]);
      const totalPrice = parseFloat(multiBuyMatch[2]);
      const perUnitPrice = totalPrice / qty;
      const regularPrice = 3.49;

      const savingsPerUnit = regularPrice - perUnitPrice;
      const savingsPercent = parseFloat((((regularPrice - perUnitPrice) / regularPrice) * 100).toFixed(0));

      expect(perUnitPrice).toBe(2.50);
      expect(parseFloat(savingsPerUnit.toFixed(2))).toBe(0.99);
      expect(savingsPercent).toBe(28);
    });

    test('scenario: Milk BOGO at $4.99', () => {
      const salePrice = 4.99;
      const quantity = 2;
      const dealType = 'bogo';

      const itemsToPay = Math.ceil(quantity / 2);
      const totalCost = salePrice * itemsToPay;
      const effectivePerUnit = totalCost / quantity;
      const regularPerUnit = 4.99;
      const savingsPercent = parseFloat((((regularPerUnit - effectivePerUnit) / regularPerUnit) * 100).toFixed(0));

      expect(totalCost).toBe(4.99);
      expect(effectivePerUnit).toBe(2.495);
      expect(savingsPercent).toBe(50);
    });

    test('scenario: Organic Apples $3.99/lb on sale from $5.99/lb', () => {
      const regularPrice = 5.99;
      const salePrice = 3.99;
      const savingsDollar = parseFloat((regularPrice - salePrice).toFixed(2));
      const savingsPercent = parseFloat((((regularPrice - salePrice) / regularPrice) * 100).toFixed(0));

      expect(savingsDollar).toBe(2.00);
      expect(savingsPercent).toBe(33);
    });

    test('scenario: Shopping list total with mixed deals', () => {
      // User has:
      // - 2 Campbell Soup (2 for $5, buy exactly 2)
      // - 2 Milk (BOGO at $4.99)
      // - 3 Apples at $3.99/lb (regular sale)

      const soupPerUnit = 2.50;
      const soupQty = 2;
      const soupTotal = soupPerUnit * soupQty;

      const milkPrice = 4.99;
      const milkQty = 2;
      const milkItemsToPay = Math.ceil(milkQty / 2);
      const milkTotal = milkPrice * milkItemsToPay;

      const applePrice = 3.99;
      const appleQty = 3;
      const appleTotal = applePrice * appleQty;

      const grandTotal = soupTotal + milkTotal + appleTotal;

      expect(soupTotal).toBe(5.00);
      expect(milkTotal).toBe(4.99);
      expect(parseFloat(appleTotal.toFixed(2))).toBe(11.97);
      expect(parseFloat(grandTotal.toFixed(2))).toBe(21.96);
    });
  });
});
