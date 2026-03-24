"use client";

import React, { useState } from 'react';
import { DealMatchCard, DealMatch } from './DealMatchCard';
import { DealBadge } from './DealBadge';
import { ChevronDown, ChevronUp, ShoppingBasket } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserListItem {
  id: string;
  itemName: string;
  itemVariant?: string;
  quantity: number;
  checked: boolean;
}

interface DealMatchGroup {
  listItem: UserListItem;
  matches: DealMatch[];
}

interface DealMatchListProps {
  dealMatches: DealMatchGroup[];
  onDealClick?: (dealMatch: DealMatch) => void;
  className?: string;
}

/**
 * DealMatchList - Lists all matched deals for a shopping list
 * - Groups by list item
 * - Shows match reason/score
 * - Expandable/collapsible sections
 */
export function DealMatchList({ dealMatches, onDealClick, className }: DealMatchListProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleItem = (itemId: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  if (dealMatches.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-12 px-4", className)}>
        <ShoppingBasket className="w-16 h-16 text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">No deals found</h3>
        <p className="text-sm text-gray-500 text-center max-w-md">
          We couldn&apos;t find any deals matching your shopping list items. Try adding more items or check back later for new deals.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {dealMatches.map((group) => {
        const isExpanded = expandedItems.has(group.listItem.id);
        const sortedMatches = [...group.matches].sort((a, b) => b.matchScore - a.matchScore);

        return (
          <div
            key={group.listItem.id}
            className="border border-gray-200 rounded-lg overflow-hidden bg-white"
          >
            {/* List Item Header */}
            <button
              onClick={() => toggleItem(group.listItem.id)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {group.listItem.itemName}
                    </h3>
                    {group.listItem.itemVariant && (
                      <span className="text-sm text-gray-500 italic">
                        ({group.listItem.itemVariant})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <DealBadge count={group.matches.length} />
                    <span className="text-xs text-gray-500">
                      Qty: {group.listItem.quantity}
                    </span>
                  </div>
                </div>
              </div>

              <div className="ml-4 shrink-0">
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                )}
              </div>
            </button>

            {/* Expanded Deal Matches */}
            {isExpanded && (
              <div className="border-t border-gray-200 bg-gray-50">
                <div className="p-4 space-y-3">
                  {sortedMatches.map((dealMatch, index) => (
                    <DealMatchCard
                      key={`${dealMatch.deal.id}-${index}`}
                      dealMatch={dealMatch}
                      onClick={() => onDealClick?.(dealMatch)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
