import React from 'react';
import { TrendingDown } from 'lucide-react';

interface SavingsBannerProps {
  cheapestStore: string;
  maxSavings: number;
  variant?: 'default' | 'compact';
}

export function SavingsBanner({
  cheapestStore,
  maxSavings,
  variant = 'default'
}: SavingsBannerProps) {
  if (maxSavings <= 0) {
    return null;
  }

  if (variant === 'compact') {
    return (
      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center gap-2 text-green-800">
          <TrendingDown className="h-4 w-4 flex-shrink-0" />
          <p className="text-sm">
            <span className="font-semibold">Save ${maxSavings.toFixed(2)}</span>
            {' '}at {cheapestStore}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
      <div className="flex items-center gap-3 text-green-800">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <span className="text-2xl">💰</span>
          </div>
        </div>
        <div className="flex-1">
          <p className="font-bold text-lg">
            Save ${maxSavings.toFixed(2)}
          </p>
          <p className="text-sm">
            by shopping at {cheapestStore} for all items!
          </p>
        </div>
      </div>
    </div>
  );
}
