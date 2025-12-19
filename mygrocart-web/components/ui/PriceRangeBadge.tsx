import React from 'react';

interface PriceRange {
  min: number;
  max: number;
  savings: number;
  storeCount: number;
}

interface PriceRangeBadgeProps {
  priceRange: PriceRange;
  variant?: 'default' | 'compact';
}

export function PriceRangeBadge({ priceRange, variant = 'default' }: PriceRangeBadgeProps) {
  if (variant === 'compact') {
    return (
      <div className="text-sm">
        <span className="font-semibold text-green-600">
          ${priceRange.min.toFixed(2)}
        </span>
        {priceRange.max > priceRange.min && (
          <span className="text-gray-500 ml-1">
            - ${priceRange.max.toFixed(2)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-bold text-green-600">
          From ${priceRange.min.toFixed(2)}
        </span>
        {priceRange.storeCount > 1 && (
          <span className="text-xs text-gray-500">
            Available at {priceRange.storeCount} stores
          </span>
        )}
      </div>
      {priceRange.savings > 0 && (
        <div className="text-sm text-green-700 font-medium">
          Save up to ${priceRange.savings.toFixed(2)}
        </div>
      )}
    </div>
  );
}
