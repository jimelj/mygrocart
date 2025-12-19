"use client";

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DealBadge } from '@/components/deals/DealBadge';
import { ChevronDown, ChevronUp, Trash2, Minus, Plus } from 'lucide-react';
import { DealCard } from '@/components/deals/DealCard';

interface Deal {
  id: string;
  productName: string;
  productBrand?: string;
  salePrice: number;
  regularPrice?: number;
  storeName: string;
  dealType: string;
  savingsPercent?: number;
  validTo: string;
}

interface ListItem {
  id: string;
  itemName: string;
  itemVariant?: string;
  quantity: number;
  checked: boolean;
  matchingDeals?: Deal[];
}

interface ListItemProps {
  item: ListItem;
  onToggleCheck: (id: string, checked: boolean) => void;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
  onViewDeals?: (item: ListItem) => void;
}

export function ListItem({
  item,
  onToggleCheck,
  onUpdateQuantity,
  onRemove,
  onViewDeals,
}: ListItemProps) {
  const [expanded, setExpanded] = useState(false);
  const dealCount = item.matchingDeals?.length || 0;

  const handleQuantityChange = (delta: number) => {
    const newQuantity = Math.max(1, item.quantity + delta);
    onUpdateQuantity(item.id, newQuantity);
  };

  const displayName = item.itemVariant && item.itemVariant !== 'Any'
    ? `${item.itemName} (${item.itemVariant})`
    : item.itemName;

  return (
    <Card className="overflow-hidden">
      <div className="p-4">
        <div className="flex items-center gap-3">
          {/* Checkbox */}
          <Checkbox
            checked={item.checked}
            onCheckedChange={(checked) =>
              onToggleCheck(item.id, checked as boolean)
            }
            className="shrink-0"
          />

          {/* Item name and variant */}
          <div
            className="flex-1 min-w-0 cursor-pointer"
            onClick={() => dealCount > 0 && setExpanded(!expanded)}
          >
            <p
              className={`font-medium ${
                item.checked ? 'line-through text-muted-foreground' : ''
              }`}
            >
              {displayName}
            </p>
          </div>

          {/* Deal badge */}
          {dealCount > 0 && (
            <DealBadge count={dealCount} className="shrink-0" />
          )}

          {/* Quantity controls */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8"
              onClick={() => handleQuantityChange(-1)}
              disabled={item.quantity <= 1}
            >
              <Minus className="w-3 h-3" />
            </Button>
            <span className="w-8 text-center font-medium">{item.quantity}</span>
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8"
              onClick={() => handleQuantityChange(1)}
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>

          {/* Expand/collapse button */}
          {dealCount > 0 && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          )}

          {/* Remove button */}
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0 text-destructive hover:bg-destructive/10"
            onClick={() => onRemove(item.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Expanded deals section */}
        {expanded && item.matchingDeals && item.matchingDeals.length > 0 && (
          <div className="mt-4 pt-4 border-t space-y-3">
            <p className="text-sm font-medium text-muted-foreground">
              {dealCount} deal{dealCount > 1 ? 's' : ''} this week:
            </p>
            <div className="space-y-2">
              {item.matchingDeals.map((deal) => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  onClick={() => onViewDeals && onViewDeals(item)}
                />
              ))}
            </div>
          </div>
        )}

        {/* No deals message */}
        {expanded && (!item.matchingDeals || item.matchingDeals.length === 0) && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              No deals this week for this item.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
