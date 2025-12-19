import React from 'react';
import { Badge } from './badge';

interface Store {
  storeId: string;
  chainName: string;
  storeName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

interface StorePrice {
  priceId: string;
  upc: string;
  storeId: string;
  price: number;
  dealType?: string;
  lastUpdated: string;
  store: Store;
}

interface StorePriceListProps {
  storePrices: StorePrice[];
  showDealBadge?: boolean;
  variant?: 'default' | 'compact';
}

export function StorePriceList({
  storePrices,
  showDealBadge = true,
  variant = 'default'
}: StorePriceListProps) {
  if (!storePrices || storePrices.length === 0) {
    return (
      <div className="text-xs text-gray-400">
        No pricing available
      </div>
    );
  }

  const prices = storePrices.map(sp => parseFloat(String(sp.price)));
  const minPrice = Math.min(...prices);

  return (
    <div className={variant === 'compact' ? 'space-y-1' : 'space-y-2'}>
      {storePrices.map((sp) => {
        const price = parseFloat(String(sp.price));
        const difference = price - minPrice;
        const isCheapest = price === minPrice;

        return (
          <div
            key={sp.priceId}
            className={`flex justify-between items-center ${
              variant === 'compact' ? 'text-sm' : ''
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={isCheapest ? 'font-semibold text-green-700' : 'text-gray-700'}>
                {sp.store.chainName}
              </span>
              {showDealBadge && sp.dealType && sp.dealType !== 'regular' && (
                <Badge
                  variant="destructive"
                  className="text-xs px-1.5 py-0 h-5"
                >
                  {sp.dealType}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <span className={`font-bold ${
                isCheapest ? 'text-green-600 text-lg' : 'text-gray-900'
              }`}>
                ${price.toFixed(2)}
              </span>
              {isCheapest && variant === 'default' && (
                <span className="text-xs text-green-600 font-medium ml-1">
                  (Cheapest!)
                </span>
              )}
              {!isCheapest && difference > 0 && (
                <span className="text-xs text-gray-500 ml-1">
                  (+${difference.toFixed(2)})
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
