interface StorePrice {
  price: number | string;
  [key: string]: any;
}

interface PriceRange {
  min: number;
  max: number;
  savings: number;
  storeCount: number;
}

/**
 * Calculate price range from store prices
 */
export function calculatePriceRange(storePrices: StorePrice[]): PriceRange {
  if (!storePrices || storePrices.length === 0) {
    return { min: 0, max: 0, savings: 0, storeCount: 0 };
  }

  const prices = storePrices.map(sp => {
    const price = typeof sp.price === 'string' ? parseFloat(sp.price) : sp.price;
    return isNaN(price) ? 0 : price;
  }).filter(p => p > 0);

  if (prices.length === 0) {
    return { min: 0, max: 0, savings: 0, storeCount: 0 };
  }

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const savings = max - min;

  return {
    min,
    max,
    savings,
    storeCount: prices.length
  };
}

/**
 * Calculate subtotal for a list item at the cheapest store
 */
export function calculateCheapestSubtotal(
  quantity: number,
  storePrices: StorePrice[]
): { subtotal: number; cheapestStore: string } {
  if (!storePrices || storePrices.length === 0) {
    return { subtotal: 0, cheapestStore: 'N/A' };
  }

  let minPrice = Infinity;
  let cheapestStore = 'N/A';

  storePrices.forEach(sp => {
    const price = typeof sp.price === 'string' ? parseFloat(sp.price) : sp.price;
    if (!isNaN(price) && price < minPrice) {
      minPrice = price;
      cheapestStore = (sp as any).store?.chainName || 'N/A';
    }
  });

  if (minPrice === Infinity) {
    return { subtotal: 0, cheapestStore: 'N/A' };
  }

  return {
    subtotal: minPrice * quantity,
    cheapestStore
  };
}
